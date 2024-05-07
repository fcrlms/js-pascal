const fs = require("node:fs");
/* eslint-disable no-unused-vars */
const {
  ProgramAstNode,
  VarDeclAstNode,
  CmdBlockAstNode,
  DeclAstNode,
} = require("./ast");
const { Symbol } = require("./utils");
/* eslint-enable no-unused-vars */

class Formatter {
  constructor() {
    /**
     * this will be filled with all comment symbols of the code
     * and after doing parsing will put them back where they where
     * @type {Array<Symbol>}
     */
    this.comments = [];

    /** @type{fs.WriteStream} */
    this.wstream = null;

    this.indentChar = " ";
    this.indentSize = 4;
    this.indentLevel = 0;

    this.isAtStartOfLine = true;
  }

  /**
   * @private
   * @param {Symbol} symbol
   */
  _write(symbol, nospace = false) {
    if (!(this.isAtStartOfLine || nospace)) {
      this.wstream.write(" ");
    }

    this.wstream.write(symbol.lexeme);

    this.isAtStartOfLine = false;
  }

  /**
   * @private
   * @param {String} char
   */
  _writechar(char, nospace = false) {
    if (!(this.isAtStartOfLine || nospace)) {
      this.wstream.write(" ");
    }

    this.wstream.write(char);

    this.isAtStartOfLine = false;
  }

  /**
   * @param {Symbol} symbol
   * TODO: check if there are comments after him that belong to the
   * same line on the program
   */
  writeSymbol(symbol) {
    while (this.commentGoesFirst(symbol)) {
      const comment = this.comments[0];
      this._write(comment);
      // remove first index
      this.comments.splice(0, 1);
    }

    this._write(symbol);
  }

  writeChar(char, nospace = false) {
    this._writechar(char, nospace);
  }

  newline() {
    this.wstream.write("\n");
    this.wstream.write(
      this.indentChar.repeat(this.indentSize * this.indentLevel),
    );
    this.isAtStartOfLine = true;
  }

  // IMPORTANT: call before using newline
  addIndent() {
    this.indentLevel += 1;
  }

  // IMPORTANT: call before using newline
  removeIndent() {
    this.indentLevel -= 1;
    if (this.indentLevel < 0) {
      this.indentLevel = 0;
    }
  }

  /**
   * @param {Symbol} symbol
   */
  addComment(symbol) {
    this.comments.push(symbol);
  }

  hasComments() {
    return this.comments.length > 0;
  }

  /**
   * @param {Symbol} symbol
   */
  commentGoesFirst(symbol) {
    if (!this.hasComments()) return false;

    return symbol.offset > this.comments[0].offset;
  }

  /**
   * @param {ProgramAstNode} prog
   */
  formatSubprogram(prog) {
    this.writeSymbol(prog.symbol);
    this.writeSymbol(prog.id);
    this.formatArgs(prog.args);
    this.writeChar(";", true);

    if (prog.vardecl) {
      this.formatVarDecl(prog.vardecl);
    }

    if (prog.subprogram) {
      for (let i = 0; i < prog.subprogram.length; ++i) {
        this.formatSubprogram(prog.subprogram[i]);
        this.newline();
      }
    }

    this.writeSymbol(prog.body.symbol);
    this.formatCmdBlock(prog.body);
    this.writeChar("end;");
    this.newline();
  }

  /**
   * @param {VarDeclAstNode} vardecl
   */
  formatVarDecl(vardecl) {
    this.newline();
    this.writeSymbol(vardecl.symbol);
    this.addIndent();
    this.newline();

    for (let i = 0; i < vardecl.declarations.length; ++i) {
      const decl = vardecl.declarations[i];
      this.formatDecl(decl);

      if (i !== vardecl.declarations.length - 1) {
        this.newline();
      }
    }

    this.removeIndent();
    this.newline();
  }

  /**
   * @param {VarDeclAstNode} args
   */
  formatArgs(args) {
    this.writeSymbol(args.symbol);

    // avoid space between '(' and first id
    this.isAtStartOfLine = true;

    for (let i = 0; i < args.declarations.length - 1; ++i) {
      const decl = args.declarations[i];
      this.formatDecl(decl);
    }

    // avoid space between ')' and last type
    const lastdecl = args.declarations[args.declarations.length - 1];
    this.formatDecl(lastdecl, false);

    this.writeChar(")", true);
  }

  /**
   * @param {DeclAstNode} vardecl
   */
  formatDecl(decl, includeLastSemicolon = true) {
    for (let i = 0; i < decl.ids.length - 1; ++i) {
      const id = decl.ids[i];
      this.writeSymbol(id);
      this.writeChar(",", true);
    }
    this.writeSymbol(decl.ids[decl.ids.length - 1]);
    this.writeChar(":");
    this.writeSymbol(decl.type);

    if (includeLastSemicolon) {
      this.writeChar(";", true);
    }
  }

  /**
   * @param {CmdBlockAstNode} cmdblock
   */
  formatCmdBlock(cmdblock) {
    this.addIndent();
    this.newline();

    for (let i = 0; i < cmdblock.commands.length; ++i) {
      // handle each type of command
      // end with ';' if necessary
      if (i !== cmdblock.commands.length - 1) {
        this.newline();
      }
    }

    this.removeIndent();
    this.newline();
  }
}

/**
 * @param {String} filepath
 * @param {ProgramAstNode} ast
 * @param {Formatter} formatter
 */
const format = (filepath, ast, formatter) => {
  // TODO: ignore if parser had error somewhere
  const wstream = fs.createWriteStream(filepath);
  formatter.wstream = wstream;

  formatter.writeSymbol(ast.symbol);
  formatter.writeSymbol(ast.id);
  formatter.writeChar(";", true);

  if (ast.vardecl) {
    formatter.formatVarDecl(ast.vardecl);
  }

  if (ast.subprogram) {
    for (let i = 0; i < ast.subprogram.length; ++i) {
      formatter.formatSubprogram(ast.subprogram[i]);
      formatter.newline();
    }
  }

  formatter.writeSymbol(ast.body.symbol);
  formatter.formatCmdBlock(ast.body);
  formatter.writeChar("end.");
  formatter.newline();

  // TODO: write all remaining comments

  wstream.close();
};

module.exports = {
  Formatter,
  format,
};

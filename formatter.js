const fs = require("node:fs");
// eslint-disable-next-line no-unused-vars
const { ProgramAstNode, VarDeclAstNode, CmdBlockAstNode } = require("./ast");
// eslint-disable-next-line no-unused-vars
const { Symbol } = require("./utils");

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
    formatVarDecl(formatter, ast.vardecl);
  }

  if (ast.subprogram) {
    for (let i = 0; i < ast.subprogram.length; ++i) {
      formatSubprogram(formatter, ast.subprogram[i]);
      formatter.newline();
    }
  }

  formatter.writeSymbol(ast.body.symbol);
  formatCmdBlock(formatter, ast.body);
  formatter.writeChar("end.");
  formatter.newline();

  // TODO: write all remaining comments

  wstream.close();
};

/**
 * @type {Formatter} formatter
 * @type {ProgramAstNode} prog
 */
const formatSubprogram = (formatter, prog) => {
  formatter.writeSymbol(prog.symbol);
  formatter.writeSymbol(prog.id);
  // TODO: format arguments
  formatter.writeChar(";", true);

  if (prog.vardecl) {
    formatVarDecl(formatter, prog.vardecl);
  }

  if (prog.subprogram) {
    for (let i = 0; i < prog.subprogram.length; ++i) {
      formatSubprogram(prog.subprogram[i]);
      formatter.newline();
    }
  }

  formatter.writeSymbol(prog.body.symbol);
  formatCmdBlock(formatter, prog.body);
  formatter.writeChar("end;");
  formatter.newline();
};

/**
 * @param {Formatter} formatter
 * @param {CmdBlockAstNode} cmdblock
 */
const formatCmdBlock = (formatter, cmdblock) => {
  formatter.addIndent();
  formatter.newline();

  for (let i = 0; i < cmdblock.commands.length; ++i) {
    // handle each type of command
    // end with ';' if necessary
    if (i !== cmdblock.commands.length - 1) {
      formatter.newline();
    }
  }

  formatter.removeIndent();
  formatter.newline();
};

/**
 * @param {Formatter} formatter
 * @param {VarDeclAstNode} vardecl
 */
const formatVarDecl = (formatter, vardecl) => {
  formatter.newline();
  formatter.writeSymbol(vardecl.symbol);
  formatter.addIndent();
  formatter.newline();

  for (let i = 0; i < vardecl.declarations.length; ++i) {
    const decl = vardecl.declarations[i];
    for (let j = 0; j < decl.ids.length - 1; ++j) {
      const id = decl.ids[j];
      formatter.writeSymbol(id);
      formatter.writeChar(",", true);
    }
    formatter.writeSymbol(decl.ids[decl.ids.length - 1]);
    formatter.writeChar(":");
    formatter.writeSymbol(decl.type);
    formatter.writeChar(";", true);

    if (i !== vardecl.declarations.length - 1) {
      formatter.newline();
    }
  }

  formatter.removeIndent();
  formatter.newline();
};

module.exports = {
  Formatter,
  format,
};

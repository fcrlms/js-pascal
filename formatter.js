const fs = require("node:fs");
/* eslint-disable no-unused-vars */
const {
  ProgramAstNode,
  VarDeclAstNode,
  CmdBlockAstNode,
  DeclAstNode,
  AssignAstNode,
  ProcCallAstNode,
  IfAstNode,
  WhileAstNode,
  ForAstNode,
  NumAstNode,
  UnaryAstNode,
  BinaryAstNode,
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
    this.pendingComments = 0;

    /** @type {fs.WriteStream} */
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
   * @private
   */
  _writeComment() {
    if (!this.hasComments()) return;

    this._write(this.comments[0]);
    // remove first index
    this.comments.splice(0, 1);
  }

  /**
   * @param {Symbol} symbol
   */
  writeSymbol(symbol) {
    while (this.commentGoesFirst(symbol)) {
      const comment = this.comments[0];
      this._writeComment();
      if (comment.pos.line < symbol.pos.line) {
        this.newline();
      }
    }

    this._write(symbol);

    /**
     * Any comment that is at the same line as the current symbol is a pending
     * comment, if a newline is called but these pending comments weren't
     * handled then we'll print them before going to the next line
     */
    let pendingComments = 0;
    for (let com of this.comments) {
      if (com.pos.line === symbol.pos.line) {
        pendingComments += 1;
      } else {
        break;
      }
    }

    this.pendingComments = pendingComments;
  }

  writeChar(char, nospace = false) {
    this._writechar(char, nospace);
  }

  newline() {
    // writing pending comments before the newline
    while (this.pendingComments > 0) {
      this._writeComment();
      this.pendingComments -= 1;
    }

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

  dumpComments() {
    let prev_comment = null;
    while (this.hasComments()) {
      const comment = this.comments[0];
      if (!prev_comment) prev_comment = comment;

      if (prev_comment.pos.line < comment.pos.line) {
        this.newline();
      }

      this._writeComment();

      prev_comment = comment;
    }

    if (prev_comment) this.newline();
  }

  /**
   * @param {ProgramAstNode} prog
   */
  formatSubprogram(prog) {
    this.writeSymbol(prog.symbol);
    this.writeSymbol(prog.id);
    if (prog.args) this.formatArgs(prog.args);
    this.writeChar(";", true);

    this.addIndent();

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
    this.removeIndent();
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
    if (!cmdblock.commands.length) {
      this.newline();
      return;
    }

    this.addIndent();
    this.newline();

    for (let i = 0; i < cmdblock.commands.length; ++i) {
      const cmd = cmdblock.commands[i];
      this.formatCmd(cmd);

      if (i !== cmdblock.commands.length - 1) {
        this.writeChar(";", true);
        this.newline();
      }
    }

    this.removeIndent();
    this.newline();
  }

  /**
   * @param {AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode} cmd
   */
  formatCmd(cmd) {
    if (cmd instanceof AssignAstNode) {
      this.writeSymbol(cmd.id);
      this.writeSymbol(cmd.symbol);
      this.formatExpr(cmd.expr);
    } else if (cmd instanceof ProcCallAstNode) {
      this.writeSymbol(cmd.symbol);
      if (cmd.args && cmd.args.length) {
        this.writeChar("(", true);
        this.isAtStartOfLine = true;
        for (let expr of cmd.args) {
          this.formatExpr(expr);
        }
        this.writeChar(")", true);
      }
    } else if (cmd instanceof IfAstNode) {
      this.writeSymbol(cmd.symbol);
      this.formatExpr(cmd.expr);
      this.writeChar("then");

      if (cmd.body instanceof CmdBlockAstNode) {
        this.newline();
        this.writeSymbol(cmd.body.symbol);
        this.formatCmdBlock(cmd.body);
        this.writeChar("end");
      } else {
        this.addIndent();
        this.newline();

        this.formatCmd(cmd.body);

        this.removeIndent();
      }

      if (cmd.elseBranch) {
        const cmd = cmd.elseBranch;
        this.newline();
        this.writeChar("else");

        if (cmd.body instanceof CmdBlockAstNode) {
          this.newline();
          this.writeSymbol(cmd.body.symbol);
          this.formatCmdBlock(cmd.body);
          this.writeChar("end");
        } else if (cmd.body instanceof IfAstNode) {
          this.formatCmd(cmd.body);
        } else {
          this.addIndent();
          this.newline();
          this.formatCmd(cmd.body);
          this.removeIndent();
        }
      }
    } else if (cmd instanceof WhileAstNode) {
      this.writeSymbol(cmd.symbol);
      this.formatExpr(cmd.expr);
      this.writeChar("do");

      if (cmd.body instanceof CmdBlockAstNode) {
        this.newline();
        this.writeSymbol(cmd.body.symbol);
        this.formatCmdBlock(cmd.body);
        this.writeChar("end");
      } else {
        this.addIndent();
        this.newline();
        this.formatCmd(cmd.body);
        this.removeIndent();
      }
    } else if (cmd instanceof ForAstNode) {
      this.writeSymbol(cmd.symbol);
      this.formatCmd(cmd.assignment);
      this.writeSymbol(cmd.type);
      this.formatExpr(cmd.targetexpr);
      this.writeChar("do");

      if (cmd.body instanceof CmdBlockAstNode) {
        this.newline();
        this.writeSymbol(cmd.body.symbol);
        this.formatCmdBlock(cmd.body);
        this.writeChar("end");
      } else {
        this.addIndent();
        this.newline();
        this.formatCmd(cmd.body);
        this.removeIndent();
      }
    }
  }

  /**
   * @param {BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode} expr
   */
  formatExpr(expr) {
    if (expr instanceof ProcCallAstNode) {
      this.writeSymbol(expr.symbol);
      if (expr.args) {
        if (expr.args && expr.args.length) {
          this.writeChar("(", true);
          this.isAtStartOfLine = true;
          for (let argexpr of expr.args) {
            this.formatExpr(argexpr);
          }
          this.writeChar(")", true);
        }
      }
    } else if (expr instanceof NumAstNode) {
      this.writeSymbol(expr.symbol);
    } else if (expr instanceof UnaryAstNode) {
      if (expr.symbol.lexeme === "(") {
        this.writeSymbol(expr.symbol);
        this.isAtStartOfLine = true;
        this.formatExpr(expr.child);
        this.writeChar(")", true);
      } else {
        this.writeSymbol(expr.symbol);
        this.formatExpr(expr.child);
      }
    } else if (expr instanceof BinaryAstNode) {
      this.formatExpr(expr.left);
      this.writeSymbol(expr.symbol);
      this.formatExpr(expr.right);
    }
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
    }
  }

  formatter.writeSymbol(ast.body.symbol);
  formatter.formatCmdBlock(ast.body);
  formatter.writeChar("end.");
  formatter.newline();

  formatter.dumpComments();

  wstream.close();
};

module.exports = {
  Formatter,
  format,
};

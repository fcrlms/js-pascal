const fs = require("fs");
const { COLORS, wrap_in_colors, get_color_code } = require("./colors.js");

/* eslint-disable no-unused-vars */
const {
  AssignAstNode,
  IfAstNode,
  UnaryAstNode,
  WhileAstNode,
  ForAstNode,
  ProgramAstNode,
  VarDeclAstNode,
  CmdBlockAstNode,
  ProcCallAstNode,
  BinaryAstNode,
  NumAstNode,
  DeclAstNode,
} = require("./ast.js");
const { Symbol, Token } = require("./utils.js");
/* eslint-enable no-unused-vars */

class Highlighter {
  /**
   * @param {ProgramAstNode} ast
   * @param {String} filepath
   */
  constructor(ast, filepath) {
    this.ast = ast;
    this.contents = fs.readFileSync(filepath);
    this.offset = 0;
    this.stream = process.stdout;
  }

  init() {
    this.highlightNode(this.ast);
  }

  finish() {
    let isComment = false;
    // TODO: better efficiency
    let i = this.offset;
    while (i < this.contents.length) {
      const currChar = this.contents.toString(
        "utf-8",
        i,
        Math.min(i + 4, this.contents.length),
      )[0];

      if (!isComment && currChar === "{") {
        isComment = true;
        this.stream.write(get_color_code(COLORS.YELLOW));
      }

      this.stream.write(currChar);

      if (isComment && currChar === "}") {
        isComment = false;
        this.stream.write(get_color_code(COLORS.RESET));
      }

      i += Buffer.byteLength(currChar);
    }

    this.offset = this.contents.length - 1;
  }

  /**
   * @param {Symbol} symbol
   */
  writeUntil(symbol) {
    const targetOffset = symbol.offset;

    let isComment = false;
    // TODO: better efficiency
    let i = this.offset;
    while (i < targetOffset) {
      const currChar = this.contents.toString(
        "utf-8",
        i,
        Math.min(i + 4, this.contents.length),
      )[0];

      if (!isComment && currChar === "{") {
        isComment = true;
        this.stream.write(get_color_code(COLORS.YELLOW));
      }

      this.stream.write(currChar);

      if (isComment && currChar === "}") {
        isComment = false;
        this.stream.write(get_color_code(COLORS.RESET));
      }

      i += Buffer.byteLength(currChar);
    }

    this.offset = targetOffset;
  }

  /**
   * Monster method
   * @param {ProgramAstNode | VarDeclAstNode | CmdBlockAstNode} node
   */
  highlightNode(node) {
    if (node instanceof ProgramAstNode) {
      this.highlightKeyword(node.symbol);
      this.highlightVariable(node.id);

      if (node.args) {
        this.highlightNode(node.args);
      }
      if (node.vardecl) {
        this.highlightNode(node.vardecl);
      }
      if (node.subprogram) {
        for (let subprogram of node.subprogram) {
          this.highlightNode(subprogram);
        }
      }

      this.highlightNode(node.body);
    } else if (node instanceof VarDeclAstNode) {
      this.highlightKeyword(node.symbol);
      for (let decl of node.declarations) {
        this.highlightDeclarations(decl);
      }
    } else if (node instanceof CmdBlockAstNode) {
      // ignore begin and end for now
      for (let cmd of node.commands) {
        this.highlightCmd(cmd);
      }
    }
  }

  /**
   * @param {DeclAstNode} decl
   */
  highlightDeclarations(decl) {
    for (let id of decl.ids) {
      this.highlightVariable(id);
    }

    this.highlightKeyword(decl.type);
  }

  /**
   * @param {AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode} cmd
   */
  highlightCmd(cmd) {
    if (cmd instanceof AssignAstNode) {
      this.highlightVariable(cmd.id);
      this.highlightExpr(cmd.expr);
    } else if (cmd instanceof ProcCallAstNode) {
      this.highlightVariable(cmd.symbol);

      for (let expr of cmd.args) {
        this.highlightExpr(expr);
      }
    } else if (cmd instanceof IfAstNode) {
      this.highlightKeyword(cmd.symbol);
      this.highlightExpr(cmd.expr);
      this.highlightKeyword(cmd.then);

      if (cmd.body instanceof CmdBlockAstNode) {
        this.highlightNode(cmd.body);
      } else {
        this.highlightCmd(cmd.body);
      }

      if (!cmd.elseBranch) return;

      if (cmd.elseBranch instanceof CmdBlockAstNode) {
        this.highlightNode(cmd.elseBranch);
      } else {
        this.highlightCmd(cmd.elseBranch);
      }
    } else if (cmd instanceof WhileAstNode) {
      this.highlightKeyword(cmd.symbol);
      this.highlightExpr(cmd.expr);
      this.highlightKeyword(cmd.do);

      if (cmd.body instanceof CmdBlockAstNode) {
        this.highlightNode(cmd.body);
      } else {
        this.highlightCmd(cmd.body);
      }
    } else if (cmd instanceof ForAstNode) {
      this.highlightKeyword(cmd.symbol);
      this.highlightCmd(cmd.assignment);
      this.highlightKeyword(cmd.type);
      this.highlightExpr(cmd.targetexpr);
      this.highlightKeyword(cmd.do);

      if (cmd.body instanceof CmdBlockAstNode) {
        this.highlightNode(cmd.body);
      } else {
        this.highlightCmd(cmd.body);
      }
    }
  }

  /**
   * @param {BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode} expr
   */
  highlightExpr(expr) {
    if (expr instanceof NumAstNode) {
      this.highlightNumber(expr.symbol);
    } else if (expr instanceof ProcCallAstNode) {
      this.highlightVariable(expr.symbol);
      if (expr.args) {
        for (let e of expr.args) {
          this.highlightExpr(e);
        }
      }
    } else if (expr instanceof UnaryAstNode) {
      // TODO: highlight 'not'
      this.highlightExpr(expr.child);
    } else if (expr instanceof BinaryAstNode) {
      this.highlightExpr(expr.left);
      // TODO: 'not' and 'and'
      this.highlightExpr(expr.right);
    }
  }

  /**
   * @param {Symbol} symbol
   */
  highlightNumber(symbol) {
    this.writeUntil(symbol);

    let color = COLORS.GREEN;
    this.offset += symbol.lexeme.length;
    this.stream.write(wrap_in_colors(symbol.lexeme, color));
  }

  /**
   * @param {Symbol} symbol
   */
  highlightKeyword(symbol) {
    this.writeUntil(symbol);

    let str = "";
    let colors = [];
    switch (symbol.type) {
      case Token.PROGRAM:
      case Token.PROCEDURE:
      case Token.VAR:
      case Token.FOR:
      case Token.WHILE:
      case Token.IF:
      case Token.TO:
      case Token.DOWNTO:
      case Token.THEN:
      case Token.DO:
        colors.push(COLORS.MAGENTA);
        break;
      case Token.INT:
      case Token.REAL:
      case Token.BOOLEAN:
        colors.push(COLORS.BLUE);
        break;
      default:
    }

    str = wrap_in_colors(symbol.lexeme, ...colors);

    this.offset += symbol.lexeme.length;
    this.stream.write(str);
  }

  /**
   * @param {Symbol} symbol
   * @param {Boolean} wasUsed
   * @param {Boolean} wasInitialized
   */
  highlightVariable(symbol, wasUsed = true, wasInitialized = true) {
    this.writeUntil(symbol);

    let colors = [COLORS.CYAN];

    if (!wasUsed) {
      colors.push(COLORS.DIM);
    } else if (!wasInitialized) {
      colors = [COLORS.RED];
    }

    const str = wrap_in_colors(symbol.lexeme, ...colors);

    this.offset += symbol.lexeme.length;
    this.stream.write(str);
  }
}

/**
 * @param {ProgramAstNode} final_ast
 * @param {String} filepath
 */
const highlight = (final_ast, filepath) => {
  const highlighter = new Highlighter(final_ast, filepath);
  highlighter.init();
  highlighter.finish();
};

module.exports = {
  highlight,
};

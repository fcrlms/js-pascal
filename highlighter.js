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
    this.contents = fs.readFileSync(filepath).toString();
    this.offset = 0;
    this.stream = process.stdout;
  }

  init() {
    this.highlightNode(this.ast);
  }

  /**
   * @param {Symbol} symbol
   */
  writeUntil(symbol) {
    const targetOffset = symbol.offset;

    let isComment = false;
    // TODO: better efficiency
    for (let i = this.offset; i < targetOffset; ++i) {
      if (!isComment && this.contents[i] === "{") {
        isComment = true;
        this.stream.write(get_color_code(COLORS.GREEN));
      }

      this.stream.write(this.contents[i]);

      if (isComment && this.contents[i] === "}") {
        isComment = false;
        this.stream.write(get_color_code(COLORS.RESET));
      }
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
      if (node.subprogram) {
        for (let subprogram of node.subprogram) {
          this.highlightNode(subprogram);
        }
      }

      this.highlightCmd(node.body);
    } else if (node instanceof VarDeclAstNode) {
    } else if (node instanceof CmdBlockAstNode) {
      // ignore begin and end for now
      for (let cmd of node.commands) {
        this.highlightCmd(cmd);
      }
    }
  }

  /**
   * @param {AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode} cmd
   */
  highlightCmd(cmd) {}

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
        colors.push(COLORS.MAGENTA);
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

    let colors = [COLORS.BLUE];

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
};

module.exports = {
  highlight,
};

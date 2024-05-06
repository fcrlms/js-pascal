// eslint-disable-next-line no-unused-vars
const { Symbol } = require("./utils.js");

/**
 * May represent any binary operator use, such as:
 * comparisons, logical and math operators
 */
class BinaryAstNode {
  /**
   * @param {Symbol} symbol
   * @param {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} left
   * @param {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} right
   */
  constructor(symbol, left, right) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} */
    this.left = left;
    /** @public @type {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} */
    this.right = right;
  }
}

/**
 * Used for unary operators and other uses:
 * unary minus or plus, not operator, opening parentheses in expressions
 */
class UnaryAstNode {
  /**
   * @param {Symbol} symbol
   * @param {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} child
   */
  constructor(symbol, child) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} */
    this.child = child;
  }
}

/**
 * Multi-purpose class for real and integer numbers and also booleans
 * the type can be found out by looking at the `symbol` property
 *
 * True is treated as 1 and False as 0
 */
class NumAstNode {
  /**
   * @param {Symbol} symbol
   * @param {Number} value
   */
  constructor(symbol, value) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {Number} */
    this.value = value;
  }
}

/**
 * Represents either a procedure call or a variable use,
 * if it's a variable the `args` property will be null
 */
class ProcCallAstNode {
  /**
   * @param {Symbol} symbol
   * @param {(Array<> | null)} args array of expressions
   */
  constructor(symbol, args) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {(Array<> | null)} array of expressions */
    this.args = args;
  }
}

class AssignAstNode {
  /**
   * @param {Symbol} symbol
   * @param {Symbol} id
   * @param {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} expr
   */
  constructor(symbol, id, expr) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {Symbol} */
    this.id = id;
    /** @public @type {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} */
    this.expr = expr;
  }
}

class ForAstNode {
  /**
   * @param {Symbol} symbol
   * @param {AssignAstNode} assignment
   * @param {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} targetexpr
   * @param {(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode | CmdBlockAstNode)} body
   */
  constructor(symbol, assignment, targetexpr, body) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {AssignAstNode} */
    this.assignment = assignment;
    /** @public @type {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} */
    this.targetexpr = targetexpr;
    /** @public @type {(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode | CmdBlockAstNode)} */
    this.body = body;
  }
}

class WhileAstNode {
  /**
   * @param {Symbol} symbol
   * @param {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} expr
   * @param {(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode | CmdBlockAstNode)} body
   */
  constructor(symbol, expr, body) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} */
    this.expr = expr;
    /** @public @type {(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode | CmdBlockAstNode)} */
    this.body = body;
  }
}

class IfAstNode {
  /**
   * @param {Symbol} symbol
   * @param {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} expr
   * @param {(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode | CmdBlockAstNode)} body
   * @param {(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode | CmdBlockAstNode)} elseBranch
   */
  constructor(symbol, expr, body, elseBranch) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} */
    this.expr = expr;
    /** @public @type {(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode | CmdBlockAstNode)} */
    this.body = body;
    /** @public @type {(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode | CmdBlockAstNode)} */
    this.elseBranch = elseBranch;
  }
}

class CmdBlockAstNode {
  /**
   *
   * @param {Symbol} symbol
   * @param {Array<(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode)>} commands
   */
  constructor(symbol, commands) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {Array<(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode)>} */
    this.commands = commands;
  }
}

class DeclAstNode {
  /**
   * @param {Symbol} type
   * @param {Array<Symbol>} ids
   */
  constructor(type, ids) {
    /** @public @type {Symbol} */
    this.type = type;
    /** @public @type {Array<Symbol>} */
    this.ids = ids;
  }
}

class VarDeclAstNode {
  /**
   * @param {Symbol} symbol
   * @param {Array<DeclAstNode>} declarations
   */
  constructor(symbol, declarations) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {Array<DeclAstNode>} */
    this.declarations = declarations;
  }
}

/**
 * Represents either the program or a procedure, check `symbol` to differentiate
 */
class ProgramAstNode {
  /**
   * @param {Symbol} symbol
   * @param {Symbol} id
   * @param {(VarDeclAstNode|null)} args only on procedures
   * @param {(VarDeclAstNode|undefined)} vardecl
   * @param {(Array<ProgramAstNode>|undefined)} subprogram
   * @param {CmdBlockAstNode} body
   */
  constructor(symbol, id, args, vardecl, subprogram, body) {
    /** @public @type {Symbol} */
    this.symbol = symbol;
    /** @public @type {Symbol} */
    this.id = id;
    /** @public @type {(VarDeclAstNode|null)} */
    this.args = args;
    /** @public @type {(VarDeclAstNode|undefined)} */
    this.vardecl = vardecl;
    /** @public @type {(Array<ProgramAstNode>|undefined)} */
    this.subprogram = subprogram;
    /** @public @type {CmdBlockAstNode} */
    this.body = body;
  }
}

module.exports = {
  BinaryAstNode,
  UnaryAstNode,
  NumAstNode,
  ProcCallAstNode,
  AssignAstNode,
  ForAstNode,
  WhileAstNode,
  IfAstNode,
  CmdBlockAstNode,
  DeclAstNode,
  VarDeclAstNode,
  ProgramAstNode,
};

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
} = require("./ast");
const { Token, Symbol } = require("./utils");
const { Logger } = require("./logger.js");
/* eslint-enable no-unused-vars */

class Scopes {
  constructor() {
    this.globalScope = new Map();
    /** @private @type {Array<Map>} */
    this.stack = [];
    /** @type {Logger} */
    this.logger = null;
  }

  /**
   * @param {String} key
   * @returns {Boolean}
   */
  has(key) {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const scope = this.stack[i];
      if (scope.has(key)) return true;
    }

    return this.globalScope.has(key);
  }

  /**
   * Only checks the current scope
   * @param {String} key
   * @returns {Boolean}
   */
  hasCurr(key) {
    // get closest scope on the stack
    if (this.stack.length) {
      const index = this.stack.length - 1;
      return this.stack[index].has(key);
    }

    // else use the global scope
    return this.globalScope.has(key);
  }

  /**
   * @param {String} key
   * @returns {ScopeEntry}
   */
  get(key) {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const scope = this.stack[i];
      if (scope.has(key)) return scope.get(key);
    }

    return this.globalScope.get(key);
  }

  /**
   * @param {String} key
   * @param {ScopeEntry} value
   */
  set(key, value) {
    if (this.stack.length) {
      const index = this.stack.length - 1;
      const scope = this.stack[index];

      scope.set(key, value);
    } else {
      this.globalScope.set(key, value);
    }
  }

  /**
   * sets key and value to the first scope that has key
   * supposes that key exists in some scope
   * @param {String} key
   * @param {ScopeEntry} value
   */
  findAndSet(key, value) {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const scope = this.stack[i];
      if (scope.has(key)) {
        scope.set(key, value);
        return;
      }
    }

    this.globalScope.set(key, value);
  }

  addNewScope() {
    this.stack.push(new Map());
  }

  removeScope() {
    const scope = this.stack[this.stack.length - 1];

    for (let [key, value] of scope) {
      if (value.wasUsed) continue;

      this.logger.error(value.symbol, `Variable '${key}' was never used.`);
    }

    this.stack.splice(this.stack.length - 1, 1);
  }

  endGlobalScope() {
    const scope = this.globalScope;

    for (let [key, value] of scope) {
      if (value.wasUsed) continue;

      this.logger.error(value.symbol, `Variable '${key}' was never used.`);
    }
  }
}

class ScopeEntry {
  /**
   * @param {Symbol} symbol
   * @param {Token} type
   * @param {Array<Token>} args
   */
  constructor(symbol, type, args = undefined) {
    this.symbol = symbol;
    this.symbol.type = type;
    this.args = args;

    this.wasInitialized = false;
    this.wasUsed = false;
  }

  /**
   * returns true if `token` matches this type
   * @param {Token} token
   * @returns {Boolean}
   */
  isOfType(token) {
    return this.symbol.type === token;
  }
}

const scope = new Scopes();

/**
 * @param {ProgramAstNode} ast
 * @param {Logger} errorLogger
 */
module.exports = (ast, errorLogger) => {
  scope.logger = errorLogger;
  const entry = new ScopeEntry(ast.id, Token.PROGRAM);
  entry.wasInitialized = true;
  entry.wasUsed = true;
  scope.set(ast.id.lexeme, entry);

  if (ast.vardecl) {
    handleVariableDeclarations(ast.vardecl);
  }

  if (ast.subprogram) {
    for (let procedure of ast.subprogram) {
      handleProcedure(procedure);
    }
  }

  handleCommandBlock(ast.body);

  scope.endGlobalScope();

  return ast;
};

/**
 * @param {CmdBlockAstNode} cmdblock
 */
function handleCommandBlock(cmdblock) {
  for (let command of cmdblock.commands) {
    handleCommand(command);
  }
}

/**
 * @param {(AssignAstNode | ProcCallAstNode | IfAstNode | WhileAstNode | ForAstNode)} command
 */
function handleCommand(command) {
  if (command instanceof AssignAstNode) {
    const entry = scope.get(command.id.lexeme);

    let vartype = undefined;
    if (entry) {
      if (entry.isOfType(Token.PROCEDURE)) {
        scope.logger.error(command.symbol, `Cannot assign to procedure.`);
      } else if (entry.isOfType(Token.PROGRAM)) {
        scope.logger.error(command.symbol, `Cannot assign to program.`);
      } else {
        vartype = entry.symbol.type; // only expect type on a valid assignment
      }

      if (scope.hasCurr(command.id.lexeme)) {
        entry.wasInitialized = true;
        scope.set(command.id.lexeme, entry);
      }
    } else {
      scope.logger.error(command.id, `${command.id.lexeme} was not declared`);
    }

    // TODO: better warning for assignment type mismatch
    handleExpression(command.expr, vartype);
  } else if (command instanceof IfAstNode) {
    // TODO: better error here
    handleExpression(command.expr, Token.BOOLEAN);

    if (command.body instanceof CmdBlockAstNode) {
      handleCommandBlock(command.body);
    } else {
      handleCommand(command.body);
    }

    if (!command.elseBranch) return;

    if (command.elseBranch instanceof CmdBlockAstNode) {
      handleCommandBlock(command.elseBranch);
    } else {
      handleCommand(command.elseBranch);
    }
  } else if (command instanceof WhileAstNode) {
    handleExpression(command.expr, Token.BOOLEAN);

    if (command.body instanceof CmdBlockAstNode) {
      handleCommandBlock(command.body);
    } else {
      handleCommand(command.body);
    }
  } else if (command instanceof ForAstNode) {
    {
      /* variable must be an integer and
               must be declared in the current scope */
      const assignment = command.assignment;
      const entry = scope.get(assignment.id.lexeme);

      let vartype = undefined;
      if (entry) {
        if (entry.isOfType(Token.PROCEDURE)) {
          scope.logger.error(assignment.symbol, `Cannot assign to procedure.`);
        } else if (entry.isOfType(Token.PROGRAM)) {
          scope.logger.error(assignment.symbol, `Cannot assign to program.`);
        } else if (!entry.isOfType(Token.INT)) {
          scope.logger.error(
            assignment.id,
            `'for' control variable must be integer.`,
          );
        } else {
          vartype = entry.symbol.type; // is integer
        }

        if (scope.hasCurr(assignment.id.lexeme)) {
          entry.wasInitialized = true;
          scope.set(assignment.id.lexeme, entry);
        } else {
          scope.logger.error(
            assignment.id,
            `'for' control variable must be declared in the local scope.`,
          );
        }
      } else {
        scope.logger.error(
          assignment.id,
          `${assignment.id.lexeme} was not declared`,
        );
      }

      // TODO: better warning for assignment type mismatch
      handleExpression(assignment.expr, vartype);
    }

    // 'for' target expression must be integer (???)
    handleExpression(command.targetexpr, Token.INT);

    if (command.body instanceof CmdBlockAstNode) {
      handleCommandBlock(command.body);
    } else {
      handleCommand(command.body);
    }
  } else if (command instanceof ProcCallAstNode) {
    const entry = scope.get(command.symbol.lexeme);

    if (entry && entry.isOfType(Token.PROCEDURE)) {
      handleProcedureCall(command);
    } else {
      if (!entry) {
        scope.logger.error(
          command.symbol,
          `'${command.symbol.lexeme}' is not declared.`,
        );
      } else if (!entry.isOfType(Token.PROCEDURE)) {
        // is variable
        scope.logger.error(
          command.symbol,
          `'${command.symbol.lexeme}' is not a procedure.`,
        );
      }

      for (let arg of command.args) {
        handleExpression(arg);
      }
    }
  }
}

/**
 * @param {ProcCallAstNode} procCall
 */
function handleProcedureCall(procCall) {
  const entry = scope.get(procCall.symbol.lexeme);

  if (!entry.args) entry.args = [];
  if (!procCall.args) procCall.args = [];

  const expectedArgSize = entry.args.length;
  const actualArgSize = procCall.args.length;

  if (actualArgSize < expectedArgSize) {
    scope.logger.error(
      procCall.symbol,
      `Received too little arguments (${actualArgSize}), expected ${expectedArgSize}`,
    );
  } else if (actualArgSize > expectedArgSize) {
    scope.logger.error(
      procCall.symbol,
      `Received too much arguments (${actualArgSize}), expected ${expectedArgSize}`,
    );
  }

  const min = Math.min(expectedArgSize, actualArgSize);

  /**
   * handle actual args here until we reach the desired amount
   * or until the provided args end
   */
  for (let i = 0; i < min; ++i) {
    const expr = procCall.args[i];
    handleExpression(expr, entry.args[i]);
  }

  // handle extra arguments here but expect no value
  for (let i = min; i < actualArgSize; ++i) {
    const expr = procCall.args[i];
    handleExpression(expr);
  }
}

/**
 * @param {ProgramAstNode} procedure
 */
function handleProcedure(procedure) {
  const lexeme = procedure.id.lexeme;
  if (scope.hasCurr(lexeme)) {
    scope.logger.error(procedure.id, `name '${lexeme}' already in use.'`);
  } else {
    let args = [];

    if (procedure.args) {
      for (let decl of procedure.args.declarations) {
        const decltype = decl.type;

        for (let i = 0; i < decl.ids.length; ++i) {
          args.push(decltype.type);
        }
      }
    }

    const entry = new ScopeEntry(procedure.id, Token.PROCEDURE, args);
    entry.wasInitialized = true;
    scope.set(lexeme, entry);
  }

  scope.addNewScope();

  if (procedure.args) {
    handleVariableDeclarations(procedure.args);
  }

  if (procedure.vardecl) {
    handleVariableDeclarations(procedure.vardecl);
  }

  if (procedure.subprogram) {
    for (let subprogram of procedure.subprogram) {
      handleProcedure(subprogram);
    }
  }

  handleCommandBlock(procedure.body);
  scope.removeScope();
}

/**
 * @param {VarDeclAstNode} vardecl
 */
function handleVariableDeclarations(vardecl) {
  const declarations = vardecl.declarations;

  for (let declaration of declarations) {
    const vartype = declaration.type.type;

    for (let id of declaration.ids) {
      if (scope.hasCurr(id.lexeme)) {
        scope.logger.error(id, `Variable '${id.lexeme}' already declared`);
        continue;
      }

      scope.set(id.lexeme, new ScopeEntry(id, vartype));
    }
  }
}

/**
 * @param {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} expr
 * @param {(Token | undefined)} expectedType
 */
function handleExpression(expr, expectedType = undefined) {
  if (expr instanceof ProcCallAstNode) {
    const entry = scope.get(expr.symbol.lexeme);
    if (!entry) {
      scope.logger.error(
        expr.symbol,
        `Variable '${expr.symbol.lexeme}' never declared.`,
      );
      return;
    }

    if (scope.hasCurr(expr.symbol.lexeme)) {
      if (!entry.wasInitialized) {
        scope.logger.error(
          expr.symbol,
          `Variable '${expr.symbol.lexeme}' was not initialized.`,
        );
      }
    }

    entry.wasUsed = true;
    scope.findAndSet(expr.symbol.lexeme, entry);

    if (entry.isOfType(Token.PROCEDURE)) {
      scope.logger.error(expr.symbol, `Procedures do not have return value.`);
      handleProcedureCall(expr);
      return;
    }

    if (expr.args) {
      scope.logger.error(
        expr.symbol,
        `Variable ${expr.symbol.lexeme} is not a procedure.`,
      );
      return;
    }

    expr.symbol.type = entry.symbol.type;
    compareTypes(expectedType, expr.symbol);
  } else if (expr instanceof NumAstNode) {
    compareTypes(expectedType, expr.symbol);
  } else if (expr instanceof UnaryAstNode) {
    if (expr.symbol.type === Token.LPAREN) {
      /**
       * Since we reached a parenthesized expression, the parenthesis is
       * no longer needed, we'll remove parentheses until we reach another
       * expression and recurse
       */
      while (expr && expr.symbol.type === Token.LPAREN) {
        expr = expr.child;
      }

      handleExpression(expr, expectedType);
    } else if (expr.symbol.type === Token.NOT) {
      if (expectedType && expectedType !== Token.BOOLEAN) {
        scope.logger.error(
          expr.symbol,
          `Expected '${typeToString(expectedType)}' but got 'boolean' instead.`,
        );
      }

      handleExpression(expr.child, Token.BOOLEAN);
    } else {
      // SUMOP and SUBOP
      if (expectedType && expectedType === Token.BOOLEAN) {
        scope.logger.error(
          expr.symbol,
          `Expected 'boolean' but got 'number' instead.`,
        );
        handleExpression(expr.child, Token.REAL);
      } else {
        handleExpression(expr.child, expectedType || Token.REAL);
      }
    }
  } else if (expr instanceof BinaryAstNode) {
    if (isRelation(expr.symbol) || isLogical(expr.symbol)) {
      if (expectedType && expectedType !== Token.BOOLEAN) {
        scope.logger.error(
          expr.symbol,
          `Expected '${typeToString(expectedType)}' but got 'boolean' instead.`,
        );
      }

      if (isLogical(expr.symbol)) {
        expectedType = Token.BOOLEAN;
      } else {
        expectedType = undefined;
      }

      handleExpression(expr.left, expectedType);
      handleExpression(expr.right, expectedType);
    } else {
      // all math operations
      // TODO: handle division by 0?

      if (expectedType && expectedType === Token.BOOLEAN) {
        scope.logger.error(
          expr.symbol,
          `Expected 'boolean' but got 'number' instead.`,
        );
        expectedType = Token.REAL;
      }

      handleExpression(expr.left, expectedType || Token.REAL);
      handleExpression(expr.right, expectedType || Token.REAL);
    }
  }
}

/**
 * @param {Token} expectedType
 * @param {Symbol} symbol
 */
function compareTypes(expectedType, symbol) {
  if (symbol.type === expectedType) {
    return;
  }

  switch (expectedType) {
    case Token.BOOLEAN:
      if (symbol.type === Token.TRUE) break;
      if (symbol.type === Token.FALSE) break;

      scope.logger.error(
        symbol,
        `Expected boolean, got ${typeToString(symbol.type)}`,
      );
      break;
    case Token.INT:
      if (symbol.type === Token.INTCONST) break;

      scope.logger.error(
        symbol,
        `Expected integer, got ${typeToString(symbol.type)}`,
      );
      break;
    case Token.REAL:
      if (symbol.type === Token.REALCONST) break;

      // both are promoted to real
      if (symbol.type === Token.INTCONST) break;
      if (symbol.type === Token.INT) break;

      scope.logger.error(
        symbol,
        `Expected real, got ${typeToString(symbol.type)}`,
      );
      break;
    default:
      break;
  }
}

/**
 * Only use with REAL, REALCONST, INT, INTCONST, TRUE, FALSE and BOOLEAN
 * @param {Token} token
 * @returns {String}
 */
function typeToString(token) {
  switch (token) {
    case Token.REAL:
    case Token.REALCONST:
      return "real";
    case Token.INT:
    case Token.INTCONST:
      return "integer";
    case Token.TRUE:
    case Token.FALSE:
    case Token.BOOLEAN:
      return "boolean";
    default:
      break;
  }

  return "";
}

/**
 * @param {Symbol} symbol
 * @returns {Boolean}
 */
function isRelation(symbol) {
  return (
    symbol.type === Token.GREATER ||
    symbol.type === Token.GREATEREQ ||
    symbol.type === Token.LESS ||
    symbol.type === Token.LESSEQ ||
    symbol.type === Token.EQUALS ||
    symbol.type === Token.NOTEQUALS
  );
}

/**
 * @param {Symbol} symbol
 * @returns {Boolean}
 */
function isLogical(symbol) {
  return symbol.type === Token.OR || symbol.type === Token.AND;
}

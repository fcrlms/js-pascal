const {
    AssignAstNode, IfAstNode, UnaryAstNode, WhileAstNode,
    ForAstNode, ProgramAstNode, VarDeclAstNode, CmdBlockAstNode,
    ProcCallAstNode, BinaryAstNode, NumAstNode
} = require("./ast");
const { Token, Symbol } = require("./utils");

class Scopes {
    constructor() {
        this.globalScope = new Map();
        /** @private @type {Array<Map>} */
        this.stack = []
    }

    /**
     * @param {String} key
     * @returns {Boolean}
     */
    has(key) {
        for (let i = this.stack.length -1; i >= 0; i--) {
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
            const index = this.stack.length -1;
            return this.stack[index].has(key);
        }

        // else use the global scope
        return this.globalScope.has(key);
    }

    /**
     * @param {String} key
     * @returns {ScopeEntry}
     */
    get (key) {
        for (let i = this.stack.length -1; i >= 0; i--) {
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
            const index = this.stack.length -1;
            const scope = this.stack[index];

            scope.set(key, value);
        } else {
            this.globalScope.set(key, value);
        }
    }

    addNewScope() {
        this.stack.push(new Map())
    }

    removeScope() {
        this.stack.splice(this.stack.length - 1, 1);
    }
}

/**
 * TODO: track variables use and initialization for better errors
 */
class ScopeEntry {
    /**
     * @param {Token} type
     * @param {Array<>} args
     */
    constructor(type, args = undefined) {
        this.type = type;
        this.args = args;
    }

    /**
     * returns true if `token` matches this type
     * @param {Token} token
     * @returns {Boolean}
     */
    isOfType(token) {
        return this.type === token;
    }

    /**
     * returns true if the symbols have the same type
     * @param {ScopeEntry} entry1
     * @param {ScopeEntry} entry2
     * @returns {Boolean}
     */
    static haveSameType(entry1, entry2) {
        return entry1.type === entry2.type;
    }
}

const scope = new Scopes();

/**
 * @param {ProgramAstNode} ast
 */
module.exports = semantic = (ast) => {
    scope.set(ast.id.lexeme, new ScopeEntry(Token.PROGRAM));

    if (ast.vardecl) {
        handleVariableDeclarations(ast.vardecl);
    }

    if (ast.subprogram) {
        for (let procedure of ast.subprogram) {
            handleProcedure(procedure);
        }
    }

    handleCommandBlock(ast.body);
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
            if (entry.type === Token.PROCEDURE) {
                console.error(`Cannot assign to procedure.`);
            } else if (entry.type === Token.PROGRAM) {
                console.error(`Cannot assign to program.`);
            } else {
                vartype = entry.type; // only expect type on a valid assignment
            }
        } else {
            console.error(`${command.id.lexeme} was not declared`);
        }

        // TODO: better warning for assignment type mismatch
        handleExpression(command.expr, vartype);
    } else if (command instanceof IfAstNode) {
        if (command.expr instanceof BinaryAstNode) {

            if (!isRelation(command.expr.symbol)) {
                console.error("not relational expression");
            }

        } else {

            if (command.expr instanceof UnaryAstNode) {
                //NOT TODO
                if (!isRelation(command.expr.symbol)) {
                    console.error("not relational expression");
                }

            } else {
                console.error("reclamar");//caso n precise do proc
            }
        }
    } else if (command instanceof WhileAstNode) {
        //igual ao if? fazer funcao?
    } else if (command instanceof ForAstNode) {
        // num sei
    } else if (command instanceof ProcCallAstNode) {
        const entry = scope.get(command.symbol.lexeme);

        if (!entry) {
            console.error(`'${command.symbol.lexeme}' is not declared.`);
            return;
        }

        if (!entry.isOfType(Token.PROCEDURE)) { // is variable
            console.error(`'${command.symbol.lexeme}' is not a procedure.`);
            return;
        }

        handleProcedureCall(command);
    }
}

// TODO: create new enum for variable types, less headache

/**
 * @param {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} expr
 * @param {Token} expectedType
 */
function handleExpression (expr, expectedType = undefined) {
    if (expr instanceof ProcCallAstNode) {
        const entry = scope.get(expr.symbol.lexeme);
        if (!entry) {
            console.error(`Variable ${expr.symbol.lexeme} never declared.`);
            return;
        }

        if (entry.isOfType(Token.PROCEDURE)) {
            console.error(`Procedures do not have return value.`);
            handleProcedureCall(expr);
            return;
        }

        if (expr.args) {
            console.error(`Variable ${expr.symbol.lexeme} is not a procedure.`);
            return;
        }

        compareTypes(expectedType, entry);
    }
    else if (expr instanceof NumAstNode) {
        compareTypes(expectedType, expr.symbol);
    }
    else if (expr instanceof UnaryAstNode) {
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
        }
    }
    else if (expr instanceof BinaryAstNode) {
        // TODO
    }
}

/**
 * @param {Token} expectedType
 * @param {(Symbol | ScopeEntry)} entry
 */
function compareTypes(expectedType, entry) {
    if (entry.type === expectedType) {
        return;
    }

    switch (expectedType) {
    case Token.BOOLEAN:
        if (entry.type === Token.TRUE) break;
        if (entry.type === Token.FALSE) break;

        console.error(`Expected boolean, got ${typeToString(entry.type)}`)
        break;
    case Token.INT:
        if (entry.type === Token.INTCONST) break;

        console.error(`Expected integer, got ${typeToString(entry.type)}`)
        break;
    case Token.REAL:
        if (entry.type === Token.REALCONST) break;

        // both are promoted to real
        if (entry.type === Token.INTCONST) break;
        if (entry.type === Token.INT) break;

        console.error(`Expected real, got ${typeToString(entry.type)}`)
        break;
    default:
        break;
    }
}

/**
 * Only use with REAL, REALCONST, INT, INTCONST, TRUE and FALSE
 * @param {Token} token
 * @returns {String}
 */
function typeToString(token) {
    switch(token) {
    case Token.REAL:
    case Token.REALCONST:
        return "real";
    case Token.INT:
    case Token.INTCONST:
        return "integer";
    case Token.TRUE:
    case Token.FALSE:
        return "boolean";
    default:
        break;
    }

    return "";
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
        console.error(`Received too little arguments (${actualArgSize}), expected ${expectedArgSize}`);
    } else if (actualArgSize > expectedArgSize) {
        console.error(`Received too much arguments (${actualArgSize}), expected ${expectedArgSize}`);
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
 * @param {VarDeclAstNode} vardecl
 */
function handleVariableDeclarations(vardecl) {
    const declarations = vardecl.declarations

    for (let declaration of declarations) {
        const vartype = declaration.type.type;

        for (let id of declaration.ids) {
            if (scope.hasCurr(id.lexeme)) {
                console.error(`Variable '${id.lexeme}' already declared`);
                continue;
            }

            scope.set(id.lexeme, new ScopeEntry(vartype));
        }
    }
}

/**
 * @param {ProgramAstNode} procedure
 */
function handleProcedure(procedure) {
    const lexeme = procedure.id.lexeme;
    if (scope.hasCurr(lexeme)) {
        console.error(`name '${lexeme} already in use.'`)
    } else {
        scope.set(lexeme, new ScopeEntry(Token.PROCEDURE, procedure.args))
    }

    scope.addNewScope();

    // handle here

    scope.removeScope();
}

/**
 * @param {Symbol} symbol
 * @returns {Boolean}
 */
function isRelation(symbol) {
    return symbol.type === Token.GREATER
        || symbol.type === Token.GREATEREQ
        || symbol.type === Token.LESS
        || symbol.type === Token.LESSEQ
        || symbol.type === Token.EQUALS
        || symbol.type === Token.NOTEQUALS
};

/**
 * @param {Symbol} symbol
 * @returns {Boolean}
 */
function isLogical(symbol) {
    return symbol.type === Token.OR || symbol.type === Token.AND;
}

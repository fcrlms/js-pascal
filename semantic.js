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
    scope.set(ast.id.lexeme, new ScopeEntry(ast.id.type));

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
        const vartype = scope.get(command.id.lexeme);

        if (!vartype) {
            console.log(`${command.id.lexeme} wasn't declared`);
        }

        //handle expression and warn on type mismatch
    } else if (command instanceof IfAstNode) {
        if (command.expr instanceof BinaryAstNode) {

            if (!isRelation(command.expr.symbol)) {
                console.log("not relational expression");
            }

        } else {

            if (command.expr instanceof UnaryAstNode) {
                //NOT TODO
                if (!isRelation(command.expr.symbol)) {
                    console.log("not relational expression");
                }

            } else {
                console.log("reclamar");//caso n precise do proc
            }
        }
    } else if (command instanceof WhileAstNode) {
        //igual ao if? fazer funcao?
    } else if (command instanceof ForAstNode) {
        // num sei
    } else if (command instanceof ProcCallAstNode) {
        const procinfo = scopes.get(command.symbol.lexeme);

        if (!procinfo) {
            console.error(`${procinfo} is not declared.`);
            return;
        }

        if (procinfo === Token.ID) { // is variable
            console.error(`${procinfo} is not a procedure.`);
            return;
        }

        // TODO: check if procedure is called correctly
        // do after implementing procedures on scope
        handleProcedureCall(command);
    }
}

// TODO: create new enum for variable types, less headache

/**
 * @param {(BinaryAstNode | UnaryAstNode | ProcCallAstNode | NumAstNode)} expr
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
             * expression and recurse, if an empty node is found report error
             * because the expression has no value
             */
            while (expr && expr.symbol.type === Token.LPAREN) {
                expr = expr.child;
            }

            if (expr) {
                handleExpression(expr, expectedType);
            } else {
                console.error("Expression doesn't return value.");
            }
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
    case Token.BOOLEAN: {
        console.error(`Expected boolean, got ${entry.type}`)
        break;
    }
    case Token.INT: {
        console.error(`Expected integer, got ${entry.type}`)
        break;
    }
    case Token.REAL: {
        console.error(`Expected real, got ${entry.type}`)
        break;
    }
    default: {}
    }
}

/**
 * @param {ProcCallAstNode} procCall
 */
function handleProcedureCall(procCall) {
    const entry = scope.get(expr.symbol.lexeme);
    const expectedArgSize = entry.args.length;
    const actualArgSize = procCall.args.length;

    if (actualArgSize < expectedArgSize) {
        console.error(`Too little arguments received, expected ${expectedArgSize}`);
    } else if (actualArgSize > expectedArgSize) {
        console.error(`Too much arguments received, expected ${actualArgSize}`);
    }

    const min = min(expectedArgSize, actualArgSize);

    // handle actual args here until we reach the desired amount
    // or until the args provided end
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
        const vartype = declaration.type;

        for (let id of declaration.ids) {
            if (scope.hasCurr(id.lexeme)) {
                console.error("Another variable already declared with this ID:", id.lexeme);
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

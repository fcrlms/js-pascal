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
 * TODO: return info about what scope the variable is
 */
class ScopeEntry {
    /**
     * @param {Token} type
     * @param {Array<Token>} args
     */
    constructor(type, args = undefined) {
        this.type = type;
        this.args = args;

        this.wasInitialized; // TODO: do only when in the same scope
        this.wasUsed; // TODO: check when closing scope
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
    const entry = new ScopeEntry(Token.PROGRAM);
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

            if (scope.hasCurr(command.id.lexeme)) {
                entry.wasInitialized = true;
                scope.set(command.id.lexeme, entry);
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

        if (scope.hasCurr(expr.symbol.lexeme)) {
            entry.wasUsed = true;
            scope.set(expr.symbol.lexeme, entry);

            if (!entry.wasInitialized) {
                console.error(`Variable ${expr.symbol.lexeme} was not initialized.`);
            }
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
        } else if (expr.symbol.type === Token.NOT) {
            if (expectedType && expectedType !== Token.BOOLEAN) {
                console.error(`Expected '${typeToString(expectedType)}' but got 'boolean' instead.`);
            }

            handleExpression(expr.child, Token.BOOLEAN);
        } else { // SUMOP and SUBOP
            if (expectedType && expectedType === Token.BOOLEAN) {
                console.error(`Expected 'boolean' but got 'number' instead.`);
                handleExpression(expr.child, Token.REAL);
            } else {
                handleExpression(expr.child, expectedType || Token.REAL);
            }
        }
    }
    else if (expr instanceof BinaryAstNode) {
        if (isRelation(expr.symbol) || isLogical(expr.symbol)) {
            if (expectedType && expectedType !== Token.BOOLEAN) {
                console.error(`Expected '${typeToString(expectedType)}' but got 'boolean' instead.`);
            }

            if (isLogical(expr.symbol)) {
                expectedType = Token.BOOLEAN;
            } else {
                expectedType = undefined;
            }

            handleExpression(expr.left, expectedType);
            handleExpression(expr.right, expectedType);
        } else { // all math operations
            // TODO: handle division by 0?

            if (expectedType && expectedType === Token.BOOLEAN) {
                console.error(`Expected 'boolean' but got 'number' instead.`);
                expectedType = Token.REAL;
            }

            handleExpression(expr.left, expectedType || Token.REAL);
            handleExpression(expr.right, expectedType || Token.REAL);
        }
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
 * Only use with REAL, REALCONST, INT, INTCONST, TRUE, FALSE and BOOLEAN
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
    case Token.BOOLEAN:
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
        let args = [];

        if (procedure.args) {
            for (let decl of procedure.args.declarations) {
                const decltype = decl.type;

                for (let i = 0; i < decl.ids.length; ++i) {
                    args.push(decltype.type);
                }
            }
        }

        const entry = new ScopeEntry(Token.PROCEDURE, args);
        entry.wasInitialized = true;
        scope.set(lexeme, entry)
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

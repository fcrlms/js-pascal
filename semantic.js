const { AssignAstNode, IfAstNode, UnaryAstNode, WhileAstNode, ForAstNode, ProgramAstNode } = require("./ast");
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
     */
    hasCurr(key) {
        // get closest scope on the stack
        if (this.stack.length) {
            const index = this.stack.length -1;
            return this.stack[index];
        }

        // else use the global scope
        return this.globalScope.has(key);
    }

    /**
     * @param {String} key
     * @returns {*}
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
     * @param {*} value
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

const scope = new Scopes();

/**
 * @param {ProgramAstNode} ast
 */
module.exports = semantic = (ast) => {
    scope.set(ast.id.lexeme, ast.id);

    if (ast.vardecl) {
        const declarations = ast.vardecl.declarations

        for (let declaration of declarations) {
            const vartype = declaration.type;

            for (let id of declaration.ids) {
                if (scope.has(id.lexeme)) {
                    console.log("Another variable already declared with this ID:", id.lexeme)
                    continue;
                }

                scope.set(id.lexeme, vartype);
            }
        }
    }

    //if (ast.subprogram) {
    //  recursao
    //}
    // for qtdArgs scope.set(args)

    if (ast.body) {

        for (let command of ast.body.commands) {

            if (command instanceof AssignAstNode) {

                const vartype = scope.get(command.id.lexeme);

                if (vartype) {

                    if (command.symbol.type = Token.BOOLEAN) {
                        //binary de relação ou unario NOT
                        //caso ID ser TRUE ou FALSE
                        //xingar se nao for algo acima
                    }

                    if (command.symbol.type = Token.VAR){
                        //xingar se receber algo n var
                    }

                    if (command.symbol.type = Token.INT) {
                        //verificar int e real se os tipos tao certos pela tabelinha
                    }

                    if (command.symbol.type = Token.REAL) {
                        //mesmo do int
                    }


                } else {
                    console.log (command.id.lexeme, " wasn't declared");
                }
                //handle expression
            }

            if (command instanceof IfAstNode) {

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
            }

            if (command instanceof WhileAstNode) {

                //igual ao if? fazer funcao?

            }

            if (command instanceof ForAstNode) {

                // num sei

            }
        }
    }

};

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

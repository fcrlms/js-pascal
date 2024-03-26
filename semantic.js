const { AssignAstNode, IfAstNode, UnaryAstNode, WhileAstNode, ForAstNode } = require("./ast");
const { Token } = require("./utils");

// Manel fazer coisas aqui

class Scopes {
    constructor() {
        this.globalScope = new Map();
        this.stack = [
            new Map()
        ]
    }

    has(key) {
        for (let scope of this.stack) { // FINGE QUE É DESEMPILHAR STACK
            if (scope.has(key)) return true;
        }

        return this.globalScope.has(key);
    }

    get (key) {
        for (let scope of this.stack) {
            if (scope.has(key)) {
                return scope.get(key);
            }
        }

        return this.globalScope.get(key);
    }

    set(key, value) {
        if (this.stack.length) {
            const scope = this.stack.pop();

            scope.set(key, value);
        } else {
            this.globalScope.set(key, value);
        }
    }

    addNewScope() {
        this.stack.append(new Map())
    }

    removeScope() {
        this.stack.pop()
    }
}

const globalScope = new Map();

module.exports = semantic = (ast) => {

    globalScope.set(ast.id.lexeme, ast.id);

    if (ast.vardecl) {
        const declarations = ast.vardecl.declarations

        for (let declaration of declarations) {
            const vartype = declaration.type;

            for (let id of declaration.ids) {
                if (globalScope.has(id.lexeme)) {
                    console.log("Another variable already declared with this ID:", id.lexeme)
                    continue;
                }

                globalScope.set(id.lexeme, vartype);
            }
        }
    }

    //if (ast.subprogram) {
    //  recursao
    //}
    // for qtdArgs globalScope.set(args)

    if (ast.body) {

        for (let command of ast.body.commands) {

            if (command instanceof AssignAstNode) {

                const vartype = globalScope.get(command.id.lexeme);

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

function isRelation(symbol) { //LEMBRAR DE VER OR E AND
    return symbol.type === Token.GREATER || 
    symbol.type === Token.GREATEREQ || 
    symbol.type === Token.LESS || 
    symbol.type === Token.LESSEQ || 
    symbol.type === Token.EQUALS || 
    symbol.type === Token.NOTEQUALS
};
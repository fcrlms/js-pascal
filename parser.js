const { Token } = require("./utils.js");
const {
    BinaryAstNode,
    UnaryAstNode,
    NumAstNode,
    ProcCallAstNode,
    AssignAstNode,
    WhileAstNode,
    IfAstNode,
    CmdBlockAstNode,
    DeclAstNode,
    VarDeclAstNode,
    ProgramAstNode,
    ForAstNode,
} = require("./ast.js");

class Parser {
    constructor (symbols, filepath) {
        this.symbols = symbols;
        this.pos = 0;

        this.filepath = filepath;

        this.hadError = false;
        this.panicMode = false;
    }

    /** @returns {Boolean} */
    reachedEnd() {
        return this.pos >= this.symbols.length;
    }

     /**
      * @param {Symbol} tokens
      * @returns {Boolean}
      */
    match(...tokens) {
        if (this.reachedEnd()) return false;

        const symbol = this.peek();
        const res = tokens.some(t => t === symbol.type);

        if (res) {
            this.advance();
        }

        return res;
    }

    /**
     * @param {Symbol} tokens
     * @returns {Boolean}
     */
    check(...tokens) {
        const symbol = this.peek();
        if (!symbol) return false;

        return tokens.some(t => t === symbol.type);
    }

    /**
     * @param {Symbol} token
     * @param {String} msg
     * @returns {Symbol}
     * @throws {Error}
     */
    consume(token, msg) {
        if (this.check(token)) {
            return this.advance();
        }

        this.error(this.peek(), msg);
    }

    /**
     * @returns {Symbol}
     */
    peek() {
        return this.symbols[this.pos];
    }

    /**
     * @returns {Symbol}
     */
    advance() {
        if (!this.reachedEnd())
            this.pos++;
        return this.previous();
    }

    /**
     * @returns {Symbol}
     */
    previous() {
        return this.symbols[this.pos - 1];
    }

    /**
     * @param {Symbol} symbol
     * @param {String} msg
     * @throws {Error}
     */
    error(symbol, msg) {
        this.hadError = true;
        this.panicMode = true;
        const prefix = `${this.filepath}:${symbol.pos.line}:${symbol.pos.col}: `;
        throw new Error(prefix + msg);
    }

    /**
     * @param {Symbol} symbol
     * @param {String} msg
     */
    warn(symbol, msg) {
        this.hadError = true;
        const prefix = `${this.filepath}:${symbol.pos.line}:${symbol.pos.col}: `;
        console.error(prefix + msg);
    }
}

let parser = new Parser();

module.exports = parse = (symbols, filepath) => {
    parser = new Parser(symbols, filepath);

    let ast;
    try {
        ast = program();
    } catch (e) {
        console.error(e.message);
    }

    if (parser.hadError) {
        // stop
    }

    return ast;
};

function program() {
    let symbol;
    try {
        symbol = parser.consume(Token.PROGRAM, "First word should be 'program'.");
    } catch (e) {
        console.error(e.message);
    }

    let id;
    try {
        if (!parser.panicMode)
            id = parser.consume(Token.ID, "Expected program identifier.");
    } catch (e) {
        console.error(e.message);
    }

    if (!parser.panicMode) {
        try {
            parser.consume(Token.SEMICOLON, "Expected ';' after program declaration.");
        } catch (e) {
            console.error(e.message);
        }
    }

    if (parser.panicMode) {
        parser.panicMode = false;

        while (!parser.check(Token.VAR, Token.PROCEDURE, Token.BEGIN)) {
            parser.advance();
        }
    }

    let var_node;
    if (parser.match(Token.VAR)) {
        try {
            var_node = var_decl();
        } catch (e) {
            console.error(e.message);
        }
    }

    if (parser.panicMode) {
        parser.panicMode = false;
        while (!parser.check(Token.PROCEDURE, Token.BEGIN)) {
            parser.advance();
        }
    }

    let subprograms;
    if (parser.check(Token.PROCEDURE)) {
        subprograms = mult_subprograms();
    }

    parser.consume(Token.BEGIN, "Expected 'begin'.");
    const body = composite_command();
    parser.consume(Token.DOT, "Expected '.' after program block.");

    const args = null;
    return new ProgramAstNode(symbol, id, args, var_node, subprograms, body);
}

function var_decl() {
    const symbol = parser.previous();

    if (parser.peek().type !== Token.ID) {
        parser.error(parser.peek(), `Expected identifier, got '${parser.peek().lexeme}'`);
    }

    const declarations = [];
    while (parser.match(Token.ID)) {
        const id_list = [parser.previous()];
        while (parser.match(Token.COMMA)) {
            if (parser.check(Token.ID)) {
                id_list.push(parser.advance());
                continue;
            }

            parser.error(parser.peek(), `Expected identifier, got '${parser.peek().lexeme}'`);
        }

        parser.consume(Token.COLON, "Expected ':' after identifier list.");

        if (!parser.match(Token.INT, Token.REAL, Token.BOOLEAN)) {
            parser.error(parser.peek(), `Expected type, got '${parser.peek().lexeme}'`);
        }

        const type = parser.previous();

        parser.consume(Token.SEMICOLON, "Expected ';' after variable declaration");

        declarations.push(new DeclAstNode(type, id_list));
    }

    return new VarDeclAstNode(symbol, declarations);
}

function mult_subprograms() {
    const procedures = [];
    while (parser.match(Token.PROCEDURE)) {
        const symbol = parser.previous();

        let id;
        try {
            if (!parser.panicMode)
                id = parser.consume(Token.ID, "Expected procedure identifier.");
        } catch (e) {
            console.error(e.message);
        }

        if (parser.panicMode) {
            if (parser.check(Token.LPAREN, Token.SEMICOLON)) {
                parser.panicMode = false;
            }
        }

        let args;
        if (!parser.panicMode) {
            if (parser.match(Token.LPAREN)) {
                try { args = arglist(); }
                catch (e) { console.error(e.message); }
            }
        }

        if (!parser.panicMode) {
            try {
                parser.consume(Token.SEMICOLON, "Expected ';' after procedure declaration.");
            } catch (e) {
                console.error(e.message);
            }
        }

        if (parser.panicMode) {
            parser.panicMode = false;

            while (!parser.check(Token.VAR, Token.PROCEDURE, Token.BEGIN)) {
                parser.advance();
            }
        }

        let vardecl;
        if (parser.match(Token.VAR)) {
            try {
                var_node = var_decl();
            } catch (e) {
                console.error(e.message);
            }
        }

        if (parser.panicMode) {
            parser.panicMode = false;
            while (!parser.check(Token.PROCEDURE, Token.BEGIN)) {
                parser.advance();
            }
        }

        let subprograms;
        if (parser.check(Token.PROCEDURE)) {
            mult_subprograms();
        }

        parser.consume(Token.BEGIN, "Expected 'begin'.");
        const body = composite_command();
        procedures.push(
            new ProgramAstNode(symbol, id, args, vardecl, subprograms, body)
        );

        if (!parser.match(Token.SEMICOLON)) {
            parser.warn(parser.peek(), "Expected ';' after procedure end.");
        }
    }

    return procedures;
}

function arglist() {
    const symbol = parser.previous();
    if (parser.match(Token.RPAREN)) {
        parser.warn(parser.previous(),
            "Procedures declared without args don't need '()'.");
        return;
    }

    const declarations = [];
    do {
        const id_list = [];
        do {
            id_list.push(parser.consume(Token.ID, `Expected identifier, got '${parser.peek().lexeme}'`));
        } while(parser.match(Token.COMMA));

        parser.consume(Token.COLON, "Expected ':' after identifier list.");

        if (!parser.match(Token.INT, Token.REAL, Token.BOOLEAN)) {
            parser.error(parser.peek(), `Expected type, got '${parser.peek().lexeme}'`);
        }

        const type = parser.previous();

        declarations.push(new DeclAstNode(type, id_list));
    } while (parser.match(Token.SEMICOLON));

    parser.consume(Token.RPAREN, "Expected ')' after argument list.");
    return new VarDeclAstNode(symbol, declarations);
}

function composite_command() {
    const begin = parser.previous();

    if (parser.match(Token.END)) {
        return new CmdBlockAstNode(begin, []);
    }

    const commands = [];
    do {
        if (parser.peek().type === Token.END) {
            parser.warn(parser.previous(), "Remove the ';'.");
            break;
        }

        try {
            const cmd = command();
            commands.push(cmd);
        } catch (e) {
            console.error(e.message);
        }

        if (parser.panicMode) {
            parser.panicMode = false;

            while (!parser.check(Token.SEMICOLON, Token.END, Token.EOF)) {
                parser.advance();
            }

            if (parser.check(Token.END, Token.EOF))
                break;

            // if is SEMICOLON, sync successful
        }
    } while (parser.match(Token.SEMICOLON));

    parser.consume(Token.END, "Expected 'end' after command list");

    return new CmdBlockAstNode(begin, commands);
}

function command() {
    if (parser.match(Token.ID)) {
        const id = parser.previous();

        if (parser.match(Token.ASSIGN)) {
            return new AssignAstNode(parser.previous(), id, expr());
        }

        let exprs = [];
        if (parser.match(Token.LPAREN)) {
            if (parser.check(Token.RPAREN)) {
                parser.warn(parser.previous(), "Procedure calls without args are made without '()'");
            } else {
                exprs = expr_list();
            }

            parser.consume(Token.RPAREN, `Expected ')' after expression list.`);
        }

        return new ProcCallAstNode(id, exprs);
    }

    if (parser.match(Token.BEGIN)) {
        return composite_command();
    }

    if (parser.match(Token.IF)) {
        const symbol = parser.previous();
        const expression = expr();
        parser.consume(Token.THEN, "Expected 'then' after if condition.");
        const body = command();

        let elseBranch = null;
        if (parser.match(Token.ELSE)) { // always matches the closest if
            elseBranch = command();
        }

        return new IfAstNode(symbol, expression, body, elseBranch);
    }

    if (parser.match(Token.WHILE)) {
        const symbol = parser.previous();
        const expression = expr();
        parser.consume(Token.DO, "Expected 'do' after while condition.");
        const body = command();
        return new WhileAstNode(symbol, expression, body);
    }

    if (parser.match(Token.FOR)) {
        const symbol = parser.previous();

        parser.consume(Token.ID, "Expected identifier after 'for'.");

        const id = parser.previous();

        parser.consume(Token.ASSIGN, "Expected assign operator after identifier.");

        const assignop = parser.previous();
        const assignexpr = expr();
        const assignment = new AssignAstNode(assignop, id, assignexpr);

        if (!parser.match(Token.TO, Token.DOWNTO)) {
            parser.error(parser.peek(), "Expected either 'to' or 'downto' after assignment.");
        }

        const target = expr();

        parser.consume(Token.DO, "Expected 'do' after 'for' target expression.");

        const body = command();

        return new ForAstNode(symbol, assignment, target, body);
    }

    parser.advance();
    parser.error(parser.previous(),
        `Expected command. Got '${parser.previous().lexeme}' instead.`);
}

function expr_list() {
    const list = [];

    list.push(expr());

    while (parser.match(Token.COMMA)) {
        list.push(expr());
    }

    return list;
}

function expr() {
    let node = simple_expr();

    if (parser.match(
            Token.LESS, Token.LESSEQ, Token.GREATER, Token.GREATEREQ,
            Token.EQUALS, Token.NOTEQUALS)
    ) {
        const symbol = parser.previous();
        const right = simple_expr();
        return new BinaryAstNode(symbol, node, right);
    }

    return node;
}

function simple_expr() {
    let node;

    if (parser.match(Token.SUMOP, Token.SUBOP)) {
        const op_symbol = parser.previous();
        const child = term();
        node = new UnaryAstNode(op_symbol, child);
    } else {
        node = term();
    }

    while (parser.match(Token.SUMOP, Token.SUBOP, Token.OR)) {
        const curr_op_symbol = parser.previous();
        const right = term();
        node = new BinaryAstNode(curr_op_symbol, node, right);
    }

    return node;
}

function term() {
    let node = factor();

    while (parser.match(Token.MULTOP, Token.DIVOP, Token.AND)) {
        const op_symbol = parser.previous();
        const right = factor();
        node = new BinaryAstNode(op_symbol, node, right);
    }

    return node;
}

function factor() {
    const symbol = parser.advance();

    let node = null;
    switch (symbol.type) {
    case Token.REALCONST:
    case Token.INTCONST:
        node = new NumAstNode(symbol, Number(symbol.lexeme));
        break;
    case Token.TRUE:
    case Token.FALSE:
        node = new NumAstNode(symbol, ~~(symbol.type === Token.TRUE));
        break;
    case Token.NOT:
        node = factor();
        node = new UnaryAstNode(symbol, node);
        break;
    case Token.LPAREN:
        node = expr();
        parser.consume(Token.RPAREN, `Expected ')'.`);
        node = new UnaryAstNode(symbol, node);
        break;
    case Token.ID: {
        let exprs = null;
        if (parser.match(Token.LPAREN)) {
            exprs = [];
            if (parser.check(Token.RPAREN)) {
                parser.warn(parser.previous(), "Procedure calls without args are made without '()'");
            } else {
                exprs = expr_list();
            }

            parser.consume(Token.RPAREN, `Expected ')' after expression list.`);
        }

        // if it's only a variable, `exprs` will be null
        node = new ProcCallAstNode(symbol, exprs);
        break;
    }
    default:
        parser.error(parser.previous(), `Expected factor, got '${symbol.lexeme}'.`);
    }

    return node;
}

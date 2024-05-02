const fs = require("fs");
const { Token, Position, Symbol, keywordMap } = require("./utils.js");

class CharStream {
    constructor(content) {
        this.content = content;
        this.size = this.content.length;
        this.pos = 0;
    }

    next() {
        this.pos++;
    }

    curr() {
        if (this.pos == this.size) return '\0';

        return this.content[this.pos];
    }

    peek() {
        if (this.pos == this.size || this.pos == this.size - 1) return '\0';

        return this.content[this.pos + 1];
    }

    is_finished() {
        return this.size == this.pos;
    }
}

const is_blank = c => c === ' ' || c === '\t' || c === '\v' || c === '\f' || c === '\r';
const is_digit = c => c >= '0' && c <= '9';
const is_alpha = c => (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
const is_alphanum_ = c => is_alpha(c) || is_digit(c) || c === '_';

module.exports = lexer = (filepath) => {
    const content = fs.readFileSync(filepath).toString().split("");

    const pos = new Position(1,1);

    let lexeme = "";
    const symbol_arr = []

    const charstream = new CharStream(content);

    while (!charstream.is_finished()) {
        const start_pos = new Position(pos.line, pos.col);
        const c = charstream.curr();

        if (c === '\n') {
            pos.line++;
            pos.col = 1;
            charstream.next();
            continue;
        }

        if (is_blank(c)) {
            pos.col++;
            charstream.next();
            continue;
        }

        // handle comment
        // TODO: create comment node and store whole comment
        if (c === '{') {
            do {
                pos.col++;
                charstream.next();

                if (charstream.curr() == '\n') {
                    pos.line += 1;
                    pos.col = 0; // next iter increments
                }
            } while (charstream.curr() !== '}' && !charstream.is_finished());

            if (charstream.is_finished()) {
                console.error(`${filepath}:${start_pos.line}:${start_pos.col}: this comment wasn't closed.`);
                break;
            } else {
                pos.col++;
                charstream.next();
            }

            continue;
        }

        if (c === '}') {
            console.error(
                `${filepath}:${start_pos.line}:${start_pos.col}: ` +
                `there is no corresponding '{'.`
            );
            pos.col++;
            charstream.next();
            continue;
        }

        if (is_alpha(c)) {
            while (is_alphanum_(charstream.curr())) {
                lexeme += charstream.curr();
                pos.col++;
                charstream.next();
            }

            let type = Token.ID;
            if (keywordMap.has(lexeme)) {
                type = keywordMap.get(lexeme);
            }

            const symbol = new Symbol(type, lexeme, start_pos);
            symbol_arr.push(symbol);
            lexeme = "";
            continue;
        }

        if (is_digit(c)) {
            let is_real = false;
            while (is_digit(charstream.curr())) {
                lexeme += charstream.curr();

                if (charstream.peek() === '.' && !is_real) {
                    is_real = true;
                    charstream.next();
                    pos.col++;
                    lexeme += charstream.curr();
                }

                pos.col++;
                charstream.next();
            }

            const symbol = new Symbol(is_real ? Token.REALCONST : Token.INTCONST, lexeme, start_pos);
            symbol_arr.push(symbol);
            lexeme = "";
            continue;
        }

        lexeme += c;

        let symbol;
        switch (c) {
        case '+':
            symbol = new Symbol(Token.SUMOP, lexeme, pos);
            break;
        case '-':
            symbol = new Symbol(Token.SUBOP, lexeme, pos);
            break;
        case '*':
            symbol = new Symbol(Token.MULTOP, lexeme, pos);
            break;
        case '/':
            symbol = new Symbol(Token.DIVOP, lexeme, pos);
            break;
        case '=':
            symbol = new Symbol(Token.EQUALS, lexeme, start_pos);
            break;
        case '<':
            if (charstream.peek() === '=') {
                pos.col++;
                charstream.next()
                lexeme += charstream.curr();
                symbol = new Symbol(Token.LESSEQ, lexeme, start_pos);
            } else if (charstream.peek() === '>') {
                pos.col++;
                charstream.next()
                lexeme += charstream.curr();
                symbol = new Symbol(Token.NOTEQUALS, lexeme, start_pos);
            } else  {
                symbol = new Symbol(Token.LESS, lexeme, start_pos);
            }
            break;
        case '>':
            if (charstream.peek() === '=') {
                pos.col++;
                charstream.next()
                lexeme += charstream.curr();
                symbol = new Symbol(Token.GREATEREQ, lexeme, start_pos);
            } else {
                symbol = new Symbol(Token.GREATER, lexeme, start_pos);
            }
            break;
        case ':':
            if (charstream.peek() === '=') {
                pos.col++;
                charstream.next();
                lexeme += charstream.curr();
                symbol = new Symbol(Token.ASSIGN, lexeme, start_pos);
            } else {
                symbol = new Symbol(Token.COLON, lexeme, start_pos);
            }
            break;
        case ';':
            symbol = new Symbol(Token.SEMICOLON, lexeme, start_pos);
            break;
        case '.':
            symbol = new Symbol(Token.DOT, lexeme, start_pos);
            break;
        case ',':
            symbol = new Symbol(Token.COMMA, lexeme, start_pos);
            break;
        case '(':
            symbol = new Symbol(Token.LPAREN, lexeme, start_pos);
            break;
        case ')':
            symbol = new Symbol(Token.RPAREN, lexeme, start_pos);
            break;
        default:
            console.error(
                `${filepath}:${start_pos.line}:${start_pos.col}: ` +
                `Unrecognized symbol: '${lexeme}'.`
            );
            // symbol = new Symbol(Token.OTHER, lexeme, start_pos);
        }

        if (symbol) symbol_arr.push(symbol);
        pos.col++;
        charstream.next();

        lexeme = "";
    }

    const last_symbol = symbol_arr[symbol_arr.length - 1];
    const EOF_POS = new Position(last_symbol.pos.line, last_symbol.pos.col + last_symbol.lexeme.length);

    // auxiliary symbol to make the parser code less horrible, adjacent to the last symbol;
    symbol_arr.push(new Symbol(Token.EOF, "EOF", EOF_POS));

    return symbol_arr;
}

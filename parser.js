const fs = require("node:fs");
const { Token, Position, Symbol, keywordMap } = require("./utils.js");
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
// eslint-disable-next-line no-unused-vars
const { Formatter } = require("./formatter.js");

class CharBuffer {
  /**
   * @param {String} filepath
   */
  constructor(filepath) {
    this.fd = fs.openSync(filepath);
    /** @type {fs.ReadStream} */
    this.rstream = fs.createReadStream(filepath).setEncoding("utf-8");

    /** @type {Buffer?} */
    this.buffer = Buffer.alloc(8192);
    this.buffer_size = this.read();
    this.string_buf = this.buffer.toString("utf-8", 0, this.buffer_size);
    this.string_offset = 0;

    /* This is intended to be used by the error logger
       when printing the error and the relevant code */
    this.offset = 0;
  }

  read() {
    return fs.readSync(this.fd, this.buffer, 0, 8192, this.offset);
  }

  isFinished() {
    return this.buffer_size === 0;
  }

  next() {
    this.string_offset += 1;
    this.offset += 1;

    if (this.string_offset >= this.string_buf.length) {
      this.buffer_size = this.read();
      this.string_buf = this.buffer.toString("utf-8", 0, this.buffer_size);
      this.string_offset = 0;
    }
  }

  getCurr() {
    if (this.isFinished()) return null;

    // TODO: if a utf8 character begins in this buffer
    // but ends in the next one, this won't work, probably
    // this will never get fixed
    return this.string_buf[this.string_offset];
  }

  peek() {
    if (this.isFinished()) return null;
    // TODO: fix this to peek at the next buffer, will never do this btw
    if (this.string_offset + 1 >= this.string_buf.length) return null;

    return this.string_buf[this.string_offset + 1];
  }

  fetchChar() {
    if (!this.buffer) {
      return null;
    }

    const pos = this.string_offset;

    if (pos >= this.string_buf.length) {
      this.buffer_size = this.read();
      this.string_offset = 0;

      if (!this.buffer_size) return null;
    }

    const char = this.string_buf[pos];
    return char;
  }
}

const is_blank = (c) =>
  c === " " || c === "\t" || c === "\v" || c === "\f" || c === "\r";
const is_digit = (c) => c >= "0" && c <= "9";
const is_alpha = (c) => (c >= "A" && c <= "Z") || (c >= "a" && c <= "z");
const is_alphanum_ = (c) => is_alpha(c) || is_digit(c) || c === "_";

class Lexer {
  /**
   * @param {String} filepath
   */
  constructor(filepath) {
    /** @type {CharBuffer} */
    this.buffer = new CharBuffer(filepath);

    /** @type {Position} starting at line 1 and column 1 */
    this.pos = new Position(1, 1);

    /** @type {Symbol} */
    this.curr_token = this.getToken();
    /** @type {Symbol?} */
    this.next_token = this.getToken();
    /** @type {Symbol?} */
    this.prev_token = null;
  }

  /** @private */
  getToken() {
    // skipping chars that don't produce anything
    while (!this.buffer.isFinished()) {
      const curr_char = this.buffer.getCurr();

      // These may loop until a token is produced
      if (curr_char === "\n") {
        this.pos.col = 1;
        this.pos.line += 1;
        this.buffer.next();
        continue;
      } else if (is_blank(curr_char)) {
        this.pos.col += 1;
        this.buffer.next();
        continue;
      } else if (curr_char === "}") {
        // TODO: log error, no matching opening comment
        // also handle when the formatter rewrites
        this.pos.col += 1;
        this.buffer.next();
        continue;
      }
      break;
    }

    // Could have reached EOF by now
    if (this.buffer.isFinished()) {
      return null;
    }

    const start_position = Object.assign({}, this.pos);
    const start_offset = this.buffer.offset;
    const curr_char = this.buffer.getCurr();

    let lexeme = "";
    let token = Token.OTHER;
    let symbol = new Symbol(token, lexeme, start_position, start_offset);

    if (curr_char === "{") {
      do {
        lexeme += this.buffer.getCurr();
        this.buffer.next();
        this.pos.col += 1;

        if (this.buffer.getCurr() === "\n") {
          this.pos.line += 1;
          this.pos.col = 0; // next iter increments
        }
      } while (this.buffer.getCurr() !== "}" && !this.buffer.isFinished());

      if (this.buffer.isFinished()) {
        // TODO: log error, comment never closed
      } else {
        lexeme += this.buffer.getCurr(); // the closing bracket
        this.buffer.next();
        this.pos.col += 1;
      }

      symbol.lexeme = lexeme;
      symbol.type = Token.COMMENT;
      return symbol;
    } else if (is_digit(curr_char)) {
      let is_real = false;
      while (is_digit(this.buffer.getCurr())) {
        lexeme += this.buffer.getCurr();

        if (this.buffer.peek() === "." && !is_real) {
          this.buffer.next();
          this.pos.col += 1;

          lexeme += this.buffer.getCurr();

          is_real = true;
        }

        this.buffer.next();
        this.pos.col += 1;
      }

      const token = is_real ? Token.REALCONST : Token.INTCONST;
      symbol.type = token;
      symbol.lexeme = lexeme;
      return symbol;
    } else if (is_alpha(curr_char)) {
      while (is_alphanum_(this.buffer.getCurr())) {
        lexeme += this.buffer.getCurr();
        this.buffer.next();
        this.pos.col += 1;
      }

      token = Token.ID;
      if (keywordMap.has(lexeme)) {
        token = keywordMap.get(lexeme);
      }

      symbol.type = token;
      symbol.lexeme = lexeme;
      return symbol;
    }

    lexeme = curr_char;

    switch (curr_char) {
      case "+":
        token = Token.SUMOP;
        break;
      case "-":
        token = Token.SUBOP;
        break;
      case "*":
        token = Token.MULTOP;
        break;
      case "/":
        token = Token.DIVOP;
        break;
      case "=":
        token = Token.EQUALS;
        break;
      case "<":
        if (this.buffer.peek() === "=") {
          this.pos.col += 1;
          this.buffer.next();
          lexeme += this.buffer.getCurr();
          token = Token.LESSEQ;
        } else if (this.buffer.peek() === ">") {
          this.pos.col += 1;
          this.buffer.next();
          lexeme += this.buffer.getCurr();
          token = Token.NOTEQUALS;
        } else {
          token = Token.LESS;
        }
        break;
      case ">":
        if (this.buffer.peek() === "=") {
          this.pos.col += 1;
          this.buffer.next();
          lexeme += this.buffer.getCurr();
          token = Token.GREATEREQ;
        } else {
          token = Token.GREATER;
        }
        break;
      case ":":
        if (this.buffer.peek() === "=") {
          this.pos.col += 1;
          this.buffer.next();
          lexeme += this.buffer.getCurr();
          token = Token.ASSIGN;
        } else {
          token = Token.COLON;
        }
        break;
      case ";":
        token = Token.SEMICOLON;
        break;
      case ".":
        token = Token.DOT;
        break;
      case ",":
        token = Token.COMMA;
        break;
      case "(":
        token = Token.LPAREN;
        break;
      case ")":
        token = Token.RPAREN;
        break;
      default:
        // TODO: log error, unrecognized symbol and return the symbol
        token = Token.OTHER; // unnecessary but it's nice to remind yourself
        break;
    }

    // fixes missing type and lexeme
    symbol.lexeme = lexeme;
    symbol.type = token;

    // advance buffer after finishing reading lexeme
    this.buffer.next();
    this.pos.col += 1;

    return symbol;
  }

  getPrevious() {
    return this.prev_token;
  }

  getCurrent() {
    return this.curr_token;
  }

  peek() {
    return this.next_token;
  }

  advance() {
    this.prev_token = this.curr_token;
    this.curr_token = this.next_token;
    this.buffer_pos += 1;
    this.next_token = this.getToken();
  }
}

class Parser {
  /**
   * @param {String} filepath
   * @param {Formatter} formatter
   */
  constructor(filepath, formatter = null) {
    this.pos = 0;

    /** @type {String} */
    this.filepath = filepath;

    /** @type {Boolean} */
    this.hadError = false;
    /** @type {Boolean} */
    this.panicMode = false;

    /** @type {Lexer} */
    this.lexer = new Lexer(filepath);

    /** @type {Formatter?} */
    this.formatter = formatter;
  }

  reachedEnd() {
    return this.lexer.getCurrent() === null;
  }

  /**
   * Advances if any of the input tokens matches the current token
   * @param {Symbol} tokens
   * @returns {Boolean}
   */
  match(...tokens) {
    if (this.reachedEnd()) return false;

    const symbol = this.peek();
    const res = tokens.some((t) => t === symbol.type);

    if (res) {
      this.advance();
    }

    return res;
  }

  /**
   * Returns true if any of the input tokens matches the current token
   * @param {Symbol} tokens
   * @returns {Boolean}
   */
  check(...tokens) {
    const symbol = this.peek();
    if (!symbol) return false;

    return tokens.some((t) => t === symbol.type);
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
    return this.lexer.getCurrent();
  }

  /**
   * Advances parser state to the next symbol read by the lexer
   * if the formatter is given to this parser then all COMMENT
   * tokens will be read by the formatter (for obvious reasons)
   * the actual parser will ignore all these occurrences for
   * convenience
   * @returns {Symbol}
   */
  advance() {
    if (!this.reachedEnd()) this.lexer.advance();

    const previous = this.previous();

    // Skip while we receive comment symbols
    while (this.peek() && this.peek().type === Token.COMMENT) {
      if (this.formatter) this.formatter.addComment(this.peek());

      if (!this.reachedEnd()) this.lexer.advance();
    }

    return previous;
  }

  /**
   * @returns {Symbol}
   */
  previous() {
    return this.lexer.prev_token;
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

/** @type {Parser} */
let parser;

module.exports = (filepath, formatter = null) => {
  parser = new Parser(filepath, formatter);

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
      parser.consume(
        Token.SEMICOLON,
        "Expected ';' after program declaration.",
      );
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
    parser.error(
      parser.peek(),
      `Expected identifier, got '${parser.peek().lexeme}'`,
    );
  }

  const declarations = [];
  while (parser.match(Token.ID)) {
    const id_list = [parser.previous()];
    while (parser.match(Token.COMMA)) {
      if (parser.check(Token.ID)) {
        id_list.push(parser.advance());
        continue;
      }

      parser.error(
        parser.peek(),
        `Expected identifier, got '${parser.peek().lexeme}'`,
      );
    }

    parser.consume(Token.COLON, "Expected ':' after identifier list.");

    if (!parser.match(Token.INT, Token.REAL, Token.BOOLEAN)) {
      parser.error(
        parser.peek(),
        `Expected type, got '${parser.peek().lexeme}'`,
      );
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
        try {
          args = arglist();
        } catch (e) {
          console.error(e.message);
        }
      }
    }

    if (!parser.panicMode) {
      try {
        parser.consume(
          Token.SEMICOLON,
          "Expected ';' after procedure declaration.",
        );
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
        vardecl = var_decl();
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
      new ProgramAstNode(symbol, id, args, vardecl, subprograms, body),
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
    parser.warn(
      parser.previous(),
      "Procedures declared without args don't need '()'.",
    );
    return;
  }

  const declarations = [];
  do {
    const id_list = [];
    do {
      id_list.push(
        parser.consume(
          Token.ID,
          `Expected identifier, got '${parser.peek().lexeme}'`,
        ),
      );
    } while (parser.match(Token.COMMA));

    parser.consume(Token.COLON, "Expected ':' after identifier list.");

    if (!parser.match(Token.INT, Token.REAL, Token.BOOLEAN)) {
      parser.error(
        parser.peek(),
        `Expected type, got '${parser.peek().lexeme}'`,
      );
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

      if (parser.check(Token.END, Token.EOF)) break;

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
        parser.warn(
          parser.previous(),
          "Procedure calls without args are made without '()'",
        );
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
    if (parser.match(Token.ELSE)) {
      // always matches the closest if
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
      parser.error(
        parser.peek(),
        "Expected either 'to' or 'downto' after assignment.",
      );
    }

    const target = expr();

    parser.consume(Token.DO, "Expected 'do' after 'for' target expression.");

    const body = command();

    return new ForAstNode(symbol, assignment, target, body);
  }

  parser.advance();
  parser.error(
    parser.previous(),
    `Expected command. Got '${parser.previous().lexeme}' instead.`,
  );
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

  if (
    parser.match(
      Token.LESS,
      Token.LESSEQ,
      Token.GREATER,
      Token.GREATEREQ,
      Token.EQUALS,
      Token.NOTEQUALS,
    )
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
          parser.warn(
            parser.previous(),
            "Procedure calls without args are made without '()'",
          );
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
      parser.error(
        parser.previous(),
        `Expected factor, got '${symbol.lexeme}'.`,
      );
  }

  return node;
}

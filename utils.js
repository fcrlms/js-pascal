const Token = {
  LPAREN: 0,
  RPAREN: 1,
  DOT: 2,
  SEMICOLON: 3,
  COLON: 4,
  COMMA: 5,

  ASSIGN: 6,

  EQUALS: 7,
  NOTEQUALS: 8,
  LESS: 9,
  LESSEQ: 10,
  GREATER: 11,
  GREATEREQ: 12,

  SUMOP: 13,
  SUBOP: 14,
  DIVOP: 15,
  MULTOP: 16,
  OR: 17,
  AND: 18,

  INTCONST: 19,
  REALCONST: 20,

  PROGRAM: 21,
  VAR: 22,
  INT: 23,
  REAL: 24,
  BOOLEAN: 25,
  PROCEDURE: 26,
  BEGIN: 27,
  END: 28,
  IF: 29,
  THEN: 30,
  ELSE: 31,
  WHILE: 32,
  DO: 33,
  NOT: 34,

  ID: 35,

  WHITESPACE: 36,

  TRUE: 37,
  FALSE: 38,

  OTHER: 39,

  EOF: 40,
  TO: 41,
  DOWNTO: 42,
  FOR: 43,
};

class Position {
  /**
   * @param {Number} line
   * @param {Number} col
   */
  constructor(line, col) {
    /** @public @type {Number} */
    this.col = col;
    /** @public @type {Number} */
    this.line = line;
  }
}

class Symbol {
  /**
   * @param {Token} type
   * @param {String} lexeme
   * @param {Position} pos
   * @param {Number} offset
   */
  constructor(type, lexeme, pos, offset) {
    /** @public @type {Token} */
    this.type = type;
    /** @public @type {String} */
    this.lexeme = lexeme;
    /** @public @type {Position} */
    this.pos = new Position(pos.line, pos.col);
    /** @public @type {Number} */
    this.offset = offset;
  }
}

/**
 * @type {Map<String, Token>}
 */
const keywordMap = new Map();
keywordMap.set("program", Token.PROGRAM);
keywordMap.set("var", Token.VAR);
keywordMap.set("integer", Token.INT);
keywordMap.set("real", Token.REAL);
keywordMap.set("boolean", Token.BOOLEAN);
keywordMap.set("procedure", Token.PROCEDURE);
keywordMap.set("begin", Token.BEGIN);
keywordMap.set("end", Token.END);
keywordMap.set("if", Token.IF);
keywordMap.set("then", Token.THEN);
keywordMap.set("else", Token.ELSE);
keywordMap.set("while", Token.WHILE);
keywordMap.set("do", Token.DO);
keywordMap.set("not", Token.NOT);
keywordMap.set("or", Token.OR);
keywordMap.set("and", Token.AND);
keywordMap.set("true", Token.TRUE);
keywordMap.set("false", Token.FALSE);
keywordMap.set("to", Token.TO);
keywordMap.set("downto", Token.DOWNTO);
keywordMap.set("for", Token.FOR);

module.exports = {
  Token,
  Position,
  Symbol,
  keywordMap,
};

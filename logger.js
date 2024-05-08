class Logger {
  constructor(filepath) {
    this.filepath = filepath;

    // sort later then print
    this.errors = [];
  }

  /**
   * @param {Position} position
   * @returns
   */
  getPrefix(position) {
    return `${this.filepath}:${position.line}:${position.col}: `;
  }

  /**
   * @param {Symbol} symbol
   * @param {String} errorMsg
   */
  error(symbol, errorMsg) {
    this.errors.push({
      pos: symbol.pos,
      msg: this.getPrefix(symbol.pos) + errorMsg,
    });
  }

  sortErrors() {
    this.errors
      .sort((a, b) => {
        return a.pos.col - b.pos.col;
      })
      .sort((a, b) => {
        return a.pos.line - b.pos.line;
      });
  }

  printAll() {
    this.sortErrors();

    for (let err of this.errors) {
      console.error(err.msg);
    }
  }
}

module.exports = {
  Logger,
};

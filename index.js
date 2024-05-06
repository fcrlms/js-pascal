// const lexer = require("./lexer.js");
const parse = require("./parser.js");
const semantic = require("./semantic.js");
// const lint_and_highlight = require("./lint_highlight.js");

// const util = require("util");

function main() {
  const filepath = "./instances/Test4.pas";
  const ast = parse(filepath);
  // const filepath = "./instances/Test5.pas";
  // const tokens = lexer(filepath);
  // const ast = parse(tokens, filepath);
  semantic(ast, filepath);
  // console.log(util.inspect(final_ast, false, null, true));
  // lint_and_highlight(final_ast, filepath);
}
main();

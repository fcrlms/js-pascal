const lexer = require("./lexer.js");
const parse = require("./parser.js");

const util = require('util')

function main() {
    const tokens = lexer("./instances/Test5.pas");
    //console.log(tokens);
    const ast = parse(tokens);
    // console.log(util.inspect(ast, false, null, true))
}
main();

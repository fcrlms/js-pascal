const lexer = require("./lexer.js");
const parse = require("./parser.js");

const util = require('util')

function main() {
    const filepath = "./instances/Test4.pas";
    const tokens = lexer(filepath);
    //console.log(tokens);
    const ast = parse(tokens, filepath);
    // console.log(util.inspect(ast, false, null, true))
}
main();

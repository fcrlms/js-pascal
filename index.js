const lexer = require("./lexer.js");
const parse = require("./parser.js");
const semantic = require("./semantic.js")

const util = require('util');

function main() {
    const filepath = "./instances/teste.pas";
    const tokens = lexer(filepath);
    // TODO: better printer
    //console.log(tokens);
    const ast = parse(tokens, filepath);
    // TODO: better printer
    // console.log(util.inspect(ast, false, null, true))
    const final_ast = semantic(ast, filepath);
}
main();

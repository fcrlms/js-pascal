const fs = require("fs");
const { COLORS, wrap_in_colors } = require("./colors.js");
//const process = require("node:process")

const {
    AssignAstNode, IfAstNode, UnaryAstNode, WhileAstNode,
    ForAstNode, ProgramAstNode, VarDeclAstNode, CmdBlockAstNode,
    ProcCallAstNode, BinaryAstNode, NumAstNode
} = require("./ast");

let curr_indent = 0;
// 4 spaces
let indent = "    ";

/**
 * @param {ProgramAstNode} final_ast
 * @param {String} filepath
 */
module.exports = (final_ast, filepath) => {
    const f_stream = fs.createWriteStream(filepath + ".pas");
    const stdout_stream = process.stdout;

    console.log(final_ast)

    stdout_stream.write(wrap_in_colors(final_ast.symbol.lexeme, COLORS.MAGENTA) + " ");
    stdout_stream.write(wrap_in_colors(final_ast.id.lexeme, COLORS.BLUE) + ";\n");

    f_stream.close();
}

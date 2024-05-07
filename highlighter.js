const fs = require("fs");
const { COLORS, wrap_in_colors } = require("./colors.js");

const {
  AssignAstNode,
  IfAstNode,
  UnaryAstNode,
  WhileAstNode,
  ForAstNode,
  ProgramAstNode,
  VarDeclAstNode,
  CmdBlockAstNode,
  ProcCallAstNode,
  BinaryAstNode,
  NumAstNode,
} = require("./ast.js");

/**
 * @param {ProgramAstNode} final_ast
 * @param {String} filepath
 */
const highlight = (final_ast, filepath) => {
  const f_stream = fs.createWriteStream(filepath + ".pas");
  const stdout_stream = process.stdout;

  console.log(final_ast);

  stdout_stream.write(
    wrap_in_colors(final_ast.symbol.lexeme, COLORS.MAGENTA) + " ",
  );
  stdout_stream.write(wrap_in_colors(final_ast.id.lexeme, COLORS.BLUE) + ";\n");

  f_stream.close();
};

module.exports = {
  highlight,
};

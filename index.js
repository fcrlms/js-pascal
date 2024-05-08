const { Logger } = require("./logger.js");
const parse = require("./parser.js");
const semantic = require("./semantic.js");
const { Formatter, format } = require("./formatter.js");
const { highlight } = require("./highlighter.js");

const printUsage = () => {
  console.log("Usage: node index.js [options] ./path/to/pascal.pas");
  console.log("       node index.js ./path/to/pascal.pas");
  console.log("\nOptions:");
  console.log("--format\t\tFormat and rewrite the source file");
  console.log("--highlight\t\tOutputs highlighted source code on stdout");
};

const main = () => {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    printUsage();
    return;
  }

  let toFormat = false;
  let toHighlight = false;
  let filepath = "";

  for (let i = 0; i < argv.length; ++i) {
    if (!argv[i].startsWith("--")) {
      filepath = argv[i];

      if (i !== argv.length - 1) {
        printUsage();
        return;
      }

      break;
    }

    if (argv[i] === "--format") {
      toFormat = true;
    } else if (argv[i] === "--highlight") {
      toHighlight = true;
    }
  }

  const errorLogger = new Logger(filepath);

  let formatter = null;
  if (toFormat) formatter = new Formatter();

  const ast = parse(filepath, errorLogger, formatter);

  if (toFormat && !toHighlight) {
    format(filepath, ast, formatter);
    return;
  }

  const final_ast = semantic(ast, errorLogger, filepath);

  if (toHighlight) {
    highlight(final_ast, filepath);
  } else {
    errorLogger.printAll();
  }
};

main();

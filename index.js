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

  if (toFormat && toHighlight) {
    console.log("Error: choose only one between format and highlight.");
    return;
  }

  const errorLogger = new Logger(filepath);

  let formatter = null;
  if (toFormat) formatter = new Formatter();

  const { ast, hadError } = parse(filepath, errorLogger, formatter);

  if (toFormat && !toHighlight) {
    if (hadError) {
      errorLogger.printAll();
      console.log(
        "Error: wasn't possible to format the file due to parser error.",
      );
      return;
    }

    format(filepath, ast, formatter);
    return;
  }

  const final_ast = semantic(ast, errorLogger, filepath);

  if (toHighlight) {
    if (hadError) {
      errorLogger.printAll();
      console.log(
        "Error: wasn't possible to highlight the file due to parser error.",
      );
      return;
    }
    highlight(final_ast, filepath);
  } else {
    errorLogger.printAll();
  }
};

main();

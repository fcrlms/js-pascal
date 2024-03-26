class BinaryAstNode {
    constructor(symbol, left, right) {
        this.symbol = symbol;
        this.left = left;
        this.right = right;
    }
}

class UnaryAstNode {
    constructor(symbol, child) {
        this.symbol = symbol;
        this.child = child;
    }
}

class NumAstNode {
    constructor(symbol, value) {
        this.symbol = symbol;
        this.value = value;
    }
}

class ProcCallAstNode {
    constructor(symbol, args) {
        this.symbol = symbol;
        this.args = args || [];
    }
}

class AssignAstNode {
    constructor(symbol, id, expr) {
        this.symbol = symbol;
        this.id = id;
        this.expr = expr;
    }
}

class ForAstNode {
    constructor(symbol, assignment, targetexpr, body) {
        this.symbol = symbol;
        this. assignment = assignment;
        this.targetexpr = targetexpr;
        this.body = body;
    }
}

class WhileAstNode {
    constructor(symbol, expr, body) {
        this.symbol = symbol;
        this.expr = expr;
        this.body = body;
    }
}

class IfAstNode {
    constructor (symbol, expr, body, elseBranch) {
        this.symbol = symbol;
        this.expr = expr;
        this.body = body;
        this.elseBranch = elseBranch;
    }
}

class CmdBlockAstNode {
    constructor(symbol, commands) {
        this.symbol = symbol;
        this.commands = commands;
    }
}

class DeclAstNode {
    constructor(type, ids) {
        this.type = type;
        this.ids = ids;
    }
}

class VarDeclAstNode {
    constructor(symbol, declarations) {
        this.symbol = symbol;
        this.declarations = declarations;
    }
}

class ProgramAstNode {
    constructor(symbol, id, args, vardecl, subprogram, body) {
        this.symbol = symbol;
        this.id = id;
        this.args = args;
        this.vardecl = vardecl;
        this.subprogram = subprogram;
        this.body = body;
    }
}

module.exports = {
    BinaryAstNode,
    UnaryAstNode,
    NumAstNode,
    ProcCallAstNode,
    AssignAstNode,
    ForAstNode,
    WhileAstNode,
    IfAstNode,
    CmdBlockAstNode,
    DeclAstNode,
    VarDeclAstNode,
    ProgramAstNode,
};

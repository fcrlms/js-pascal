program teste; {programa exemplo}
var
    a, b, c, d: integer;
    w, x, y, z: real;
    i, j, k, l: boolean;

    a, w, i: integer; {variables already declared}
    teste: real; {already declared}
procedure proc1;
    var
        a, b, c: integer;
        w, x, y: real;
        i, j, k: boolean;

        a, w, i: integer; {variables already declared}
        teste, proc1: real; {already declared}
    begin
        c := 10
    end
begin
    a := 10;
    b := a;
    b := w; {expected integer, got real}
    c := 1.; {expected integer, got real}
    d := 1;
    d := false; {expected integer, got boolean}
    a := (((false))); {expected integer, got boolean}

    w := 1.;
    x := 1;
    y := a;
    z := x;
    z := true; {expected real, got boolean}

    i := 0; {expected boolean, got integer}
    j := a; {expected boolean, got integer}
    k := x; {expected boolean, got real}
    l := true;
    l := false;
    l := 1.; {expected boolean, got real}

    teste := false; {can't assign to program}
    proc1 := true; {assign to procedure here}
    proc1(1);
    a := proc1 {procedures do not return values}
end.

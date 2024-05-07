/*
literal de numero = VERDE

keyword:
- if, while, for, do,  => roxo
- var, integer, real, boolean => azul escuro

variavel usada = AZUL CLARO
variavel nao usada = AZUL CLARO APAGADO

COMENTARIO = VERDE SERUCO

char que n tem na lang = RED
*/

const COLORS = {
  RED: 0,
  RESET: 1,
  BRIGHT: 2,
  DIM: 3,
  MAGENTA: 4,
  BLUE: 5,
  GREEN: 6,
};

const color_to_code = new Map();
color_to_code.set(COLORS.RED, "\x1b[31m");
color_to_code.set(COLORS.GREEN, "\x1b[32m");
color_to_code.set(COLORS.BLUE, "\x1b[34m");
color_to_code.set(COLORS.MAGENTA, "\x1b[35m");

color_to_code.set(COLORS.RESET, "\x1b[0m");
color_to_code.set(COLORS.BRIGHT, "\x1b[1m");
color_to_code.set(COLORS.DIM, "\x1b[2m");

const get_color_code = (color) => color_to_code.get(color);

const wrap_in_colors = (message, ...colors) => {
  let out = "";
  for (let color of colors) {
    out += color_to_code.get(color);
  }
  out += message;
  out += color_to_code.get(COLORS.RESET);
  return out;
};

module.exports = {
  COLORS,
  wrap_in_colors,
  get_color_code,
};

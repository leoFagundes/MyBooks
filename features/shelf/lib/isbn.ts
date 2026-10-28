// ISBN-13 (o código de barras dos livros, EAN-13 com 978 ou 979) e ISBN-10.

const digitsOf = (code: string) => code.replace(/[^0-9Xx]/g, "").toUpperCase();

function isbn13CheckDigit(first12: string) {
  const sum = [...first12].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
    0,
  );
  return (10 - (sum % 10)) % 10;
}

function isValidIsbn10(code: string) {
  if (!/^\d{9}[\dX]$/.test(code)) return false;
  const sum = [...code].reduce(
    (total, char, index) =>
      total + (char === "X" ? 10 : Number(char)) * (10 - index),
    0,
  );
  return sum % 11 === 0;
}

/**
 * O ISBN-13 de um código: um ISBN-13 com o dígito certo, ou um ISBN-10
 * convertido. Hífens e espaços não contam. Qualquer outra coisa: null.
 */
export function isbn13From(code: string): string | null {
  const digits = digitsOf(code);
  if (digits.length === 13) {
    return /^97[89]\d{10}$/.test(digits) &&
      isbn13CheckDigit(digits.slice(0, 12)) === Number(digits[12])
      ? digits
      : null;
  }
  if (digits.length === 10 && isValidIsbn10(digits)) {
    const core = `978${digits.slice(0, 9)}`;
    return `${core}${isbn13CheckDigit(core)}`;
  }
  return null;
}

/** A busca é um ISBN (só dígitos, hífens e espaços, com o dígito certo)? */
export function isIsbnQuery(query: string): boolean {
  return /^[\d\s-]+[\dXx]?$/.test(query.trim()) && isbn13From(query) !== null;
}

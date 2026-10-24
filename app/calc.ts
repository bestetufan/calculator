export type Operator = "+" | "-" | "*" | "/" | "^";
export type AngleMode = "DEG" | "RAD";
export type FunctionName = "sqrt" | "sin" | "cos" | "tan" | "log" | "ln";

type Token =
  | { type: "number"; value: number }
  | { type: "operator"; value: Operator }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "function"; name: FunctionName }
  | { type: "constant"; name: "pi" | "e" }
  | { type: "factorial" }
  | { type: "percent" };

export function isOperator(character: string): character is Operator {
  return (
    character === "+" ||
    character === "-" ||
    character === "*" ||
    character === "/" ||
    character === "^"
  );
}

export function format(value: number): string {
  if (!Number.isFinite(value)) {
    return "Error";
  }
  return Number(value.toPrecision(12)).toString();
}

export function formatExpression(expression: string): string {
  return expression
    .replace(/sqrt\(/g, "√(")
    .replace(/\*/g, " × ")
    .replace(/\//g, " ÷ ")
    .replace(/\+/g, " + ")
    .replace(/-/g, " − ")
    .replace(/\^/g, " ^ ")
    .trim();
}

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const character = input[index];

    if (character === " ") {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(character)) {
      const match = input
        .slice(index)
        .match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);

      if (!match) {
        return null;
      }

      const value = Number(match[0]);

      if (!Number.isFinite(value)) {
        return null;
      }

      tokens.push({ type: "number", value });
      index += match[0].length;
      continue;
    }

    if (isOperator(character)) {
      tokens.push({ type: "operator", value: character });
      index += 1;
      continue;
    }

    if (character === "(") {
      tokens.push({ type: "lparen" });
      index += 1;
      continue;
    }

    if (character === ")") {
      tokens.push({ type: "rparen" });
      index += 1;
      continue;
    }

    if (character === "!") {
      tokens.push({ type: "factorial" });
      index += 1;
      continue;
    }

    if (character === "%") {
      tokens.push({ type: "percent" });
      index += 1;
      continue;
    }

    if (character === "π") {
      tokens.push({ type: "constant", name: "pi" });
      index += 1;
      continue;
    }

    if (character === "√") {
      tokens.push({ type: "function", name: "sqrt" });
      index += 1;
      continue;
    }

    if (character === "e") {
      tokens.push({ type: "constant", name: "e" });
      index += 1;
      continue;
    }

    const functionName = (["sqrt", "sin", "cos", "tan", "log", "ln"] as const).find(
      (name) => input.startsWith(name, index),
    );

    if (functionName) {
      tokens.push({ type: "function", name: functionName });
      index += functionName.length;
      continue;
    }

    return null;
  }

  return tokens;
}

function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    return Number.NaN;
  }

  if (value > 170) {
    return Number.POSITIVE_INFINITY;
  }

  let result = 1;

  for (let factor = 2; factor <= value; factor += 1) {
    result *= factor;
  }

  return result;
}

function applyFunction(name: FunctionName, value: number, angleMode: AngleMode): number {
  switch (name) {
    case "sqrt":
      return Math.sqrt(value);
    case "log":
      return Math.log10(value);
    case "ln":
      return Math.log(value);
    case "sin":
      return cleanTrig(Math.sin(toRadians(value, angleMode)));
    case "cos":
      return cleanTrig(Math.cos(toRadians(value, angleMode)));
    case "tan": {
      const radians = toRadians(value, angleMode);

      if (Math.abs(Math.cos(radians)) < 1e-12) {
        return Number.NaN;
      }

      return cleanTrig(Math.tan(radians));
    }
  }
}

function toRadians(value: number, angleMode: AngleMode): number {
  return angleMode === "DEG" ? (value * Math.PI) / 180 : value;
}

function cleanTrig(value: number): number {
  return Math.abs(value) < 1e-12 ? 0 : value;
}

function evaluateTokens(tokens: Token[], angleMode: AngleMode): number | null {
  let index = 0;

  function parseExpression(): number | null {
    let value = parseTerm();

    if (value === null) {
      return null;
    }

    while (index < tokens.length) {
      const token = tokens[index];

      if (token.type !== "operator" || (token.value !== "+" && token.value !== "-")) {
        break;
      }

      index += 1;

      const right = parseTerm();

      if (right === null) {
        return null;
      }

      value = token.value === "+" ? value + right : value - right;
    }

    return value;
  }

  function parseTerm(): number | null {
    let value = parseUnary();

    if (value === null) {
      return null;
    }

    while (index < tokens.length) {
      const token = tokens[index];

      if (token.type !== "operator" || (token.value !== "*" && token.value !== "/")) {
        break;
      }

      index += 1;

      const right = parseUnary();

      if (right === null) {
        return null;
      }

      if (token.value === "/" && right === 0) {
        value = Number.POSITIVE_INFINITY;
      } else {
        value = token.value === "*" ? value * right : value / right;
      }
    }

    return value;
  }

  function parseUnary(): number | null {
    if (index >= tokens.length) {
      return null;
    }

    const token = tokens[index];

    if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
      index += 1;

      const value = parseUnary();

      if (value === null) {
        return null;
      }

      return token.value === "-" ? -value : value;
    }

    return parsePower();
  }

  function parsePower(): number | null {
    const base = parsePostfix();

    if (base === null) {
      return null;
    }

    const token = tokens[index];

    if (token?.type === "operator" && token.value === "^") {
      index += 1;

      const exponent = parseUnary();

      if (exponent === null) {
        return null;
      }

      return base ** exponent;
    }

    return base;
  }

  function parsePostfix(): number | null {
    let value = parsePrimary();

    if (value === null) {
      return null;
    }

    while (index < tokens.length) {
      const token = tokens[index];

      if (token.type === "factorial") {
        index += 1;
        value = factorial(value);
        continue;
      }

      if (token.type === "percent") {
        index += 1;
        value /= 100;
        continue;
      }

      break;
    }

    return value;
  }

  function parsePrimary(): number | null {
    const token = tokens[index];

    if (!token) {
      return null;
    }

    if (token.type === "number") {
      index += 1;
      return token.value;
    }

    if (token.type === "constant") {
      index += 1;
      return token.name === "pi" ? Math.PI : Math.E;
    }

    if (token.type === "lparen") {
      index += 1;

      const value = parseExpression();

      if (value === null) {
        return null;
      }

      const closing = tokens[index];

      if (closing?.type !== "rparen") {
        return null;
      }

      index += 1;
      return value;
    }

    if (token.type === "function") {
      index += 1;

      const opening = tokens[index];

      if (opening?.type !== "lparen") {
        return null;
      }

      index += 1;

      const value = parseExpression();

      if (value === null) {
        return null;
      }

      const closing = tokens[index];

      if (closing?.type !== "rparen") {
        return null;
      }

      index += 1;
      return applyFunction(token.name, value, angleMode);
    }

    return null;
  }

  const value = parseExpression();

  return index === tokens.length ? value : null;
}

export function evaluateExpression(
  expression: string,
  angleMode: AngleMode = "RAD",
): number | null {
  const tokens = tokenize(expression);

  if (!tokens || tokens.length === 0) {
    return null;
  }

  while (tokens.length > 0 && tokens[tokens.length - 1].type === "operator") {
    tokens.pop();
  }

  if (tokens.length === 0) {
    return null;
  }

  let openParentheses = 0;

  for (const token of tokens) {
    if (token.type === "lparen") {
      openParentheses += 1;
    } else if (token.type === "rparen") {
      openParentheses -= 1;
    }
  }

  for (let count = 0; count < openParentheses; count += 1) {
    tokens.push({ type: "rparen" });
  }

  return evaluateTokens(tokens, angleMode);
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  evaluateExpression,
  format,
  formatExpression,
  isOperator,
  type AngleMode,
  type FunctionName,
  type Operator,
} from "./calc";

type ButtonVariant = "digit" | "function" | "operator" | "equals" | "scientific";

const PLAIN_NUMBER = /^-?\d+(?:\.\d*)?(?:e[+-]?\d+)?$/i;

const buttonBase =
  "flex select-none items-center justify-center rounded-2xl font-medium transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

const buttonVariants: Record<ButtonVariant, string> = {
  digit: "bg-slate-800 text-xl text-slate-100 hover:bg-slate-700",
  function: "bg-slate-700/70 text-xl text-slate-300 hover:bg-slate-600",
  operator: "bg-sky-500/15 text-xl text-sky-300 hover:bg-sky-500/25",
  equals: "bg-sky-500 text-2xl text-white hover:bg-sky-400",
  scientific: "bg-slate-800/40 text-sm text-slate-300 hover:bg-slate-800",
};

function buttonClass(variant: ButtonVariant) {
  return `${buttonBase} ${buttonVariants[variant]}`;
}

function endsWithValue(expression: string): boolean {
  return /[0-9.πe)%!]$/.test(expression);
}

export default function Calculator() {
  const [expression, setExpression] = useState("0");
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");
  const [showScientific, setShowScientific] = useState(false);

  const isError = expression === "Error";
  const isPlainNumber = PLAIN_NUMBER.test(expression);
  const showExpression = !isError && !isPlainNumber;

  const liveValue = showExpression ? evaluateExpression(expression, angleMode) : null;
  const liveText =
    liveValue === null
      ? null
      : Number.isFinite(liveValue)
        ? format(liveValue)
        : "Error";

  const displayedValue = isError ? "Error" : (liveText ?? expression);
  const expressionLabel = showExpression ? formatExpression(expression) : "";

  const expressionRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = expressionRef.current;

    if (element) {
      element.scrollLeft = element.scrollWidth;
    }
  }, [expressionLabel]);

  function clearAll() {
    setExpression("0");
    setJustEvaluated(false);
  }

  function startFresh(value: string) {
    setExpression(value);
    setJustEvaluated(false);
  }

  function insertValue(next: string) {
    const current = expression === "0" ? "" : expression;
    const separator = endsWithValue(current) ? "*" : "";
    setExpression(current + separator + next);
    setJustEvaluated(false);
  }

  function inputDigit(digit: string) {
    if (isError || justEvaluated) {
      startFresh(digit);
      return;
    }

    const lastCharacter = expression.slice(-1);

    if (expression === "" || isOperator(lastCharacter) || lastCharacter === "(") {
      setExpression(expression + digit);
      return;
    }

    if (/[)πe!%]/.test(lastCharacter)) {
      setExpression(expression + "*" + digit);
      return;
    }

    const currentNumber = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)$/)?.[0] ?? "";

    if (currentNumber === "0") {
      setExpression(expression.slice(0, -1) + digit);
      return;
    }

    setExpression(expression + digit);
  }

  function inputDecimal() {
    if (isError || justEvaluated) {
      startFresh("0.");
      return;
    }

    const lastCharacter = expression.slice(-1);

    if (expression === "" || isOperator(lastCharacter) || lastCharacter === "(") {
      setExpression(expression + "0.");
      return;
    }

    if (/[)πe!%]/.test(lastCharacter)) {
      setExpression(expression + "*0.");
      return;
    }

    const currentNumber = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)$/)?.[0] ?? "";

    if (!currentNumber.includes(".")) {
      setExpression(expression + ".");
    }
  }

  function insertConstant(constant: "π" | "e") {
    if (isError || justEvaluated) {
      startFresh(constant);
      return;
    }

    insertValue(constant);
  }

  function insertFunction(name: FunctionName) {
    if (isError) {
      return;
    }

    if (justEvaluated) {
      setExpression(`${name}(${expression})`);
      setJustEvaluated(false);
      return;
    }

    insertValue(`${name}(`);
  }

  function insertOpenParenthesis() {
    if (isError) {
      return;
    }

    insertValue("(");
  }

  function insertCloseParenthesis() {
    if (isError) {
      return;
    }

    let openParentheses = 0;

    for (const character of expression) {
      if (character === "(") {
        openParentheses += 1;
      } else if (character === ")") {
        openParentheses -= 1;
      }
    }

    const lastCharacter = expression.slice(-1);

    if (
      openParentheses <= 0 ||
      expression === "" ||
      lastCharacter === "(" ||
      lastCharacter === "." ||
      isOperator(lastCharacter)
    ) {
      return;
    }

    setExpression(expression + ")");
    setJustEvaluated(false);
  }

  function chooseOperator(nextOperator: Operator) {
    if (isError) {
      return;
    }

    if (justEvaluated) {
      setExpression(expression + nextOperator);
      setJustEvaluated(false);
      return;
    }

    const lastCharacter = expression.slice(-1);

    if (expression === "") {
      return;
    }

    if (isOperator(lastCharacter)) {
      if (lastCharacter === "^" && nextOperator === "-") {
        setExpression(expression + "-");
        return;
      }

      setExpression(expression.slice(0, -1) + nextOperator);
      return;
    }

    if (lastCharacter === ".") {
      setExpression(expression.slice(0, -1) + nextOperator);
      return;
    }

    if (lastCharacter === "(") {
      if (nextOperator === "-") {
        setExpression(expression + "-");
      }
      return;
    }

    setExpression(expression + nextOperator);
  }

  function applySquare() {
    if (isError || !endsWithValue(expression)) {
      return;
    }

    setExpression(expression + "^2");
    setJustEvaluated(false);
  }

  function applyPower() {
    if (isError || !endsWithValue(expression)) {
      return;
    }

    setExpression(expression + "^");
    setJustEvaluated(false);
  }

  function applyFactorial() {
    if (isError || !endsWithValue(expression)) {
      return;
    }

    setExpression(expression + "!");
    setJustEvaluated(false);
  }

  function applyPercent() {
    if (isError || !endsWithValue(expression)) {
      return;
    }

    setExpression(expression + "%");
    setJustEvaluated(false);
  }

  function toggleSign() {
    if (isError) {
      return;
    }

    let end = expression.length;

    while (end > 0 && (expression[end - 1] === "!" || expression[end - 1] === "%")) {
      end -= 1;
    }

    if (end === 0) {
      return;
    }

    let start: number;

    if (expression[end - 1] === ")") {
      let depth = 0;
      let position = end - 1;

      for (; position >= 0; position -= 1) {
        if (expression[position] === ")") {
          depth += 1;
        } else if (expression[position] === "(") {
          depth -= 1;

          if (depth === 0) {
            break;
          }
        }
      }

      if (position < 0) {
        return;
      }

      start = position;

      while (start > 0 && /[a-z√]/.test(expression[start - 1])) {
        start -= 1;
      }
    } else if (expression[end - 1] === "π" || expression[end - 1] === "e") {
      start = end - 1;
    } else {
      const number = expression.slice(0, end).match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i);

      if (!number || number.index === undefined) {
        return;
      }

      start = number.index;
    }

    const previousIsUnaryMinus =
      expression[start - 1] === "-" &&
      (start - 1 === 0 ||
        isOperator(expression[start - 2] ?? "") ||
        expression[start - 2] === "(");

    if (previousIsUnaryMinus) {
      setExpression(expression.slice(0, start - 1) + expression.slice(start));
    } else {
      setExpression(expression.slice(0, start) + "-" + expression.slice(start));
    }

    setJustEvaluated(false);
  }

  function equals() {
    if (isError || isPlainNumber) {
      return;
    }

    const result = evaluateExpression(expression, angleMode);

    if (result === null || !Number.isFinite(result)) {
      setExpression("Error");
      setJustEvaluated(false);
      return;
    }

    setExpression(format(result));
    setJustEvaluated(true);
  }

  function backspace() {
    if (isError) {
      clearAll();
      return;
    }

    const functionMatch = expression.match(/(?:sqrt|sin|cos|tan|log|ln|√)\($/);
    const next = functionMatch
      ? expression.slice(0, -functionMatch[0].length)
      : expression.slice(0, -1);

    setExpression(next === "" || next === "-" ? "0" : next);
    setJustEvaluated(false);
  }

  const scientificKeys: Array<{
    label: string;
    ariaLabel: string;
    action: () => void;
  }> = [
    { label: "(", ariaLabel: "Open parenthesis", action: insertOpenParenthesis },
    { label: ")", ariaLabel: "Close parenthesis", action: insertCloseParenthesis },
    { label: "√", ariaLabel: "Square root", action: () => insertFunction("sqrt") },
    { label: "x²", ariaLabel: "Square", action: applySquare },
    { label: "xʸ", ariaLabel: "Power", action: applyPower },
    { label: "n!", ariaLabel: "Factorial", action: applyFactorial },
    { label: "π", ariaLabel: "Pi", action: () => insertConstant("π") },
    { label: "e", ariaLabel: "Euler's number", action: () => insertConstant("e") },
    { label: "sin", ariaLabel: "Sine", action: () => insertFunction("sin") },
    { label: "cos", ariaLabel: "Cosine", action: () => insertFunction("cos") },
    { label: "tan", ariaLabel: "Tangent", action: () => insertFunction("tan") },
    { label: "log", ariaLabel: "Logarithm base 10", action: () => insertFunction("log") },
    { label: "ln", ariaLabel: "Natural logarithm", action: () => insertFunction("ln") },
    { label: "%", ariaLabel: "Percent", action: applyPercent },
    { label: "±", ariaLabel: "Toggle sign", action: toggleSign },
  ];

  return (
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="mb-3 flex items-center justify-between px-2">
        <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Scientific calculator
        </h1>
        <span
          aria-live="polite"
          className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-sky-300 ring-1 ring-inset ring-sky-400/20"
        >
          {angleMode}
        </span>
      </div>

      <output
        aria-live="polite"
        className="mb-4 block rounded-2xl bg-slate-950/80 px-5 py-3 text-right font-mono text-white"
      >
        <span
          ref={expressionRef}
          className="block h-6 overflow-x-auto whitespace-nowrap text-right text-sm leading-6 text-slate-400 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {expressionLabel}
        </span>
        <span className="block overflow-hidden text-3xl font-light tracking-tight">
          {displayedValue}
        </span>
      </output>

      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowScientific((value) => !value)}
          aria-expanded={showScientific}
          aria-controls="scientific-pad"
          aria-label="Toggle scientific keypad"
          className="flex flex-1 items-center justify-between rounded-2xl bg-slate-800/40 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          <span className="flex items-center gap-2">
            <span className="font-mono text-sky-300">fx</span>
            Scientific
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform ${showScientific ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div className="flex items-center gap-1 rounded-2xl bg-slate-800/40 p-0.5">
          {(["DEG", "RAD"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setAngleMode(mode)}
              aria-pressed={angleMode === mode}
              aria-label={`${mode === "DEG" ? "Degrees" : "Radians"} angle mode`}
              className={`rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                angleMode === mode
                  ? "bg-sky-500/25 text-sky-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div
        id="scientific-pad"
        className={`mb-2 auto-rows-[2.5rem] grid-cols-5 gap-2 ${
          showScientific ? "grid" : "hidden"
        }`}
      >
        {scientificKeys.map((key) => (
          <button
            key={key.label}
            type="button"
            className={buttonClass("scientific")}
            onClick={key.action}
            aria-label={key.ariaLabel}
          >
            {key.label}
          </button>
        ))}
      </div>

      <div className="grid auto-rows-[3.25rem] grid-cols-4 gap-2">
        <button type="button" className={buttonClass("function")} onClick={clearAll}>
          C
        </button>
        <button
          type="button"
          className={buttonClass("function")}
          onClick={backspace}
          aria-label="Backspace"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7 6-7Z" />
            <path d="m12 9 6 6m0-6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          className={buttonClass("operator")}
          onClick={() => chooseOperator("/")}
          aria-label="Divide"
        >
          ÷
        </button>
        <button
          type="button"
          className={buttonClass("operator")}
          onClick={() => chooseOperator("*")}
          aria-label="Multiply"
        >
          ×
        </button>

        <button type="button" className={buttonClass("digit")} onClick={() => inputDigit("7")}>
          7
        </button>
        <button type="button" className={buttonClass("digit")} onClick={() => inputDigit("8")}>
          8
        </button>
        <button type="button" className={buttonClass("digit")} onClick={() => inputDigit("9")}>
          9
        </button>
        <button
          type="button"
          className={buttonClass("operator")}
          onClick={() => chooseOperator("-")}
          aria-label="Subtract"
        >
          −
        </button>

        <button type="button" className={buttonClass("digit")} onClick={() => inputDigit("4")}>
          4
        </button>
        <button type="button" className={buttonClass("digit")} onClick={() => inputDigit("5")}>
          5
        </button>
        <button type="button" className={buttonClass("digit")} onClick={() => inputDigit("6")}>
          6
        </button>
        <button
          type="button"
          className={buttonClass("operator")}
          onClick={() => chooseOperator("+")}
          aria-label="Add"
        >
          +
        </button>

        <button type="button" className={buttonClass("digit")} onClick={() => inputDigit("1")}>
          1
        </button>
        <button type="button" className={buttonClass("digit")} onClick={() => inputDigit("2")}>
          2
        </button>
        <button type="button" className={buttonClass("digit")} onClick={() => inputDigit("3")}>
          3
        </button>

        <button
          type="button"
          className={`${buttonClass("digit")} col-span-2`}
          onClick={() => inputDigit("0")}
        >
          0
        </button>
        <button type="button" className={buttonClass("digit")} onClick={inputDecimal}>
          .
        </button>
        <button
          type="button"
          className={`${buttonClass("equals")} col-start-4 row-span-2 row-start-4`}
          onClick={equals}
          aria-label="Equals"
        >
          =
        </button>
      </div>
    </div>
  );
}

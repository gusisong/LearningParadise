/**
 * 数学口算题目生成引擎
 *
 * 核心规则（PRD V2）：
 * - 百以内加减乘除混合运算
 * - 每题 3 个数混合计算，带括号
 * - 加减法涉及进位退位
 * - 乘除法限定：一个十位数 × 一个个位数
 * - 难度分普通/挑战
 */

import type { QuestionType } from "./constants";

export interface GeneratedQuestion {
  expression: string; // 显示表达式，如 "(17 + 8) × 3"
  answer: number; // 正确答案
  type: QuestionType; // 分类标签
}

// ─── 工具函数 ───
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── 各类题型生成器 ───

/** 进位加法: a + b 其中 a%10 + b%10 >= 10 */
function genCarryAdd(hard: boolean): GeneratedQuestion {
  let a: number, b: number;
  do {
    a = randInt(hard ? 20 : 10, hard ? 80 : 50);
    b = randInt(hard ? 10 : 5, hard ? 50 : 30);
  } while ((a % 10) + (b % 10) < 10 || a + b > 100);
  return { expression: `${a} + ${b}`, answer: a + b, type: "add_carry" };
}

/** 不进位加法 */
function genNoCarryAdd(hard: boolean): GeneratedQuestion {
  let a: number, b: number;
  do {
    a = randInt(hard ? 20 : 10, hard ? 60 : 40);
    b = randInt(hard ? 10 : 5, hard ? 30 : 20);
  } while ((a % 10) + (b % 10) >= 10 || a + b > 100);
  return { expression: `${a} + ${b}`, answer: a + b, type: "add_no_carry" };
}

/** 退位减法: a - b 其中 a%10 < b%10 */
function genBorrowSub(hard: boolean): GeneratedQuestion {
  let a: number, b: number;
  do {
    a = randInt(hard ? 30 : 20, hard ? 90 : 60);
    b = randInt(hard ? 10 : 5, hard ? 50 : 30);
  } while ((a % 10) >= (b % 10) || a - b < 0 || a === b);
  return { expression: `${a} - ${b}`, answer: a - b, type: "sub_borrow" };
}

/** 不退位减法 */
function genNoBorrowSub(hard: boolean): GeneratedQuestion {
  let a: number, b: number;
  do {
    a = randInt(hard ? 30 : 20, hard ? 90 : 60);
    b = randInt(hard ? 10 : 5, hard ? 40 : 25);
  } while ((a % 10) < (b % 10) || a - b < 0 || a === b);
  return { expression: `${a} - ${b}`, answer: a - b, type: "sub_no_borrow" };
}

/** 乘法: 十位数 × 个位数 */
function genMul(hard: boolean): GeneratedQuestion {
  const a = randInt(hard ? 12 : 10, hard ? 19 : 15);
  const b = randInt(hard ? 3 : 2, hard ? 9 : 6);
  return { expression: `${a} × ${b}`, answer: a * b, type: "mul" };
}

/** 除法: 确保整除，商合理 */
function genDiv(hard: boolean): GeneratedQuestion {
  const b = randInt(hard ? 3 : 2, hard ? 9 : 6);
  const quotient = randInt(hard ? 5 : 3, hard ? 15 : 10);
  const a = b * quotient;
  if (a > 99) return genDiv(hard); // 超出百以内则重试
  return { expression: `${a} ÷ ${b}`, answer: quotient, type: "div" };
}

// ─── 三数混合运算生成（带括号）───

type BinaryOp = "+" | "-" | "×" | "÷";

function opToFn(op: BinaryOp): (a: number, b: number) => number | null {
  return (a, b) => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b >= 0 ? a - b : null;
      case "×": return a * b;
      case "÷": return b !== 0 && a % b === 0 ? a / b : null;
    }
  };
}

function genMixedQuestion(hard: boolean): GeneratedQuestion {
  // 策略：生成 (a op1 b) op2 c 或 a op1 (b op2 c) 形式
  const ops: BinaryOp[] = hard
    ? ["+", "-", "×", "÷"]
    : ["+", "-", "×"];

  // 确保至少一个加减法和一个乘除法
  const addSubOps: BinaryOp[] = ["+", "-"];
  const mulDivOps: BinaryOp[] = hard ? ["×", "÷"] : ["×"];

  for (let attempt = 0; attempt < 100; attempt++) {
    const useBracketFirst = Math.random() > 0.5;
    const op1 = pick(Math.random() > 0.5 ? addSubOps : mulDivOps);
    const op2 = pick(op1 === "+" || op1 === "-" ? mulDivOps : addSubOps);

    let a: number, b: number, c: number;

    // 乘除法的操作数约束
    if (op1 === "×" || op1 === "÷") {
      a = randInt(10, hard ? 19 : 15);
      b = randInt(2, hard ? 9 : 6);
      if (op1 === "÷") {
        b = randInt(2, hard ? 9 : 6);
        a = b * randInt(3, Math.min(12, Math.floor(99 / b)));
      }
    } else {
      a = randInt(hard ? 15 : 10, hard ? 60 : 40);
      b = randInt(hard ? 10 : 5, hard ? 40 : 25);
    }

    if (op2 === "×" || op2 === "÷") {
      c = randInt(2, hard ? 9 : 6);
    } else {
      c = randInt(hard ? 10 : 5, hard ? 30 : 20);
    }

    let result: number | null;
    let expression: string;

    if (useBracketFirst) {
      // (a op1 b) op2 c
      const inner = opToFn(op1)(a, b);
      if (inner === null || inner < 0 || inner > 200) continue;
      result = opToFn(op2)(inner, c);
      if (op2 === "÷" && c !== 0 && inner % c !== 0) continue;
      expression = `(${a} ${op1} ${b}) ${op2} ${c}`;
    } else {
      // a op1 (b op2 c)
      const inner = opToFn(op2)(b, c);
      if (inner === null || inner < 0 || inner > 200) continue;
      result = opToFn(op1)(a, inner);
      if (op1 === "÷" && inner !== 0 && a % inner !== 0) continue;
      expression = `${a} ${op1} (${b} ${op2} ${c})`;
    }

    if (result === null || result < 0 || !Number.isInteger(result) || result > 999) {
      continue;
    }

    // 判断混合类型
    const hasBracket = true;
    const hasMulDiv = op1 === "×" || op1 === "÷" || op2 === "×" || op2 === "÷";
    const qType: QuestionType =
      hasMulDiv && hasBracket ? "mixed_priority" : "mixed_complex";

    return { expression, answer: result, type: qType };
  }

  // fallback: 简单加法
  return genCarryAdd(hard);
}

// ─── 主函数：生成 50 道题 ───

const SIMPLE_GENERATORS = [
  genCarryAdd,
  genNoCarryAdd,
  genBorrowSub,
  genNoBorrowSub,
  genMul,
  genDiv,
];

export interface QuestionGeneratorOptions {
  mode: "normal" | "challenge";
  /** 需要生成变形题的错题类型列表 */
  weakTypes?: QuestionType[];
  /** 变形题数量 (默认 10) */
  variantCount?: number;
}

export function generateQuestions(options: QuestionGeneratorOptions): GeneratedQuestion[] {
  const { mode, weakTypes = [], variantCount = 10 } = options;
  const hard = mode === "challenge";
  const questions: GeneratedQuestion[] = [];

  // 1. 先生成变形题（基于错题类型）
  const actualVariantCount = Math.min(variantCount, weakTypes.length > 0 ? variantCount : 0);
  for (let i = 0; i < actualVariantCount; i++) {
    const targetType = weakTypes[i % weakTypes.length];
    const q = generateByType(targetType, hard);
    questions.push(q);
  }

  // 2. 剩余题目均匀分配各类型 + 混合题
  const remaining = 50 - questions.length;
  const mixedCount = Math.floor(remaining * 0.4); // 40% 混合题
  const simpleCount = remaining - mixedCount;

  for (let i = 0; i < simpleCount; i++) {
    const gen = SIMPLE_GENERATORS[i % SIMPLE_GENERATORS.length];
    questions.push(gen(hard));
  }

  for (let i = 0; i < mixedCount; i++) {
    questions.push(genMixedQuestion(hard));
  }

  // 3. 随机打乱顺序
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions;
}

/** 根据错题类型生成对应的变形题 */
function generateByType(type: QuestionType, hard: boolean): GeneratedQuestion {
  switch (type) {
    case "add_carry": return genCarryAdd(hard);
    case "add_no_carry": return genNoCarryAdd(hard);
    case "sub_borrow": return genBorrowSub(hard);
    case "sub_no_borrow": return genNoBorrowSub(hard);
    case "mul": return genMul(hard);
    case "div": return genDiv(hard);
    case "mixed_priority":
    case "mixed_complex":
      return genMixedQuestion(hard);
  }
}

/**
 * 数学口算题目生成引擎
 *
 * 核心规则：
 * - 移除区分难度，统一为二年级至三年级过渡水平。
 * - 使用 {ans} 和 {ans2} 作为占位符，支持多输入填空题。
 */

import { PRACTICE_CONFIG, type QuestionType } from "./constants";

export interface GeneratedQuestion {
  expression: string;
  answer: number;
  answer2?: number;
  type: QuestionType;
}

// ─── 工具函数 ───
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── 各类题型生成器 ───

/** 1. 大数加减法: 整十整百相加减，或三位数减一位数退位 */
function genLargeNumberCalc(): GeneratedQuestion {
  const subtype = randInt(1, 3);
  if (subtype === 1) {
    // 几百加几十，如 900 + 50
    const a = randInt(1, 9) * 100;
    const b = randInt(1, 9) * 10;
    return { expression: `${a} + ${b} = {ans}`, answer: a + b, type: "large_number_calc" };
  } else if (subtype === 2) {
    // 几百减几十，如 700 - 30
    const a = randInt(2, 9) * 100;
    const b = randInt(1, 9) * 10;
    return { expression: `${a} - ${b} = {ans}`, answer: a - b, type: "large_number_calc" };
  } else {
    // 三位数减一位数退位，如 331 - 3
    const a = randInt(1, 9) * 100 + randInt(1, 9) * 10 + randInt(0, 5);
    const b = randInt(6, 9);
    return { expression: `${a} - ${b} = {ans}`, answer: a - b, type: "large_number_calc" };
  }
}

/** 2. 连加连减运算 */
function genContinuousCalc(): GeneratedQuestion {
  const ops = pick([["+", "+"], ["-", "-"], ["+", "-"], ["-", "+"]]);
  
  if (ops[0] === "+" && ops[1] === "+") {
    // 连加如 5 + 5 + 73
    const a = randInt(2, 20);
    const b = randInt(2, 20);
    const c = randInt(10, 70);
    return { expression: `${a} + ${b} + ${c} = {ans}`, answer: a + b + c, type: "continuous_calc" };
  } else if (ops[0] === "-" && ops[1] === "-") {
    // 连减如 11 - 3 - 4
    const a = randInt(20, 90);
    const b = randInt(5, 15);
    const c = randInt(5, 15);
    return { expression: `${a} - ${b} - ${c} = {ans}`, answer: a - b - c, type: "continuous_calc" };
  } else {
    // 混合连加减
    const a = randInt(10, 50);
    const b = randInt(5, 30);
    const op1 = ops[0];
    const op2 = ops[1];
    let inter = op1 === "+" ? a + b : a - b;
    if (inter <= 0) {
      // fallback to ++ if negative intermediate
      return { expression: `${a} + ${b} + 5 = {ans}`, answer: a + b + 5, type: "continuous_calc" };
    }
    const c = randInt(5, 30);
    let final = op2 === "+" ? inter + c : inter - c;
    if (final < 0) {
       return { expression: `${a} + ${b} + ${c} = {ans}`, answer: a + b + c, type: "continuous_calc" };
    }
    return { expression: `${a} ${op1} ${b} ${op2} ${c} = {ans}`, answer: final, type: "continuous_calc" };
  }
}

/** 3. 无括号混合运算 (乘除与加减) */
function genMixedNoBracket(): GeneratedQuestion {
  // 形式1: a × b ± c
  // 形式2: a ÷ b ± c
  // 形式3: a ± b × c
  // 形式4: a ± b ÷ c
  const form = randInt(1, 4);
  const isAdd = Math.random() > 0.5;
  const op2 = isAdd ? "+" : "-";

  if (form === 1) { // a × b ± c
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const c = randInt(5, 50);
    const ans = isAdd ? a * b + c : a * b - c;
    if (ans < 0) return genMixedNoBracket();
    return { expression: `${a} × ${b} ${op2} ${c} = {ans}`, answer: ans, type: "mixed_no_bracket" };
  } else if (form === 2) { // a ÷ b ± c
    const b = randInt(2, 9);
    const q = randInt(2, 9);
    const a = b * q;
    const c = randInt(5, 50);
    const ans = isAdd ? q + c : q - c;
    if (ans < 0) return genMixedNoBracket();
    return { expression: `${a} ÷ ${b} ${op2} ${c} = {ans}`, answer: ans, type: "mixed_no_bracket" };
  } else if (form === 3) { // a ± b × c
    const b = randInt(2, 9);
    const c = randInt(2, 9);
    const a = randInt(10, 80);
    const ans = isAdd ? a + b * c : a - b * c;
    if (ans < 0) return genMixedNoBracket();
    return { expression: `${a} ${op2} ${b} × ${c} = {ans}`, answer: ans, type: "mixed_no_bracket" };
  } else { // a ± b ÷ c
    const c = randInt(2, 9);
    const q = randInt(2, 9);
    const b = c * q;
    const a = randInt(10, 80);
    const ans = isAdd ? a + q : a - q;
    if (ans < 0) return genMixedNoBracket();
    return { expression: `${a} ${op2} ${b} ÷ ${c} = {ans}`, answer: ans, type: "mixed_no_bracket" };
  }
}

/** 4. 等式填空题 (位置在等号左侧或混合中) */
function genEquationBlank(): GeneratedQuestion {
  const type = randInt(1, 2);
  if (type === 1) {
    // a × {ans} = b ± c
    const a = randInt(2, 9);
    const ans = randInt(2, 9);
    const target = a * ans;
    // 构造右侧
    const b = randInt(target + 1, target + 20);
    const c = b - target;
    return { expression: `${a} × {ans} = ${b} - ${c}`, answer: ans, type: "equation_blank" };
  } else {
    // a × b - {ans} = c
    const a = randInt(5, 9);
    const b = randInt(5, 9);
    const prod = a * b;
    const ans = randInt(10, prod - 5);
    const c = prod - ans;
    return { expression: `${a} × ${b} - {ans} = ${c}`, answer: ans, type: "equation_blank" };
  }
}

/** 5. 带余除法求被除数 */
function genDivRemainderDividend(): GeneratedQuestion {
  // {ans} ÷ a = b ... c
  const a = randInt(3, 9);
  const b = randInt(3, 9);
  const c = randInt(1, a - 1); // 确保余数小于除数
  const ans = a * b + c;
  return { expression: `{ans} ÷ ${a} = ${b} ... ${c}`, answer: ans, type: "div_remainder_dividend" };
}

/** 6. 带余除法求商和余数（双填空） */
function genDivRemainder(): GeneratedQuestion {
  // a ÷ b = {ans} ... {ans2}
  const b = randInt(3, 9);
  const quotient = randInt(3, 9);
  const remainder = randInt(1, b - 1);
  const a = b * quotient + remainder;
  return { 
    expression: `${a} ÷ ${b} = {ans} ... {ans2}`, 
    answer: quotient, 
    answer2: remainder, 
    type: "div_remainder" 
  };
}

// ─── 主函数：生成题目 ───

const GENERATORS = [
  genLargeNumberCalc,
  genContinuousCalc,
  genMixedNoBracket,
  genEquationBlank,
  genDivRemainderDividend,
  genDivRemainder,
];

export interface QuestionGeneratorOptions {
  mode?: "normal" | "challenge"; // 保留参数但内部不再区分难度
  /** 需要生成变形题的错题类型列表 */
  weakTypes?: QuestionType[];
  /** 变形题数量 (默认 10) */
  variantCount?: number;
  /** 管理员偏好加权的题型列表（增加出题率） */
  boostedTypes?: QuestionType[];
}

export function generateQuestions(options: QuestionGeneratorOptions): GeneratedQuestion[] {
  const { weakTypes = [], variantCount = 10, boostedTypes = [] } = options;
  const questions: GeneratedQuestion[] = [];

  // 1. 先生成变形题（基于错题类型）
  const actualVariantCount = Math.min(variantCount, weakTypes.length > 0 ? variantCount : 0);
  for (let i = 0; i < actualVariantCount; i++) {
    const targetType = weakTypes[i % weakTypes.length];
    const q = generateByType(targetType);
    questions.push(q);
  }

  // 2. 生成偏好加权题（管理员配置的题型增加出题率，占剩余的 ~30%）
  if (boostedTypes.length > 0) {
    const afterVariants = PRACTICE_CONFIG.totalQuestions - questions.length;
    const boostedCount = Math.round(afterVariants * 0.3);
    for (let i = 0; i < boostedCount; i++) {
      const targetType = boostedTypes[i % boostedTypes.length];
      questions.push(generateByType(targetType));
    }
  }

  // 3. 剩余题目均匀分配各类型
  const remaining = PRACTICE_CONFIG.totalQuestions - questions.length;

  for (let i = 0; i < remaining; i++) {
    const gen = GENERATORS[i % GENERATORS.length];
    questions.push(gen());
  }

  // 4. 随机打乱顺序
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions;
}

/** 根据错题类型生成对应的变形题 */
function generateByType(type: QuestionType): GeneratedQuestion {
  switch (type) {
    case "large_number_calc": return genLargeNumberCalc();
    case "continuous_calc": return genContinuousCalc();
    case "mixed_no_bracket": return genMixedNoBracket();
    case "equation_blank": return genEquationBlank();
    case "div_remainder_dividend": return genDivRemainderDividend();
    case "div_remainder": return genDivRemainder();
    default: return genMixedNoBracket(); // 应对旧类型
  }
}

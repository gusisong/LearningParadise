/**
 * 游戏核心常量 — 角色属性、经济平衡、升级公式
 */

// ─── 角色基础属性 (Level 1 裸装) ───
export const BASE_STATS = {
  hp: 20,
  atk: 5,
  def: 2,
};

// ─── 每级成长 ───
export const LEVEL_UP_STATS = {
  hp: 2,
  atk: 1,
  def: 1,
};

/**
 * 升级所需经验: Level N → N+1 需要 80 + N * 40
 */
export function expForNextLevel(currentLevel: number): number {
  return 80 + currentLevel * 40;
}

/**
 * 计算角色裸装属性 (不含装备)
 */
export function getBaseStats(level: number) {
  return {
    hp: BASE_STATS.hp + (level - 1) * LEVEL_UP_STATS.hp,
    atk: BASE_STATS.atk + (level - 1) * LEVEL_UP_STATS.atk,
    def: BASE_STATS.def + (level - 1) * LEVEL_UP_STATS.def,
  };
}

// ─── 可选角色皮肤 ───
export const SKINS = [
  { id: "steve", name: "Steve", gender: "male" },
  { id: "alex", name: "Alex", gender: "female" },
  { id: "ari", name: "Ari", gender: "female" },
  { id: "kai", name: "Kai", gender: "male" },
  { id: "zuri", name: "Zuri", gender: "female" },
  { id: "makena", name: "Makena", gender: "female" },
  { id: "efe", name: "Efe", gender: "male" },
  { id: "noor", name: "Noor", gender: "female" },
] as const;

export type SkinType = (typeof SKINS)[number]["id"];

// ─── 错题分类 ───
export const QUESTION_TYPES = {
  large_number_calc: "大数加减法",
  continuous_calc: "连加连减",
  mixed_no_bracket: "无括号混合运算",
  equation_blank: "等式填空",
  div_remainder_dividend: "带余除法求被除数",
  div_remainder: "带余除法求商和余数",
} as const;

export type QuestionType = keyof typeof QUESTION_TYPES;

// ─── 练习配置 ───
export const PRACTICE_CONFIG = {
  totalQuestions: 40,
  defaultDurationSeconds: 240, // 4 分钟
  dailyLimit: 4,
  variantRatio: 0.2, // 20% 变形题
  graduationThreshold: 10, // 连续答对 10 次毕业
};

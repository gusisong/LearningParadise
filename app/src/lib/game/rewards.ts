import { expForNextLevel } from "./constants";

export interface RewardResult {
  goldEarned: number;
  expEarned: number;
  leveledUp: boolean;
  newLevel: number;
  newExp: number;
  newGold: number;
}

interface RewardConfig {
  goldPerCorrect: number;
  expPerCorrect: number;
  highScoreGoldBonus: number;
  highScoreExpBonus: number;
  highScoreThreshold: number;
  perfectGoldBonus: number;
  perfectExpBonus: number;
  challengeMultiplier: number;
}

const DEFAULT_CONFIG: RewardConfig = {
  goldPerCorrect: 2,
  expPerCorrect: 3,
  highScoreGoldBonus: 20,
  highScoreExpBonus: 50,
  highScoreThreshold: 45,
  perfectGoldBonus: 50,
  perfectExpBonus: 100,
  challengeMultiplier: 1.5,
};

/**
 * 计算练习奖励并处理升级
 */
export function calculateRewards(
  correctCount: number,
  totalQuestions: number,
  mode: "normal" | "challenge",
  currentLevel: number,
  currentExp: number,
  currentGold: number,
  config?: Partial<RewardConfig>
): RewardResult {
  const c = { ...DEFAULT_CONFIG, ...config };
  const multiplier = mode === "challenge" ? c.challengeMultiplier : 1;

  // 基础奖励
  let gold = Math.floor(correctCount * c.goldPerCorrect * multiplier);
  let exp = Math.floor(correctCount * c.expPerCorrect * multiplier);

  // 高分奖励 (≥45/50)
  if (correctCount >= c.highScoreThreshold) {
    gold += Math.floor(c.highScoreGoldBonus * multiplier);
    exp += Math.floor(c.highScoreExpBonus * multiplier);
  }

  // 满分暴击
  if (correctCount === totalQuestions) {
    gold += Math.floor(c.perfectGoldBonus * multiplier);
    exp += Math.floor(c.perfectExpBonus * multiplier);
  }

  // 处理升级
  let newLevel = currentLevel;
  let newExp = currentExp + exp;
  let leveledUp = false;

  while (newExp >= expForNextLevel(newLevel)) {
    newExp -= expForNextLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  return {
    goldEarned: gold,
    expEarned: exp,
    leveledUp,
    newLevel,
    newExp,
    newGold: currentGold + gold,
  };
}

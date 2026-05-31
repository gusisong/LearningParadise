import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── 角色表 ───
export const characters = sqliteTable("characters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  skinType: text("skin_type").notNull().default("steve"), // steve, alex, etc.
  level: integer("level").notNull().default(1),
  exp: integer("exp").notNull().default(0),
  gold: integer("gold").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── 物品表（预置种子数据）───
export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // weapon, helmet, chestplate, leggings, boots, food, potion
  tier: text("tier").notNull(), // wood, stone, iron, gold, diamond, netherite
  priceGold: integer("price_gold").notNull().default(0),
  atkBonus: integer("atk_bonus").notNull().default(0),
  defBonus: integer("def_bonus").notNull().default(0),
  hpBonus: integer("hp_bonus").notNull().default(0),
  iconKey: text("icon_key").notNull(),
  description: text("description").notNull().default(""),
});

// ─── 角色背包 ───
export const characterInventory = sqliteTable("character_inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  characterId: integer("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  quantity: integer("quantity").notNull().default(1),
  equipped: integer("equipped", { mode: "boolean" }).notNull().default(false),
});

// ─── 练习场次 ───
export const practiceSessions = sqliteTable("practice_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  characterId: integer("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  mode: text("mode").notNull().default("normal"), // normal, challenge
  totalQuestions: integer("total_questions").notNull().default(50),
  correctCount: integer("correct_count").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  goldEarned: integer("gold_earned").notNull().default(0),
  expEarned: integer("exp_earned").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── 单题作答记录 ───
export const practiceAnswers = sqliteTable("practice_answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => practiceSessions.id, { onDelete: "cascade" }),
  questionIndex: integer("question_index").notNull(),
  expression: text("expression").notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  correctAnswer2: integer("correct_answer_2"), // 用于带余数除法的余数
  userAnswer: integer("user_answer"),
  userAnswer2: integer("user_answer_2"), // 用户输入的第二答案
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
  questionType: text("question_type").notNull(),
});

// ─── 错题追踪器 ───
export const wrongQuestionTracker = sqliteTable("wrong_question_tracker", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  characterId: integer("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  questionType: text("question_type").notNull(),
  consecutiveCorrect: integer("consecutive_correct").notNull().default(0),
  isGraduated: integer("is_graduated", { mode: "boolean" }).notNull().default(false),
  totalWrong: integer("total_wrong").notNull().default(0),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── 管理配置 ───
export const adminConfig = sqliteTable("admin_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

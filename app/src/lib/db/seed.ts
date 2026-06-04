import { db, sqlite } from "./index";
import { items, adminConfig } from "./schema";

/**
 * 初始化数据库表结构（如不存在则创建）并填充种子数据
 */
export function initializeDatabase() {
  // 建表 SQL
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      skin_type TEXT NOT NULL DEFAULT 'steve',
      level INTEGER NOT NULL DEFAULT 1,
      exp INTEGER NOT NULL DEFAULT 0,
      gold INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      tier TEXT NOT NULL,
      price_gold INTEGER NOT NULL DEFAULT 0,
      atk_bonus INTEGER NOT NULL DEFAULT 0,
      def_bonus INTEGER NOT NULL DEFAULT 0,
      hp_bonus INTEGER NOT NULL DEFAULT 0,
      icon_key TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS character_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      equipped INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS practice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      mode TEXT NOT NULL DEFAULT 'normal',
      total_questions INTEGER NOT NULL DEFAULT 50,
      correct_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      gold_earned INTEGER NOT NULL DEFAULT 0,
      exp_earned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS practice_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
      question_index INTEGER NOT NULL,
      expression TEXT NOT NULL,
      correct_answer INTEGER NOT NULL,
      user_answer INTEGER,
      is_correct INTEGER NOT NULL DEFAULT 0,
      question_type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wrong_question_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      question_type TEXT NOT NULL,
      consecutive_correct INTEGER NOT NULL DEFAULT 0,
      is_graduated INTEGER NOT NULL DEFAULT 0,
      total_wrong INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 检查是否已有种子数据
  const itemCount = sqlite.prepare("SELECT COUNT(*) as c FROM items").get() as { c: number };
  if (itemCount.c === 0) {
    seedItems();
  }

  const configCount = sqlite.prepare("SELECT COUNT(*) as c FROM admin_config").get() as { c: number };
  if (configCount.c === 0) {
    seedConfig();
  }
}

function seedItems() {
  const seedData = [
    // ── 武器 ──
    { name: "木剑", type: "weapon", tier: "wood", priceGold: 80, atkBonus: 4, defBonus: 0, hpBonus: 0, iconKey: "sword_wood", description: "一把朴素的木质剑" },
    { name: "石剑", type: "weapon", tier: "stone", priceGold: 200, atkBonus: 6, defBonus: 0, hpBonus: 0, iconKey: "sword_stone", description: "石头磨砺的利剑" },
    { name: "铁剑", type: "weapon", tier: "iron", priceGold: 500, atkBonus: 9, defBonus: 0, hpBonus: 0, iconKey: "sword_iron", description: "精铁锻造的强力武器" },
    { name: "金剑", type: "weapon", tier: "gold", priceGold: 400, atkBonus: 7, defBonus: 0, hpBonus: 0, iconKey: "sword_gold", description: "黄金打造，闪闪发光" },
    { name: "钻石剑", type: "weapon", tier: "diamond", priceGold: 1500, atkBonus: 12, defBonus: 0, hpBonus: 0, iconKey: "sword_diamond", description: "钻石切割，锋利无比" },
    // ── 头盔 ──
    { name: "皮革帽", type: "helmet", tier: "leather", priceGold: 30, atkBonus: 0, defBonus: 1, hpBonus: 1, iconKey: "helmet_leather", description: "简易的皮质头盔" },
    { name: "铁头盔", type: "helmet", tier: "iron", priceGold: 200, atkBonus: 0, defBonus: 3, hpBonus: 3, iconKey: "helmet_iron", description: "坚固的铁质头盔" },
    { name: "钻石头盔", type: "helmet", tier: "diamond", priceGold: 500, atkBonus: 0, defBonus: 5, hpBonus: 4, iconKey: "helmet_diamond", description: "钻石头盔，坚不可摧" },
    // ── 胸甲 ──
    { name: "皮革甲", type: "chestplate", tier: "leather", priceGold: 50, atkBonus: 0, defBonus: 2, hpBonus: 2, iconKey: "chest_leather", description: "基本的皮质胸甲" },
    { name: "铁胸甲", type: "chestplate", tier: "iron", priceGold: 350, atkBonus: 0, defBonus: 5, hpBonus: 4, iconKey: "chest_iron", description: "厚重的铁质胸甲" },
    { name: "钻石胸甲", type: "chestplate", tier: "diamond", priceGold: 800, atkBonus: 0, defBonus: 7, hpBonus: 5, iconKey: "chest_diamond", description: "钻石铠甲，王者之选" },
    // ── 护腿 ──
    { name: "皮革裤", type: "leggings", tier: "leather", priceGold: 40, atkBonus: 0, defBonus: 1, hpBonus: 1, iconKey: "legs_leather", description: "简单的皮质护腿" },
    { name: "铁护腿", type: "leggings", tier: "iron", priceGold: 300, atkBonus: 0, defBonus: 4, hpBonus: 3, iconKey: "legs_iron", description: "沉甸甸的铁质护腿" },
    { name: "钻石护腿", type: "leggings", tier: "diamond", priceGold: 700, atkBonus: 0, defBonus: 6, hpBonus: 4, iconKey: "legs_diamond", description: "钻石护腿，无坚不摧" },
    // ── 靴子 ──
    { name: "皮革靴", type: "boots", tier: "leather", priceGold: 25, atkBonus: 0, defBonus: 1, hpBonus: 1, iconKey: "boots_leather", description: "轻便的皮靴" },
    { name: "铁靴子", type: "boots", tier: "iron", priceGold: 180, atkBonus: 0, defBonus: 2, hpBonus: 2, iconKey: "boots_iron", description: "沉稳的铁靴" },
    { name: "钻石靴子", type: "boots", tier: "diamond", priceGold: 450, atkBonus: 0, defBonus: 4, hpBonus: 3, iconKey: "boots_diamond", description: "钻石靴，步步生辉" },
    // ── 消耗品 ──
    { name: "面包", type: "food", tier: "basic", priceGold: 10, atkBonus: 0, defBonus: 0, hpBonus: 10, iconKey: "food_bread", description: "恢复 10 HP" },
    { name: "牛排", type: "food", tier: "basic", priceGold: 25, atkBonus: 0, defBonus: 0, hpBonus: 25, iconKey: "food_steak", description: "恢复 25 HP" },
    { name: "金苹果", type: "food", tier: "rare", priceGold: 100, atkBonus: 0, defBonus: 5, hpBonus: 50, iconKey: "food_golden_apple", description: "恢复 50 HP 并暂时+5 DEF" },
  ];

  const stmt = sqlite.prepare(
    `INSERT INTO items (name, type, tier, price_gold, atk_bonus, def_bonus, hp_bonus, icon_key, description)
     VALUES (@name, @type, @tier, @priceGold, @atkBonus, @defBonus, @hpBonus, @iconKey, @description)`
  );

  const insertMany = sqlite.transaction((data: typeof seedData) => {
    for (const item of data) {
      stmt.run(item);
    }
  });

  insertMany(seedData);
}

function seedConfig() {
  const configs = [
    { key: "admin_password", value: "admin123" },
    { key: "daily_practice_limit", value: "2" },
    { key: "practice_duration_seconds", value: "180" },
    { key: "variant_question_ratio", value: "0.2" },
    { key: "graduation_threshold", value: "5" },
    {
      key: "difficulty_weights",
      value: JSON.stringify({
        accuracy_weight: 0.5,
        speed_weight: 0.3,
        error_type_weight: 0.2,
      }),
    },
    { key: "boosted_question_types", value: "[]" },
    {
      key: "reward_config",
      value: JSON.stringify({
        gold_per_correct: 2,
        exp_per_correct: 3,
        high_score_gold_bonus: 20,
        high_score_exp_bonus: 50,
        high_score_threshold: 45,
        perfect_gold_bonus: 50,
        perfect_exp_bonus: 100,
        challenge_multiplier: 1.5,
      }),
    },
  ];

  const stmt = sqlite.prepare("INSERT INTO admin_config (key, value) VALUES (@key, @value)");
  const insertMany = sqlite.transaction((data: typeof configs) => {
    for (const c of data) {
      stmt.run(c);
    }
  });
  insertMany(configs);
}

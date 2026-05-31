import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characterInventory, items } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { initializeDatabase } from "@/lib/db/seed";

let dbInit = false;
function ensureDB() { if (!dbInit) { initializeDatabase(); dbInit = true; } }

// POST /api/equipment/equip — 装备/卸下物品
export async function POST(request: NextRequest) {
  ensureDB();
  const body = await request.json();
  const { characterId, inventoryId, equip } = body;
  // equip: true = 穿上, false = 卸下

  if (!characterId || !inventoryId || equip === undefined) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  // 验证该背包物品属于此角色
  const invItem = db
    .select({
      id: characterInventory.id,
      characterId: characterInventory.characterId,
      itemId: characterInventory.itemId,
      equipped: characterInventory.equipped,
      type: items.type,
    })
    .from(characterInventory)
    .innerJoin(items, eq(characterInventory.itemId, items.id))
    .where(
      and(
        eq(characterInventory.id, inventoryId),
        eq(characterInventory.characterId, characterId)
      )
    )
    .get();

  if (!invItem) {
    return NextResponse.json({ error: "物品不存在或不属于该角色" }, { status: 404 });
  }

  // 消耗品不能"装备"
  if (invItem.type === "food" || invItem.type === "potion") {
    return NextResponse.json({ error: "消耗品不能装备" }, { status: 400 });
  }

  if (equip) {
    // 先卸下同类型的已装备物品
    const sameTypeEquipped = db
      .select({ id: characterInventory.id })
      .from(characterInventory)
      .innerJoin(items, eq(characterInventory.itemId, items.id))
      .where(
        and(
          eq(characterInventory.characterId, characterId),
          eq(characterInventory.equipped, true),
          eq(items.type, invItem.type)
        )
      )
      .all();

    for (const e of sameTypeEquipped) {
      db.update(characterInventory)
        .set({ equipped: false })
        .where(eq(characterInventory.id, e.id))
        .run();
    }
  }

  // 更新装备状态
  db.update(characterInventory)
    .set({ equipped: equip })
    .where(eq(characterInventory.id, inventoryId))
    .run();

  return NextResponse.json({ success: true, equipped: equip });
}

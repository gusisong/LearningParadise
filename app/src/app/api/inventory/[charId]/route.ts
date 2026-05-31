import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characterInventory, items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { initializeDatabase } from "@/lib/db/seed";

let dbInitialized = false;
function ensureDB() {
  if (!dbInitialized) {
    initializeDatabase();
    dbInitialized = true;
  }
}

// GET /api/inventory/[charId] — 获取角色拥有的所有物品
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ charId: string }> }
) {
  ensureDB();
  const { charId } = await params;
  const characterId = parseInt(charId);

  try {
    const inventory = db
      .select({
        inventoryId: characterInventory.id,
        quantity: characterInventory.quantity,
        equipped: characterInventory.equipped,
        itemId: items.id,
        name: items.name,
        type: items.type,
        tier: items.tier,
        atkBonus: items.atkBonus,
        defBonus: items.defBonus,
        hpBonus: items.hpBonus,
        iconKey: items.iconKey,
        description: items.description,
      })
      .from(characterInventory)
      .innerJoin(items, eq(characterInventory.itemId, items.id))
      .where(eq(characterInventory.characterId, characterId))
      .all();

    return NextResponse.json(inventory);
  } catch (e) {
    return NextResponse.json({ error: "无法获取背包数据" }, { status: 500 });
  }
}

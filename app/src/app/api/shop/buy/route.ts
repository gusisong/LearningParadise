import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { characters, items, characterInventory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { initializeDatabase } from "@/lib/db/seed";

let dbInit = false;
function ensureDB() { if (!dbInit) { initializeDatabase(); dbInit = true; } }

// POST /api/shop/buy — 购买商品
export async function POST(request: NextRequest) {
  ensureDB();
  const body = await request.json();
  const { characterId, itemId } = body;

  if (!characterId || !itemId) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  const char = db.select().from(characters).where(eq(characters.id, characterId)).get();
  if (!char) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  const item = db.select().from(items).where(eq(items.id, itemId)).get();
  if (!item) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  if (item.priceGold <= 0) {
    return NextResponse.json({ error: "该商品不可直接购买" }, { status: 400 });
  }

  if (char.gold < item.priceGold) {
    return NextResponse.json(
      { error: "金币不足", required: item.priceGold, current: char.gold },
      { status: 400 }
    );
  }

  // 装备类（weapon/helmet/chestplate/leggings/boots）只需一把
  const isEquipment = ["weapon", "helmet", "chestplate", "leggings", "boots"].includes(item.type);

  const transact = sqlite.transaction(() => {
    // 扣金币
    db.update(characters)
      .set({ gold: char.gold - item.priceGold })
      .where(eq(characters.id, characterId))
      .run();

    if (isEquipment) {
      // 检查是否已拥有
      const existing = db
        .select()
        .from(characterInventory)
        .where(
          and(
            eq(characterInventory.characterId, characterId),
            eq(characterInventory.itemId, itemId)
          )
        )
        .get();

      if (existing) {
        return { alreadyOwned: true };
      }

      // 添加到背包
      db.insert(characterInventory)
        .values({ characterId, itemId, quantity: 1, equipped: false })
        .run();
    } else {
      // 消耗品：累加数量
      const existing = db
        .select()
        .from(characterInventory)
        .where(
          and(
            eq(characterInventory.characterId, characterId),
            eq(characterInventory.itemId, itemId)
          )
        )
        .get();

      if (existing) {
        db.update(characterInventory)
          .set({ quantity: existing.quantity + 1 })
          .where(eq(characterInventory.id, existing.id))
          .run();
      } else {
        db.insert(characterInventory)
          .values({ characterId, itemId, quantity: 1, equipped: false })
          .run();
      }
    }

    return { alreadyOwned: false };
  });

  const result = transact();

  if (result.alreadyOwned) {
    // 退款
    db.update(characters)
      .set({ gold: char.gold })
      .where(eq(characters.id, characterId))
      .run();
    return NextResponse.json({ error: "已拥有该装备" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    newGold: char.gold - item.priceGold,
    item: item.name,
  });
}

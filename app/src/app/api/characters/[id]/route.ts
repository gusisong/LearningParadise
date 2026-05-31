import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters, characterInventory, items } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getBaseStats } from "@/lib/game/constants";
import { initializeDatabase } from "@/lib/db/seed";

let dbInitialized = false;
function ensureDB() {
  if (!dbInitialized) {
    initializeDatabase();
    dbInitialized = true;
  }
}

// GET /api/characters/[id] — 角色详情（含装备加成后的属性）
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDB();
  const { id } = await params;
  const charId = parseInt(id);

  const char = db.select().from(characters).where(eq(characters.id, charId)).get();
  if (!char) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  // 获取已装备的物品
  const equipped = db
    .select({
      inventoryId: characterInventory.id,
      itemId: items.id,
      name: items.name,
      type: items.type,
      tier: items.tier,
      atkBonus: items.atkBonus,
      defBonus: items.defBonus,
      hpBonus: items.hpBonus,
      iconKey: items.iconKey,
    })
    .from(characterInventory)
    .innerJoin(items, eq(characterInventory.itemId, items.id))
    .where(
      and(
        eq(characterInventory.characterId, charId),
        eq(characterInventory.equipped, true)
      )
    )
    .all();

  // 计算总属性
  const base = getBaseStats(char.level);
  const equipBonus = equipped.reduce(
    (acc, e) => ({
      atk: acc.atk + e.atkBonus,
      def: acc.def + e.defBonus,
      hp: acc.hp + e.hpBonus,
    }),
    { atk: 0, def: 0, hp: 0 }
  );

  return NextResponse.json({
    ...char,
    stats: {
      hp: base.hp + equipBonus.hp,
      atk: base.atk + equipBonus.atk,
      def: base.def + equipBonus.def,
    },
    baseStats: base,
    equipBonus,
    equipped,
  });
}

// PATCH /api/characters/[id] — 修改角色（改名/换肤）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDB();
  const { id } = await params;
  const charId = parseInt(id);
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name.trim();
  if (body.skinType) updates.skinType = body.skinType;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "没有要更新的字段" }, { status: 400 });
  }

  const result = db
    .update(characters)
    .set(updates)
    .where(eq(characters.id, charId))
    .returning()
    .get();

  if (!result) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  return NextResponse.json(result);
}

// DELETE /api/characters/[id] — 删除角色（需管理员密码）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDB();
  const { id } = await params;
  const charId = parseInt(id);

  // 从 header 中读取管理员密码
  const adminPwd = request.headers.get("x-admin-password");
  const { sqlite } = await import("@/lib/db");
  const config = sqlite
    .prepare("SELECT value FROM admin_config WHERE key = 'admin_password'")
    .get() as { value: string } | undefined;

  if (!config || adminPwd !== config.value) {
    return NextResponse.json({ error: "管理员密码错误" }, { status: 403 });
  }

  db.delete(characters).where(eq(characters.id, charId)).run();
  return NextResponse.json({ success: true });
}

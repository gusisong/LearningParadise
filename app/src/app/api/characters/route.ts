import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { initializeDatabase } from "@/lib/db/seed";

// 确保数据库已初始化
let dbInitialized = false;
function ensureDB() {
  if (!dbInitialized) {
    initializeDatabase();
    dbInitialized = true;
  }
}

// GET /api/characters — 获取所有角色
export async function GET() {
  ensureDB();
  const allCharacters = db.select().from(characters).all();
  return NextResponse.json(allCharacters);
}

// POST /api/characters — 创建新角色
export async function POST(request: NextRequest) {
  ensureDB();
  try {
    const body = await request.json();
    const { name, skinType } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "角色名称不能为空" },
        { status: 400 }
      );
    }

    if (name.trim().length > 12) {
      return NextResponse.json(
        { error: "角色名称不能超过12个字符" },
        { status: 400 }
      );
    }

    const result = db
      .insert(characters)
      .values({
        name: name.trim(),
        skinType: skinType || "steve",
      })
      .returning()
      .get();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建角色失败: " + String(error) },
      { status: 500 }
    );
  }
}

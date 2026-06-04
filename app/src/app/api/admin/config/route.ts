import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { adminConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { initializeDatabase } from "@/lib/db/seed";

let dbInit = false;
function ensureDB() { if (!dbInit) { initializeDatabase(); dbInit = true; } }

function getAdminPassword(): string {
  const row = sqlite
    .prepare("SELECT value FROM admin_config WHERE key = 'admin_password'")
    .get() as { value: string } | undefined;
  return row?.value || "admin123";
}

function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return false;
  const password = getAdminPassword();
  return authHeader === `Bearer ${password}`;
}

// GET /api/admin/config — 获取所有管理配置
export async function GET(request: NextRequest) {
  ensureDB();
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = db.select().from(adminConfig).all();
  const result: Record<string, string> = {};
  for (const c of configs) {
    result[c.key] = c.value;
  }

  return NextResponse.json(result);
}

// PUT /api/admin/config — 更新指定配置项
export async function PUT(request: NextRequest) {
  ensureDB();
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { key, value } = body;

  if (!key || value === undefined) {
    return NextResponse.json({ error: "缺少 key 或 value" }, { status: 400 });
  }

  // 不允许通过此接口修改密码
  if (key === "admin_password") {
    return NextResponse.json({ error: "不允许修改密码" }, { status: 403 });
  }

  const existing = db.select().from(adminConfig).where(eq(adminConfig.key, key)).get();
  if (existing) {
    db.update(adminConfig)
      .set({ value: String(value) })
      .where(eq(adminConfig.key, key))
      .run();
  } else {
    db.insert(adminConfig).values({ key, value: String(value) }).run();
  }

  return NextResponse.json({ ok: true, key, value: String(value) });
}

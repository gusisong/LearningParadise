import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { initializeDatabase } from "@/lib/db/seed";

let dbInit = false;
function ensureDB() { if (!dbInit) { initializeDatabase(); dbInit = true; } }

// GET /api/practice/config — 获取练习配置（无需鉴权）
export async function GET() {
  ensureDB();

  const durationRow = sqlite
    .prepare("SELECT value FROM admin_config WHERE key = 'practice_duration_seconds'")
    .get() as { value: string } | undefined;

  const durationSeconds = durationRow ? parseInt(durationRow.value) : 240;

  return NextResponse.json({ durationSeconds });
}

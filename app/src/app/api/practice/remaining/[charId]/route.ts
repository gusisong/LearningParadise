import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { initializeDatabase } from "@/lib/db/seed";
import { PRACTICE_CONFIG } from "@/lib/game/constants";

let dbInit = false;
function ensureDB() { if (!dbInit) { initializeDatabase(); dbInit = true; } }

// GET /api/practice/remaining/[charId] — 今日剩余练习次数
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ charId: string }> }
) {
  ensureDB();
  const { charId } = await params;
  const characterId = parseInt(charId);

  const today = new Date().toISOString().split("T")[0];
  const result = sqlite
    .prepare(
      `SELECT COUNT(*) as c FROM practice_sessions
       WHERE character_id = ? AND created_at >= ?`
    )
    .get(characterId, today) as { c: number };

  const dailyLimit = PRACTICE_CONFIG.dailyLimit;
  const remaining = Math.max(0, dailyLimit - result.c);

  return NextResponse.json({ remaining, dailyLimit, usedToday: result.c });
}

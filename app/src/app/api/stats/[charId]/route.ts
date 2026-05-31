import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { initializeDatabase } from "@/lib/db/seed";

let dbInit = false;
function ensureDB() { if (!dbInit) { initializeDatabase(); dbInit = true; } }

// GET /api/stats/[charId] — 角色统计数据
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ charId: string }> }
) {
  ensureDB();
  const { charId } = await params;
  const characterId = parseInt(charId);

  // 最近 30 天的练习记录
  const sessions = sqlite
    .prepare(
      `SELECT id, mode, total_questions, correct_count, duration_ms,
              gold_earned, exp_earned, created_at
       FROM practice_sessions
       WHERE character_id = ?
       ORDER BY created_at DESC
       LIMIT 60`
    )
    .all(characterId) as Array<{
    id: number;
    mode: string;
    total_questions: number;
    correct_count: number;
    duration_ms: number;
    gold_earned: number;
    exp_earned: number;
    created_at: string;
  }>;

  // 里程碑
  const bestScore = sqlite
    .prepare(
      `SELECT MAX(correct_count) as best FROM practice_sessions WHERE character_id = ?`
    )
    .get(characterId) as { best: number | null };

  const fastestTime = sqlite
    .prepare(
      `SELECT MIN(duration_ms) as fastest FROM practice_sessions
       WHERE character_id = ? AND correct_count = total_questions`
    )
    .get(characterId) as { fastest: number | null };

  const totalSessions = sqlite
    .prepare(
      `SELECT COUNT(*) as total FROM practice_sessions WHERE character_id = ?`
    )
    .get(characterId) as { total: number };

  const totalCorrect = sqlite
    .prepare(
      `SELECT COALESCE(SUM(correct_count), 0) as total FROM practice_sessions WHERE character_id = ?`
    )
    .get(characterId) as { total: number };

  // 连续全对天数
  const perfectDays = sqlite
    .prepare(
      `SELECT DISTINCT DATE(created_at) as d FROM practice_sessions
       WHERE character_id = ? AND correct_count = total_questions
       ORDER BY d DESC`
    )
    .all(characterId) as Array<{ d: string }>;

  let consecutivePerfectDays = 0;
  if (perfectDays.length > 0) {
    const today = new Date();
    let checkDate = new Date(perfectDays[0].d);
    // 只有从今天或昨天开始才算连续
    const diffFromToday = Math.floor(
      (today.getTime() - checkDate.getTime()) / 86400000
    );
    if (diffFromToday <= 1) {
      consecutivePerfectDays = 1;
      for (let i = 1; i < perfectDays.length; i++) {
        const prevDate = new Date(perfectDays[i].d);
        const diff = Math.floor(
          (checkDate.getTime() - prevDate.getTime()) / 86400000
        );
        if (diff === 1) {
          consecutivePerfectDays++;
          checkDate = prevDate;
        } else {
          break;
        }
      }
    }
  }

  // 错题统计
  const wrongTypes = sqlite
    .prepare(
      `SELECT question_type, total_wrong, consecutive_correct, is_graduated
       FROM wrong_question_tracker
       WHERE character_id = ?
       ORDER BY total_wrong DESC`
    )
    .all(characterId);

  return NextResponse.json({
    sessions,
    milestones: {
      bestScore: bestScore.best ?? 0,
      fastestPerfectMs: fastestTime.fastest,
      totalSessions: totalSessions.total,
      totalCorrectAnswers: totalCorrect.total,
      consecutivePerfectDays,
    },
    wrongTypes,
  });
}

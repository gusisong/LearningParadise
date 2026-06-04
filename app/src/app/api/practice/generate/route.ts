import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { wrongQuestionTracker } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateQuestions } from "@/lib/game/questionEngine";
import type { QuestionType } from "@/lib/game/constants";
import { initializeDatabase } from "@/lib/db/seed";

let dbInit = false;
function ensureDB() { if (!dbInit) { initializeDatabase(); dbInit = true; } }

// POST /api/practice/generate — 生成 40 道题 + 返回配置
export async function POST(request: NextRequest) {
  ensureDB();
  const body = await request.json();
  const { characterId, mode = "normal" } = body;

  if (!characterId) {
    return NextResponse.json({ error: "缺少 characterId" }, { status: 400 });
  }

  // 从 admin_config 读取练习时长
  const durationRow = sqlite
    .prepare("SELECT value FROM admin_config WHERE key = 'practice_duration_seconds'")
    .get() as { value: string } | undefined;
  const durationSeconds = durationRow ? parseInt(durationRow.value) : 240;

  // 从 admin_config 读取偏好题型
  const boostedRow = sqlite
    .prepare("SELECT value FROM admin_config WHERE key = 'boosted_question_types'")
    .get() as { value: string } | undefined;
  let boostedTypes: QuestionType[] = [];
  if (boostedRow) {
    try {
      boostedTypes = JSON.parse(boostedRow.value) as QuestionType[];
    } catch {
      boostedTypes = [];
    }
  }

  // 查询该角色未毕业的错题类型
  const weakEntries = db
    .select()
    .from(wrongQuestionTracker)
    .where(
      and(
        eq(wrongQuestionTracker.characterId, characterId),
        eq(wrongQuestionTracker.isGraduated, false)
      )
    )
    .all();

  // 按错误次数降序排序，取权重最高的类型
  const weakTypes = weakEntries
    .sort((a, b) => b.totalWrong - a.totalWrong)
    .map((e) => e.questionType as QuestionType);

  const questions = generateQuestions({
    mode: mode as "normal" | "challenge",
    weakTypes,
    variantCount: 10,
    boostedTypes,
  });

  return NextResponse.json({
    durationSeconds,
    questions: questions.map((q, i) => ({
      index: i,
      expression: q.expression,
      answer: q.answer,
      answer2: q.answer2,
      type: q.type,
    })),
  });
}

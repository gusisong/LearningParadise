import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wrongQuestionTracker } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateQuestions } from "@/lib/game/questionEngine";
import type { QuestionType } from "@/lib/game/constants";
import { initializeDatabase } from "@/lib/db/seed";

let dbInit = false;
function ensureDB() { if (!dbInit) { initializeDatabase(); dbInit = true; } }

// POST /api/practice/generate — 生成 50 道题
export async function POST(request: NextRequest) {
  ensureDB();
  const body = await request.json();
  const { characterId, mode = "normal" } = body;

  if (!characterId) {
    return NextResponse.json({ error: "缺少 characterId" }, { status: 400 });
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
  });

  return NextResponse.json({
    questions: questions.map((q, i) => ({
      index: i,
      expression: q.expression,
      answer: q.answer,
      type: q.type,
    })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import {
  characters,
  practiceSessions,
  practiceAnswers,
  wrongQuestionTracker,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateRewards } from "@/lib/game/rewards";
import { initializeDatabase } from "@/lib/db/seed";

let dbInit = false;
function ensureDB() { if (!dbInit) { initializeDatabase(); dbInit = true; } }

// POST /api/practice/submit — 提交答卷
export async function POST(request: NextRequest) {
  ensureDB();
  const body = await request.json();
  const { characterId, mode, durationMs, answers } = body;
  // answers: Array<{ index, expression, correctAnswer, userAnswer, type }>

  if (!characterId || !answers || !Array.isArray(answers)) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  // 获取角色
  const char = db
    .select()
    .from(characters)
    .where(eq(characters.id, characterId))
    .get();
  if (!char) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  // 检查每日限制
  const today = new Date().toISOString().split("T")[0];
  const todayCount = sqlite
    .prepare(
      `SELECT COUNT(*) as c FROM practice_sessions
       WHERE character_id = ? AND created_at >= ?`
    )
    .get(characterId, today) as { c: number };

  if (todayCount.c >= 2) {
    return NextResponse.json(
      { error: "今日练习次数已用完" },
      { status: 429 }
    );
  }

  // 计算正确数
  const correctCount = answers.filter(
    (a: { userAnswer: number; correctAnswer: number; userAnswer2?: number; correctAnswer2?: number }) => {
      if (a.userAnswer === null || a.userAnswer === undefined) return false;
      if (a.userAnswer !== a.correctAnswer) return false;
      if (a.correctAnswer2 !== undefined && a.correctAnswer2 !== null) {
        return a.userAnswer2 === a.correctAnswer2;
      }
      return true;
    }
  ).length;

  // 计算奖励
  const reward = calculateRewards(
    correctCount,
    answers.length,
    mode || "normal",
    char.level,
    char.exp,
    char.gold
  );

  // 用事务写入所有数据
  const transact = sqlite.transaction(() => {
    // 1. 创建练习记录
    const session = db
      .insert(practiceSessions)
      .values({
        characterId,
        mode: mode || "normal",
        totalQuestions: answers.length,
        correctCount,
        durationMs: durationMs || 0,
        goldEarned: reward.goldEarned,
        expEarned: reward.expEarned,
      })
      .returning()
      .get();

    // 2. 写入每题详细作答
    for (const a of answers) {
      const isCorrect = 
        a.userAnswer !== null && 
        a.userAnswer !== undefined && 
        a.userAnswer === a.correctAnswer &&
        (a.correctAnswer2 == null || a.userAnswer2 === a.correctAnswer2);

      db.insert(practiceAnswers)
        .values({
          sessionId: session.id,
          questionIndex: a.index,
          expression: a.expression,
          correctAnswer: a.correctAnswer,
          correctAnswer2: a.correctAnswer2 ?? null,
          userAnswer: a.userAnswer ?? null,
          userAnswer2: a.userAnswer2 ?? null,
          isCorrect,
          questionType: a.type,
        })
        .run();
    }

    // 3. 更新角色金币、经验、等级
    db.update(characters)
      .set({
        gold: reward.newGold,
        exp: reward.newExp,
        level: reward.newLevel,
      })
      .where(eq(characters.id, characterId))
      .run();

    // 4. 更新错题追踪器
    for (const a of answers) {
      const isCorrect = 
        a.userAnswer !== null && 
        a.userAnswer !== undefined && 
        a.userAnswer === a.correctAnswer &&
        (a.correctAnswer2 == null || a.userAnswer2 === a.correctAnswer2);

      const existing = db
        .select()
        .from(wrongQuestionTracker)
        .where(
          and(
            eq(wrongQuestionTracker.characterId, characterId),
            eq(wrongQuestionTracker.questionType, a.type)
          )
        )
        .get();

      if (isCorrect && existing) {
        // 答对：递增连续正确次数
        const newConsecutive = existing.consecutiveCorrect + 1;
        db.update(wrongQuestionTracker)
          .set({
            consecutiveCorrect: newConsecutive,
            isGraduated: newConsecutive >= 10,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(wrongQuestionTracker.id, existing.id))
          .run();
      } else if (!isCorrect) {
        if (existing) {
          // 答错：重置连续计数，累加错误总数
          db.update(wrongQuestionTracker)
            .set({
              consecutiveCorrect: 0,
              isGraduated: false,
              totalWrong: existing.totalWrong + 1,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(wrongQuestionTracker.id, existing.id))
            .run();
        } else {
          // 首次出错：新建记录
          db.insert(wrongQuestionTracker)
            .values({
              characterId,
              questionType: a.type,
              consecutiveCorrect: 0,
              isGraduated: false,
              totalWrong: 1,
            })
            .run();
        }
      }
    }

    return session;
  });

  const session = transact();

  return NextResponse.json({
    sessionId: session.id,
    correctCount,
    totalQuestions: answers.length,
    score: Math.round((correctCount / answers.length) * 100),
    goldEarned: reward.goldEarned,
    expEarned: reward.expEarned,
    leveledUp: reward.leveledUp,
    newLevel: reward.newLevel,
  });
}

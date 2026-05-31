"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QUESTION_TYPES } from "@/lib/game/constants";
import { useSound } from "@/contexts/SoundContext";

interface PracticeResult {
  sessionId: number;
  correctCount: number;
  totalQuestions: number;
  score: number;
  goldEarned: number;
  expEarned: number;
  leveledUp: boolean;
  newLevel: number;
  questions: Array<{ index: number; expression: string; answer: number; answer2?: number; type: string }>;
  userAnswers: Array<{ correctAnswer: number; correctAnswer2?: number; userAnswer: number | null; userAnswer2: number | null }>;
}

export default function PracticeResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [showWrong, setShowWrong] = useState(false);
  const { playLevelUp } = useSound();

  useEffect(() => {
    const saved = localStorage.getItem("practiceResult");
    if (saved) {
      const parsed = JSON.parse(saved);
      setResult(parsed);
      if (parsed.leveledUp) {
        playLevelUp();
      }
    } else {
      router.push("/home");
    }
  }, [router, playLevelUp]);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-mc-gold animate-pulse">载入中...</p>
      </div>
    );
  }

  const isPerfect = result.correctCount === result.totalQuestions;
  const wrongQuestions = result.questions.filter((q, i) => {
    const ua = result.userAnswers[i];
    if (!ua) return true;
    if (ua.userAnswer !== ua.correctAnswer) return true;
    if (ua.correctAnswer2 !== undefined && ua.correctAnswer2 !== null) {
      if (ua.userAnswer2 !== ua.correctAnswer2) return true;
    }
    return false;
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="mc-panel max-w-lg w-full text-center p-6">
        {/* 标题 */}
        <h1
          className="text-2xl mb-4 font-mc"
          style={{
            color: isPerfect ? "#FFD700" : result.score >= 90 ? "#7FFF00" : "#E8E8E8",
            textShadow: "3px 3px 0 #000",
          }}
        >
          {isPerfect ? "🏆 满分暴击！" : result.score >= 90 ? "⭐ 表现优秀！" : result.score >= 60 ? "👍 继续努力！" : "💪 不要放弃！"}
        </h1>

        {/* 得分 */}
        <div className="text-5xl font-bold text-mc-gold mb-2 font-mc" style={{ textShadow: "3px 3px 0 #000" }}>
          {result.score}
          <span className="text-lg">分</span>
        </div>
        <p className="text-sm text-mc-dim mb-6 font-mc">
          {result.correctCount} / {result.totalQuestions} 道题正确
        </p>

        {/* 奖励 */}
        <div className="flex justify-center gap-6 mb-6 font-mc">
          <div className="mc-panel px-6 py-4 text-center border-2">
            <div className="text-mc-gold text-2xl mb-2">+{result.goldEarned}</div>
            <div className="text-sm text-mc-dim">金币 💰</div>
          </div>
          <div className="mc-panel px-6 py-4 text-center border-2">
            <div className="text-mc-exp text-2xl mb-2">+{result.expEarned}</div>
            <div className="text-sm text-mc-dim">经验 ✨</div>
          </div>
        </div>

        {/* 升级提示 */}
        {result.leveledUp && (
          <div
            className="mc-panel mb-6 py-4 text-mc-gold font-mc text-lg"
            style={{
              background: "rgba(255, 215, 0, 0.1)",
              borderColor: "#FFD700",
            }}
          >
            🎉 恭喜升级！当前等级: Lv.{result.newLevel}
          </div>
        )}

        {/* 错题回顾 */}
        {wrongQuestions.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowWrong(!showWrong)}
              className="mc-btn text-sm px-6 py-3 mb-4 font-mc"
            >
              {showWrong ? "收起错题" : `📋 查看错题 (${wrongQuestions.length}道)`}
            </button>

            {showWrong && (
              <div className="mc-panel text-left max-h-60 overflow-y-auto p-4 border-2">
                {wrongQuestions.map((q, i) => {
                  const ua = result.userAnswers[q.index];
                  
                  let userExpr = q.expression;
                  let correctExpr = q.expression;
                  
                  if (q.expression.includes("{ans2}")) {
                     userExpr = userExpr.replace("{ans}", String(ua?.userAnswer ?? "未答")).replace("{ans2}", String(ua?.userAnswer2 ?? "未答"));
                     correctExpr = correctExpr.replace("{ans}", String(q.answer)).replace("{ans2}", String(q.answer2));
                  } else if (q.expression.includes("{ans}")) {
                     userExpr = userExpr.replace("{ans}", String(ua?.userAnswer ?? "未答"));
                     correctExpr = correctExpr.replace("{ans}", String(q.answer));
                  } else {
                     userExpr = `${q.expression} = ${ua?.userAnswer ?? "未答"}`;
                     correctExpr = `${q.expression} = ${q.answer}`;
                  }

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3 text-sm font-mc border-b border-panel-border last:border-0"
                    >
                      <div className="flex-1 flex flex-col gap-2 font-sans text-base whitespace-nowrap overflow-x-auto no-scrollbar">
                        <span className="text-mc-red">
                          <span className="text-mc-dim mr-2 font-mc text-sm">你的作答:</span>
                          {userExpr}
                        </span>
                        <span className="text-mc-exp">
                          <span className="text-mc-dim mr-2 font-mc text-sm">正确答案:</span>
                          {correctExpr}
                        </span>
                      </div>
                      <span className="text-mc-dim text-xs w-28 text-right ml-4">
                        {QUESTION_TYPES[q.type as keyof typeof QUESTION_TYPES] || q.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-4 justify-center mt-6">
          <button
            onClick={() => {
              localStorage.removeItem("practiceResult");
              router.push("/home");
            }}
            className="mc-btn mc-btn-primary text-base px-8 py-4 font-mc"
          >
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
}

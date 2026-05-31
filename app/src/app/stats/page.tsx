"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QUESTION_TYPES } from "@/lib/game/constants";

interface Session {
  id: number;
  mode: string;
  total_questions: number;
  correct_count: number;
  duration_ms: number;
  gold_earned: number;
  exp_earned: number;
  created_at: string;
}

interface StatsData {
  sessions: Session[];
  milestones: {
    bestScore: number;
    fastestPerfectMs: number | null;
    totalSessions: number;
    totalCorrectAnswers: number;
    consecutivePerfectDays: number;
  };
  wrongTypes: Array<{
    question_type: string;
    total_wrong: number;
    consecutive_correct: number;
    is_graduated: number;
  }>;
}

export default function StatsPage() {
  const router = useRouter();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"overview" | "wrong">("overview");

  const charId = typeof window !== "undefined" ? localStorage.getItem("characterId") : null;

  const loadStats = useCallback(async () => {
    if (!charId) { router.push("/"); return; }
    try {
      const res = await fetch(`/api/stats/${charId}`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [charId, router]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-mc-gold animate-pulse">载入中...</p>
      </div>
    );
  }

  const m = data.milestones;
  const recentSessions = data.sessions.slice(0, 14);

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部栏 */}
      <header className="mc-navbar">
        <button onClick={() => router.push("/home")} className="mc-btn text-xs px-4 py-2 font-mc">
          ← 返回
        </button>
        <span className="text-base text-mc-gold font-mc" style={{ textShadow: "2px 2px 0 #000" }}>
          成长数据
        </span>
        <div />
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* 里程碑 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="mc-panel text-center py-4">
            <div className="text-mc-gold text-2xl font-mc">{m.bestScore}/50</div>
            <div className="text-xs text-mc-dim font-mc mt-1">历史最高分</div>
          </div>
          <div className="mc-panel text-center py-4">
            <div className="text-mc-exp text-2xl font-mc">
              {m.fastestPerfectMs ? `${(m.fastestPerfectMs / 1000).toFixed(1)}s` : "-"}
            </div>
            <div className="text-xs text-mc-dim font-mc mt-1">最快满分</div>
          </div>
          <div className="mc-panel text-center py-4">
            <div className="text-mc-diamond text-2xl font-mc">{m.totalSessions}</div>
            <div className="text-xs text-mc-dim font-mc mt-1">总练习次数</div>
          </div>
          <div className="mc-panel text-center py-4">
            <div className="text-mc-red text-2xl font-mc">{m.consecutivePerfectDays}</div>
            <div className="text-xs text-mc-dim font-mc mt-1">连续全对天数</div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-4">
          <button
            onClick={() => setView("overview")}
            className={`mc-btn text-xs px-6 py-2 font-mc ${view === "overview" ? "mc-btn-primary" : ""}`}
          >
            近期趋势
          </button>
          <button
            onClick={() => setView("wrong")}
            className={`mc-btn text-xs px-6 py-2 font-mc ${view === "wrong" ? "mc-btn-primary" : ""}`}
          >
            错题分析
          </button>
        </div>

        {view === "overview" && (
          <>
            {/* 正确率趋势（文字版柱状图） */}
            <div className="mc-panel p-4">
              <h3 className="text-sm text-mc-gold mb-4 font-mc">正确率趋势</h3>
              {recentSessions.length === 0 ? (
                <p className="text-xs text-mc-dim">暂无练习记录</p>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((s) => {
                    const pct = Math.round(
                      (s.correct_count / s.total_questions) * 100
                    );
                    const date = new Date(s.created_at).toLocaleDateString("zh-CN", {
                      month: "short", day: "numeric",
                    });
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="text-xs text-mc-dim w-16">{date}</span>
                        <div className="flex-1 h-6 bg-black/40 relative rounded-sm overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background:
                                pct === 100
                                  ? "linear-gradient(90deg, #FFD700, #FFA500)"
                                  : pct >= 90
                                  ? "#7FFF00"
                                  : pct >= 60
                                  ? "#FF9800"
                                  : "#FF4444",
                            }}
                          />
                        </div>
                        <span className="text-xs w-10 text-right font-mc">
                          {pct}%
                        </span>
                        <span className="text-xs text-mc-dim w-12 text-right">
                          {(s.duration_ms / 1000).toFixed(0)}s
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 累计统计 */}
            <div className="mc-panel p-4 text-sm text-mc-dim font-mc">
              <p>📝 总答题量: <span className="text-white">{m.totalCorrectAnswers}</span> 道</p>
            </div>
          </>
        )}

        {view === "wrong" && (
          <div className="mc-panel p-4">
            <h3 className="text-sm text-mc-gold mb-4 font-mc">错题类型分析</h3>
            {data.wrongTypes.length === 0 ? (
              <p className="text-xs text-mc-dim">还没有错题记录，继续加油！</p>
            ) : (
              <div className="space-y-3">
                {data.wrongTypes.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-panel-border last:border-0"
                  >
                    <span className="text-sm font-mc">
                      {QUESTION_TYPES[w.question_type as keyof typeof QUESTION_TYPES] || w.question_type}
                    </span>
                    <div className="flex items-center gap-4 text-xs font-mc">
                      <span className="text-mc-red">错 {w.total_wrong} 次</span>
                      <span className="text-mc-exp">
                        连对 {w.consecutive_correct}/5
                      </span>
                      {w.is_graduated ? (
                        <span className="text-mc-gold">🎓 已毕业</span>
                      ) : (
                        <span className="text-mc-dim">学习中</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

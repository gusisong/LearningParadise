"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Question {
  index: number;
  expression: string;
  answer: number;
  type: string;
}

const DURATION_SECONDS = 180; // 3 分钟

export default function PracticePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<(string)[]>([]);
  const [mode, setMode] = useState<"normal" | "challenge">("normal");
  const [phase, setPhase] = useState<"setup" | "exam" | "submitting">("setup");
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [startTime, setStartTime] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const characterId =
    typeof window !== "undefined"
      ? localStorage.getItem("characterId")
      : null;

  // ─── 防刷新恢复 ───
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("practiceState");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        const now = Date.now();
        const elapsed = Math.floor((now - state.startTime) / 1000);
        const remaining = DURATION_SECONDS - elapsed;

        if (remaining > 0 && state.questions?.length > 0) {
          setQuestions(state.questions);
          setUserAnswers(state.userAnswers || new Array(50).fill(""));
          setMode(state.mode || "normal");
          setTimeLeft(remaining);
          setStartTime(state.startTime);
          setPhase("exam");
          return;
        }
      } catch {
        /* ignore corrupt state */
      }
      localStorage.removeItem("practiceState");
    }
  }, []);

  // ─── 保存状态到 localStorage ───
  useEffect(() => {
    if (phase === "exam" && questions.length > 0) {
      localStorage.setItem(
        "practiceState",
        JSON.stringify({ questions, userAnswers, mode, startTime })
      );
    }
  }, [userAnswers, phase, questions, mode, startTime]);

  // ─── 倒计时 ───
  useEffect(() => {
    if (phase !== "exam") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── 开始考试 ───
  async function startExam() {
    if (!characterId) {
      router.push("/");
      return;
    }
    try {
      const res = await fetch("/api/practice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: parseInt(characterId), mode }),
      });
      const data = await res.json();
      setQuestions(data.questions);
      setUserAnswers(new Array(data.questions.length).fill(""));
      setStartTime(Date.now());
      setTimeLeft(DURATION_SECONDS);
      setPhase("exam");

      // 聚焦第一个输入框
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (e) {
      console.error("Failed to generate questions:", e);
    }
  }

  // ─── 提交答卷 ───
  const handleSubmit = useCallback(async () => {
    if (phase === "submitting") return;
    setPhase("submitting");
    if (timerRef.current) clearInterval(timerRef.current);

    const durationMs = Date.now() - startTime;
    const answers = questions.map((q, i) => ({
      index: q.index,
      expression: q.expression,
      correctAnswer: q.answer,
      userAnswer: userAnswers[i] !== "" ? parseInt(userAnswers[i]) : null,
      type: q.type,
    }));

    try {
      const res = await fetch("/api/practice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: parseInt(characterId!),
          mode,
          durationMs,
          answers,
        }),
      });
      const result = await res.json();

      // 清除缓存的考试状态
      localStorage.removeItem("practiceState");

      // 跳转结算页
      localStorage.setItem("practiceResult", JSON.stringify({
        ...result,
        questions,
        userAnswers: answers,
      }));
      router.push("/practice/result");
    } catch (e) {
      console.error("Submit failed:", e);
      setPhase("exam");
    }
  }, [phase, startTime, questions, userAnswers, characterId, mode, router]);

  // ─── 焦点流转 ───
  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const next = index + 1;
      if (next < questions.length) {
        inputRefs.current[next]?.focus();
        inputRefs.current[next]?.select();
      }
    }
  }

  // ─── 输入处理 + 自动长度跳转 ───
  function handleInput(index: number, value: string) {
    // 仅允许数字和负号
    const cleaned = value.replace(/[^0-9\-]/g, "");
    const newAnswers = [...userAnswers];
    newAnswers[index] = cleaned;
    setUserAnswers(newAnswers);

    // 自动长度跳转：当输入位数与答案位数相同时，跳到下一题
    if (cleaned.length > 0) {
      const answerLen = Math.abs(questions[index].answer).toString().length;
      if (cleaned.length >= answerLen && index + 1 < questions.length) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
          inputRefs.current[index + 1]?.select();
        }, 50);
      }
    }
  }

  // ─── 格式化时间 ───
  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  // ─── 开始前的设置界面 ───
  if (phase === "setup") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black/40">
        <div className="mc-panel max-w-md w-full p-8 flex flex-col items-center border-[3px]">
          <h1 className="text-mc-gold text-2xl mb-8 font-mc border-b-2 border-[#1A1A1A] w-full text-center pb-4" style={{ textShadow: "2px 2px 0 #000" }}>
            📝 口算练习
          </h1>

          <div className="w-full mb-8">
            <p className="text-sm text-mc-dim mb-4 font-mc text-center">选择难度</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setMode("normal")}
                className={`mc-btn text-sm px-6 py-3 font-mc ${mode === "normal" ? "mc-btn-primary" : ""}`}
              >
                普通
              </button>
              <button
                onClick={() => setMode("challenge")}
                className={`mc-btn text-sm px-6 py-3 font-mc ${mode === "challenge" ? "mc-btn-danger border-mc-gold" : ""}`}
              >
                ⚡ 挑战
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-300 mb-8 space-y-3 font-mc text-center bg-black/30 p-4 border border-[#1A1A1A] shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)] w-full">
            <p>📋 50 道题 <span className="text-mc-dim mx-2">|</span> ⏱ 3 分钟</p>
            <p className={mode === "challenge" ? "text-mc-red" : "text-mc-exp"}>
              {mode === "challenge" ? "🔥 挑战模式：题目更难，奖励×1.5" : "📖 普通模式：标准难度"}
            </p>
          </div>

          <div className="flex gap-4 w-full mt-2">
            <button
              onClick={() => router.push("/home")}
              className="mc-btn flex-1 text-sm py-4 font-mc"
            >
              返回
            </button>
            <button onClick={startExam} className="mc-btn mc-btn-primary flex-[2] text-lg py-4 font-mc">
              开始考试!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 考试界面 ───
  const isDisabled = phase === "submitting";

  return (
    <div className="min-h-screen flex flex-col">
      {/* 置顶毛玻璃倒计时 */}
      <div className="mc-navbar !py-3">
        <span className="text-sm text-mc-dim font-mc">
          {mode === "challenge" ? "⚡ 挑战" : "📝 普通"} 模式
        </span>

        <span
          className={`text-2xl font-bold ${timeLeft <= 60 ? "timer-critical" : "text-mc-gold"}`}
          style={{ textShadow: "2px 2px 0 #000" }}
        >
          ⏱ {formatTime(timeLeft)}
        </span>

        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="mc-btn mc-btn-primary text-xs px-6 py-2 font-mc"
        >
          {isDisabled ? "..." : "交卷"}
        </button>
      </div>

      {/* 50 题双列网格 */}
      <div className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {questions.map((q, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              {/* 题号 */}
              <span className="text-mc-dim text-sm w-8 text-right flex-shrink-0 font-mc">
                {i + 1}.
              </span>

              {/* 表达式 */}
              <span className="text-base md:text-lg flex-1 whitespace-nowrap">
                {q.expression} =
              </span>

              {/* 括号包裹的输入框 */}
              <span className="text-lg text-mc-dim">(</span>
              <input
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                value={userAnswers[i] || ""}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                disabled={isDisabled}
                className="exam-input"
                autoComplete="off"
              />
              <span className="text-lg text-mc-dim">)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Question {
  index: number;
  expression: string;
  answer: number;
  answer2?: number;
  type: string;
}

interface AnswerPair {
  ans1: string;
  ans2: string;
}

const DURATION_SECONDS = 180; // 3 分钟

export default function PracticePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<AnswerPair[]>([]);
  const [phase, setPhase] = useState<"setup" | "exam" | "submitting">("setup");
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [startTime, setStartTime] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>(new Array(100).fill(null));
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
          setUserAnswers(state.userAnswers || new Array(40).fill({ ans1: "", ans2: "" }));
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
        JSON.stringify({ questions, userAnswers, startTime })
      );
    }
  }, [userAnswers, phase, questions, startTime]);

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
        body: JSON.stringify({ characterId: parseInt(characterId) }),
      });
      const data = await res.json();
      setQuestions(data.questions);
      setUserAnswers(new Array(data.questions.length).fill({ ans1: "", ans2: "" }));
      setStartTime(Date.now());
      setTimeLeft(DURATION_SECONDS);
      setPhase("exam");

      // 聚焦第一个输入框
      setTimeout(() => {
        let first = 0;
        while (first < 100 && !inputRefs.current[first]) first++;
        inputRefs.current[first]?.focus();
      }, 100);
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
      correctAnswer2: q.answer2,
      userAnswer: userAnswers[i]?.ans1 !== "" ? parseInt(userAnswers[i].ans1) : null,
      userAnswer2: userAnswers[i]?.ans2 !== "" ? parseInt(userAnswers[i].ans2) : null,
      type: q.type,
    }));

    try {
      const res = await fetch("/api/practice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: parseInt(characterId!),
          durationMs,
          answers,
        }),
      });
      const result = await res.json();

      localStorage.removeItem("practiceState");
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
  }, [phase, startTime, questions, userAnswers, characterId, router]);

  // ─── 焦点流转 ───
  function handleKeyDown(e: React.KeyboardEvent, inputIndex: number) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      let next = inputIndex + 1;
      while (next < 100 && !inputRefs.current[next]) {
        next++;
      }
      if (next < 100 && inputRefs.current[next]) {
        inputRefs.current[next]?.focus();
        inputRefs.current[next]?.select();
      }
    }
  }

  // ─── 输入处理 + 自动长度跳转 ───
  function handleInput(i: number, key: "ans1" | "ans2", value: string, inputIndex: number) {
    const cleaned = value.replace(/[^0-9\-]/g, "");
    const newAnswers = [...userAnswers];
    if (!newAnswers[i]) newAnswers[i] = { ans1: "", ans2: "" };
    newAnswers[i] = { ...newAnswers[i], [key]: cleaned };
    setUserAnswers(newAnswers);

    if (cleaned.length > 0) {
      const targetAns = key === "ans1" ? questions[i].answer : questions[i].answer2;
      const answerLen = targetAns !== undefined && targetAns !== null ? Math.abs(targetAns).toString().length : 1;
      if (cleaned.length >= answerLen) {
        setTimeout(() => {
          let next = inputIndex + 1;
          while (next < 100 && !inputRefs.current[next]) {
            next++;
          }
          if (next < 100 && inputRefs.current[next]) {
            inputRefs.current[next]?.focus();
            inputRefs.current[next]?.select();
          }
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

          <div className="text-sm text-gray-300 mb-8 space-y-3 font-mc text-center bg-black/30 p-4 border border-[#1A1A1A] shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)] w-full">
            <p>📋 40 道题 <span className="text-slate-400 mx-2">|</span> ⏱ 3 分钟</p>
            <p className="text-mc-exp">📖 难度均衡，贴近日常练习</p>
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
    <div className="min-h-screen flex flex-col bg-[#FDFBF2] text-slate-800 font-sans">
      {/* 置顶毛玻璃倒计时 */}
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-50 bg-[#FDFBF2]/90 backdrop-blur border-b border-amber-200/50 shadow-sm">
        <span className="text-sm font-bold text-slate-600">
          📝 口算练习
        </span>

        <span
          className={`text-2xl font-bold ${timeLeft <= 60 ? "text-red-500 animate-pulse" : "text-amber-600"}`}
        >
          ⏱ {formatTime(timeLeft)}
        </span>

        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="mc-btn mc-btn-primary text-xs px-6 py-2 !font-sans"
        >
          {isDisabled ? "..." : "交卷"}
        </button>
      </div>

      {/* 50 题双列网格 */}
      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {questions.map((q, i) => {
            const parts = q.expression.split(/(\{ans\}|\{ans2\})/g);
            return (
              <div
                key={i}
                className="flex items-center gap-2 py-3 border-b border-amber-900/10"
              >
                {/* 题号 */}
                <span className="text-slate-400 text-lg w-8 text-right flex-shrink-0 font-medium">
                  {i + 1}.
                </span>

                {/* 表达式和输入框 */}
                <div className="flex-1 flex items-center flex-nowrap font-medium text-slate-800 text-xl md:text-2xl whitespace-nowrap overflow-x-auto no-scrollbar">
                  {parts.map((part, pIdx) => {
                    if (part === "{ans}") {
                      const inputIndex = i * 2;
                      return (
                        <span key={pIdx} className="inline-flex items-center mx-1 flex-shrink-0">
                          <span className="text-xl md:text-2xl text-slate-400 mr-1">(</span>
                          <input
                            ref={(el) => { inputRefs.current[inputIndex] = el; }}
                            type="text"
                            inputMode="numeric"
                            value={userAnswers[i]?.ans1 || ""}
                            onChange={(e) => handleInput(i, "ans1", e.target.value, inputIndex)}
                            onKeyDown={(e) => handleKeyDown(e, inputIndex)}
                            disabled={isDisabled}
                            className="bg-transparent border-b-2 border-slate-300 text-center text-slate-900 outline-none w-12 md:w-16 text-xl md:text-2xl pb-1 focus:border-amber-500 focus:text-amber-600 font-sans transition-colors"
                            autoComplete="off"
                          />
                          <span className="text-xl md:text-2xl text-slate-400 ml-1">)</span>
                        </span>
                      );
                    }
                    if (part === "{ans2}") {
                      const inputIndex = i * 2 + 1;
                      return (
                        <span key={pIdx} className="inline-flex items-center mx-1 flex-shrink-0">
                          <span className="text-xl md:text-2xl text-slate-400 mr-1">(</span>
                          <input
                            ref={(el) => { inputRefs.current[inputIndex] = el; }}
                            type="text"
                            inputMode="numeric"
                            value={userAnswers[i]?.ans2 || ""}
                            onChange={(e) => handleInput(i, "ans2", e.target.value, inputIndex)}
                            onKeyDown={(e) => handleKeyDown(e, inputIndex)}
                            disabled={isDisabled}
                            className="bg-transparent border-b-2 border-slate-300 text-center text-slate-900 outline-none w-12 md:w-16 text-xl md:text-2xl pb-1 focus:border-amber-500 focus:text-amber-600 font-sans transition-colors"
                            autoComplete="off"
                          />
                          <span className="text-xl md:text-2xl text-slate-400 ml-1">)</span>
                        </span>
                      );
                    }
                    return (
                      <span key={pIdx} className="text-xl md:text-2xl whitespace-nowrap flex-shrink-0">
                        {part}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

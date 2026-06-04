"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QUESTION_TYPES, type QuestionType } from "@/lib/game/constants";

interface AdminStats {
  summary: {
    totalCharacters: number;
    totalLevel: number;
    totalGold: number;
    totalSessions: number;
    totalDurationSeconds: number;
    totalGoldEarned: number;
  };
  characters: Array<{
    id: number;
    name: string;
    level: number;
    gold: number;
    createdAt: string;
  }>;
}

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── 练习配置状态 ───
  const [boostedTypes, setBoostedTypes] = useState<QuestionType[]>([]);
  const [practiceDuration, setPracticeDuration] = useState(240);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaved, setConfigSaved] = useState<string | null>(null);

  const fetchStats = useCallback(async (pwd: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setIsAuthenticated(true);
        setError("");
        sessionStorage.setItem("adminPwd", pwd);
      } else {
        setError("密码错误或无权限");
        setIsAuthenticated(false);
      }
    } catch {
      setError("请求失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async (pwd: string) => {
    try {
      const res = await fetch("/api/admin/config", {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      if (res.ok) {
        const data = await res.json();
        // 练习时长
        if (data.practice_duration_seconds) {
          setPracticeDuration(parseInt(data.practice_duration_seconds));
        }
        // 偏好题型
        if (data.boosted_question_types) {
          try {
            const types = JSON.parse(data.boosted_question_types);
            setBoostedTypes(types);
          } catch { /* ignore */ }
        }
      }
    } catch {
      /* ignore config fetch failure */
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("blurred-bg");
    const savedPwd = sessionStorage.getItem("adminPwd");
    if (savedPwd) {
      setPassword(savedPwd);
      fetchStats(savedPwd);
      fetchConfig(savedPwd);
    }
    return () => document.body.classList.remove("blurred-bg");
  }, [fetchStats, fetchConfig]);

  async function saveConfig(key: string, value: string) {
    const pwd = sessionStorage.getItem("adminPwd");
    if (!pwd) return;
    setConfigLoading(true);
    setConfigSaved(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pwd}`,
        },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setConfigSaved(key);
        setTimeout(() => setConfigSaved(null), 2000);
      }
    } catch {
      /* ignore */
    } finally {
      setConfigLoading(false);
    }
  }

  function toggleBoostedType(type: QuestionType) {
    setBoostedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  }

  async function confirmDelete() {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const savedPwd = sessionStorage.getItem("adminPwd");
      const res = await fetch(`/api/admin/users/${userToDelete}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${savedPwd}` 
        },
        body: JSON.stringify({ password: deletePassword })
      });
      if (res.ok) {
        setUserToDelete(null);
        setDeletePassword("");
        fetchStats(savedPwd || "");
      } else {
        const data = await res.json();
        setDeleteError(data.error || "删除失败");
      }
    } catch (e) {
      setDeleteError("请求失败");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    fetchStats(password);
    fetchConfig(password);
  }

  function handleLogout() {
    sessionStorage.removeItem("adminPwd");
    setIsAuthenticated(false);
    setStats(null);
    setPassword("");
  }

  // ─── 格式化时长显示 ───
  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0 && s > 0) return `${m}分${s}秒`;
    if (m > 0) return `${m}分钟`;
    return `${s}秒`;
  }

  // ─── 登录面板 ───
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black/40">
        <div className="mc-panel p-8 w-full max-w-sm">
          <h1 className="text-mc-gold text-2xl mb-6 font-mc text-center" style={{ textShadow: "2px 2px 0 #000" }}>
            系统管理后台
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-mc-dim font-mc mb-2 block">访问密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mc-input w-full"
                autoFocus
              />
            </div>
            {error && <p className="text-mc-red text-xs font-mc">{error}</p>}
            <button type="submit" disabled={loading} className="mc-btn mc-btn-primary font-mc mt-4">
              {loading ? "..." : "进入"}
            </button>
            <button type="button" onClick={() => router.push("/")} className="mc-btn font-mc text-xs mt-2">
              返回主页
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { summary, characters } = stats;

  const allTypes = Object.keys(QUESTION_TYPES) as QuestionType[];

  return (
    <div className="min-h-screen flex flex-col bg-black/40">
      <header className="mc-navbar">
        <div className="flex items-center gap-3">
          <span className="text-mc-gold text-base font-mc" style={{ textShadow: "2px 2px 0 #000" }}>
            控制台面板
          </span>
        </div>
        <button onClick={handleLogout} className="mc-btn mc-btn-danger text-xs px-4 py-2 font-mc">
          登出
        </button>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col gap-6">
        
        {/* 全局统计卡片 */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="mc-panel p-4 flex flex-col justify-center items-center">
            <span className="text-mc-dim text-xs font-mc mb-2">总用户数</span>
            <span className="text-white text-2xl font-mc">{summary.totalCharacters}</span>
          </div>
          <div className="mc-panel p-4 flex flex-col justify-center items-center">
            <span className="text-mc-dim text-xs font-mc mb-2">总练习次数</span>
            <span className="text-mc-diamond text-2xl font-mc">{summary.totalSessions}</span>
          </div>
          <div className="mc-panel p-4 flex flex-col justify-center items-center">
            <span className="text-mc-dim text-xs font-mc mb-2">系统产出金币</span>
            <span className="text-mc-gold text-2xl font-mc">{summary.totalGoldEarned}</span>
          </div>
          <div className="mc-panel p-4 flex flex-col justify-center items-center">
            <span className="text-mc-dim text-xs font-mc mb-2">总练习时长 (秒)</span>
            <span className="text-mc-exp text-2xl font-mc">{summary.totalDurationSeconds}</span>
          </div>
        </section>

        {/* ─── 练习配置区 ─── */}
        <section className="mc-panel p-6">
          <h2 className="text-mc-gold text-sm font-mc mb-6 border-b-2 border-panel-border pb-3">
            ⚙️ 口算练习配置
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 练习时长配置 */}
            <div>
              <h3 className="text-white text-xs font-mc mb-4 flex items-center gap-2">
                <span>⏱</span> 练习时长
              </h3>
              <div className="bg-black/30 border border-[#1A1A1A] p-4 shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)]">
                <div className="flex items-center gap-4 mb-3">
                  <button
                    onClick={() => setPracticeDuration(prev => Math.max(30, prev - 30))}
                    className="mc-btn text-lg px-4 py-2 font-mc"
                    disabled={practiceDuration <= 30}
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-mc-gold text-3xl font-mc">{formatDuration(practiceDuration)}</span>
                    <p className="text-mc-dim text-xs font-mc mt-1">{practiceDuration} 秒</p>
                  </div>
                  <button
                    onClick={() => setPracticeDuration(prev => Math.min(600, prev + 30))}
                    className="mc-btn text-lg px-4 py-2 font-mc"
                    disabled={practiceDuration >= 600}
                  >
                    +
                  </button>
                </div>
                {/* 快捷预设 */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {[90, 120, 150, 180, 210, 240, 300].map(sec => (
                    <button
                      key={sec}
                      onClick={() => setPracticeDuration(sec)}
                      className={`text-xs px-3 py-1.5 font-mc border transition-colors ${
                        practiceDuration === sec
                          ? "bg-amber-700/50 border-amber-500 text-mc-gold"
                          : "bg-black/20 border-gray-600 text-mc-dim hover:border-gray-400"
                      }`}
                    >
                      {formatDuration(sec)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => saveConfig("practice_duration_seconds", String(practiceDuration))}
                  disabled={configLoading}
                  className="mc-btn mc-btn-primary text-xs px-6 py-2 font-mc w-full"
                >
                  {configSaved === "practice_duration_seconds" ? "✅ 已保存" : configLoading ? "..." : "保存时长"}
                </button>
              </div>
            </div>

            {/* 题型偏好配置 */}
            <div>
              <h3 className="text-white text-xs font-mc mb-4 flex items-center gap-2">
                <span>📋</span> 题型偏好（增加出题率）
              </h3>
              <div className="bg-black/30 border border-[#1A1A1A] p-4 shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)]">
                <p className="text-mc-dim text-xs font-mc mb-4">
                  勾选的题型将增加约 30% 的出题比例
                </p>
                <div className="grid grid-cols-1 gap-2 mb-4">
                  {allTypes.map(type => (
                    <label
                      key={type}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border transition-all ${
                        boostedTypes.includes(type)
                          ? "bg-emerald-900/30 border-emerald-500/50 text-mc-exp"
                          : "bg-black/20 border-gray-700 text-mc-dim hover:border-gray-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={boostedTypes.includes(type)}
                        onChange={() => toggleBoostedType(type)}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      <span className="text-xs font-mc">{QUESTION_TYPES[type]}</span>
                      <span className="text-xs text-gray-500 ml-auto font-mono">{type}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => saveConfig("boosted_question_types", JSON.stringify(boostedTypes))}
                  disabled={configLoading}
                  className="mc-btn mc-btn-primary text-xs px-6 py-2 font-mc w-full"
                >
                  {configSaved === "boosted_question_types" ? "✅ 已保存" : configLoading ? "..." : "保存偏好"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 用户列表 */}
        <section className="mc-panel p-6 flex-1 flex flex-col">
          <h2 className="text-mc-gold text-sm font-mc mb-6">注册用户列表</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-panel-border text-mc-dim text-xs font-mc">
                  <th className="py-3 px-2">ID</th>
                  <th className="py-3 px-2">名称</th>
                  <th className="py-3 px-2">等级</th>
                  <th className="py-3 px-2">当前金币</th>
                  <th className="py-3 px-2">注册时间</th>
                  <th className="py-3 px-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {characters.map((char) => (
                  <tr key={char.id} className="border-b border-gray-700/50 hover:bg-white/5 transition-colors text-sm">
                    <td className="py-3 px-2 font-mc text-mc-dim">#{char.id}</td>
                    <td className="py-3 px-2 font-mc">{char.name}</td>
                    <td className="py-3 px-2 font-mc text-mc-exp">Lv.{char.level}</td>
                    <td className="py-3 px-2 font-mc text-mc-gold">{char.gold}</td>
                    <td className="py-3 px-2 text-xs text-gray-400">
                      {new Date(char.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button 
                        onClick={() => setUserToDelete(char.id)}
                        className="mc-btn mc-btn-danger text-xs px-2 py-1 font-mc"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {characters.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-mc-dim font-mc text-sm">
                      暂无用户
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="mc-panel p-6 max-w-sm w-full relative">
            <h2 className="text-mc-red text-xl font-mc mb-4 text-center">危险操作</h2>
            <p className="text-mc-dim text-sm font-mc mb-6 text-center">
              确定要删除该用户吗？此操作不可逆！
            </p>
            <div className="mb-4">
              <label className="text-sm text-mc-dim font-mc mb-2 block">请输入管理员密码确认</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="mc-input w-full"
                autoFocus
                placeholder="Admin Password"
              />
              {deleteError && <p className="text-mc-red text-xs font-mc mt-1">{deleteError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setUserToDelete(null);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="mc-btn flex-1 font-mc text-sm"
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting || !deletePassword}
                className="mc-btn mc-btn-danger flex-1 font-mc text-sm"
              >
                {isDeleting ? "..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

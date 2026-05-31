"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    document.body.classList.add("blurred-bg");
    const savedPwd = sessionStorage.getItem("adminPwd");
    if (savedPwd) {
      setPassword(savedPwd);
      fetchStats(savedPwd);
    }
    return () => document.body.classList.remove("blurred-bg");
  }, [fetchStats]);

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
  }

  function handleLogout() {
    sessionStorage.removeItem("adminPwd");
    setIsAuthenticated(false);
    setStats(null);
    setPassword("");
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

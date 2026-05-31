"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SKINS } from "@/lib/game/constants";

interface Character {
  id: number;
  name: string;
  skinType: string;
  level: number;
  gold: number;
}

export default function CharacterSelectPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedSkin, setSelectedSkin] = useState("steve");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, []);

  async function fetchCharacters() {
    try {
      const res = await fetch("/api/characters");
      const data = await res.json();
      setCharacters(data);
    } catch (e) {
      console.error("Failed to fetch characters:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createCharacter() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), skinType: selectedSkin }),
      });
      if (res.ok) {
        const char = await res.json();
        setCharacters((prev) => [...prev, char]);
        setShowCreate(false);
        setNewName("");
        selectCharacter(char.id);
      }
    } catch (e) {
      console.error("Failed to create character:", e);
    } finally {
      setCreating(false);
    }
  }

  function selectCharacter(id: number) {
    localStorage.setItem("characterId", String(id));
    router.push("/home");
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <p className="text-mc-gold font-mc text-xl animate-pulse">正在加载...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pb-20">
      {/* 标题 */}
      <div className="text-center mb-16">
        <h1
          className="text-5xl md:text-7xl font-mc text-[#DDD] tracking-tighter"
          style={{ textShadow: "4px 4px 0 #000, 0 4px 0 #000, -4px 0 0 #000, 0 -4px 0 #000, 4px 0 0 #000" }}
        >
          学习乐园
        </h1>
        <p className="text-[#FFAA00] font-mc text-sm mt-4 transform -rotate-12 translate-x-32 inline-block shadow-black drop-shadow-md animate-pulse">
          一起来探索吧!
        </p>
      </div>

      {!showCreate ? (
        <div className="flex flex-col gap-4 w-full max-w-sm px-4">
          {characters.map((char) => (
            <button
              key={char.id}
              onClick={() => selectCharacter(char.id)}
              className="mc-btn w-full h-14 text-base justify-between px-6"
            >
              <div className="flex items-center gap-3">
                <img src={`/icons/EntitySprite_${char.skinType}.png`} alt={char.skinType} className="w-8 h-8 pixel-image" />
                <span className="font-mc text-white text-shadow-sm">{char.name}</span>
              </div>
              <div className="flex gap-4 font-mc text-xs text-gray-300">
                <span>Lv.{char.level}</span>
              </div>
            </button>
          ))}
          
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setShowCreate(true)}
              className="mc-btn flex-1 h-14 text-base font-mc text-white text-shadow-sm"
            >
              创建新角色
            </button>
          </div>
        </div>
      ) : (
        /* 创建面板 */
        <div className="mc-panel p-8 w-full max-w-md">
          <h2 className="text-center text-white font-mc text-lg mb-8 text-shadow-sm">创建新角色</h2>

          {/* 角色名输入 */}
          <div className="mb-6">
            <label className="text-sm text-mc-dim font-mc mb-3 block">名称</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={12}
              className="mc-input w-full h-10"
              autoFocus
            />
          </div>

          {/* 皮肤选择 */}
          <div className="mb-10">
            <label className="text-sm text-mc-dim font-mc mb-4 block">外观</label>
            <div className="grid grid-cols-4 gap-4">
              {SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => setSelectedSkin(skin.id)}
                  className={`flex flex-col items-center gap-2 p-4 border-2 transition-colors
                    ${
                      selectedSkin === skin.id
                        ? "border-white bg-white/10"
                        : "border-transparent hover:border-gray-500"
                    }`}
                >
                  <img src={`/icons/EntitySprite_${skin.id}.png`} alt={skin.name} className="w-12 h-12 pixel-image" />
                </button>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowCreate(false)}
              className="mc-btn flex-1"
            >
              取消
            </button>
            <button
              onClick={createCharacter}
              disabled={!newName.trim() || creating}
              className="mc-btn mc-btn-primary flex-1 font-mc"
            >
              {creating ? "..." : "完成"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

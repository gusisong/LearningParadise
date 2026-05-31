"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { expForNextLevel } from "@/lib/game/constants";

interface InventoryItem {
  inventoryId: number;
  quantity: number;
  equipped: boolean;
  itemId: number;
  name: string;
  type: string;
  tier: string;
  iconKey: string;
  atkBonus: number;
  defBonus: number;
  hpBonus: number;
}

interface CharacterData {
  id: number;
  name: string;
  skinType: string;
  level: number;
  exp: number;
  gold: number;
  stats: { hp: number; atk: number; def: number };
  baseStats: { hp: number; atk: number; def: number };
  equipBonus: { hp: number; atk: number; def: number };
  equipped: Array<InventoryItem>;
}

// ─── 空槽线稿 SVG 组件 ───
const EmptyHelmet = () => (
  <svg viewBox="0 0 16 16" width="100%" height="100%" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="square" style={{ imageRendering: 'pixelated' }}>
    <path d="M 4.5 4.5 L 11.5 4.5 L 11.5 11.5 L 4.5 11.5 Z" />
    <path d="M 6.5 7.5 L 6.5 8.5 M 9.5 7.5 L 9.5 8.5" />
    <path d="M 7.5 10.5 L 8.5 10.5" />
  </svg>
);
const EmptyChestplate = () => (
  <svg viewBox="0 0 16 16" width="100%" height="100%" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="square" style={{ imageRendering: 'pixelated' }}>
    <path d="M 4.5 4.5 L 11.5 4.5 L 11.5 8.5 L 9.5 8.5 L 9.5 13.5 L 6.5 13.5 L 6.5 8.5 L 4.5 8.5 Z" />
    <path d="M 6.5 4.5 L 6.5 5.5 L 9.5 5.5 L 9.5 4.5" />
  </svg>
);
const EmptyLeggings = () => (
  <svg viewBox="0 0 16 16" width="100%" height="100%" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="square" style={{ imageRendering: 'pixelated' }}>
    <path d="M 4.5 3.5 L 11.5 3.5 L 11.5 6.5 L 10.5 6.5 L 10.5 12.5 L 8.5 12.5 L 8.5 6.5 L 7.5 6.5 L 7.5 12.5 L 5.5 12.5 L 5.5 6.5 L 4.5 6.5 Z" />
    <path d="M 4.5 5.5 L 11.5 5.5" />
  </svg>
);
const EmptyBoots = () => (
  <svg viewBox="0 0 16 16" width="100%" height="100%" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="square" style={{ imageRendering: 'pixelated' }}>
    <path d="M 3.5 7.5 L 6.5 7.5 L 6.5 13.5 L 2.5 13.5 L 2.5 10.5 L 3.5 10.5 Z" />
    <path d="M 9.5 7.5 L 12.5 7.5 L 12.5 10.5 L 13.5 10.5 L 13.5 13.5 L 9.5 13.5 Z" />
  </svg>
);
const EmptyWeapon = () => (
  <svg viewBox="0 0 16 16" width="100%" height="100%" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="square" strokeLinejoin="miter" style={{ imageRendering: 'pixelated' }}>
    <path d="M 4.5 3.5 L 11.5 3.5 L 11.5 8.5 L 8 13 L 4.5 8.5 Z" />
    <path d="M 5.5 4.5 L 10.5 4.5 L 10.5 8.5 L 8 11.5 L 5.5 8.5 Z" />
  </svg>
);

const EMPTY_ICONS: Record<string, React.ReactNode> = {
  helmet: <EmptyHelmet />,
  chestplate: <EmptyChestplate />,
  leggings: <EmptyLeggings />,
  boots: <EmptyBoots />,
  weapon: <EmptyWeapon />,
};

export default function HomePage() {
  const router = useRouter();
  const [char, setChar] = useState<CharacterData | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [remaining, setRemaining] = useState(2);
  const [loading, setLoading] = useState(true);

  // 装备切换弹窗状态
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  const loadCharacter = useCallback(async () => {
    const charId = localStorage.getItem("characterId");
    if (!charId) {
      router.push("/");
      return;
    }
    try {
      const [charRes, remRes, invRes] = await Promise.all([
        fetch(`/api/characters/${charId}`),
        fetch(`/api/practice/remaining/${charId}`),
        fetch(`/api/inventory/${charId}`)
      ]);
      if (!charRes.ok) {
        router.push("/");
        return;
      }
      const charData = await charRes.json();
      const remData = await remRes.json();
      const invData = await invRes.json();
      
      setChar(charData);
      setRemaining(remData.remaining);
      setInventory(invData);
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCharacter();
  }, [loadCharacter]);

  async function equipItem(inventoryId: number, equip: boolean) {
    const charId = localStorage.getItem("characterId");
    if (!charId) return;
    
    try {
      const res = await fetch("/api/equipment/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: parseInt(charId),
          inventoryId,
          equip
        })
      });
      if (res.ok) {
        setActiveSlot(null);
        loadCharacter(); // 重新加载刷新属性和装备状态
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (loading || !char) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-mc-gold animate-pulse">载入中...</p>
      </div>
    );
  }

  const nextLevelExp = expForNextLevel(char.level);
  const expPercent = Math.round((char.exp / nextLevelExp) * 100);

  // 获取当前槽位可用物品
  const availableItemsForSlot = activeSlot 
    ? inventory.filter(i => i.type === activeSlot) 
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部状态栏 */}
      <header className="mc-navbar">
        <div className="flex items-center gap-3">
          <span className="text-mc-gold text-lg font-mc" style={{ textShadow: "2px 2px 0 #000" }}>学习乐园</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mc">
          <span className="text-mc-gold" style={{ textShadow: "1px 1px 0 #000" }}>💰 {char.gold}</span>
          <span className="text-mc-red" title="今日剩余练习次数" style={{ textShadow: "1px 1px 0 #000" }}>
            {"🍗".repeat(remaining)}
            {"  ".repeat(Math.max(0, 2 - remaining))}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {/* 左侧：角色面板 */}
        <div className="mc-panel flex-shrink-0 w-full lg:w-80 p-4">
          <div className="flex flex-col gap-4">
            
            {/* 装备槽与角色展示 (Minecraft UI 风格) */}
            <div className="flex items-center justify-center gap-4 mt-2">
              {/* 护甲区 (左侧) */}
              <div className="flex flex-col gap-1 h-[172px]">
                {["helmet", "chestplate", "leggings", "boots"].map((slot) => {
                  const item = char.equipped.find((e) => e.type === slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => setActiveSlot(slot)}
                      className="w-10 h-10 bg-[#8b8b8b] border-2 border-black flex items-center justify-center flex-shrink-0
                                 shadow-[inset_2px_2px_0_#373737,inset_-2px_-2px_0_#fff]
                                 hover:brightness-110 transition-all cursor-pointer relative"
                      title={item ? item.name : `空 (${slot})`}
                    >
                      {item ? (
                        <img src={`/icons/${item.iconKey}.png`} alt={item.name} className="w-7 h-7 pixel-image object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-[2px] opacity-80">{EMPTY_ICONS[slot]}</div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 角色形象与名称 (中间) */}
              <div className="flex flex-col items-center">
                <div className="w-[120px] h-[172px] bg-black/40 border-2 border-black p-2 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                  <img src={`/icons/EntitySprite_${char.skinType}.png`} alt={char.name} className="w-full h-full object-contain pixel-image" />
                </div>
              </div>

              {/* 武器区 (右侧) */}
              <div className="flex flex-col justify-end h-[172px]">
                {["weapon"].map((slot) => {
                  const item = char.equipped.find((e) => e.type === slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => setActiveSlot(slot)}
                      className="w-10 h-10 bg-[#8b8b8b] border-2 border-black flex items-center justify-center flex-shrink-0
                                 shadow-[inset_2px_2px_0_#373737,inset_-2px_-2px_0_#fff]
                                 hover:brightness-110 transition-all cursor-pointer relative"
                      title={item ? item.name : `空 (${slot})`}
                    >
                      {item ? (
                        <img src={`/icons/${item.iconKey}.png`} alt={item.name} className="w-7 h-7 pixel-image object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-[2px] opacity-80">{EMPTY_ICONS[slot]}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 名字和等级 */}
            <div className="flex items-center justify-center gap-2 -mt-1 mb-2">
              <h2 className="text-mc-gold text-lg font-mc leading-none" style={{ textShadow: "2px 2px 0 #000" }}>{char.name}</h2>
              <span className="text-mc-exp text-sm font-mc leading-none" style={{ textShadow: "1px 1px 0 #000" }}>Lv.{char.level}</span>
            </div>

            {/* 经验条 */}
            <div className="w-full">
              <div className="flex justify-between text-xs text-mc-dim mb-1 font-mc">
                <span>EXP</span>
                <span>
                  {char.exp}/{nextLevelExp}
                </span>
              </div>
              <div className="w-full h-4 bg-black/50 border-2 border-black p-[2px]">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${expPercent}%`,
                    background: "linear-gradient(180deg, #7FFF00 0%, #4CAF50 100%)",
                  }}
                />
              </div>
            </div>

            {/* 属性面板 */}
            <div className="w-full grid grid-cols-3 gap-2 text-center text-sm font-mc">
              <div className="bg-black/30 border border-black p-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)]">
                <div className="text-mc-red text-lg">❤</div>
                <div>{char.stats.hp}</div>
                <div className="text-[10px] text-mc-dim mt-1">HP</div>
              </div>
              <div className="bg-black/30 border border-black p-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)]">
                <div className="text-mc-gold text-lg">⚔</div>
                <div>{char.stats.atk}</div>
                <div className="text-[10px] text-mc-dim mt-1">ATK</div>
              </div>
              <div className="bg-black/30 border border-black p-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)]">
                <div className="text-mc-diamond text-lg">🛡</div>
                <div>{char.stats.def}</div>
                <div className="text-[10px] text-mc-dim mt-1">DEF</div>
              </div>
            </div>

            {/* 属性面板的结尾占位符 */}
          </div>
        </div>

        {/* 右侧：功能导航 */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* 上半区：最醒目的学习与数据 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            <button
              onClick={() => remaining > 0 ? router.push("/practice/math") : undefined}
              disabled={remaining <= 0}
              className={`mc-panel flex flex-col items-center justify-center gap-4 p-8 text-center
                transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer
                ${remaining <= 0 ? "opacity-50 cursor-not-allowed" : "hover:border-mc-gold"}`}
            >
              <span className="text-7xl">📝</span>
              <span className="text-2xl font-mc text-mc-gold">口算练习</span>
              <span className="text-sm text-mc-dim font-mc mt-2">
                {remaining > 0 ? `今日还剩 ${remaining} 次` : "今日练习已完成！"}
              </span>
            </button>

            <button
              onClick={() => router.push("/stats")}
              className="mc-panel flex flex-col items-center justify-center gap-4 p-8 text-center
                transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer
                hover:border-mc-gold"
            >
              <span className="text-7xl">📊</span>
              <span className="text-2xl font-mc text-mc-gold">成长数据</span>
              <span className="text-sm text-mc-dim font-mc mt-2">查看练习记录与里程碑</span>
            </button>
          </div>

          {/* 下半区：较小的商店与切换用户 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-32">
            <button
              onClick={() => router.push("/shop")}
              className="mc-panel flex items-center justify-center gap-4 p-4 text-center
                transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer
                hover:border-mc-gold"
            >
              <span className="text-4xl">🏪</span>
              <div className="text-left">
                <div className="text-base font-mc text-mc-gold">装备商店</div>
                <div className="text-xs text-mc-dim font-mc mt-1">用金币购买装备</div>
              </div>
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("characterId");
                router.push("/");
              }}
              className="mc-panel flex items-center justify-center gap-4 p-4 text-center
                transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span className="text-4xl">🔄</span>
              <div className="text-left">
                <div className="text-base font-mc text-white">切换角色</div>
                <div className="text-xs text-mc-dim font-mc mt-1">返回角色选择</div>
              </div>
            </button>
          </div>

        </div>
      </main>

      {/* 装备切换弹窗 */}
      {activeSlot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="mc-panel w-full max-w-md p-6 flex flex-col">
            <h3 className="text-lg font-mc text-mc-gold mb-6 border-b-2 border-panel-border pb-2">
              切换 {activeSlot} 装备
            </h3>
            
            {availableItemsForSlot.length === 0 ? (
              <p className="text-center text-sm text-mc-dim font-mc py-8">
                你的背包里还没有这个部位的装备哦，<br/>快去商店看看吧！
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-64 pr-2">
                {/* 增加一个卸下当前装备的选项 */}
                {char.equipped.find((e) => e.type === activeSlot) && (
                  <button
                    onClick={() => {
                      const equippedItem = char.equipped.find((e) => e.type === activeSlot);
                      if (equippedItem) equipItem(equippedItem.inventoryId, false);
                    }}
                    className="mc-btn mc-btn-danger text-xs font-mc py-2"
                  >
                    🚫 卸下当前装备
                  </button>
                )}

                {availableItemsForSlot.map(item => (
                  <button
                    key={item.inventoryId}
                    onClick={() => equipItem(item.inventoryId, true)}
                    disabled={item.equipped}
                    className={`flex items-center gap-4 p-3 border-2 text-left transition-colors
                      ${item.equipped ? 'border-mc-gold bg-mc-gold/10' : 'border-gray-600 hover:border-gray-400 bg-black/40'}`}
                  >
                    <img src={`/icons/${item.iconKey}.png`} alt={item.name} className="w-10 h-10 pixel-image object-contain bg-black/50 p-1" />
                    <div className="flex-1">
                      <div className={`font-mc text-sm ${item.equipped ? 'text-mc-gold' : 'text-white'}`}>
                        {item.name} {item.equipped && "(已装备)"}
                      </div>
                      <div className="flex gap-2 text-[10px] font-mc mt-1 text-gray-400">
                        {item.atkBonus > 0 && <span className="text-mc-red">ATK+{item.atkBonus}</span>}
                        {item.defBonus > 0 && <span className="text-mc-diamond">DEF+{item.defBonus}</span>}
                        {item.hpBonus > 0 && <span className="text-mc-exp">HP+{item.hpBonus}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setActiveSlot(null)}
              className="mc-btn text-sm font-mc mt-6"
            >
              关闭
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

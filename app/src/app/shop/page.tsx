"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ShopItem {
  id: number;
  name: string;
  type: string;
  tier: string;
  priceGold: number;
  atkBonus: number;
  defBonus: number;
  hpBonus: number;
  iconKey: string;
  description: string;
}

interface CharacterBasic {
  id: number;
  gold: number;
}

const TIER_COLORS: Record<string, string> = {
  leather: "#8B4513",
  wood: "#8B6D3F",
  stone: "#7F7F7F",
  iron: "#C0C0C0",
  gold: "#FFD700",
  diamond: "#4AEDD9",
  netherite: "#443A3B",
  basic: "#AAA",
  rare: "#FFD700",
};

const TIER_LABELS: Record<string, string> = {
  leather: "皮革",
  wood: "木质",
  stone: "石质",
  iron: "铁质",
  gold: "金质",
  diamond: "钻石",
  netherite: "下界合金",
  basic: "基础",
  rare: "稀有",
};

const TYPE_EMOJI: Record<string, string> = {
  weapon: "⚔",
  helmet: "⛑",
  chestplate: "🛡",
  leggings: "👖",
  boots: "👢",
  food: "🍖",
  potion: "🧪",
};

export default function ShopPage() {
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [gold, setGold] = useState(0);
  const [buying, setBuying] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const characterId =
    typeof window !== "undefined" ? localStorage.getItem("characterId") : null;

  const load = useCallback(async () => {
    if (!characterId) { router.push("/"); return; }
    const [itemsRes, charRes] = await Promise.all([
      fetch("/api/shop/items"),
      fetch(`/api/characters/${characterId}`),
    ]);
    setItems(await itemsRes.json());
    const charData = await charRes.json();
    setGold(charData.gold);
  }, [characterId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function buyItem(itemId: number) {
    setBuying(itemId);
    setMessage("");
    try {
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: parseInt(characterId!),
          itemId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGold(data.newGold);
        setMessage(`✅ 成功购买 ${data.item}！`);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage("❌ 购买失败");
    } finally {
      setBuying(null);
    }
  }

  const filteredItems = items.filter(
    (item) => filter === "all" || item.type === filter
  );

  // 按类别分组
  const categories = ["all", "weapon", "helmet", "chestplate", "leggings", "boots", "food"];
  const categoryLabels: Record<string, string> = {
    all: "全部",
    weapon: "武器",
    helmet: "头盔",
    chestplate: "胸甲",
    leggings: "护腿",
    boots: "靴子",
    food: "食物",
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部栏 */}
      <header className="mc-navbar">
        <button onClick={() => router.push("/home")} className="mc-btn text-xs px-4 py-2 font-mc">
          ← 返回
        </button>
        <span className="text-base text-mc-gold font-mc" style={{ textShadow: "2px 2px 0 #000" }}>
          装备商店
        </span>
        <span className="text-mc-gold text-xs font-mc">💰 {gold}</span>
      </header>

      {/* 分类筛选 */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-nowrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`mc-btn text-xs px-4 py-2 whitespace-nowrap font-mc
              ${filter === cat ? "mc-btn-primary" : ""}`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* 提示消息 */}
      {message && (
        <div className="mx-4 mc-panel text-center text-sm py-3 mb-2 font-mc">
          {message}
        </div>
      )}

      {/* 商品网格 */}
      <div className="flex-1 p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredItems.map((item) => {
          const canAfford = gold >= item.priceGold;
          return (
            <div key={item.id} className="mc-panel flex flex-col gap-2 p-4">
              {/* 物品图标 & 名称 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 p-1 bg-black/40 rounded flex items-center justify-center">
                  <img src={`/icons/${item.iconKey}.png`} alt={item.name} className="w-full h-full object-contain pixel-image" />
                </div>
                <div>
                  <div
                    className="text-sm font-bold font-mc"
                    style={{ color: TIER_COLORS[item.tier] || "#EEE", textShadow: "1px 1px 0 #000" }}
                  >
                    {item.name}
                  </div>
                  <div className="text-xs text-mc-dim font-mc">
                    {TIER_LABELS[item.tier] || item.tier}
                  </div>
                </div>
              </div>

              {/* 描述 */}
              <p className="text-xs text-gray-300 min-h-[2.5rem]">{item.description}</p>

              {/* 属性加成 */}
              <div className="flex gap-3 text-xs font-mc mt-auto">
                {item.atkBonus > 0 && (
                  <span className="text-mc-red">ATK+{item.atkBonus}</span>
                )}
                {item.defBonus > 0 && (
                  <span className="text-mc-diamond">DEF+{item.defBonus}</span>
                )}
                {item.hpBonus > 0 && (
                  <span className="text-mc-exp">HP+{item.hpBonus}</span>
                )}
              </div>

              {/* 价格 & 购买 */}
              <button
                onClick={() => buyItem(item.id)}
                disabled={!canAfford || buying === item.id}
                className={`mc-btn text-xs w-full mt-3 font-mc
                  ${canAfford ? "mc-btn-gold" : "opacity-50 cursor-not-allowed"}`}
              >
                {buying === item.id
                  ? "购买中..."
                  : `💰 ${item.priceGold} 金币`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

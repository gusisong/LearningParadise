"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { Howl } from "howler";

interface SoundContextType {
  playClick: () => void;
  playLevelUp: () => void;
}

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const clickSound = useRef<Howl | null>(null);
  const levelUpSound = useRef<Howl | null>(null);

  useEffect(() => {
    clickSound.current = new Howl({
      src: ["/sounds/Click.ogg"],
      volume: 0.5,
    });
    levelUpSound.current = new Howl({
      src: ["/sounds/Level_up.ogg"],
      volume: 0.8,
    });
  }, []);

  const playClick = () => {
    clickSound.current?.play();
  };

  const playLevelUp = () => {
    levelUpSound.current?.play();
  };

  return (
    <SoundContext.Provider value={{ playClick, playLevelUp }}>
      <div 
        className="w-full h-full flex flex-col min-h-full"
        onClick={(e) => {
          // 自动检测全局按钮点击
          const target = e.target as HTMLElement;
          const btn = target.closest("button");
          // 对于有 href 的 a 标签但充当按钮的，也做额外兼容
          const link = target.closest("a");
          
          if ((btn && !btn.disabled) || link) {
            playClick();
          }
        }}
      >
        {children}
      </div>
    </SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSound must be used within SoundProvider");
  }
  return ctx;
}

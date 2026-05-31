import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters, practiceSessions } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

const ADMIN_PASSWORD = "admin123";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 总用户数
    const charCountResult = db.select({ count: sql<number>`count(*)` }).from(characters).get();
    
    // 总等级和金币
    const charSumResult = db.select({
      totalLevel: sql<number>`sum(${characters.level})`,
      totalGold: sql<number>`sum(${characters.gold})`,
    }).from(characters).get();

    // 练习总场次与总耗时
    const sessionStatsResult = db.select({
      totalSessions: sql<number>`count(*)`,
      totalDuration: sql<number>`sum(${practiceSessions.durationMs})`,
      totalGoldEarned: sql<number>`sum(${practiceSessions.goldEarned})`,
    }).from(practiceSessions).get();

    // 所有的角色列表
    const allCharacters = db.select({
      id: characters.id,
      name: characters.name,
      level: characters.level,
      gold: characters.gold,
      createdAt: characters.createdAt,
    }).from(characters).all();

    return NextResponse.json({
      summary: {
        totalCharacters: charCountResult?.count || 0,
        totalLevel: charSumResult?.totalLevel || 0,
        totalGold: charSumResult?.totalGold || 0,
        totalSessions: sessionStatsResult?.totalSessions || 0,
        totalDurationSeconds: Math.floor((sessionStatsResult?.totalDuration || 0) / 1000),
        totalGoldEarned: sessionStatsResult?.totalGoldEarned || 0,
      },
      characters: allCharacters,
    });
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

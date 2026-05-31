import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db/seed";

// GET /api/init — 初始化数据库（开发时手动调用一次）
export async function GET() {
  try {
    initializeDatabase();
    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

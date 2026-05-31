import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { initializeDatabase } from "@/lib/db/seed";

let dbInit = false;
function ensureDB() { if (!dbInit) { initializeDatabase(); dbInit = true; } }

// GET /api/shop/items — 商品列表
export async function GET() {
  ensureDB();
  const allItems = db.select().from(items).all();
  return NextResponse.json(allItems);
}

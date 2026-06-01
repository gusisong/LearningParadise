import { db, sqlite } from "@/lib/db";
import { characters, practiceSessions } from "@/lib/db/schema";
import { eq, like, like as iLike } from "drizzle-orm";

async function run() {
  try {
    const chars = db.select().from(characters).all();
    console.log("All characters:", chars.map(c => `${c.id}: ${c.name}`));

    const ethan = chars.find(c => c.name.toLowerCase() === "ethan");
    if (!ethan) {
      console.error("Ethan not found");
      return;
    }

    console.log(`Found Ethan, id: ${ethan.id}`);
    
    // delete today's sessions for Ethan
    const today = new Date().toISOString().split("T")[0];
    const sessions = sqlite.prepare(`SELECT * FROM practice_sessions WHERE character_id = ? AND created_at >= ?`).all(ethan.id, today);
    
    console.log(`Found ${sessions.length} sessions today for Ethan`);
    
    sqlite.prepare(`DELETE FROM practice_sessions WHERE character_id = ? AND created_at >= ?`).run(ethan.id, today);
    console.log("Deleted today's sessions for Ethan.");
  } catch (e) {
    console.error(e);
  }
}

run();

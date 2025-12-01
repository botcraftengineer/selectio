import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../client";

async function setupUuidV7() {
  try {
    console.log("Setting up UUID v7 function...");

    const sqlContent = readFileSync(join(__dirname, "uuid-v7.sql"), "utf-8");

    await db.execute(sql.raw(sqlContent));

    console.log("✅ UUID v7 function created successfully");
  } catch (error) {
    console.error("❌ Error setting up UUID v7:", error);
    throw error;
  }
}

setupUuidV7()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

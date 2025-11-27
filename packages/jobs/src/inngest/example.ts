/**
 * Example of using Inngest functions
 * This file demonstrates how to trigger Inngest events
 */

import {
  triggerResponseScreening,
  triggerVacancyRequirementsExtraction,
} from "../services/inngest-service";

async function main() {
  console.log("🚀 Inngest Example");
  console.log("==================\n");

  // Example 1: Trigger vacancy requirements extraction
  console.log("1️⃣ Triggering vacancy requirements extraction...");
  await triggerVacancyRequirementsExtraction(
    "example-vacancy-123",
    `
    We are looking for a Senior Full-Stack Developer with the following skills:
    - 5+ years of experience with React and Node.js
    - Strong knowledge of TypeScript
    - Experience with PostgreSQL
    - Familiarity with Docker and Kubernetes
    - Good communication skills in English
    `
  );

  // Example 2: Trigger response screening
  console.log("\n2️⃣ Triggering response screening...");
  await triggerResponseScreening("example-response-456");

  console.log("\n✅ All events sent successfully!");
  console.log(
    "\n💡 Make sure the Inngest dev server is running: bun run dev:inngest"
  );
}

main().catch(console.error);

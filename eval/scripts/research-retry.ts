import { researchPerson } from "../src/agents/research.js";
import { ModelConfigSchema } from "../src/types.js";
import "dotenv/config";

const models = ModelConfigSchema.parse({});

async function retry() {
  console.log("[RETRY] Kyle Jeong (Browserbase)");
  try {
    const spec = await researchPerson(
      { name: "Kyle Jeong", context: "Browserbase", needsBrowser: false },
      models,
    );
    console.log(`[DONE] Kyle Jeong -> ${spec.name}`);
  } catch (err) {
    console.error(`[FAIL] Kyle Jeong:`, err);
  }
}

retry();

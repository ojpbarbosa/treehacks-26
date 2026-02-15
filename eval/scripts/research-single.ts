import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

async function test() {
  console.log("Testing single query call...");
  try {
    for await (const message of query({
      prompt: "What is 2+2? Reply with just the number.",
      options: {
        model: "claude-sonnet-4-5-20250929",
        allowedTools: [],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: 1,
      },
    })) {
      console.log("Message:", JSON.stringify(message, null, 2));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

test();

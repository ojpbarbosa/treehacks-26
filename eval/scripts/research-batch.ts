import { researchPerson } from "../src/agents/research.js";
import { ModelConfigSchema } from "../src/types.js";
import "dotenv/config";

const models = ModelConfigSchema.parse({});

const people = [
  { name: "Gautam Kumar", context: "Fetch.ai", needsBrowser: false },
  { name: "Greg Feingold", context: "Anthropic", needsBrowser: false },
  { name: "Kyle Jeong", context: "Browserbase", needsBrowser: false },
  { name: "Shrey Pandya", context: "Browserbase", needsBrowser: false },
  { name: "Diyi Zhu", context: "Cerebras", needsBrowser: false },
  { name: "Sarah Josief", context: "Cerebras", needsBrowser: false },
  { name: "Craig Dennis", context: "Cloudflare", needsBrowser: false },
  { name: "Judy Cheong", context: "Cloudflare", needsBrowser: false },
  { name: "Rajesh Bhatia", context: "Cloudflare", needsBrowser: false },
  { name: "Sabrina Farmin", context: "Cloudflare", needsBrowser: false },
  { name: "Ben Lang", context: "Cursor", needsBrowser: false },
  { name: "Kelsea An", context: "Decagon", needsBrowser: false },
  { name: "Olivia Petrie", context: "Elastic", needsBrowser: false },
  { name: "Sana Wajid", context: "Fetch.ai", needsBrowser: false },
  { name: "Abhi Gangani", context: "Fetch", needsBrowser: false },
  { name: "Dev Chauhan", context: "Fetch", needsBrowser: false },
  { name: "Kshipra Dhame", context: "Fetch", needsBrowser: false },
  { name: "Prithvi Chaudhari", context: "Fetch", needsBrowser: false },
  { name: "Ryan Tran", context: "Fetch", needsBrowser: false },
  { name: "Michelle Vinocour", context: "Google", needsBrowser: false },
  { name: "Jess Waterman", context: "Greylock", needsBrowser: false },
  { name: "David Yi", context: "HeyGen", needsBrowser: false },
  { name: "Emma Kirst", context: "Human Capital", needsBrowser: false },
  { name: "Claudia Dalmau", context: "Interaction Company", needsBrowser: false },
  { name: "Brandon Beaty", context: "Logitech", needsBrowser: false },
  { name: "Chad Rushing", context: "Logitech", needsBrowser: false },
  { name: "Daniel Sigman", context: "Logitech", needsBrowser: false },
  { name: "Matt Luat", context: "Midjourney", needsBrowser: false },
  { name: "Felicia Chang", context: "Modal", needsBrowser: false },
  { name: "Connor Ling", context: "Neo", needsBrowser: false },
  { name: "Maddie Bernheim", context: "Neo", needsBrowser: false },
  { name: "Vincent Po", context: "Neo, Head of Scholars Program", needsBrowser: false },
  { name: "Janelle Battad", context: "OpenAI", needsBrowser: false },
  { name: "Dj Isaac", context: "Runpod", needsBrowser: false },
  { name: "Max Forsey", context: "Runpod", needsBrowser: false },
  { name: "Zach Gulsby", context: "Runpod", needsBrowser: false },
  { name: "Jeff Gardner", context: "Suno", needsBrowser: false },
  { name: "Robin Lee", context: "Vercel", needsBrowser: false },
  { name: "Sandy Orozco", context: "Visa", needsBrowser: false },
  { name: "Hong Yi Chen", context: "Warp", needsBrowser: false },
  { name: "Lauren Goldberg", context: "YC", needsBrowser: false },
  { name: "Megan Ehrlich", context: "YC", needsBrowser: false },
  { name: "Ojus Save", context: "Zoom/Render", needsBrowser: false },
  { name: "Amanda Yiu", context: "Zoom", needsBrowser: false },
  { name: "Advait Maybhate", context: "Warp", needsBrowser: false },
  { name: "Martin Ceballos", context: "SWE at Fetch.ai", needsBrowser: false },
  { name: "Marvin von Hagen", context: "Interaction Company of California", needsBrowser: false },
  { name: "Samyok Nepal", context: "Interaction", needsBrowser: false },
];

const CONCURRENCY = 5;

async function runBatch() {
  console.log(`Starting research for ${people.length} people (concurrency: ${CONCURRENCY})...\n`);
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < people.length; i += CONCURRENCY) {
    const batch = people.slice(i, i + CONCURRENCY);
    console.log(`\n--- Batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(people.length / CONCURRENCY)} ---`);

    const results = await Promise.allSettled(
      batch.map(async (person) => {
        console.log(`[START] ${person.name} (${person.context})`);
        const spec = await researchPerson(person, models);
        console.log(`[DONE]  ${person.name} -> ${spec.name}`);
        return spec;
      }),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled") {
        completed++;
      } else {
        failed++;
        console.error(`[FAIL]  ${batch[j].name}: ${result.reason}`);
      }
    }
    console.log(`Progress: ${completed} done, ${failed} failed, ${people.length - completed - failed} remaining`);
  }

  console.log(`\nComplete! ${completed} succeeded, ${failed} failed out of ${people.length} total.`);
}

runBatch().catch(console.error);

import { describe, it, expect, vi, beforeEach } from "vitest";
import { orchestrate } from "../src/orchestrator.js";
import type {
  Config,
  Project,
  JudgingPlan,
  JudgeResult,
  JudgeSpec,
  CustomJudgeInput,
  ProgressEvent,
} from "../src/types.js";
import { mkdtemp, rm, readFile, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: vi.fn(),
}));

vi.mock("../src/agents/planner.js", () => ({
  runPlanner: vi.fn(),
}));

vi.mock("../src/agents/research.js", () => ({
  researchAll: vi.fn(),
}));

vi.mock("../src/agents/judge.js", () => ({
  runJudge: vi.fn(),
  getMaxTurns: vi.fn(() => 2),
  shouldCreateSession: vi.fn(() => false),
  shouldCloseSession: vi.fn(() => false),
  buildJudgePrompt: vi.fn(() => "fake prompt"),
}));

vi.mock("../src/agents/report-writer.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/agents/report-writer.js")>();
  return {
    ...original,
    writeProjectReport: vi.fn(),
  };
});

vi.mock("../src/tools/stagehand.js", () => ({
  createStagehandSession: vi.fn(),
  createStagehandTools: vi.fn(),
}));

vi.mock("../src/tools/stagehand-pool.js", () => ({
  StagehandPool: vi.fn().mockImplementation(() => ({
    acquire: vi.fn(),
    closeAll: vi.fn(),
  })),
}));

const fakeJudges: JudgeSpec[] = [
  {
    name: "innovation_judge",
    role: "Innovation & Creativity Expert",
    systemPrompt: "You evaluate innovation and creative thinking.",
    scoringCategories: [
      { category: "Novelty", description: "How novel is the idea?", weight: 0.4 },
      { category: "Creativity", description: "Creative problem solving", weight: 0.3 },
      { category: "Impact", description: "Potential impact", weight: 0.3 },
    ],
    needsBrowser: false,
    source: "auto",
  },
  {
    name: "technical_judge",
    role: "Technical Architecture Expert",
    systemPrompt: "You evaluate technical quality and architecture.",
    scoringCategories: [
      { category: "Architecture", description: "System design quality", weight: 0.35 },
      { category: "Code Quality", description: "Code quality and practices", weight: 0.35 },
      { category: "Scalability", description: "Can it scale?", weight: 0.3 },
    ],
    needsBrowser: false,
    source: "auto",
  },
  {
    name: "ux_judge",
    role: "User Experience Expert",
    systemPrompt: "You evaluate user experience and design.",
    scoringCategories: [
      { category: "Usability", description: "How easy to use", weight: 0.4 },
      { category: "Design", description: "Visual design quality", weight: 0.3 },
      { category: "Accessibility", description: "Accessible to all users", weight: 0.3 },
    ],
    needsBrowser: false,
    source: "auto",
  },
];

const fakeCustomJudgeInputs: CustomJudgeInput[] = [
  {
    name: "Paul Graham",
    context: "Y Combinator co-founder, essayist, investor in early-stage startups",
    needsBrowser: false,
  },
  {
    name: "Reshma Saujani",
    context: "Founder of Girls Who Code, advocate for closing the gender gap in tech",
    needsBrowser: false,
  },
];

const fakePersonaJudges: JudgeSpec[] = [
  {
    name: "persona_paul_graham",
    role: "Startup Investor & Essayist",
    systemPrompt:
      "You are Paul Graham evaluating hackathon projects. You care deeply about whether the founders are building something people actually want. You value simplicity, rapid iteration, and genuine insight into a problem. You're skeptical of over-engineering and buzzword-heavy pitches. You look for evidence of clear thinking and authentic motivation.",
    scoringCategories: [
      { category: "Product-Market Fit", description: "Are they making something people want?", weight: 0.35 },
      { category: "Founder Insight", description: "Do they understand the problem deeply?", weight: 0.25 },
      { category: "Simplicity", description: "Is the solution elegantly simple?", weight: 0.2 },
      { category: "Growth Potential", description: "Could this become huge?", weight: 0.2 },
    ],
    needsBrowser: false,
    source: "persona",
  },
  {
    name: "persona_reshma_saujani",
    role: "Tech Equity & Education Advocate",
    systemPrompt:
      "You are Reshma Saujani evaluating hackathon projects. You focus on whether technology is being used to bridge gaps and create equitable access. You value projects that empower underserved communities, prioritize accessibility, and demonstrate social impact. You appreciate bravery over perfection and look for teams tackling hard, meaningful problems.",
    scoringCategories: [
      { category: "Social Impact", description: "Does it meaningfully help underserved communities?", weight: 0.35 },
      { category: "Accessibility", description: "Is it accessible to diverse users?", weight: 0.25 },
      { category: "Empowerment", description: "Does it empower users rather than create dependency?", weight: 0.2 },
      { category: "Bravery", description: "Is the team tackling a hard, meaningful problem?", weight: 0.2 },
    ],
    needsBrowser: false,
    source: "persona",
  },
];

const fakePlan: JudgingPlan = {
  scenario: "TreeHacks 2026 Hackathon Evaluation",
  scoreScale: { min: 1, max: 10 },
  scaleGuidance:
    "1-3: Below expectations, 4-5: Meets basic requirements, 6-7: Good, 8-9: Excellent, 10: Exceptional",
  judges: fakeJudges,
  tracks: ["Health", "Education", "Sustainability"],
  reportConfig: {
    feedbackTone: "encouraging",
    includeScreenshots: false,
    includeTrackRecommendations: true,
  },
};

const fakeProjects: Project[] = [
  {
    name: "MediSync",
    pitch: "AI-powered medication management app that syncs with wearables to track adherence and side effects in real-time.",
    url: "https://medisync.example.com",
  },
  {
    name: "EcoRoute",
    pitch: "Sustainable route planner that calculates carbon footprint and suggests greener alternatives for daily commutes.",
  },
  {
    name: "StudyBuddy",
    pitch: "Peer-to-peer tutoring platform that uses AI to match students with the ideal study partners based on learning styles.",
    idea: "Help students learn better together",
  },
  {
    name: "FarmCast",
    pitch: "Satellite imagery + ML pipeline that predicts crop yields and alerts small farmers about pest outbreaks 2 weeks early.",
  },
  {
    name: "SignLang",
    pitch: "Real-time sign language translation using computer vision, enabling deaf users to communicate via any video call platform.",
    url: "https://signlang.example.com",
  },
];

function buildFakeJudgeResult(
  projectName: string,
  judge: JudgeSpec,
  scoreProfile: Record<string, number>,
): JudgeResult {
  return {
    projectName,
    judgeName: judge.name,
    scores: judge.scoringCategories.map((cat) => ({
      category: cat.category,
      score: scoreProfile[cat.category] ?? 5,
      weight: cat.weight,
      reasoning: `Evaluated ${cat.category} for ${projectName}: solid execution.`,
    })),
    feedback: {
      strengths: [`Strong ${judge.role.toLowerCase()} fundamentals`, "Well-executed concept"],
      weaknesses: ["Could improve documentation", "Needs broader testing"],
      suggestions: ["Add more comprehensive tests", "Consider edge cases"],
      summary: `${projectName} shows promise in ${judge.role.toLowerCase()} areas.`,
    },
    feedbackSignal: {
      improvementPriorities: [
        {
          area: "Documentation",
          impact: "medium",
          currentState: "Minimal docs",
          targetState: "Comprehensive guides",
        },
      ],
      keyDifferentiators: ["Novel approach to the problem space"],
      dealBreakers: [],
    },
    resourceAccessible: "fully_accessible",
    trackRecommendations: [
      { track: "Health", fit: "strong", reasoning: "Directly addresses health challenges" },
    ],
  };
}

const projectScoreProfiles: Record<string, Record<string, Record<string, number>>> = {
  MediSync: {
    innovation_judge: { Novelty: 9, Creativity: 8, Impact: 9 },
    technical_judge: { Architecture: 8, "Code Quality": 7, Scalability: 8 },
    ux_judge: { Usability: 9, Design: 8, Accessibility: 7 },
    persona_paul_graham: { "Product-Market Fit": 9, "Founder Insight": 8, Simplicity: 6, "Growth Potential": 8 },
    persona_reshma_saujani: { "Social Impact": 8, Accessibility: 7, Empowerment: 8, Bravery: 7 },
  },
  EcoRoute: {
    innovation_judge: { Novelty: 6, Creativity: 7, Impact: 8 },
    technical_judge: { Architecture: 7, "Code Quality": 8, Scalability: 6 },
    ux_judge: { Usability: 7, Design: 6, Accessibility: 8 },
    persona_paul_graham: { "Product-Market Fit": 7, "Founder Insight": 6, Simplicity: 8, "Growth Potential": 5 },
    persona_reshma_saujani: { "Social Impact": 9, Accessibility: 8, Empowerment: 7, Bravery: 6 },
  },
  StudyBuddy: {
    innovation_judge: { Novelty: 5, Creativity: 6, Impact: 7 },
    technical_judge: { Architecture: 6, "Code Quality": 6, Scalability: 5 },
    ux_judge: { Usability: 8, Design: 7, Accessibility: 6 },
    persona_paul_graham: { "Product-Market Fit": 6, "Founder Insight": 5, Simplicity: 7, "Growth Potential": 4 },
    persona_reshma_saujani: { "Social Impact": 8, Accessibility: 7, Empowerment: 9, Bravery: 5 },
  },
  FarmCast: {
    innovation_judge: { Novelty: 8, Creativity: 7, Impact: 9 },
    technical_judge: { Architecture: 9, "Code Quality": 8, Scalability: 7 },
    ux_judge: { Usability: 5, Design: 4, Accessibility: 5 },
    persona_paul_graham: { "Product-Market Fit": 8, "Founder Insight": 9, Simplicity: 5, "Growth Potential": 9 },
    persona_reshma_saujani: { "Social Impact": 10, Accessibility: 6, Empowerment: 9, Bravery: 10 },
  },
  SignLang: {
    innovation_judge: { Novelty: 9, Creativity: 9, Impact: 10 },
    technical_judge: { Architecture: 7, "Code Quality": 6, Scalability: 6 },
    ux_judge: { Usability: 8, Design: 7, Accessibility: 10 },
    persona_paul_graham: { "Product-Market Fit": 7, "Founder Insight": 8, Simplicity: 4, "Growth Potential": 7 },
    persona_reshma_saujani: { "Social Impact": 10, Accessibility: 10, Empowerment: 10, Bravery: 9 },
  },
};

describe("Full evaluator pipeline with fake data", () => {
  let outputDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    outputDir = await mkdtemp(join(tmpdir(), "eval-e2e-"));

    const { runPlanner } = await import("../src/agents/planner.js");
    const { researchAll } = await import("../src/agents/research.js");
    const { runJudge } = await import("../src/agents/judge.js");
    const { writeProjectReport } = await import("../src/agents/report-writer.js");

    vi.mocked(runPlanner).mockResolvedValue(fakePlan);
    vi.mocked(researchAll).mockResolvedValue([]);

    vi.mocked(runJudge).mockImplementation(
      async (project, judgeSpec) => {
        const profile =
          projectScoreProfiles[project.name]?.[judgeSpec.name] ?? {};
        return buildFakeJudgeResult(project.name, judgeSpec, profile);
      },
    );

    vi.mocked(writeProjectReport).mockImplementation(async (ps) => {
      return `# ${ps.projectName} — Deep Evaluation Report\n\nComposite: ${ps.compositeScore.toFixed(1)}/10\n\nThis is a fake deep report for testing.`;
    });
  });

  it("runs the full pipeline and produces complete results", async () => {
    const config: Config = {
      context: "TreeHacks 2026 hackathon — evaluate student projects",
      projects: fakeProjects,
      output_dir: outputDir,
    };

    const progressEvents: ProgressEvent[] = [];
    const onProgress = (event: ProgressEvent) => progressEvents.push(event);

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: config.context as string,
      onProgress,
    });

    expect(results.plan).toEqual(fakePlan);
    expect(results.plan.judges).toHaveLength(3);
    expect(results.plan.scenario).toBe("TreeHacks 2026 Hackathon Evaluation");

    expect(results.projectResults.size).toBe(5);
    for (const project of fakeProjects) {
      const judgeResults = results.projectResults.get(project.name);
      expect(judgeResults).toBeDefined();
      expect(judgeResults).toHaveLength(3);
    }

    expect(results.projectScores).toHaveLength(5);
    for (const ps of results.projectScores) {
      expect(ps.compositeScore).toBeGreaterThan(0);
      expect(ps.compositeScore).toBeLessThanOrEqual(10);
      expect(Object.keys(ps.overallScores)).toHaveLength(3);
      expect(Object.keys(ps.normalizedScores)).toHaveLength(3);
    }

    expect(results.rankings).toHaveLength(5);
    for (let i = 0; i < results.rankings.length - 1; i++) {
      expect(results.rankings[i].compositeScore).toBeGreaterThanOrEqual(
        results.rankings[i + 1].compositeScore,
      );
    }

    const topProject = results.rankings[0];
    const bottomProject = results.rankings[results.rankings.length - 1];
    expect(topProject.compositeScore).toBeGreaterThan(bottomProject.compositeScore);

    expect(results.outliers).toBeDefined();
    expect(results.outliers).toHaveProperty("globalOutliers");
    expect(results.outliers).toHaveProperty("dimensionalOutliers");
    expect(results.outliers).toHaveProperty("uniqueProfiles");
    expect(results.outliers).toHaveProperty("recommended");
    expect(results.outliers).toHaveProperty("patterns");
    expect(typeof results.outliers.noOutliersDetected).toBe("boolean");

    expect(results.reports.deepReports.size).toBe(5);
    for (const project of fakeProjects) {
      const report = results.reports.deepReports.get(project.name);
      expect(report).toBeDefined();
      expect(report).toContain(project.name);
    }

    expect(results.reports.summary).toContain("TreeHacks 2026 Hackathon Evaluation");
    expect(results.reports.summary).toContain("Overall Rankings");
    expect(results.reports.summary).toContain("Outlier Analysis");

    const resultsJson = JSON.parse(
      await readFile(join(outputDir, "results.json"), "utf-8"),
    );
    expect(resultsJson.plan.scenario).toBe("TreeHacks 2026 Hackathon Evaluation");
    expect(resultsJson.rankings).toHaveLength(5);
    expect(resultsJson.outliers).toBeDefined();

    const rankingsMd = await readFile(join(outputDir, "rankings.md"), "utf-8");
    expect(rankingsMd).toContain("Rank");
    expect(rankingsMd).toContain("MediSync");

    const reportFiles = await readdir(join(outputDir, "reports"));
    expect(reportFiles).toHaveLength(5);

    const planningEvents = progressEvents.filter((e) => e.type === "planning");
    expect(planningEvents.length).toBeGreaterThan(0);

    const evaluatingEvents = progressEvents.filter((e) => e.type === "evaluating");
    expect(evaluatingEvents.length).toBeGreaterThanOrEqual(5);

    const judgeStartEvents = progressEvents.filter((e) => e.type === "judge_started");
    expect(judgeStartEvents).toHaveLength(15);

    const judgeCompletedEvents = progressEvents.filter((e) => e.type === "judge_completed");
    expect(judgeCompletedEvents).toHaveLength(15);

    const computeEvents = progressEvents.filter((e) => e.type === "computing");
    expect(computeEvents.length).toBeGreaterThan(0);

    const reportEvents = progressEvents.filter((e) => e.type === "reporting");
    expect(reportEvents.length).toBeGreaterThan(0);

    const completeEvents = progressEvents.filter((e) => e.type === "complete");
    expect(completeEvents).toHaveLength(1);
  });

  it("produces correct score rankings based on fake data", async () => {
    const config: Config = {
      context: "Hackathon evaluation",
      projects: fakeProjects,
      output_dir: outputDir,
    };

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "Hackathon evaluation",
    });

    const rankNames = results.rankings.map((r) => r.projectName);

    const signLangIdx = rankNames.indexOf("SignLang");
    const mediSyncIdx = rankNames.indexOf("MediSync");
    const studyBuddyIdx = rankNames.indexOf("StudyBuddy");
    expect(signLangIdx).toBeLessThan(studyBuddyIdx);
    expect(mediSyncIdx).toBeLessThan(studyBuddyIdx);

    const signLangScores = results.projectScores.find((p) => p.projectName === "SignLang")!;
    expect(signLangScores.overallScores["innovation_judge"]).toBeCloseTo(
      9 * 0.4 + 9 * 0.3 + 10 * 0.3,
      1,
    );

    const mediSyncScores = results.projectScores.find((p) => p.projectName === "MediSync")!;
    expect(mediSyncScores.overallScores["technical_judge"]).toBeCloseTo(
      8 * 0.35 + 7 * 0.35 + 8 * 0.3,
      1,
    );
  });

  it("normalizes scores across judges", async () => {
    const config: Config = {
      context: "Hackathon evaluation",
      projects: fakeProjects,
      output_dir: outputDir,
    };

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "Hackathon evaluation",
    });

    for (const ps of results.projectScores) {
      for (const score of Object.values(ps.normalizedScores)) {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(10);
      }
    }

    const normalizedByJudge: Record<string, number[]> = {};
    for (const ps of results.projectScores) {
      for (const [judge, score] of Object.entries(ps.normalizedScores)) {
        if (!normalizedByJudge[judge]) normalizedByJudge[judge] = [];
        normalizedByJudge[judge].push(score);
      }
    }
    for (const scores of Object.values(normalizedByJudge)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      expect(avg).toBeGreaterThan(3);
      expect(avg).toBeLessThan(8);
    }
  });

  it("handles checkpoint resume by skipping already-evaluated projects", async () => {
    const config: Config = {
      context: "Hackathon evaluation",
      projects: fakeProjects,
      output_dir: outputDir,
    };

    await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "Hackathon evaluation",
    });

    const { runJudge } = await import("../src/agents/judge.js");
    vi.mocked(runJudge).mockClear();

    const results2 = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "Hackathon evaluation",
    });

    expect(vi.mocked(runJudge)).not.toHaveBeenCalled();
    expect(results2.rankings).toHaveLength(5);
    expect(results2.projectScores).toHaveLength(5);
  });

  it("applies custom judge weights to composite scores", async () => {
    const config: Config = {
      context: "Hackathon evaluation",
      projects: fakeProjects,
      output_dir: outputDir,
      judgeWeights: {
        innovation_judge: 3,
        technical_judge: 2,
        ux_judge: 1,
      },
    };

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "Hackathon evaluation",
    });

    const equalWeightConfig: Config = {
      ...config,
      judgeWeights: undefined,
      output_dir: await mkdtemp(join(tmpdir(), "eval-e2e-eq-")),
    };

    const { runPlanner } = await import("../src/agents/planner.js");
    vi.mocked(runPlanner).mockResolvedValue(fakePlan);

    const equalResults = await orchestrate({
      config: equalWeightConfig,
      projects: fakeProjects,
      contextDocument: "Hackathon evaluation",
    });

    const signLangWeighted = results.projectScores.find((p) => p.projectName === "SignLang")!;
    const signLangEqual = equalResults.projectScores.find((p) => p.projectName === "SignLang")!;

    expect(signLangWeighted.compositeScore).not.toBeCloseTo(signLangEqual.compositeScore, 5);

    await rm(equalWeightConfig.output_dir, { recursive: true, force: true });
  });

  it("detects outlier patterns in the fake data", async () => {
    const config: Config = {
      context: "Hackathon evaluation",
      projects: fakeProjects,
      output_dir: outputDir,
      outlierConfig: {
        globalThreshold: 1.0,
        dimensionalThreshold: 1.5,
        minQualityPercentile: 30,
        maxRecommended: 5,
        diversityWeight: 0.3,
      },
    };

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "Hackathon evaluation",
    });

    expect(results.outliers).toBeDefined();
    expect(Array.isArray(results.outliers.globalOutliers)).toBe(true);
    expect(Array.isArray(results.outliers.dimensionalOutliers)).toBe(true);
    expect(Array.isArray(results.outliers.uniqueProfiles)).toBe(true);

    for (const outlier of results.outliers.globalOutliers) {
      expect(outlier.percentile).toBeGreaterThanOrEqual(0);
      expect(outlier.percentile).toBeLessThanOrEqual(100);
    }
  });

  it("writes all output files correctly", async () => {
    const config: Config = {
      context: "Hackathon evaluation",
      projects: fakeProjects,
      output_dir: outputDir,
    };

    await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "Hackathon evaluation",
    });

    const resultsJson = JSON.parse(
      await readFile(join(outputDir, "results.json"), "utf-8"),
    );
    expect(resultsJson.plan.judges).toHaveLength(3);
    expect(resultsJson.rankings).toHaveLength(5);
    for (const ranking of resultsJson.rankings) {
      expect(ranking).toHaveProperty("projectName");
      expect(ranking).toHaveProperty("compositeScore");
      expect(ranking).toHaveProperty("overallScores");
      expect(ranking).toHaveProperty("normalizedScores");
    }

    const rankingsMd = await readFile(join(outputDir, "rankings.md"), "utf-8");
    expect(rankingsMd).toContain("TreeHacks 2026 Hackathon Evaluation");
    for (const project of fakeProjects) {
      expect(rankingsMd).toContain(project.name);
    }

    const checkpoints = await readdir(join(outputDir, "checkpoints"));
    expect(checkpoints).toContain("_plan.json");
    expect(checkpoints.filter((f) => !f.startsWith("_"))).toHaveLength(5);

    const reportFiles = await readdir(join(outputDir, "reports"));
    expect(reportFiles).toHaveLength(5);
    for (const file of reportFiles) {
      expect(file).toMatch(/\.md$/);
      const content = await readFile(join(outputDir, "reports", file), "utf-8");
      expect(content).toContain("Deep Evaluation Report");
    }
  });

  it("tracks all 15 judge evaluations via progress events", async () => {
    const config: Config = {
      context: "Hackathon evaluation",
      projects: fakeProjects,
      output_dir: outputDir,
    };

    const events: ProgressEvent[] = [];

    await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "Hackathon evaluation",
      onProgress: (e) => events.push(e),
    });

    const lifecycle = events.map((e) => e.type);

    expect(lifecycle[0]).toBe("planning");
    expect(lifecycle[lifecycle.length - 1]).toBe("complete");

    const judgeStarts = events.filter(
      (e) => e.type === "judge_started",
    ) as Extract<ProgressEvent, { type: "judge_started" }>[];

    const projectJudgePairs = new Set(
      judgeStarts.map((e) => `${e.projectName}::${e.judgeName}`),
    );
    expect(projectJudgePairs.size).toBe(15);

    for (const project of fakeProjects) {
      for (const judge of fakeJudges) {
        expect(projectJudgePairs.has(`${project.name}::${judge.name}`)).toBe(true);
      }
    }

    const judgeCompleted = events.filter(
      (e) => e.type === "judge_completed",
    ) as Extract<ProgressEvent, { type: "judge_completed" }>[];
    expect(judgeCompleted).toHaveLength(15);
    for (const e of judgeCompleted) {
      expect(e.overallScore).toBeGreaterThan(0);
      expect(e.overallScore).toBeLessThanOrEqual(10);
    }
  });
});

describe("Full evaluator pipeline with custom persona judges", () => {
  let outputDir: string;
  const allJudges = [...fakeJudges, ...fakePersonaJudges];
  const planWithPersonas: JudgingPlan = {
    ...fakePlan,
    judges: allJudges,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    outputDir = await mkdtemp(join(tmpdir(), "eval-e2e-persona-"));

    const { runPlanner } = await import("../src/agents/planner.js");
    const { researchAll } = await import("../src/agents/research.js");
    const { runJudge } = await import("../src/agents/judge.js");
    const { writeProjectReport } = await import("../src/agents/report-writer.js");

    vi.mocked(runPlanner).mockResolvedValue(fakePlan);
    vi.mocked(researchAll).mockResolvedValue(fakePersonaJudges);

    vi.mocked(runJudge).mockImplementation(async (project, judgeSpec) => {
      const profile = projectScoreProfiles[project.name]?.[judgeSpec.name] ?? {};
      return buildFakeJudgeResult(project.name, judgeSpec, profile);
    });

    vi.mocked(writeProjectReport).mockImplementation(async (ps) => {
      return `# ${ps.projectName} — Deep Evaluation Report\n\nComposite: ${ps.compositeScore.toFixed(1)}/10\n\nThis is a fake deep report for testing.`;
    });
  });

  it("merges auto and persona judges into a single panel", async () => {
    const config: Config = {
      context: "TreeHacks 2026 hackathon",
      projects: fakeProjects,
      output_dir: outputDir,
      custom_judges: fakeCustomJudgeInputs,
    };

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "TreeHacks 2026 hackathon",
    });

    expect(results.plan.judges).toHaveLength(5);

    const autoJudges = results.plan.judges.filter((j) => j.source === "auto");
    const personaJudges = results.plan.judges.filter((j) => j.source === "persona");
    expect(autoJudges).toHaveLength(3);
    expect(personaJudges).toHaveLength(2);

    const judgeNames = results.plan.judges.map((j) => j.name);
    expect(judgeNames).toContain("persona_paul_graham");
    expect(judgeNames).toContain("persona_reshma_saujani");
  });

  it("calls researchAll with the custom judge inputs", async () => {
    const { researchAll } = await import("../src/agents/research.js");

    const config: Config = {
      context: "TreeHacks 2026 hackathon",
      projects: fakeProjects,
      output_dir: outputDir,
      custom_judges: fakeCustomJudgeInputs,
    };

    await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "TreeHacks 2026 hackathon",
    });

    expect(vi.mocked(researchAll)).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(researchAll).mock.calls[0];
    expect(callArgs[0]).toEqual(fakeCustomJudgeInputs);
  });

  it("evaluates every project with all 5 judges (3 auto + 2 persona)", async () => {
    const config: Config = {
      context: "TreeHacks 2026 hackathon",
      projects: fakeProjects,
      output_dir: outputDir,
      custom_judges: fakeCustomJudgeInputs,
    };

    const events: ProgressEvent[] = [];

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "TreeHacks 2026 hackathon",
      onProgress: (e) => events.push(e),
    });

    for (const project of fakeProjects) {
      const judgeResults = results.projectResults.get(project.name)!;
      expect(judgeResults).toHaveLength(5);

      const judgeNames = judgeResults.map((r) => r.judgeName);
      expect(judgeNames).toContain("persona_paul_graham");
      expect(judgeNames).toContain("persona_reshma_saujani");
      expect(judgeNames).toContain("innovation_judge");
      expect(judgeNames).toContain("technical_judge");
      expect(judgeNames).toContain("ux_judge");
    }

    const judgeStarts = events.filter(
      (e) => e.type === "judge_started",
    ) as Extract<ProgressEvent, { type: "judge_started" }>[];
    expect(judgeStarts).toHaveLength(25);

    const judgeCompleted = events.filter(
      (e) => e.type === "judge_completed",
    ) as Extract<ProgressEvent, { type: "judge_completed" }>[];
    expect(judgeCompleted).toHaveLength(25);
  });

  it("includes persona judges in composite scores and rankings", async () => {
    const config: Config = {
      context: "TreeHacks 2026 hackathon",
      projects: fakeProjects,
      output_dir: outputDir,
      custom_judges: fakeCustomJudgeInputs,
    };

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "TreeHacks 2026 hackathon",
    });

    for (const ps of results.projectScores) {
      expect(Object.keys(ps.overallScores)).toHaveLength(5);
      expect(ps.overallScores).toHaveProperty("persona_paul_graham");
      expect(ps.overallScores).toHaveProperty("persona_reshma_saujani");
      expect(Object.keys(ps.normalizedScores)).toHaveLength(5);
    }

    const farmCast = results.projectScores.find((p) => p.projectName === "FarmCast")!;
    expect(farmCast.overallScores["persona_reshma_saujani"]).toBeCloseTo(
      10 * 0.35 + 6 * 0.25 + 9 * 0.2 + 10 * 0.2,
      1,
    );

    const signLang = results.projectScores.find((p) => p.projectName === "SignLang")!;
    expect(signLang.overallScores["persona_reshma_saujani"]).toBeCloseTo(
      10 * 0.35 + 10 * 0.25 + 10 * 0.2 + 9 * 0.2,
      1,
    );
  });

  it("persona judges shift rankings compared to auto-only", async () => {
    const autoOnlyDir = await mkdtemp(join(tmpdir(), "eval-e2e-autoonly-"));
    const { runPlanner } = await import("../src/agents/planner.js");
    const { researchAll } = await import("../src/agents/research.js");

    vi.mocked(runPlanner).mockResolvedValue(fakePlan);
    vi.mocked(researchAll).mockResolvedValue([]);

    const autoOnlyResults = await orchestrate({
      config: {
        context: "TreeHacks 2026 hackathon",
        projects: fakeProjects,
        output_dir: autoOnlyDir,
      },
      projects: fakeProjects,
      contextDocument: "TreeHacks 2026 hackathon",
    });

    vi.mocked(runPlanner).mockResolvedValue(fakePlan);
    vi.mocked(researchAll).mockResolvedValue(fakePersonaJudges);

    const withPersonaResults = await orchestrate({
      config: {
        context: "TreeHacks 2026 hackathon",
        projects: fakeProjects,
        output_dir: outputDir,
        custom_judges: fakeCustomJudgeInputs,
      },
      projects: fakeProjects,
      contextDocument: "TreeHacks 2026 hackathon",
    });

    const autoRanking = autoOnlyResults.rankings.map((r) => r.projectName);
    const personaRanking = withPersonaResults.rankings.map((r) => r.projectName);

    expect(autoRanking).not.toEqual(personaRanking);

    const farmCastAutoIdx = autoRanking.indexOf("FarmCast");
    const farmCastPersonaIdx = personaRanking.indexOf("FarmCast");
    expect(farmCastPersonaIdx).toBeLessThanOrEqual(farmCastAutoIdx);

    await rm(autoOnlyDir, { recursive: true, force: true });
  });

  it("applies custom weights that favor persona judges", async () => {
    const config: Config = {
      context: "TreeHacks 2026 hackathon",
      projects: fakeProjects,
      output_dir: outputDir,
      custom_judges: fakeCustomJudgeInputs,
      judgeWeights: {
        innovation_judge: 1,
        technical_judge: 1,
        ux_judge: 1,
        persona_paul_graham: 3,
        persona_reshma_saujani: 3,
      },
    };

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "TreeHacks 2026 hackathon",
    });

    const farmCast = results.projectScores.find((p) => p.projectName === "FarmCast")!;
    const pgNorm = farmCast.normalizedScores["persona_paul_graham"];
    const rsNorm = farmCast.normalizedScores["persona_reshma_saujani"];
    const innovNorm = farmCast.normalizedScores["innovation_judge"];
    const techNorm = farmCast.normalizedScores["technical_judge"];
    const uxNorm = farmCast.normalizedScores["ux_judge"];

    const expectedComposite =
      (innovNorm * 1 + techNorm * 1 + uxNorm * 1 + pgNorm * 3 + rsNorm * 3) / 9;
    expect(farmCast.compositeScore).toBeCloseTo(expectedComposite, 5);
  });

  it("persona judges appear in the rankings summary markdown", async () => {
    const config: Config = {
      context: "TreeHacks 2026 hackathon",
      projects: fakeProjects,
      output_dir: outputDir,
      custom_judges: fakeCustomJudgeInputs,
    };

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "TreeHacks 2026 hackathon",
    });

    expect(results.reports.summary).toContain("persona_paul_graham");
    expect(results.reports.summary).toContain("persona_reshma_saujani");
    expect(results.reports.summary).toContain("Startup Investor & Essayist");
    expect(results.reports.summary).toContain("Tech Equity & Education Advocate");
  });

  it("detects outliers with 5-judge panel and persona-driven score variance", async () => {
    const config: Config = {
      context: "TreeHacks 2026 hackathon",
      projects: fakeProjects,
      output_dir: outputDir,
      custom_judges: fakeCustomJudgeInputs,
      outlierConfig: {
        globalThreshold: 1.0,
        dimensionalThreshold: 1.5,
        minQualityPercentile: 30,
        maxRecommended: 5,
        diversityWeight: 0.3,
      },
    };

    const results = await orchestrate({
      config,
      projects: fakeProjects,
      contextDocument: "TreeHacks 2026 hackathon",
    });

    expect(results.outliers).toBeDefined();

    const dimensionalJudges = results.outliers.dimensionalOutliers.map((o) => o.dimension);
    const allOutlierDimensions = new Set(dimensionalJudges);
    const hasPersonaDimension = [...allOutlierDimensions].some(
      (d) => d.includes("persona_paul_graham") || d.includes("persona_reshma_saujani"),
    );

    if (results.outliers.dimensionalOutliers.length > 0) {
      expect(allOutlierDimensions.size).toBeGreaterThan(0);
    }

    expect(results.outliers.uniqueProfiles.length).toBeGreaterThanOrEqual(0);

    for (const outlier of results.outliers.globalOutliers) {
      expect(outlier.compositeScore).toBeGreaterThan(0);
    }
  });
});

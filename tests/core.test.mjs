import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFundDNA, normalizeMeetingExtraction } from "../lib/ai-schemas.ts";
import { createMeetingBrief, explainLPOpportunity, normalizeLPDNA, lpFromCsv, parseCsvRows, prioritizeThisWeek } from "../lib/live-workspace.ts";
import { groundedSystemPrompt, groundingPreflight } from "../lib/chat-grounding.ts";

test("normalizes structured Fund DNA with confidence labels and evidence", () => {
  const dna = normalizeFundDNA({
    fundName: "Example Fund",
    stage: "Seed",
    sectorFocus: "AI, Healthcare",
    suggestedFundraisingNarrative: "Focused seed fund.",
    fundSummary: "Seed AI fund",
    investmentStrategy: "Lead seed rounds",
    idealLPTypes: ["Family Office"],
    confidence: "high",
    evidence: { fundSummary: ["deck says seed AI fund"] },
  });
  assert.equal(dna.fundName, "Example Fund");
  assert.deepEqual(dna.sectors, ["AI", "Healthcare"]);
  assert.equal(dna.confidence, "high");
  assert.deepEqual(dna.evidence.fundSummary, ["deck says seed AI fund"]);
});

test("normalizes meeting intelligence output without numeric confidence", () => {
  const extraction = normalizeMeetingExtraction({
    summary: "LP asked for deck.",
    questionsAsked: "Can we see track record?",
    concernsRaised: ["Attribution"],
    followUpDueDate: "2026-08-07",
    suggestedPipelineStage: "Diligence",
  });
  assert.equal(extraction.conciseMeetingSummary, "LP asked for deck.");
  assert.deepEqual(extraction.questionsAsked, ["Can we see track record?"]);
  assert.deepEqual(extraction.objections, ["Attribution"]);
  assert.equal(extraction.nextActionDate, "2026-08-07");
});

test("CSV import skips duplicates and requires name plus organization", () => {
  const rows = parseCsvRows("name,organization,email,type\nElena Park,Northstar,elena@example.com,Family Office\nMissing,,x@y.com,RIA");
  const first = lpFromCsv(rows[0], "w1", []);
  const duplicate = lpFromCsv(rows[0], "w1", first ? [first] : []);
  const invalid = lpFromCsv(rows[1], "w1", []);
  assert.ok(first);
  assert.equal(first?.name, "Elena Park");
  assert.equal(duplicate, null);
  assert.equal(invalid, null);
});

test("This Week prioritizes overdue actions with transparent reason", () => {
  const lps = [{
    id: "lp1",
    workspaceId: "w1",
    name: "Elena Park",
    organization: "Northstar",
    lpType: "Family Office",
    email: "elena@example.com",
    relationshipOwner: "The GP",
    relationshipSource: "Founder intro",
    currentStage: "Diligence",
    estimatedCommitmentRange: "$500K-$1M",
    nextAction: "Send updated deck",
    nextActionDate: "2026-07-29",
    notes: "LP requested an updated deck.",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  }];
  const items = prioritizeThisWeek(lps, [], new Date("2026-08-01T12:00:00Z"));
  assert.equal(items[0].priority, "high");
  assert.match(items[0].reason, /follow-up date passed 3 days ago/);
  assert.match(items[0].reason, /updated deck/);
});

test("Meeting prep cites only Fund DNA, LP record, and timeline", () => {
  const lp = {
    id: "lp1",
    workspaceId: "w1",
    name: "Maya Chen",
    organization: "River Family Office",
    lpType: "Family Office",
    email: "maya@example.com",
    relationshipOwner: "The GP",
    relationshipSource: "Founder intro",
    currentStage: "First meeting",
    estimatedCommitmentRange: "$250K-$500K",
    nextAction: "Prepare meeting",
    nextActionDate: "2026-08-03",
    notes: "Concern: attribution clarity",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  };
  const dna = normalizeFundDNA({ fundName: "Example Fund", stage: "Seed", sectors: ["AI"], recommendedPositioning: "AI seed specialist", evidence: { recommendedPositioning: ["thesis mentions AI"] } });
  const brief = createMeetingBrief(dna, lp, [{ id: "t1", workspaceId: "w1", lpId: "lp1", date: "2026-08-01", type: "introduction", source: "Founder", summary: "Founder made intro", supportingText: "Warm intro from founder", createdBy: "The GP", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" }]);
  assert.match(brief.relationshipSummary, /Maya Chen/);
  assert.ok(brief.citations.some((citation) => citation.includes("Fund DNA")));
  assert.ok(brief.assumptions[0].includes("No LP investment history"));
});

test("LP DNA preserves known, inferred, and unknown labels", () => {
  const dna = normalizeLPDNA({
    geography: { status: "known", value: "United States", evidenceSource: "LP spreadsheet", evidenceText: "US family office" },
    sectorPreferences: { status: "inferred", value: "AI", evidenceSource: "Meeting note", evidenceText: "asked about AI infrastructure" },
  });
  assert.equal(dna.geography.status, "known");
  assert.equal(dna.sectorPreferences.status, "inferred");
  assert.equal(dna.checkSizeRange.status, "unknown");
  assert.equal(dna.checkSizeRange.value, "Unknown");
});

test("Meeting prep uses relationship paths and surfaces unknown LP DNA gaps", () => {
  const lp = {
    id: "lp-path",
    workspaceId: "w1",
    name: "Elena Park",
    organization: "Northstar",
    lpType: "Family Office",
    email: "elena@example.com",
    relationshipOwner: "The GP",
    relationshipSource: "Founder intro",
    relationshipStrength: "Warm",
    priorInteractions: "One intro call",
    currentStage: "First meeting",
    estimatedCommitmentRange: "Unknown",
    nextAction: "Prepare meeting",
    nextActionDate: "2026-08-03",
    notes: "",
    lpDNA: normalizeLPDNA({ sectorPreferences: { status: "known", value: "AI", evidenceSource: "Call note" } }),
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  };
  const dna = normalizeFundDNA({ fundName: "Example Fund", stage: "Seed", sectors: ["AI"], typicalInvestmentCheck: "$250K-$500K", recommendedPositioning: "AI seed specialist", evidence: { recommendedPositioning: ["thesis mentions AI"] } });
  const paths = [{ id: "path1", workspaceId: "w1", lpId: "lp-path", sourcePerson: "The GP", targetPerson: "Portfolio Founder", pathType: "First-degree introduction", relationshipStrength: "Warm", evidenceSource: "Manual", evidenceText: "Founder offered intro", notes: "", lastVerifiedDate: "2026-08-01", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" }];
  const brief = createMeetingBrief(dna, lp, [], paths);
  assert.match(brief.bestKnownIntroductionPath, /Portfolio Founder/);
  assert.ok(brief.informationGaps.some((gap) => gap.includes("LP DNA checkSizeRange is Unknown")));
});

test("LP opportunity explanation uses categories instead of numeric predictive scores", () => {
  const lp = {
    id: "lp-fit",
    workspaceId: "w1",
    name: "Maya Chen",
    organization: "River FO",
    lpType: "Family Office",
    email: "maya@example.com",
    relationshipOwner: "The GP",
    relationshipSource: "Advisor",
    relationshipStrength: "Warm",
    priorInteractions: "One meeting",
    currentStage: "Contacted",
    estimatedCommitmentRange: "$250K-$500K",
    nextAction: "Ask for intro",
    nextActionDate: "2026-08-03",
    notes: "",
    lpDNA: normalizeLPDNA({
      sectorPreferences: { status: "known", value: "AI infrastructure", evidenceSource: "Meeting note", evidenceText: "asked about AI infrastructure" },
      checkSizeRange: { status: "known", value: "$250K-$500K", evidenceSource: "LP spreadsheet" },
      emergingManagerAppetite: { status: "inferred", value: "Open to emerging managers", evidenceSource: "Advisor note" },
    }),
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  };
  const fund = normalizeFundDNA({ fundName: "Example Fund", stage: "Seed", sectors: ["AI"], typicalInvestmentCheck: "$250K-$500K", fundSummary: "AI fund", investmentStrategy: "Seed", idealLPProfile: "Family offices", recommendedPositioning: "AI seed specialist" });
  const explanation = explainLPOpportunity(lp, fund, [{ id: "path1", workspaceId: "w1", lpId: "lp-fit", sourcePerson: "The GP", targetPerson: "Advisor", pathType: "First-degree introduction", relationshipStrength: "Warm", evidenceSource: "Manual", evidenceText: "Advisor knows LP", notes: "", lastVerifiedDate: "2026-08-01", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" }]);
  assert.match(["High", "Medium", "Low", "Unknown"].join(","), new RegExp(explanation.potentialFit));
  assert.ok(explanation.why.some((why) => why.includes("Sector alignment")));
  assert.ok(!JSON.stringify(explanation).includes("% fit"));
});

test("Ask LP Brain grounding blocks nonexistent LP names", () => {
  const result = groundingPreflight("Tell me about Jordan Blake", {
    lpProfiles: [{ name: "Elena Park", organization: "Northstar Family Office", lpType: "Family Office" }],
  });
  assert.ok(result);
  assert.match(result.answer, /Insufficient workspace evidence/);
  assert.match(result.answer, /Jordan Blake/);
});

test("Ask LP Brain grounding does not invent meetings", () => {
  const result = groundingPreflight("What happened in Elena Park's meeting?", {
    lpProfiles: [{ name: "Elena Park", organization: "Northstar Family Office", lpType: "Family Office", meetings: [] }],
  });
  assert.ok(result);
  assert.match(result.answer, /Insufficient workspace evidence/);
  assert.match(result.answer, /no meeting record/i);
});

test("Ask LP Brain grounding does not invent investment commitments", () => {
  const result = groundingPreflight("Did Elena Park make a verbal commitment?", {
    lpProfiles: [{ name: "Elena Park", organization: "Northstar Family Office", lpType: "Family Office", status: "Diligence" }],
  });
  assert.ok(result);
  assert.match(result.answer, /Insufficient workspace evidence/);
  assert.match(result.answer, /no commitment/i);
});

test("Ask LP Brain grounding handles known LP with conflicting commitment amount", () => {
  const result = groundingPreflight("Has Elena Park committed $5 million to our fund?", {
    lpProfiles: [{ name: "Elena Park", organization: "Northstar Family Office", lpType: "Family Office", commitment: "$1M verbal indication - diligence pending", status: "Diligence" }],
  });
  assert.ok(result);
  assert.match(result.answer, /^No\./);
  assert.match(result.answer, /Elena Park is present/);
  assert.match(result.answer, /does not show a \$5M commitment/);
  assert.match(result.answer, /\$1M verbal indication - diligence pending/);
});

test("Ask LP Brain grounding still blocks fake Jennifer Thompson", () => {
  const result = groundingPreflight("Has Jennifer Thompson committed $5 million to our fund?", {
    lpProfiles: [{ name: "Elena Park", organization: "Northstar Family Office", lpType: "Family Office", commitment: "$1M verbal indication - diligence pending" }],
  });
  assert.ok(result);
  assert.match(result.answer, /Insufficient workspace evidence/);
  assert.match(result.answer, /Jennifer Thompson/);
  assert.match(result.answer, /not present/);
});

test("Ask LP Brain grounding does not invent deadlines", () => {
  const result = groundingPreflight("When is Elena Park's follow-up deadline?", {
    lpProfiles: [{ name: "Elena Park", organization: "Northstar Family Office", lpType: "Family Office", nextAction: "Send materials" }],
  });
  assert.ok(result);
  assert.match(result.answer, /Insufficient workspace evidence/);
  assert.match(result.answer, /no follow-up deadline/i);
});

test("Ask LP Brain prompt requires explicit uncertainty and grounded category claims", () => {
  const prompt = groundedSystemPrompt();
  assert.match(prompt, /Insufficient workspace evidence/);
  assert.match(prompt, /never invent an LP, person, organization, meeting, commitment/);
  assert.match(prompt, /Do not recommend Emerging Managers/);
  assert.match(prompt, /Workspace fact/);
  assert.match(prompt, /AI inference\/recommendation/);
});

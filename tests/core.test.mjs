import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFundDNA, normalizeMeetingExtraction } from "../lib/ai-schemas.ts";
import { createMeetingBrief, lpFromCsv, parseCsvRows, prioritizeThisWeek } from "../lib/live-workspace.ts";

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

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeFundDNA, normalizeMeetingExtraction } from "../lib/ai-schemas.ts";
import { createMeetingBrief, explainLPOpportunity, normalizeLPDNA, lpFromCsv, parseCsvRows, prioritizeThisWeek } from "../lib/live-workspace.ts";
import { groundedSystemPrompt, groundedWorkspaceAnswer, groundingPreflight } from "../lib/chat-grounding.ts";

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

test("Ask LP Brain does not call undated next action due today", () => {
  const result = groundedWorkspaceAnswer("Who needs a follow-up today?", {
    currentDateIso: "2026-08-17T12:00:00.000Z",
    lpProfiles: [{ name: "Nora Ellis", organization: "Blue River Office", nextAction: "Send data room access" }],
  });
  assert.ok(result);
  assert.match(result.answer, /No follow-ups can be factually confirmed as due today from normalized workspace dates/);
  assert.match(result.answer, /Next actions without verified due dates/);
  assert.doesNotMatch(result.answer, /Nora Ellis.*due today/i);
});

test("Ask LP Brain identifies actual overdue action with date", () => {
  const result = groundedWorkspaceAnswer("Who needs a follow-up today?", {
    currentDateIso: "2026-08-17T12:00:00.000Z",
    lpProfiles: [{ name: "Nora Ellis", organization: "Blue River Office", nextAction: "Send data room access", due: "2026-08-15" }],
  });
  assert.ok(result);
  assert.match(result.answer, /Overdue:/);
  assert.match(result.answer, /2026-08-15/);
});

test("Ask LP Brain does not call future action overdue", () => {
  const result = groundedWorkspaceAnswer("Who needs a follow-up today?", {
    currentDateIso: "2026-08-17T12:00:00.000Z",
    lpProfiles: [{ name: "Nora Ellis", organization: "Blue River Office", nextAction: "Send data room access", due: "2026-08-20" }],
  });
  assert.ok(result);
  assert.match(result.answer, /No follow-ups can be factually confirmed as due today from normalized workspace dates/);
  assert.doesNotMatch(result.answer, /Overdue:/);
  assert.doesNotMatch(result.answer, /Nora Ellis.*overdue/i);
});

test("Ask LP Brain preserves verbal indication as not confirmed commitment", () => {
  const result = groundedWorkspaceAnswer("Which LPs are closest to committing, based only on evidence in my workspace?", {
    lpProfiles: [{ name: "Nora Ellis", organization: "Blue River Office", commitment: "$1M verbal indication - diligence pending", status: "Diligence" }],
  });
  assert.ok(result);
  assert.match(result.answer, /not confirmed/);
  assert.match(result.answer, /\$1M verbal indication - diligence pending/);
  assert.doesNotMatch(result.answer, /confirmed commitment.*Nora Ellis/i);
});

test("Ask LP Brain objection aggregation cannot assign unsupported objection", () => {
  const result = groundedWorkspaceAnswer("What are the biggest objections across my LP conversations?", {
    lpProfiles: [
      { name: "Nora Ellis", organization: "Blue River Office", concern: "Attribution clarity" },
      { name: "Maya Chen", organization: "River Family Office", lpType: "Family Office" },
    ],
  });
  assert.ok(result);
  assert.match(result.answer, /Attribution clarity/);
  assert.match(result.answer, /Nora Ellis/);
  assert.doesNotMatch(result.answer, /Maya Chen/);
});

test("Ask LP Brain ranking cannot introduce absent LP", () => {
  const result = groundedWorkspaceAnswer("Who are my top 5 LPs to focus on this week, and why?", {
    currentDateIso: "2026-08-17T12:00:00.000Z",
    lpProfiles: [{ id: "lp-nora", name: "Nora Ellis", organization: "Blue River Office", status: "Diligence", strength: 80, nextAction: "Send data room access", due: "2026-08-17" }],
  });
  assert.ok(result);
  assert.match(result.answer, /Nora Ellis/);
  assert.doesNotMatch(result.answer, /Jennifer Thompson/);
});

test("Ask LP Brain relative date strings cannot create absolute due-today claims", () => {
  const result = groundedWorkspaceAnswer("Who needs a follow-up today?", {
    currentDateIso: "2026-08-17T12:00:00.000Z",
    lpProfiles: [{ name: "Nora Ellis", organization: "Blue River Office", nextAction: "Send data room access", due: "Today" }],
  });
  assert.ok(result);
  assert.match(result.answer, /relative date text/);
  assert.match(result.answer, /Insufficient workspace evidence/);
  assert.doesNotMatch(result.answer, /Nora Ellis.*due today/i);
});

test("Ask LP Brain compound request returns all five deterministic sections", () => {
  const result = groundedWorkspaceAnswer("Who are my top 5 LPs to focus on this week, and why? Which LP relationships are going cold? Who needs a follow-up today? What are the biggest objections across my LP conversations? Which LPs are closest to committing, based only on evidence in my workspace?", {
    currentDateIso: "2026-08-17T12:00:00.000Z",
    lpProfiles: [
      { id: "lp-nora", name: "Nora Ellis", organization: "Blue River Office", status: "Diligence", strength: 90, nextAction: "Send data room access", due: "2026-08-17", concern: "Attribution clarity", commitment: "1000000 verbal indication - diligence pending" },
      { id: "lp-maya", name: "Maya Chen", organization: "River Family Office", status: "Cold", strength: 40, nextAction: "Send quarterly update", due: "2026-08-15", concern: "Track record depth", commitmentAmount: 250000 },
      { id: "lp-omar", name: "Omar Singh", organization: "Hillcrest Foundation", status: "Warm", strength: 55, nextAction: "Share references" },
    ],
    relationshipIntelligence: { fitResults: { "lp-nora": { score: 94 }, "lp-maya": { score: 72 }, "lp-omar": { score: 60 } } },
  });
  assert.ok(result);
  for (const title of ["Top 5 to Focus on This Week", "Relationships Currently Marked Cold", "Follow-ups Due / Overdue", "Biggest Objections", "Closest to Commitment"]) {
    assert.match(result.answer, new RegExp(`## ${title}`));
  }
  assert.match(result.reason, /evidence_based_prioritization/);
  assert.match(result.reason, /cold_relationship_detection/);
  assert.match(result.reason, /follow_up_today_grounding/);
  assert.match(result.reason, /objection_aggregation/);
  assert.match(result.reason, /commitment_stage_grounding/);
});

test("Ask LP Brain compound routing does not drop later supported intents", () => {
  const result = groundedWorkspaceAnswer("Who are my top LPs and what objections came up?", {
    lpProfiles: [{ id: "lp-nora", name: "Nora Ellis", organization: "Blue River Office", strength: 80, concern: "Attribution clarity" }],
  });
  assert.ok(result);
  assert.match(result.answer, /## Top 5 to Focus on This Week/);
  assert.match(result.answer, /## Biggest Objections/);
});

test("Ask LP Brain formats raw money values in deterministic answers", () => {
  const result = groundedWorkspaceAnswer("Which LPs are closest to committing, based only on evidence in my workspace?", {
    lpProfiles: [
      { name: "Nora Ellis", organization: "Blue River Office", commitmentAmount: 1250000, status: "Committed" },
      { name: "Maya Chen", organization: "River Family Office", commitmentAmount: 1500000, status: "Soft circle" },
      { name: "Omar Singh", organization: "Hillcrest Foundation", commitmentAmount: 1000000, status: "Committed" },
      { name: "Priya Rao", organization: "Cedar Ridge Office", commitmentAmount: 750000, status: "Soft circle" },
      { name: "Sam Rivera", organization: "Harbor Angels", commitmentAmount: 250000, status: "Verbal indication" },
    ],
  });
  assert.ok(result);
  assert.match(result.answer, /\$1\.25M/);
  assert.match(result.answer, /\$1\.5M/);
  assert.match(result.answer, /\$1M/);
  assert.match(result.answer, /\$750K/);
  assert.match(result.answer, /\$250K/);
  assert.doesNotMatch(result.answer, /\$1250K/);
  assert.doesNotMatch(result.answer, /\$1500K/);
  assert.doesNotMatch(result.answer, /\$1000K/);
  assert.doesNotMatch(result.answer, /\b1250000\b/);
  assert.doesNotMatch(result.answer, /\b1500000\b/);
  assert.doesNotMatch(result.answer, /\b1000000\b/);
  assert.doesNotMatch(result.answer, /\b750000\b/);
  assert.doesNotMatch(result.answer, /\b250000\b/);
});

test("Ask LP Brain formats $125K and avoids duplicate commitment amounts", () => {
  const result = groundedWorkspaceAnswer("Which LPs are closest to committing, based only on evidence in my workspace?", {
    lpProfiles: [
      { name: "Nora Ellis", organization: "Blue River Office", commitment: "$1M verbal indication - diligence pending", commitmentAmount: 1000000 },
      { name: "Maya Chen", organization: "River Family Office", commitmentAmount: 125000, status: "Soft circle" },
    ],
  });
  assert.ok(result);
  assert.match(result.answer, /Evidence: \$1M verbal indication - diligence pending\./);
  assert.match(result.answer, /\$125K/);
  assert.doesNotMatch(result.answer, /\$1M verbal indication - diligence pending; \$1M/);
  assert.doesNotMatch(result.answer, /\b125000\b/);
});

test("Ask LP Brain same LP in multiple sections does not leak facts to another LP", () => {
  const result = groundedWorkspaceAnswer("Who are my top 5 LPs to focus on this week, and why? What are the biggest objections across my LP conversations? Which LPs are closest to committing, based only on evidence in my workspace?", {
    currentDateIso: "2026-08-17T12:00:00.000Z",
    lpProfiles: [
      { id: "lp-nora", name: "Nora Ellis", organization: "Blue River Office", strength: 90, due: "2026-08-17", nextAction: "Send data room access", commitment: "$1M verbal indication - diligence pending" },
      { id: "lp-maya", name: "Maya Chen", organization: "River Family Office", strength: 70, concern: "Attribution clarity" },
    ],
  });
  assert.ok(result);
  assert.match(result.answer, /Nora Ellis/);
  assert.match(result.answer, /Maya Chen/);
  const objectionSection = result.answer.split("## Biggest Objections")[1].split("## Closest to Commitment")[0];
  assert.match(objectionSection, /Attribution clarity/);
  assert.match(objectionSection, /Maya Chen/);
  assert.doesNotMatch(objectionSection, /Nora Ellis/);
  const commitmentSection = result.answer.split("## Closest to Commitment")[1];
  assert.match(commitmentSection, /Nora Ellis/);
  assert.match(commitmentSection, /verbal indication/);
  assert.doesNotMatch(commitmentSection, /Maya Chen/);
});

test("Ask LP Brain excludes no-commitment and zero-commitment records from closest-to-commit", () => {
  const result = groundedWorkspaceAnswer("Which LPs are closest to committing, based only on evidence in my workspace?", {
    lpProfiles: [
      { name: "Nora Ellis", organization: "Blue River Office", commitment: "No commitment yet" },
      { name: "Maya Chen", organization: "River Family Office", commitmentAmount: 0 },
      { name: "Omar Singh", organization: "Hillcrest Foundation", commitment: "$750K verbal indication - diligence pending" },
    ],
  });
  assert.ok(result);
  assert.match(result.answer, /Omar Singh/);
  assert.match(result.answer, /\$750K verbal indication - diligence pending/);
  assert.doesNotMatch(result.answer, /Nora Ellis/);
  assert.doesNotMatch(result.answer, /Maya Chen/);
  assert.doesNotMatch(result.answer, /No commitment yet.*commitment evidence present/);
});

test("Ask LP Brain closest-to-commit returns max five records", () => {
  const result = groundedWorkspaceAnswer("Which LPs are closest to committing, based only on evidence in my workspace?", {
    lpProfiles: Array.from({ length: 7 }, (_, index) => ({ name: `LP ${index + 1}`, organization: `Org ${index + 1}`, commitment: "$250K verbal indication" })),
  });
  assert.ok(result);
  assert.match(result.answer, /\+ 2 more commitment-stage records in workspace/);
  assert.doesNotMatch(result.answer, /LP 6/);
});

test("Ask LP Brain cold section returns max five records", () => {
  const result = groundedWorkspaceAnswer("Which LP relationships are going cold?", {
    lpProfiles: Array.from({ length: 7 }, (_, index) => ({ name: `Cold LP ${index + 1}`, organization: `Org ${index + 1}`, status: "Cold" })),
  });
  assert.ok(result);
  assert.match(result.answer, /## Relationships Currently Marked Cold/);
  assert.match(result.answer, /\+ 2 more cold records in workspace/);
  assert.doesNotMatch(result.answer, /Cold LP 6/);
});

test("Ask LP Brain follow-up section does not dump undated records", () => {
  const result = groundedWorkspaceAnswer("Who needs a follow-up today?", {
    currentDateIso: "2026-08-17T12:00:00.000Z",
    lpProfiles: Array.from({ length: 7 }, (_, index) => ({ name: `Undated LP ${index + 1}`, organization: `Org ${index + 1}`, nextAction: "Send update" })),
  });
  assert.ok(result);
  assert.match(result.answer, /\+ 2 more undated next actions in workspace/);
  assert.doesNotMatch(result.answer, /Undated LP 6/);
});

test("Ask LP Brain objections return max five categories without meeting-history dump", () => {
  const result = groundedWorkspaceAnswer("What are the biggest objections across my LP conversations?", {
    lpProfiles: Array.from({ length: 7 }, (_, index) => ({
      name: `LP ${index + 1}`,
      organization: `Org ${index + 1}`,
      concern: `Objection ${index + 1}`,
      meetings: [{ note: "Long meeting history should not be treated as an objection or dumped into the answer." }],
    })),
  });
  assert.ok(result);
  assert.match(result.answer, /\+ 2 more objection categories in workspace/);
  assert.doesNotMatch(result.answer, /Objection 6/);
  assert.doesNotMatch(result.answer, /Long meeting history/);
});

test("Ask LP Brain compound response remains concise", () => {
  const result = groundedWorkspaceAnswer("Who are my top 5 LPs to focus on this week, and why? Which LP relationships are going cold? Who needs a follow-up today? What are the biggest objections across my LP conversations? Which LPs are closest to committing, based only on evidence in my workspace?", {
    currentDateIso: "2026-08-17T12:00:00.000Z",
    lpProfiles: Array.from({ length: 8 }, (_, index) => ({ id: `lp-${index}`, name: `LP ${index + 1}`, organization: `Org ${index + 1}`, status: index % 2 ? "Cold" : "Diligence", strength: 80 - index, nextAction: "Follow up", due: index === 0 ? "2026-08-17" : "", concern: `Objection ${index + 1}`, commitment: index < 6 ? "$250K verbal indication" : "No commitment yet" })),
  });
  assert.ok(result);
  assert.ok(result.answer.length < 3500);
  assert.doesNotMatch(result.answer, /\b1000000\b|\b250000\b|\b750000\b/);
});

test("Ask LP Brain markdown headings render through isolated chat component", () => {
  const source = readFileSync(new URL("../components/lp-chat-message.tsx", import.meta.url), "utf8");
  assert.match(source, /type: "heading"/);
  assert.match(source, /<h3/);
  assert.match(source, /trimmed\.startsWith\("## "\)/);
});

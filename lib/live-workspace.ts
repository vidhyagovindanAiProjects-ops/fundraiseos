import type { FundDNARecord, MeetingExtractionRecord } from "./ai-schemas";

export type LPStage = "Not started" | "Contacted" | "First meeting" | "Diligence" | "Soft circle" | "Committed" | "Passed";
export type TimelineKind = "introduction" | "email" | "meeting" | "note" | "follow-up" | "document request" | "stage change";
export type IntelligenceStatus = "known" | "inferred" | "unknown";
export type PotentialFit = "High" | "Medium" | "Low" | "Unknown";
export type RelationshipPathType = "Direct" | "First-degree introduction" | "Second-degree introduction" | "Weak inferred relationship" | "No known path";
export type RecommendationFeedbackValue = "Accept" | "Reject" | "Already Known" | "Already Contacted" | "Not Relevant" | "Save for Later";
export type RejectionReason = "Wrong LP type" | "Wrong check size" | "Wrong geography" | "Wrong sector" | "Wrong timing" | "No credible warm path" | "Already allocated" | "Relationship conflict" | "Insufficient information" | "Other";
export type OutcomeStage = "Suggested" | "Accepted by GP" | "Intro Requested" | "Intro Made" | "LP Responded" | "Meeting Held" | "Follow-up" | "Diligence" | "Data Room Requested" | "Soft Indication" | "Commitment" | "Pass";

export type LPDNAField = {
  status: IntelligenceStatus;
  value: string;
  evidenceSource: string;
  evidenceText: string;
  lastVerifiedDate: string;
};

export type LPDNA = {
  geography: LPDNAField;
  sectorPreferences: LPDNAField;
  stagePreferences: LPDNAField;
  fundSizePreferences: LPDNAField;
  checkSizeRange: LPDNAField;
  emergingManagerAppetite: LPDNAField;
  timingSignals: LPDNAField;
};

export type LiveLPRecord = {
  id: string;
  workspaceId: string;
  name: string;
  organization: string;
  lpType: string;
  email: string;
  relationshipOwner: string;
  relationshipSource: string;
  relationshipStrength?: string;
  priorInteractions?: string;
  lpDNA?: LPDNA;
  currentStage: LPStage;
  estimatedCommitmentRange: string;
  nextAction: string;
  nextActionDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type RelationshipPath = {
  id: string;
  workspaceId: string;
  lpId: string;
  sourcePerson: string;
  targetPerson: string;
  pathType: RelationshipPathType;
  relationshipStrength: string;
  evidenceSource: string;
  evidenceText: string;
  notes: string;
  lastVerifiedDate: string;
  createdAt: string;
  updatedAt: string;
};

export type LPOpportunityExplanation = {
  lpId: string;
  lpName: string;
  potentialFit: PotentialFit;
  why: string[];
  bestKnownRelationshipPath: string;
  evidence: string[];
  informationGaps: string[];
};

export type RecommendationFeedback = {
  id: string;
  workspaceId: string;
  lpId: string;
  recommendationId: string;
  feedback: RecommendationFeedbackValue;
  rejectionReason?: RejectionReason | "";
  notes: string;
  createdAt: string;
};

export type LPOutcomeEvent = {
  id: string;
  workspaceId: string;
  lpId: string;
  recommendationId?: string;
  outcomeStage: OutcomeStage;
  notes: string;
  occurredAt: string;
  createdAt: string;
};

export type LiveTimelineEntry = {
  id: string;
  workspaceId: string;
  lpId: string;
  date: string;
  type: TimelineKind;
  source: string;
  summary: string;
  supportingText: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ThisWeekItem = {
  id: string;
  lpId: string;
  lpName: string;
  label: string;
  priority: "high" | "medium" | "low";
  reason: string;
  dueDate?: string;
};

export type MeetingBrief = {
  relationshipSummary: string;
  previousInteractionSummary: string;
  likelyAreasOfAlignment: string[];
  possibleConcerns: string[];
  recommendedQuestions: string[];
  personalizedTalkingPoints: string[];
  bestKnownIntroductionPath: string;
  informationGaps: string[];
  assumptions: string[];
  citations: string[];
};

export function uid(prefix = "rec") {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function unknownLPDNAField(): LPDNAField {
  return { status: "unknown", value: "Unknown", evidenceSource: "", evidenceText: "", lastVerifiedDate: "" };
}

export function normalizeLPDNAField(raw: unknown): LPDNAField {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const value = typeof raw === "string" && raw.trim() ? raw.trim() : "Unknown";
    return { ...unknownLPDNAField(), status: value === "Unknown" ? "unknown" : "known", value };
  }
  const source = raw as Record<string, unknown>;
  const status = String(source.status || "").toLowerCase();
  const safeStatus: IntelligenceStatus = status === "known" || status === "inferred" || status === "unknown" ? status : "unknown";
  const value = String(source.value || "").trim() || "Unknown";
  return {
    status: value === "Unknown" ? "unknown" : safeStatus,
    value,
    evidenceSource: String(source.evidenceSource || source.evidence_source || "").trim(),
    evidenceText: String(source.evidenceText || source.evidence_text || "").trim(),
    lastVerifiedDate: String(source.lastVerifiedDate || source.last_verified_date || "").trim(),
  };
}

export function emptyLPDNA(): LPDNA {
  return {
    geography: unknownLPDNAField(),
    sectorPreferences: unknownLPDNAField(),
    stagePreferences: unknownLPDNAField(),
    fundSizePreferences: unknownLPDNAField(),
    checkSizeRange: unknownLPDNAField(),
    emergingManagerAppetite: unknownLPDNAField(),
    timingSignals: unknownLPDNAField(),
  };
}

export function normalizeLPDNA(raw: unknown): LPDNA {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return {
    geography: normalizeLPDNAField(source.geography),
    sectorPreferences: normalizeLPDNAField(source.sectorPreferences || source.sector_preferences),
    stagePreferences: normalizeLPDNAField(source.stagePreferences || source.stage_preferences),
    fundSizePreferences: normalizeLPDNAField(source.fundSizePreferences || source.fund_size_preferences),
    checkSizeRange: normalizeLPDNAField(source.checkSizeRange || source.check_size_range),
    emergingManagerAppetite: normalizeLPDNAField(source.emergingManagerAppetite || source.emerging_manager_appetite),
    timingSignals: normalizeLPDNAField(source.timingSignals || source.timing_signals),
  };
}

function formatDNAField(label: string, field: LPDNAField) {
  const tag = field.status === "inferred" ? "Inferred" : field.status === "known" ? "Known" : "Unknown";
  return `${label}: ${field.value || "Unknown"} (${tag}${field.evidenceSource ? `, source: ${field.evidenceSource}` : ""})`;
}

export function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((x) => x.trim().toLowerCase());
  return lines.slice(1).map((line) => Object.fromEntries(splitCsvLine(line).map((value, i) => [headers[i] || `col_${i}`, value.trim()])));
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      out.push(current);
      current = "";
    } else current += char;
  }
  out.push(current);
  return out;
}

export function lpFromCsv(row: Record<string, string>, workspaceId: string, existing: LiveLPRecord[] = []): LiveLPRecord | null {
  const get = (...keys: string[]) => keys.map((key) => row[key.toLowerCase()]).find(Boolean) || "";
  const name = get("name", "lp name", "contact");
  const organization = get("organization", "firm", "company");
  if (!name || !organization) return null;
  const email = get("email");
  const duplicate = existing.find((lp) => lp.workspaceId === workspaceId && ((email && lp.email.toLowerCase() === email.toLowerCase()) || (lp.name.toLowerCase() === name.toLowerCase() && lp.organization.toLowerCase() === organization.toLowerCase())));
  if (duplicate) return null;
  const now = new Date().toISOString();
  return {
    id: uid("lp"),
    workspaceId,
    name,
    organization,
    lpType: get("lp type", "type", "investor type") || "Unknown",
    email,
    relationshipOwner: get("relationship owner", "owner") || "The GP",
    relationshipSource: get("relationship source", "source", "intro source") || "Imported CSV",
    currentStage: normalizeStage(get("current stage", "stage")),
    estimatedCommitmentRange: get("estimated commitment range", "check size", "commitment") || "Unknown",
    relationshipStrength: get("relationship strength") || "Unknown",
    priorInteractions: get("prior interactions", "history") || "Unknown",
    lpDNA: normalizeLPDNA({
      geography: { value: get("geography"), status: get("geography") ? "known" : "unknown", evidenceSource: "Imported CSV" },
      sectorPreferences: { value: get("sector preferences", "interests", "interest"), status: get("sector preferences", "interests", "interest") ? "known" : "unknown", evidenceSource: "Imported CSV" },
      stagePreferences: { value: get("stage preferences"), status: get("stage preferences") ? "known" : "unknown", evidenceSource: "Imported CSV" },
      fundSizePreferences: { value: get("fund size preferences"), status: get("fund size preferences") ? "known" : "unknown", evidenceSource: "Imported CSV" },
      checkSizeRange: { value: get("check size range", "check size", "commitment"), status: get("check size range", "check size", "commitment") ? "known" : "unknown", evidenceSource: "Imported CSV" },
      emergingManagerAppetite: { value: get("emerging manager appetite"), status: get("emerging manager appetite") ? "known" : "unknown", evidenceSource: "Imported CSV" },
      timingSignals: { value: get("timing signals", "timing"), status: get("timing signals", "timing") ? "known" : "unknown", evidenceSource: "Imported CSV" },
    }),
    nextAction: get("next action") || "Qualify LP fit",
    nextActionDate: get("next action date", "due date") || "",
    notes: get("notes", "note", "interest") || "Imported from CSV.",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeStage(value: string): LPStage {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("diligence")) return "Diligence";
  if (normalized.includes("soft")) return "Soft circle";
  if (normalized.includes("commit")) return "Committed";
  if (normalized.includes("pass")) return "Passed";
  if (normalized.includes("meeting")) return "First meeting";
  if (normalized.includes("contact")) return "Contacted";
  return "Not started";
}

export function prioritizeThisWeek(lps: LiveLPRecord[], entries: LiveTimelineEntry[], today = new Date()): ThisWeekItem[] {
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sevenDays = new Date(todayOnly);
  sevenDays.setDate(todayOnly.getDate() + 7);
  const items: ThisWeekItem[] = [];
  for (const lp of lps) {
    const due = parseDate(lp.nextActionDate);
    if (due && due < todayOnly) {
      const days = Math.max(1, Math.ceil((todayOnly.getTime() - due.getTime()) / 86400000));
      items.push({ id: `overdue-${lp.id}`, lpId: lp.id, lpName: lp.name, label: lp.nextAction || "Follow up", priority: "high", dueDate: lp.nextActionDate, reason: `High priority because the follow-up date passed ${days} day${days === 1 ? "" : "s"} ago${lp.notes ? ` and the LP record says: ${lp.notes}` : "."}` });
    } else if (due && due <= sevenDays) {
      items.push({ id: `due-${lp.id}`, lpId: lp.id, lpName: lp.name, label: lp.nextAction || "Follow up", priority: "medium", dueDate: lp.nextActionDate, reason: "Medium priority because the next action is due in the next seven days." });
    }
    if (!lp.nextAction.trim()) items.push({ id: `missing-action-${lp.id}`, lpId: lp.id, lpName: lp.name, label: "Add next action", priority: "medium", reason: "Medium priority because this LP record has no next action, so follow-up ownership is unclear." });
    const latest = entries.filter((entry) => entry.lpId === lp.id).map((entry) => parseDate(entry.date)).filter((x): x is Date => Boolean(x)).sort((a, b) => b.getTime() - a.getTime())[0];
    if (latest) {
      const inactiveDays = Math.floor((todayOnly.getTime() - latest.getTime()) / 86400000);
      if (inactiveDays >= 30 && !due) items.push({ id: `inactive-${lp.id}`, lpId: lp.id, lpName: lp.name, label: "Review stale relationship", priority: "low", reason: `Low priority because there has been no recorded activity for ${inactiveDays} days and no upcoming next action is set.` });
    }
  }
  return items.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (a.dueDate || "").localeCompare(b.dueDate || ""));
}

function priorityRank(priority: ThisWeekItem["priority"]) {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function createMeetingBrief(fundDNA: FundDNARecord | null, lp: LiveLPRecord, timeline: LiveTimelineEntry[], paths: RelationshipPath[] = []): MeetingBrief {
  const sorted = [...timeline].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted.at(-1);
  const dna = normalizeLPDNA(lp.lpDNA);
  const bestPath = bestRelationshipPath(paths.filter((path) => path.lpId === lp.id));
  const citations = [
    `LP record: ${lp.name}, ${lp.organization}, stage ${lp.currentStage}`,
    fundDNA ? `Fund DNA: ${fundDNA.fundName}, ${fundDNA.fundStage}, ${fundDNA.sectors.join(", ")}` : "Fund DNA: not approved yet",
    `LP DNA: ${formatDNAField("sector preferences", dna.sectorPreferences)}; ${formatDNAField("check size range", dna.checkSizeRange)}`,
    bestPath ? `Relationship path: ${bestPath.sourcePerson} → ${bestPath.targetPerson} (${bestPath.pathType})` : "Relationship path: no known path recorded",
    ...sorted.slice(-3).map((entry) => `Timeline ${entry.date}: ${entry.summary}`),
  ];
  const notes = [lp.notes, ...sorted.map((entry) => `${entry.summary} ${entry.supportingText}`)].join(" ").toLowerCase();
  const sectors = fundDNA?.sectors.length ? fundDNA.sectors : ["the fund thesis"];
  return {
    relationshipSummary: `${lp.name} at ${lp.organization} is a ${lp.lpType || "LP"} currently at ${lp.currentStage}. Relationship source: ${lp.relationshipSource || "not recorded"}. Relationship strength: ${lp.relationshipStrength || "Unknown"}.`,
    previousInteractionSummary: last ? `Most recent entry on ${last.date}: ${last.summary}` : "No previous timeline entries have been recorded.",
    likelyAreasOfAlignment: fundDNA ? [`Fund focus: ${sectors.slice(0, 3).join(", ")}. LP sector preference: ${dna.sectorPreferences.value} (${dna.sectorPreferences.status}).`, `LP check-size range: ${dna.checkSizeRange.value}; fund target LP check size: ${fundDNA.typicalInvestmentCheck || "Unknown"}.`] : ["Approve Fund DNA before inferring fund/LP alignment."],
    possibleConcerns: [notes.includes("track") ? "Track record may require proof points." : "Track record depth should be proactively addressed.", notes.includes("timing") ? "Timing was mentioned and should be clarified." : "Allocation timing is unknown.", notes.includes("attribution") ? "Attribution clarity was mentioned." : "Attribution expectations are not fully documented."],
    recommendedQuestions: ["What would make this fund a fit for your current allocation plan?", "What check size range is realistic if diligence goes well?", "Who else should be involved before a decision?", "Which proof points would make the opportunity easier to underwrite?", "What timing constraints should we plan around?"],
    personalizedTalkingPoints: fundDNA ? [`Position around: ${fundDNA.recommendedPositioning}`, `Use evidence from Fund DNA: ${Object.values(fundDNA.evidence).flat().slice(0, 2).join(" | ") || "approved fund inputs"}`, `Connect the ask to ${bestPath ? `${bestPath.sourcePerson} → ${bestPath.targetPerson}` : lp.relationshipSource || "the relationship source"} without claiming unstated LP preferences.`] : ["Start by confirming the LP's interests; Fund DNA is not approved yet."],
    bestKnownIntroductionPath: bestPath ? `${bestPath.sourcePerson} → ${bestPath.targetPerson} → ${lp.name}` : "No known path recorded.",
    informationGaps: [!lp.email ? "LP email is missing." : "", !lp.estimatedCommitmentRange ? "Estimated commitment range is missing." : "", !lp.nextActionDate ? "Next action date is missing." : "", !fundDNA ? "Approved Fund DNA is missing." : "", ...Object.entries(dna).filter(([, field]) => field.status === "unknown").map(([key]) => `LP DNA ${key} is Unknown.`), !bestPath ? "No relationship path has been verified." : ""].filter(Boolean),
    assumptions: ["No LP investment history, personal details, or preference claims are used unless present in Fund DNA, LP DNA, the LP record, relationship paths, or timeline."],
    citations,
  };
}

export function bestRelationshipPath(paths: RelationshipPath[]): RelationshipPath | null {
  const rank: Record<RelationshipPathType, number> = { "Direct": 0, "First-degree introduction": 1, "Second-degree introduction": 2, "Weak inferred relationship": 3, "No known path": 4 };
  return [...paths].sort((a, b) => rank[a.pathType] - rank[b.pathType] || (b.lastVerifiedDate || "").localeCompare(a.lastVerifiedDate || ""))[0] || null;
}

export function explainLPOpportunity(lp: LiveLPRecord, fundDNA: FundDNARecord | null, paths: RelationshipPath[] = []): LPOpportunityExplanation {
  const dna = normalizeLPDNA(lp.lpDNA);
  const why: string[] = [];
  const evidence: string[] = [];
  const gaps: string[] = [];
  const fundSectors = fundDNA?.sectors.map((x) => x.toLowerCase()) || [];
  const lpSectors = dna.sectorPreferences.value.toLowerCase();
  const sectorAligned = fundSectors.length > 0 && fundSectors.some((sector) => lpSectors.includes(sector.split(/\s+/)[0]));
  if (sectorAligned) why.push(`Sector alignment: Fund DNA sectors overlap with LP DNA sector preferences (${dna.sectorPreferences.value}).`);
  else gaps.push("Sector alignment is not verified.");
  if (dna.checkSizeRange.status !== "unknown" && fundDNA?.typicalInvestmentCheck) why.push(`Check-size context is available: LP ${dna.checkSizeRange.value}; fund target ${fundDNA.typicalInvestmentCheck}.`);
  else gaps.push("Check-size fit is Unknown.");
  if (dna.emergingManagerAppetite.status !== "unknown") why.push(`Emerging-manager appetite is ${dna.emergingManagerAppetite.value} (${dna.emergingManagerAppetite.status}).`);
  else gaps.push("Emerging-manager appetite is Unknown.");
  const path = bestRelationshipPath(paths.filter((p) => p.lpId === lp.id));
  if (path && path.pathType !== "No known path") why.push(`Relationship context exists through ${path.sourcePerson} → ${path.targetPerson}.`);
  else gaps.push("No credible warm path has been verified.");
  for (const [label, field] of Object.entries(dna)) {
    if (field.evidenceSource || field.evidenceText) evidence.push(`${label}: ${field.evidenceSource || "LP DNA"}${field.evidenceText ? ` — ${field.evidenceText}` : ""}`);
  }
  if (fundDNA) evidence.push(`Fund DNA: ${fundDNA.fundName || "approved fund"} / ${fundDNA.fundStage || "Unknown stage"} / ${fundDNA.sectors.join(", ") || "Unknown sectors"}`);
  const potentialFit: PotentialFit = why.length >= 4 ? "High" : why.length >= 2 ? "Medium" : why.length >= 1 ? "Low" : "Unknown";
  return {
    lpId: lp.id,
    lpName: lp.name,
    potentialFit,
    why,
    bestKnownRelationshipPath: path ? `${path.sourcePerson} → ${path.targetPerson} → ${lp.name}` : "No known path recorded.",
    evidence: evidence.length ? evidence : ["No material LP DNA evidence recorded yet."],
    informationGaps: gaps.length ? gaps : ["No obvious information gaps for the available data."],
  };
}

export function timelineEntryFromMeeting(lpId: string, workspaceId: string, extraction: MeetingExtractionRecord, supportingText: string, createdBy = "The GP"): LiveTimelineEntry {
  const now = new Date().toISOString();
  return {
    id: uid("tl"),
    workspaceId,
    lpId,
    date: extraction.nextActionDate || now.slice(0, 10),
    type: "meeting",
    source: "Meeting notes",
    summary: extraction.conciseMeetingSummary,
    supportingText,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

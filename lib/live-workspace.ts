import type { FundDNARecord, MeetingExtractionRecord } from "./ai-schemas";

export type LPStage = "Not started" | "Contacted" | "First meeting" | "Diligence" | "Soft circle" | "Committed" | "Passed";
export type TimelineKind = "introduction" | "email" | "meeting" | "note" | "follow-up" | "document request" | "stage change";

export type LiveLPRecord = {
  id: string;
  workspaceId: string;
  name: string;
  organization: string;
  lpType: string;
  email: string;
  relationshipOwner: string;
  relationshipSource: string;
  currentStage: LPStage;
  estimatedCommitmentRange: string;
  nextAction: string;
  nextActionDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
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
  informationGaps: string[];
  assumptions: string[];
  citations: string[];
};

export function uid(prefix = "rec") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
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

export function createMeetingBrief(fundDNA: FundDNARecord | null, lp: LiveLPRecord, timeline: LiveTimelineEntry[]): MeetingBrief {
  const sorted = [...timeline].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted.at(-1);
  const citations = [
    `LP record: ${lp.name}, ${lp.organization}, stage ${lp.currentStage}`,
    fundDNA ? `Fund DNA: ${fundDNA.fundName}, ${fundDNA.fundStage}, ${fundDNA.sectors.join(", ")}` : "Fund DNA: not approved yet",
    ...sorted.slice(-3).map((entry) => `Timeline ${entry.date}: ${entry.summary}`),
  ];
  const notes = [lp.notes, ...sorted.map((entry) => `${entry.summary} ${entry.supportingText}`)].join(" ").toLowerCase();
  const sectors = fundDNA?.sectors.length ? fundDNA.sectors : ["the fund thesis"];
  return {
    relationshipSummary: `${lp.name} at ${lp.organization} is a ${lp.lpType || "LP"} currently at ${lp.currentStage}. Relationship source: ${lp.relationshipSource || "not recorded"}.`,
    previousInteractionSummary: last ? `Most recent entry on ${last.date}: ${last.summary}` : "No previous timeline entries have been recorded.",
    likelyAreasOfAlignment: fundDNA ? [`LP may align with ${sectors.slice(0, 3).join(", ")} if those areas match their stated interests.`, `Estimated commitment range ${lp.estimatedCommitmentRange || "not recorded"} should be checked against the fund's target LP check size.`] : ["Approve Fund DNA before inferring fund/LP alignment."],
    possibleConcerns: [notes.includes("track") ? "Track record may require proof points." : "Track record depth should be proactively addressed.", notes.includes("timing") ? "Timing was mentioned and should be clarified." : "Allocation timing is unknown.", notes.includes("attribution") ? "Attribution clarity was mentioned." : "Attribution expectations are not fully documented."],
    recommendedQuestions: ["What would make this fund a fit for your current allocation plan?", "What check size range is realistic if diligence goes well?", "Who else should be involved before a decision?", "Which proof points would make the opportunity easier to underwrite?", "What timing constraints should we plan around?"],
    personalizedTalkingPoints: fundDNA ? [`Position around: ${fundDNA.recommendedPositioning}`, `Use evidence from Fund DNA: ${Object.values(fundDNA.evidence).flat().slice(0, 2).join(" | ") || "approved fund inputs"}`, `Connect the ask to ${lp.relationshipSource || "the relationship source"} without claiming unstated LP preferences.`] : ["Start by confirming the LP's interests; Fund DNA is not approved yet."],
    informationGaps: [!lp.email ? "LP email is missing." : "", !lp.estimatedCommitmentRange ? "Estimated commitment range is missing." : "", !lp.nextActionDate ? "Next action date is missing." : "", !fundDNA ? "Approved Fund DNA is missing." : ""].filter(Boolean),
    assumptions: ["No LP investment history, personal details, or preference claims are used unless present in the LP record or timeline."],
    citations,
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

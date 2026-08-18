const GENERIC_ENTITY_PHRASES = new Set([
  "AI",
  "Ask LP Brain",
  "Fund DNA",
  "LP Brain",
  "LP",
  "LPs",
  "GP",
  "The GP",
  "Family Office",
  "Family Offices",
  "Fund of Funds",
  "Angel Investor",
  "Angel Investors",
  "RIA",
  "RIAs",
  "Foundation",
  "Foundations",
  "Emerging Manager",
  "Emerging Managers",
]);

function textFrom(value: unknown) {
  return JSON.stringify(value ?? {});
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function namedEntitiesFromQuestion(question: string) {
  const matches = question.match(/\b[A-Z][A-Za-z]*(?:\s+(?:[A-Z][A-Za-z]*|of|the|and|&)){1,5}/g) || [];
  const questionWords = new Set(["Tell", "Give", "Which", "What", "Who", "Why", "How", "Draft", "List", "Show", "Explain", "Did", "Has", "Have", "Is", "Are"]);
  return [...new Set(matches.map((match) => {
    const parts = match.trim().split(/\s+/);
    return questionWords.has(parts[0]) ? parts.slice(1).join(" ") : parts.join(" ");
  }).filter((match) => {
    return Boolean(match) && !GENERIC_ENTITY_PHRASES.has(match);
  }))];
}

function lpProfilesFrom(memory: unknown): Record<string, unknown>[] {
  if (!isObject(memory)) return [];
  return asArray(memory.lpProfiles).filter(isObject);
}

function profileName(profile: Record<string, unknown>) {
  return String(profile.name || "").trim();
}

function profileOrganization(profile: Record<string, unknown>) {
  return String(profile.organization || profile.firm || "").trim();
}

function findProfileForEntity(entity: string, memory: unknown) {
  const needle = normalize(entity);
  return lpProfilesFrom(memory).find((profile) => {
    const name = normalize(profileName(profile));
    const organization = normalize(profileOrganization(profile));
    return Boolean((name && (name === needle || name.includes(needle) || needle.includes(name))) || (organization && (organization === needle || organization.includes(needle) || needle.includes(organization))));
  });
}

function hasWorkspaceEntity(entity: string, memory: unknown) {
  return normalize(textFrom(memory)).includes(normalize(entity));
}

function isMeaningfulFact(value: unknown) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  const text = String(value).trim().toLowerCase();
  return Boolean(text && text !== "unknown" && text !== "n/a" && text !== "none" && text !== "-");
}

function hasCommitmentEvidence(profile: Record<string, unknown>) {
  return isMeaningfulFact(profile.commitment) || isMeaningfulFact(profile.commitmentAmount) || String(profile.status || "").toLowerCase().includes("commit");
}

function commitmentEvidenceText(profile: Record<string, unknown>) {
  return [
    isMeaningfulFact(profile.commitment) ? String(profile.commitment).trim() : "",
    isMeaningfulFact(profile.commitmentAmount) ? String(profile.commitmentAmount).trim() : "",
    isMeaningfulFact(profile.estimatedCommitmentRange) ? String(profile.estimatedCommitmentRange).trim() : "",
    String(profile.status || "").toLowerCase().includes("commit") ? `Status: ${String(profile.status).trim()}` : "",
  ].filter(Boolean).join("; ");
}

function extractMoneyAmounts(text: string) {
  const amounts: number[] = [];
  const matches = text.matchAll(/\$?\s*(\d+(?:\.\d+)?)\s*(m|mm|million|k|thousand)?\b/gi);
  for (const match of matches) {
    const rawNumber = Number(match[1]);
    if (!Number.isFinite(rawNumber)) continue;
    const unit = (match[2] || "").toLowerCase();
    if (!unit && !match[0].includes("$")) continue;
    if (unit === "k" || unit === "thousand") amounts.push(rawNumber * 1000);
    else if (unit === "m" || unit === "mm" || unit === "million") amounts.push(rawNumber * 1000000);
    else amounts.push(rawNumber);
  }
  return [...new Set(amounts)];
}

function formatMoney(amount: number) {
  if (amount >= 1000000 && amount % 1000000 === 0) return `$${amount / 1000000}M`;
  if (amount >= 1000 && amount % 1000 === 0) return `$${amount / 1000}K`;
  return `$${amount.toLocaleString("en-US")}`;
}

function formatMoneyInText(text: string) {
  return text.replace(/\b([1-9]\d{5,})\b/g, (match) => formatMoney(Number(match)));
}

function hasMeetingEvidence(profile: Record<string, unknown>) {
  return asArray(profile.meetings).length > 0 || String(profile.recentActivity || profile.activity || "").toLowerCase().includes("meeting");
}

function hasDeadlineEvidence(profile: Record<string, unknown>) {
  return isMeaningfulFact(profile.due) || isMeaningfulFact(profile.nextActionDate);
}

function currentDateOnly(memory: unknown) {
  const source = isObject(memory) ? String(memory.currentDateIso || "") : "";
  const date = source ? new Date(source) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function parseIsoDateOnly(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return { kind: "missing" as const, value: "" };
  if (/^(today|tomorrow|yesterday)$/i.test(text)) return { kind: "relative" as const, value: text };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { kind: "invalid" as const, value: text };
  return { kind: "iso" as const, value: text };
}

function dateStatus(value: unknown, today: string) {
  const parsed = parseIsoDateOnly(value);
  if (parsed.kind !== "iso") return parsed;
  if (parsed.value < today) return { ...parsed, timing: "overdue" as const };
  if (parsed.value === today) return { ...parsed, timing: "today" as const };
  return { ...parsed, timing: "future" as const };
}

function profileDueValue(profile: Record<string, unknown>) {
  return profile.due || profile.nextActionDate;
}

function profileDisplay(profile: Record<string, unknown>) {
  const org = profileOrganization(profile);
  return `${profileName(profile)}${org ? ` at ${org}` : ""}`;
}

function profileStrength(profile: Record<string, unknown>) {
  const numeric = Number(profile.strength ?? profile.relationshipStrength);
  return Number.isFinite(numeric) ? numeric : 0;
}

function fitScoreFor(profile: Record<string, unknown>, memory: unknown) {
  if (!isObject(memory) || !isObject(memory.relationshipIntelligence)) return 0;
  const fitResults = memory.relationshipIntelligence.fitResults;
  if (!isObject(fitResults)) return 0;
  const id = String(profile.id || "");
  const fit = id ? fitResults[id] : null;
  return isObject(fit) && Number.isFinite(Number(fit.score)) ? Number(fit.score) : 0;
}

function explicitObjections(profile: Record<string, unknown>) {
  const values = [
    profile.concern,
    isObject(profile) && Array.isArray(profile.concerns) ? profile.concerns.join("; ") : "",
    ...asArray(profile.meetings).filter(isObject).map((meeting) => [meeting.concern, meeting.concerns, meeting.objection, meeting.objections, meeting.note].filter(isMeaningfulFact).join("; ")),
  ].filter(isMeaningfulFact).map((value) => String(value).trim());
  return [...new Set(values)];
}

function commitmentStage(profile: Record<string, unknown>) {
  const evidence = formatMoneyInText(commitmentEvidenceText(profile));
  const text = `${evidence} ${String(profile.status || "")}`.toLowerCase();
  if (!evidence && !String(profile.status || "").toLowerCase().includes("commit")) return null;
  if (/\bcommitted\b|confirmed commitment|wired|signed/i.test(text)) return { label: "confirmed commitment", evidence };
  if (/verbal indication|soft indication|soft circle|diligence/i.test(text)) return { label: "not confirmed; verbal/soft indication or diligence evidence only", evidence };
  return { label: "commitment evidence present, confirmation status unclear", evidence };
}

function rankingScore(profile: Record<string, unknown>, memory: unknown, today: string) {
  let score = 0;
  const reasons: string[] = [];
  const fit = fitScoreFor(profile, memory);
  if (fit) {
    score += fit;
    reasons.push(`LP fit score ${fit}`);
  }
  const strength = profileStrength(profile);
  if (strength) {
    score += strength / 2;
    reasons.push(`relationship strength ${strength}`);
  }
  const status = String(profile.status || "").toLowerCase();
  if (status.includes("diligence") || status.includes("soft")) {
    score += 25;
    reasons.push(`pipeline stage: ${profile.status}`);
  }
  const commitment = commitmentStage(profile);
  if (commitment) {
    score += commitment.label.includes("confirmed") ? 35 : 22;
    reasons.push(`commitment evidence: ${commitment.evidence || profile.status}`);
  }
  const due = dateStatus(profileDueValue(profile), today);
  if (due.kind === "iso" && due.timing === "today") {
    score += 18;
    reasons.push(`next action due today (${due.value})`);
  } else if (due.kind === "iso" && due.timing === "overdue") {
    score += 20;
    reasons.push(`next action overdue since ${due.value}`);
  } else if (due.kind === "iso" && due.timing === "future") {
    reasons.push(`next action scheduled for ${due.value}`);
  } else if (isMeaningfulFact(profile.nextAction)) {
    reasons.push(`next action recorded without factual due date: ${profile.nextAction}`);
  }
  if (explicitObjections(profile).length) reasons.push(`objection evidence: ${explicitObjections(profile).join("; ")}`);
  return { score, reasons };
}

function limitedProfiles(memory: unknown) {
  return lpProfilesFrom(memory).filter((profile) => isMeaningfulFact(profile.name));
}

function numbered(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function bullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function section(title: string, body: string) {
  return `## ${title}\n${body}`;
}

function conciseReasons(reasons: string[]) {
  return reasons.slice(0, 3).map(formatMoneyInText).join("; ");
}

function answerTopLPs(memory: unknown) {
  const today = currentDateOnly(memory);
  const ranked = limitedProfiles(memory).map((profile) => ({ profile, ...rankingScore(profile, memory, today) })).filter((row) => row.reasons.length).sort((a, b) => b.score - a.score).slice(0, 5);
  if (!ranked.length) return "Insufficient workspace evidence: no LP records contain enough fit, relationship, commitment, follow-up, objection, or meeting evidence to rank.";
  return ranked.map(({ profile, reasons }, index) => `${index + 1}. ${profileDisplay(profile)}\n${bullets([`Why now: ${conciseReasons(reasons)}`, `Next action: ${isMeaningfulFact(profile.nextAction) ? String(profile.nextAction) : "Recommended: choose a next action; no existing next action is recorded."}`])}`).join("\n\n");
}

function answerCold(memory: unknown) {
  const profiles = limitedProfiles(memory).filter((profile) => {
    const status = String(profile.status || "").toLowerCase();
    const activity = String(profile.recentActivity || profile.activity || "").toLowerCase();
    return status.includes("cold") || status.includes("inactive") || activity.includes("cold") || activity.includes("inactive") || activity.includes("no response");
  });
  if (!profiles.length) return "Insufficient workspace evidence: no LP relationship is explicitly marked cold, inactive, or no-response in the supplied workspace context.";
  return numbered(profiles.map((profile) => `${profileDisplay(profile)} - factual reason: status "${profile.status || "not recorded"}"; activity "${profile.recentActivity || profile.activity || "not recorded"}".`));
}

function answerFollowUpToday(memory: unknown) {
  const today = currentDateOnly(memory);
  const profiles = limitedProfiles(memory);
  const dueToday = profiles.filter((profile) => {
    const due = dateStatus(profileDueValue(profile), today);
    return due.kind === "iso" && due.timing === "today";
  });
  const overdue = profiles.filter((profile) => {
    const due = dateStatus(profileDueValue(profile), today);
    return due.kind === "iso" && due.timing === "overdue";
  });
  const relative = profiles.filter((profile) => dateStatus(profileDueValue(profile), today).kind === "relative");
  const noDatedAction = profiles.filter((profile) => isMeaningfulFact(profile.nextAction) && dateStatus(profileDueValue(profile), today).kind !== "iso");
  const parts: string[] = [];
  if (!dueToday.length && !overdue.length) parts.push("No LP follow-ups have a factual due date of today or earlier in the current workspace.");
  if (dueToday.length) parts.push(`Due today (${today}):\n${numbered(dueToday.map((profile) => `${profileDisplay(profile)} - ${profile.nextAction || "Follow up"}; due ${String(profileDueValue(profile))}.`))}`);
  if (overdue.length) parts.push(`Overdue:\n${numbered(overdue.map((profile) => `${profileDisplay(profile)} - ${profile.nextAction || "Follow up"}; due ${String(profileDueValue(profile))}.`))}`);
  if (noDatedAction.length) parts.push(`Not counted as due today because no factual ISO due date exists:\n${numbered(noDatedAction.map((profile) => `${profileDisplay(profile)} - next action: ${profile.nextAction || "recorded"}; date evidence: ${String(profileDueValue(profile) || "none")}.`))}`);
  if (relative.length) parts.push("Insufficient workspace evidence: one or more records use relative date text such as Today, Tomorrow, or Yesterday. I cannot convert that into an absolute due date without an ISO date in the workspace.");
  return parts.join("\n\n");
}

function answerObjections(memory: unknown) {
  const rows: { objection: string; names: string[] }[] = [];
  for (const profile of limitedProfiles(memory)) {
    for (const objection of explicitObjections(profile)) {
      const existing = rows.find((row) => normalize(row.objection) === normalize(objection));
      if (existing) existing.names.push(profileName(profile));
      else rows.push({ objection, names: [profileName(profile)] });
    }
  }
  if (!rows.length) return "Insufficient workspace evidence: no explicit LP objections are present in the supplied workspace context.";
  rows.sort((a, b) => b.names.length - a.names.length || a.objection.localeCompare(b.objection));
  return rows.map((row) => `${row.objection}\n${bullets([`${row.names.length} LP${row.names.length === 1 ? "" : "s"}`, `LP names: ${row.names.join(", ")}`])}`).join("\n\n");
}

function answerClosestToCommit(memory: unknown) {
  const rows = limitedProfiles(memory).map((profile) => ({ profile, stage: commitmentStage(profile) })).filter((row): row is { profile: Record<string, unknown>; stage: { label: string; evidence: string } } => Boolean(row.stage));
  if (!rows.length) return "Insufficient workspace evidence: no LP has recorded commitment, verbal indication, soft circle, or diligence commitment evidence.";
  return numbered(rows.map(({ profile, stage }) => `${profileDisplay(profile)} - ${stage.label}. Evidence: ${formatMoneyInText(stage.evidence || String(profile.status || ""))}.`));
}

export function groundedWorkspaceAnswer(question: string, memory: unknown) {
  const low = question.toLowerCase();
  const sections: { title: string; body: string; reason: string }[] = [];
  if (/\btop\b|\bfocus\b|\bprioriti[sz]e\b|\brank/.test(low)) sections.push({ title: "Top 5 to Focus on This Week", body: answerTopLPs(memory), reason: "evidence_based_prioritization" });
  if (/\bcold|cooling|inactive|going cold|no response/.test(low)) sections.push({ title: "Relationships Going Cold", body: answerCold(memory), reason: "cold_relationship_detection" });
  if (/\bfollow.?up\b/.test(low) && /\btoday\b/.test(low)) sections.push({ title: "Follow-ups Due / Overdue", body: answerFollowUpToday(memory), reason: "follow_up_today_grounding" });
  if (/\bobjection|concern|pushback/.test(low)) sections.push({ title: "Biggest Objections", body: answerObjections(memory), reason: "objection_aggregation" });
  if (/\bclosest\b.*\bcommit|\bcommit.*\bclosest|\blikely\b.*\bcommit/.test(low)) sections.push({ title: "Closest to Commitment", body: answerClosestToCommit(memory), reason: "commitment_stage_grounding" });
  if (!sections.length) return null;
  return { answer: sections.map(({ title, body }) => section(title, body)).join("\n\n"), reason: sections.map((item) => item.reason).join("+") };
}

function askedForCommitment(question: string) {
  return /\b(commit|commitment|committed|verbal|soft circle|soft indication)\b/i.test(question);
}

function askedForMeeting(question: string) {
  return /\b(meeting|met|call|conversation|transcript)\b/i.test(question);
}

function askedForDeadline(question: string) {
  return /\b(deadline|due date|follow-up date|follow up date|when|by what date)\b/i.test(question);
}

export function groundingPreflight(question: string, memory: unknown) {
  const namedEntities = namedEntitiesFromQuestion(question);
  const unsupported = namedEntities.filter((entity) => !hasWorkspaceEntity(entity, memory));
  if (unsupported.length) {
    return {
      answer: `Insufficient workspace evidence: ${unsupported.join(", ")} ${unsupported.length === 1 ? "is" : "are"} not present in the supplied workspace context. I can only answer using LPs, people, organizations, meetings, commitments, relationship paths, and dates already in the workspace.`,
      reason: "unsupported_named_entity",
    };
  }

  for (const entity of namedEntities) {
    const profile = findProfileForEntity(entity, memory);
    if (!profile) continue;
    if (askedForCommitment(question) && !hasCommitmentEvidence(profile)) {
      return {
        answer: `Workspace fact: ${profileName(profile)} is present in the workspace. Insufficient workspace evidence: no commitment or verbal commitment is recorded for ${profileName(profile)}. AI recommendation: confirm commitment status directly before treating this LP as committed.`,
        reason: "missing_commitment_evidence",
      };
    }
    if (askedForCommitment(question)) {
      const requestedAmounts = extractMoneyAmounts(question);
      const evidence = formatMoneyInText(commitmentEvidenceText(profile));
      const recordedAmounts = extractMoneyAmounts(evidence);
      if (requestedAmounts.length && recordedAmounts.length && !requestedAmounts.some((requested) => recordedAmounts.includes(requested))) {
        return {
          answer: `No. Workspace fact: ${profileName(profile)} is present in the workspace. The workspace does not show a ${requestedAmounts.map(formatMoney).join(" or ")} commitment. It shows: ${evidence}. AI recommendation: treat any larger commitment amount as unconfirmed unless it is added to the workspace with evidence.`,
          reason: "conflicting_commitment_evidence",
        };
      }
    }
    if (askedForMeeting(question) && !hasMeetingEvidence(profile)) {
      return {
        answer: `Workspace fact: ${profileName(profile)} is present in the workspace. Insufficient workspace evidence: no meeting record is available for ${profileName(profile)}. AI recommendation: add meeting notes or a timeline entry before relying on meeting-specific guidance.`,
        reason: "missing_meeting_evidence",
      };
    }
    if (askedForDeadline(question) && !hasDeadlineEvidence(profile)) {
      return {
        answer: `Workspace fact: ${profileName(profile)} is present in the workspace. Insufficient workspace evidence: no follow-up deadline or next-action date is recorded for ${profileName(profile)}. AI recommendation: set a recommended next action date instead of treating one as an existing deadline.`,
        reason: "missing_deadline_evidence",
      };
    }
  }

  return null;
}

export function groundedSystemPrompt() {
  return [
    "You are LP Brain, an AI-native LP discovery and relationship intelligence assistant for emerging venture fund managers.",
    "Answer the user's exact question using only the supplied fundraising memory context.",
    "Critical grounding rule: never invent an LP, person, organization, meeting, commitment, relationship, introduction path, investment preference, date, deadline, or next action and present it as workspace fact.",
    "Named LP recommendations may only reference LPs, people, or organizations present in the supplied workspace context.",
    "Every factual claim about an LP must be supported by available workspace data. If evidence is insufficient, explicitly say: Insufficient workspace evidence.",
    "Clearly distinguish Workspace fact from AI inference/recommendation.",
    "Recommended next actions may be generated, but label them as AI recommendations, not existing commitments or recorded tasks unless the context contains them.",
    "Do not fabricate deadlines or next-action dates. Use currentDate/currentDateIso from context when discussing timing.",
    "Never describe an action as due today unless the workspace contains an actual ISO date matching currentDateIso. If a date is relative text such as Today, Tomorrow, or Yesterday, say Insufficient workspace evidence for an absolute date.",
    "For ranking questions, separate Workspace facts from AI recommendation and cite concise evidence for every ranked LP.",
    "Do not treat interest, verbal indication, diligence, soft circle, or committed capital as equivalent. Preserve the exact workspace evidence.",
    "For objection aggregation, include only objections explicitly present in LP records or meeting notes.",
    "Use Fund DNA when explaining LP fit, and label fit explanations as AI inference unless the exact LP preference is recorded.",
    "Do not recommend Emerging Managers as an LP category unless the workspace context identifies a real investor or allocator fitting that role.",
    "If the user requests a count or format, follow it exactly.",
    "Return clean concise prose or bullets. Do not return raw JSON.",
  ].join(" ");
}

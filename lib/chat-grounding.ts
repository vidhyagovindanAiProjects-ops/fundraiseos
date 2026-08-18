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
  const questionWords = new Set(["Tell", "Give", "Which", "What", "Who", "Why", "How", "Draft", "List", "Show", "Explain", "Did"]);
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

function hasMeetingEvidence(profile: Record<string, unknown>) {
  return asArray(profile.meetings).length > 0 || String(profile.recentActivity || profile.activity || "").toLowerCase().includes("meeting");
}

function hasDeadlineEvidence(profile: Record<string, unknown>) {
  return isMeaningfulFact(profile.due) || isMeaningfulFact(profile.nextActionDate);
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
    "Use Fund DNA when explaining LP fit, and label fit explanations as AI inference unless the exact LP preference is recorded.",
    "Do not recommend Emerging Managers as an LP category unless the workspace context identifies a real investor or allocator fitting that role.",
    "If the user requests a count or format, follow it exactly.",
    "Return clean concise prose or bullets. Do not return raw JSON.",
  ].join(" ");
}

export type ConfidenceLabel = "low" | "medium" | "high";

export type FundDNARecord = {
  fundName: string;
  targetFundSize: string;
  fundStage: string;
  sectors: string[];
  geography: string;
  typicalInvestmentCheck: string;
  gpBackground: string;
  investmentThesis: string;
  fundSummary: string;
  investmentStrategy: string;
  differentiation: string;
  idealLPProfile: string;
  likelyFundraisingStrengths: string[];
  likelyLPConcerns: string[];
  recommendedPositioning: string;
  confidence: ConfidenceLabel;
  evidence: Record<string, string[]>;
};

export type MeetingExtractionRecord = {
  conciseMeetingSummary: string;
  questionsAsked: string[];
  objections: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  commitmentsOrPromises: string[];
  followUpTasks: string[];
  nextAction: string;
  nextActionDate: string;
  suggestedPipelineStage: string;
  assumptions: string[];
  evidence: Record<string, string[]>;
};

const confidenceLabels = new Set(["low", "medium", "high"]);

export function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
  return [];
}

export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function evidence(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, list(val)]));
}

export function normalizeFundDNA(raw: Record<string, unknown>): FundDNARecord {
  const confidence = text(raw.confidence).toLowerCase();
  return {
    fundName: text(raw.fundName),
    targetFundSize: text(raw.targetFundSize),
    fundStage: text(raw.fundStage || raw.stage),
    sectors: list(raw.sectors || raw.sectorFocus),
    geography: text(raw.geography),
    typicalInvestmentCheck: text(raw.typicalInvestmentCheck || raw.targetLPCheckSize),
    gpBackground: text(raw.gpBackground),
    investmentThesis: text(raw.investmentThesis),
    fundSummary: text(raw.fundSummary),
    investmentStrategy: text(raw.investmentStrategy),
    differentiation: text(raw.differentiation || raw.strongestDifferentiators),
    idealLPProfile: text(raw.idealLPProfile || raw.idealLPTypes),
    likelyFundraisingStrengths: list(raw.likelyFundraisingStrengths || raw.strongestDifferentiators),
    likelyLPConcerns: list(raw.likelyLPConcerns || raw.likelyLPObjections),
    recommendedPositioning: text(raw.recommendedPositioning || raw.suggestedFundraisingNarrative),
    confidence: confidenceLabels.has(confidence) ? confidence as ConfidenceLabel : "medium",
    evidence: evidence(raw.evidence),
  };
}

export function normalizeMeetingExtraction(raw: Record<string, unknown>): MeetingExtractionRecord {
  return {
    conciseMeetingSummary: text(raw.conciseMeetingSummary || raw.summary),
    questionsAsked: list(raw.questionsAsked),
    objections: list(raw.objections || raw.concernsRaised),
    positiveSignals: list(raw.positiveSignals),
    negativeSignals: list(raw.negativeSignals),
    commitmentsOrPromises: list(raw.commitmentsOrPromises || raw.commitmentSignals),
    followUpTasks: list(raw.followUpTasks),
    nextAction: text(raw.nextAction),
    nextActionDate: text(raw.nextActionDate || raw.followUpDueDate),
    suggestedPipelineStage: text(raw.suggestedPipelineStage),
    assumptions: list(raw.assumptions),
    evidence: evidence(raw.evidence),
  };
}

export function validateFundDNA(record: FundDNARecord): string[] {
  const missing = [
    ["fundName", record.fundName],
    ["fundSummary", record.fundSummary],
    ["investmentStrategy", record.investmentStrategy],
    ["idealLPProfile", record.idealLPProfile],
    ["recommendedPositioning", record.recommendedPositioning],
  ].filter(([, value]) => !value).map(([key]) => key);
  return missing;
}

export function validateMeetingExtraction(record: MeetingExtractionRecord): string[] {
  const missing = [
    ["conciseMeetingSummary", record.conciseMeetingSummary],
    ["nextAction", record.nextAction],
    ["suggestedPipelineStage", record.suggestedPipelineStage],
  ].filter(([, value]) => !value).map(([key]) => key);
  return missing;
}

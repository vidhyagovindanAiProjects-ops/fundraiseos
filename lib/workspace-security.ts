export const PRIVATE_WORKSPACE_MODE = "live";

type DbRow = Record<string, any>;

export function requiresServerWorkspaceContext(mode: unknown) {
  return mode === PRIVATE_WORKSPACE_MODE;
}

export function shouldAllowLocalWorkspaceFallback(supabaseConfigured: boolean, _authenticated: boolean) {
  return !supabaseConfigured;
}

export function onlyRowsOwnedBy<T extends DbRow>(rows: T[] | null | undefined, ownerId: string): T[] {
  return (rows || []).filter((row) => row.owner_id === ownerId);
}

export function workspaceInsertPayload(ownerId: string) {
  return { owner_id: ownerId, name: "My Fund Workspace", mode: PRIVATE_WORKSPACE_MODE };
}

export function workspaceBelongsToOwner(workspace: DbRow | null | undefined, ownerId: string) {
  return Boolean(workspace && workspace.owner_id === ownerId && workspace.mode === PRIVATE_WORKSPACE_MODE);
}

function text(value: unknown) {
  return String(value || "").trim();
}

function firstMatchingLine(source: string, label: string) {
  const match = source.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

function numberFromMoneyText(source: string) {
  const match = source.match(/\$?\s*(\d+(?:\.\d+)?)\s*(m|mm|million|k|thousand)?\b/i);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;
  const unit = (match[2] || "").toLowerCase();
  if (unit === "m" || unit === "mm" || unit === "million") return value * 1000000;
  if (unit === "k" || unit === "thousand") return value * 1000;
  return value;
}

export function buildAuthenticatedWorkspaceContext(input: {
  ownerId: string;
  workspace: DbRow;
  fundRecord?: DbRow | null;
  lpRows?: DbRow[] | null;
  timelineRows?: DbRow[] | null;
  pathRows?: DbRow[] | null;
  feedbackRows?: DbRow[] | null;
  outcomeRows?: DbRow[] | null;
  currentDateIso?: string;
}) {
  const ownerId = input.ownerId;
  const workspaceId = input.workspace.id;
  const fund = input.fundRecord && input.fundRecord.owner_id === ownerId ? input.fundRecord : null;
  const originalInputs = (fund?.original_inputs || {}) as { onboardingSummary?: any };
  const storedProfiles = Array.isArray(originalInputs.onboardingSummary?.profiles) ? originalInputs.onboardingSummary.profiles : [];
  const storedTasks = Array.isArray(originalInputs.onboardingSummary?.tasks) ? originalInputs.onboardingSummary.tasks : [];
  const timelines = onlyRowsOwnedBy(input.timelineRows, ownerId).filter((row) => row.workspace_id === workspaceId);
  const paths = onlyRowsOwnedBy(input.pathRows, ownerId).filter((row) => row.workspace_id === workspaceId);
  const feedback = onlyRowsOwnedBy(input.feedbackRows, ownerId).filter((row) => row.workspace_id === workspaceId);
  const outcomes = onlyRowsOwnedBy(input.outcomeRows, ownerId).filter((row) => row.workspace_id === workspaceId);
  const liveRows = onlyRowsOwnedBy(input.lpRows, ownerId).filter((row) => row.workspace_id === workspaceId);
  const liveProfiles = liveRows.map((row) => {
    const notes = text(row.notes);
    const commitment = firstMatchingLine(notes, "Commitment") || text(row.estimated_commitment_range);
    const concern = firstMatchingLine(notes, "Concern");
    return {
      id: row.id,
      name: text(row.name),
      organization: text(row.organization),
      firm: text(row.organization),
      type: text(row.lp_type),
      status: text(row.current_stage),
      strength: numberFromMoneyText(text(row.relationship_strength)) || text(row.relationship_strength),
      interest: text(row.sector_preferences?.value || row.lp_dna?.sectorPreferences?.value || row.lp_dna?.sector_preferences?.value),
      interests: [text(row.sector_preferences?.value || row.lp_dna?.sectorPreferences?.value || row.lp_dna?.sector_preferences?.value)].filter(Boolean),
      nextAction: text(row.next_action),
      due: text(row.next_action_date),
      concern,
      commitment,
      commitmentAmount: numberFromMoneyText(`${text(row.estimated_commitment_range)} ${commitment}`),
      recentActivity: notes.split(/\r?\n/).find(Boolean) || "",
      meetings: timelines.filter((entry) => entry.lp_id === row.id).map((entry) => ({ date: entry.entry_date, title: entry.summary, note: entry.supporting_text || entry.summary })),
    };
  });
  const lpProfiles = storedProfiles.length ? storedProfiles : liveProfiles;
  return {
    currentDateIso: input.currentDateIso || new Date().toISOString(),
    workspace: { id: workspaceId, mode: input.workspace.mode, name: input.workspace.name },
    fundDNA: fund?.generated_output || originalInputs.onboardingSummary?.fundDNA || null,
    lpProfiles,
    followUpTasks: storedTasks,
    relationshipIntelligence: { relationshipPaths: paths, recommendationFeedback: feedback, outcomes },
  };
}

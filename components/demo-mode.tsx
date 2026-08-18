"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BrainCircuit, CalendarDays, Check, ChevronRight, Clock3, Database, FileText, Home, LayoutList, Mail, Menu, Network, Plus, RefreshCw, Search, Send, Settings, Sparkles, Target, UploadCloud, Users, Video, Webhook, X, Zap } from "lucide-react";
import { activities as seedActivity, demoLPs, type Heat, type LP, type LPType } from "@/lib/demo-data";
import { normalizeFundDNA, normalizeMeetingExtraction, type FundDNARecord, type MeetingExtractionRecord } from "@/lib/ai-schemas";
import { createClient } from "@/lib/supabase/client";
import { createMeetingBrief, emptyLPDNA, explainLPOpportunity, lpFromCsv, normalizeLPDNA, parseCsvRows, prioritizeThisWeek, timelineEntryFromMeeting, uid, type LPOutcomeEvent, type LiveLPRecord, type LiveTimelineEntry, type RecommendationFeedback, type RecommendationFeedbackValue, type RejectionReason, type RelationshipPath, type RelationshipPathType } from "@/lib/live-workspace";

type Screen = "Home" | "LP Pipeline" | "Meetings" | "Knowledge" | "Discover Investors" | "Integrations" | "Settings" | "Fund DNA" | "Fundraising Strategy" | "LP Opportunities" | "LP Directory" | "Follow-ups" | "Relationship Graph";
type Task = { id: string; lpId: string; title: string; due: string; done: boolean };
type Feed = { title: string; meta: string; tag: string };
type Extraction = {
  lpName: string;
  firm: string;
  investorType: LPType;
  meetingDate: string;
  interestAreas: string[];
  checkSize: string;
  questionsAsked: string[];
  concernsRaised: string[];
  documentsRequested: string[];
  commitmentSignals: string;
  nextAction: string;
  followUpDueDate: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  confidenceScore: number;
  summary: string;
};
type FundDNA = {
  fundName: string;
  targetFundSize: string;
  stage: string;
  geography: string;
  sectorFocus: string[];
  idealLPTypes: string[];
  targetLPCheckSize: string;
  strongestDifferentiators: string[];
  likelyLPObjections: string[];
  suggestedFundraisingNarrative: string;
  confidenceScore: number;
};
type LPFit = { lpId: string; score: number; why: string; likelyObjection: string; outreachAngle: string; nextBestAction: string };
type StrategyAction = { title: string; reason: string; lpId?: string; urgency: "Today" | "This week" | "Delay" };
type OpportunityStatus = "Not started" | "Contacted" | "Meeting scheduled" | "Diligence" | "Soft circle" | "Committed" | "Passed" | "Not a fit";
type OpportunityReason = "" | "No allocation" | "Too early" | "Not enough track record" | "Geographic mismatch" | "Sector mismatch" | "Check size mismatch" | "Timing" | "Other";
type OpportunityOutcome = { status: OpportunityStatus; reason: OpportunityReason };
type FundraisingSignal = { label: "warming up" | "cooling down" | "high intent" | "needs follow-up" | "likely commitment" | "inactive"; reason: string; confidence: number };
type TimelineEvent = { kind: "Meeting" | "Email" | "Introduction" | "Data room access" | "Questions" | "Objections" | "Follow-up" | "Commitment" | "Next action"; title: string; detail: string; date: string };
type AutonomousRecommendation = { title: string; why: string; impact: string; confidence: number; action: string; lpId?: string };
type OutcomeInsight = { question: string; answer: string; evidence: string; confidence: number; suggestedAction: string; expectedImpact: string };
type FundraisingOutcomeIntelligence = { recommendations: OutcomeInsight[]; strategyChange: OutcomeInsight; metrics: { trackedInteractions: number; commitmentRate: number; topObjection: string; bestLPType: string; bestIntroSource: string; medianCommitmentDays: number } };
type IntegrationStatus = "Connected" | "Needs authentication" | "Syncing";
type IntegrationKey = "gmail" | "calendar" | "meetings" | "docsend" | "csv" | "api";
type IntegrationState = Record<IntegrationKey, { status: IntegrationStatus; lastSynced: string; imported: number; signal: string }>;
type WorkspaceMode = "Demo Workspace" | "My Fund Workspace";
type OnboardingSummary = {
  fundDNA: FundDNA;
  profiles: LP[];
  tasks: Task[];
  feed: Feed[];
  importedLPs: number;
  meetingsDetected: number;
  opportunitiesGenerated: number;
  missingInformation: string[];
  recommendedActions: string[];
  files: string[];
};
type LPOpportunity = {
  id: string;
  name: string;
  organization: string;
  type: LPType;
  estimatedFitScore: number;
  confidenceScore: number;
  status: OpportunityStatus;
  whyRecommended: string;
  likelyInterests: string[];
  likelyObjections: string[];
  suggestedFirstAction: string;
  suggestedOutreachAngle: string;
  introPath: string[];
  suggestedIntroducer: string;
  relationshipConfidence: number;
  recommendedIntroAsk: string;
  outreachPlaybook: { email: string; linkedIn: string; meetingAgenda: string[]; followUpSequence: string[] };
};
type DiscoveryOpportunity = {
  id: string;
  lpName: string;
  organization: string;
  investorType: LPType;
  rank: number;
  priority: "P1" | "P2" | "P3";
  whyMatches: string;
  whyRanksAbove: string;
  evidence: string[];
  confidenceScore: number;
  expectedCheckSize: string;
  warmIntroPossibilities: string[];
  likelyObjections: string[];
  suggestedFirstOutreach: string;
  recommendedTiming: string;
  expectedImpact: string;
  suggestedNextAction: string;
  providerName: string;
  providerLabel: "Demo Data" | "Imported Workspace Data" | "Manual Workspace Data";
  providerEvidence: string;
};
type DiscoveryInsights = {
  totalMatches: number;
  strongFamilyOfficeFits: number;
  emergingAIManagerInvestors: number;
  requiresWarmIntro: number;
  strongestSegment: string;
  thesisSignal: string;
  providerSummary: string;
};
type ProviderStatus = "Connected" | "Demo Active" | "Not Connected" | "Requires API credentials";
type ProviderKey = "demo" | "csv" | "manual" | "crunchbase" | "pitchbook" | "affinity" | "attio" | "mercury" | "docsend-provider" | "linkedin" | "openvc";
type ProviderRegistryItem = { key: ProviderKey; name: string; status: ProviderStatus; label: string; description: string; capabilities: string[] };
type ProviderContext = { workspaceMode: WorkspaceMode; importedCount: number; manualCount: number };
type ProviderSearchInput = { query: string; fundDNA: FundDNA | null; strategy: FundraisingStrategy | null; profiles: LP[] };
type InvestorProvider = {
  key: ProviderKey;
  name: string;
  status: ProviderStatus;
  label: string;
  searchInvestors: (input: ProviderSearchInput) => string[];
  lookupInvestor: (name: string, input: ProviderSearchInput) => string | null;
  searchOrganizations: (query: string, input: ProviderSearchInput) => string[];
  searchNews: (query: string) => string[];
  searchWarmIntroductions: (lpName: string, input: ProviderSearchInput) => string[];
};
type FundraisingStrategy = {
  idealLPProfile: string;
  lpTypesToPrioritize: string[];
  lpTypesToAvoid: string[];
  recommendedSequence: string[];
  likelyObjections: string[];
  recommendedPositioning: string;
  recommendedProofPoints: string[];
  suggestedOutreachStrategy: string[];
  geographicPriorities: string[];
  targetCheckSizeDistribution: string[];
  expectedFundraisingRisks: string[];
  aiPriorities: StrategyAction[];
  readinessScore: { score: number; helping: string[]; slowing: string[]; improveBeforeMoreLPs: string[] };
  narrativeCoach: { pitch30Second: string; executiveSummary: string; lpSpecificTalkingPoints: string[]; objectionResponses: string[] };
};

const investorTypes: LPType[] = ["Family Office", "Fund of Funds", "Angel Investor", "RIA", "Foundation"];
const initialTasks: Task[] = demoLPs.slice(0, 12).map((lp) => ({ id: `task-${lp.id}`, lpId: lp.id, title: lp.next, due: lp.due, done: false }));
const initialFeed: Feed[] = seedActivity.slice(0, 4);
const initialIntegrations: IntegrationState = {
  gmail: { status: "Needs authentication", lastSynced: "Not connected", imported: 0, signal: "Import fundraising emails, detect LP conversations, generate follow-up drafts, and update LP timelines." },
  calendar: { status: "Connected", lastSynced: "Today 8:30 AM", imported: 12, signal: "Import fundraising meetings, generate meeting briefs, and queue post-meeting intelligence updates." },
  meetings: { status: "Needs authentication", lastSynced: "Not connected", imported: 0, signal: "Import Zoom / Google Meet transcripts and trigger the Meeting Debrief Agent automatically." },
  docsend: { status: "Connected", lastSynced: "Today 9:10 AM", imported: 18, signal: "Track deck views, detect LP engagement, and update interest signals in the pipeline." },
  csv: { status: "Connected", lastSynced: "Today 9:25 AM", imported: 75, signal: "Import LP spreadsheets, historical meetings, and fundraising pipeline records." },
  api: { status: "Connected", lastSynced: "Live demo endpoint", imported: 6, signal: "Accept future integration events through a simple webhook/API layer." },
};

const sampleMeetingNote = `Meeting: Nora Ellis, Redwood Family Office
Date: June 27, 2026
Introduced by Maya Feldman at the Emerging Manager Dinner.

Nora is evaluating the venture fund for Redwood Family Office. She is interested in applied AI, vertical SaaS, and infrastructure software. She asked for the fund deck, track record by company, ownership history, and two founder references. Her main concern is attribution and whether the team can keep ownership targets with a concentrated seed strategy.

She said Redwood could consider a $750K allocation after reviewing the data room and references. Sentiment was positive, but she wants materials before her Monday partner discussion.

Next action: send track record analysis and founder references by July 2, 2026.`;

const sampleExtraction: Extraction = {
  lpName: "Nora Ellis",
  firm: "Redwood Family Office",
  investorType: "Family Office",
  meetingDate: "2026-06-27",
  interestAreas: ["Applied AI", "Vertical SaaS", "Infrastructure software"],
  checkSize: "$750K",
  questionsAsked: ["Can the GP show track record by company?", "How has ownership trended across prior investments?", "Can Redwood speak with two founders?"],
  concernsRaised: ["Attribution clarity", "Maintaining ownership targets with a concentrated seed strategy"],
  documentsRequested: ["Fund deck", "Track record analysis", "Founder references", "Data room access"],
  commitmentSignals: "Potential $750K allocation after reviewing data room and references.",
  nextAction: "Send track record analysis and founder references",
  followUpDueDate: "2026-07-02",
  sentiment: "Positive",
  confidenceScore: 0.91,
  summary: "Nora Ellis expressed positive interest in the venture fund and requested diligence materials before a partner discussion.",
};

const sampleFundMaterials = `The venture fund is an emerging manager seed fund led by The GP and a focused investment team.
The fund backs technical founders building applied AI, vertical SaaS, infrastructure software, and developer platforms across the United States.
The GP focuses on pre-seed and seed rounds, targets high ownership early, and supports founders with customer discovery, enterprise introductions, and follow-on fundraising.
The GP track record includes early investments in AI workflow automation, data infrastructure, cybersecurity automation, and B2B vertical software.
Target LPs include family offices, funds of funds, founder angels, RIAs with private-market programs, and foundations seeking emerging-manager exposure.
The fund is targeting LP checks from $250K to $1M.
Likely LP objections include attribution clarity, small team bandwidth, ownership durability, and whether the AI thesis is differentiated enough after the market reset.`;

const demoFundDNA: FundDNA = {
  fundName: "Emerging Venture Fund",
  targetFundSize: "Emerging venture fund",
  stage: "Pre-seed and seed",
  geography: "United States",
  sectorFocus: ["Applied AI", "Vertical SaaS", "Infrastructure software", "Developer platforms"],
  idealLPTypes: ["Family Office", "Fund of Funds", "Angel Investor", "RIA", "Foundation"],
  targetLPCheckSize: "$250K to $1M",
  strongestDifferentiators: ["Concentrated seed strategy", "Technical founder network", "Enterprise customer access", "Applied AI specialization", "Hands-on founder support"],
  likelyLPObjections: ["Attribution clarity", "Small team bandwidth", "Ownership durability", "Crowded AI fund landscape"],
  suggestedFundraisingNarrative: "The fund gives LPs focused exposure to technical founders turning AI into durable B2B software companies, with a concentrated seed strategy designed for meaningful ownership and hands-on company building.",
  confidenceScore: 0.92,
};

const sampleExistingLPCsv = `Name,Firm,Type,Stage,Interest,Concern,Next Action,Check Size,Last Contact,Intro Source
Amara Singh,Blue Oak Family Office,Family Office,Diligence,Applied AI and vertical SaaS,Attribution clarity,Send data room access,$500K,2026-06-28,Portfolio Founder
Julian Hart,Keystone Venture Access,Fund of Funds,First meeting,Emerging managers and seed funds,Track record depth,Schedule partner meeting,$1M,2026-06-25,Emerging Manager Circle
Maya Feldman,Independent Angel,Angel Investor,Soft circle,Developer tools and founder-led funds,Allocation size,Share founder references,$250K,2026-06-27,Founder referral
Priyanka Rao,Meridian Private Wealth,RIA,Contacted,Private markets and B2B software,Client suitability,Send first-close update,$300K,2026-06-21,Advisor network
David Mercer,Hawthorne Endowment,Foundation,Diligence,Responsible AI and mission alignment,Governance proof points,Provide track record analysis,$750K,2026-06-24,Allocator Forum`;

const sampleOnboardingMaterials = `${sampleFundMaterials}

Existing LP list export:
${sampleExistingLPCsv}`;

const integrationCatalog: Array<{ key: IntegrationKey; name: string; icon: typeof Mail; purpose: string; capabilities: string[]; downstream: string[]; authNote: string }> = [
  { key: "gmail", name: "Gmail", icon: Mail, purpose: "Import fundraising emails and detect LP conversations.", capabilities: ["Import fundraising emails", "Detect LP conversations", "Generate follow-up drafts", "Update LP timeline automatically"], downstream: ["LP timeline", "Follow-up tasks", "Ask Memory context"], authNote: "Demo connector. Real Gmail OAuth is not enabled in this build." },
  { key: "calendar", name: "Google Calendar", icon: CalendarDays, purpose: "Import fundraising meetings and create briefs.", capabilities: ["Import fundraising meetings", "Generate meeting briefs automatically", "Update Meeting Intelligence after meetings"], downstream: ["Meeting prep", "Activity feed", "AI Priorities"], authNote: "Demo connector using sample calendar events." },
  { key: "meetings", name: "Zoom / Google Meet", icon: Video, purpose: "Import transcripts and trigger debrief automation.", capabilities: ["Import meeting transcripts", "Automatically trigger Meeting Debrief Agent", "Create summaries, objections, and next actions"], downstream: ["Meeting Intelligence", "LP profile", "Fundraising timeline"], authNote: "Placeholder transcript importer; no live Zoom or Meet auth yet." },
  { key: "docsend", name: "DocSend", icon: FileText, purpose: "Track deck views and detect LP engagement.", capabilities: ["Track deck views", "Detect LP engagement", "Update LP interest signals"], downstream: ["Fundraising signals", "LP priority", "Relationship strategy"], authNote: "Demo engagement stream; production DocSend auth can attach later." },
  { key: "csv", name: "CSV Import", icon: Database, purpose: "Import spreadsheets, meetings, and fundraising pipeline history.", capabilities: ["Import LP spreadsheets", "Import historical meetings", "Import fundraising pipeline"], downstream: ["LP profiles", "Existing pipeline stages", "Relationship history"], authNote: "Uses the existing onboarding/import parser for demo data." },
  { key: "api", name: "Webhooks/API", icon: Webhook, purpose: "Let future integrations update LP Brain through a simple event layer.", capabilities: ["Receive integration events", "Update LP memory", "Queue downstream AI work"], downstream: ["LP profile", "Timeline", "Tasks", "Forecast"], authNote: "Demo endpoint available at /api/integrations for future integration events." },
];

function providerRegistry(context: ProviderContext): ProviderRegistryItem[] {
  return [
    { key: "demo", name: "Demo Provider", status: "Demo Active", label: "Demo Data", description: "Uses the built-in demo investor network and demo LP memory.", capabilities: ["searchInvestors()", "lookupInvestor()", "searchOrganizations()", "searchNews()", "searchWarmIntroductions()"] },
    { key: "csv", name: "CSV Provider", status: context.importedCount > 0 ? "Connected" : "Not Connected", label: "Imported Workspace Data", description: "Searches uploaded LP spreadsheets and relationship exports from My Fund Workspace.", capabilities: ["Search uploaded LP spreadsheets", "Search relationship exports", "Return imported workspace records"] },
    { key: "manual", name: "Manual Provider", status: context.manualCount > 0 ? "Connected" : "Not Connected", label: "Manual Workspace Data", description: "Searches LP profiles manually created or edited by the GP.", capabilities: ["Create LP profile", "Edit LP profile", "Search manual records"] },
    { key: "crunchbase", name: "Crunchbase Adapter", status: "Requires API credentials", label: "Requires API credentials", description: "Placeholder adapter only. No Crunchbase investor data is used until credentials are connected.", capabilities: ["Future investor lookup", "Future organization search"] },
    { key: "pitchbook", name: "PitchBook Adapter", status: "Requires API credentials", label: "Requires API credentials", description: "Placeholder adapter only. No PitchBook investor data is used until credentials are connected.", capabilities: ["Future LP lookup", "Future organization search"] },
    { key: "affinity", name: "Affinity Adapter", status: "Requires API credentials", label: "Requires API credentials", description: "Placeholder relationship-data adapter. Does not fabricate relationship data.", capabilities: ["Future relationship import", "Future warm intro search"] },
    { key: "attio", name: "Attio Adapter", status: "Requires API credentials", label: "Requires API credentials", description: "Placeholder relationship-data adapter. Does not fabricate relationship data.", capabilities: ["Future relationship import", "Future pipeline sync"] },
    { key: "mercury", name: "Mercury Adapter", status: "Requires API credentials", label: "Requires API credentials", description: "Placeholder adapter for future workspace/account context. No data is used yet.", capabilities: ["Future organization lookup"] },
    { key: "docsend-provider", name: "DocSend Provider Adapter", status: "Requires API credentials", label: "Requires API credentials", description: "Placeholder provider adapter. Existing DocSend demo integration does not provide real investor discovery data.", capabilities: ["Future deck engagement search", "Future LP engagement lookup"] },
    { key: "linkedin", name: "LinkedIn Adapter", status: "Not Connected", label: "Not Connected", description: "Placeholder adapter. LinkedIn data is not searched or fabricated.", capabilities: ["Future warm intro search"] },
    { key: "openvc", name: "OpenVC Adapter", status: "Requires API credentials", label: "Requires API credentials", description: "Placeholder adapter. No OpenVC investor data is used until connected.", capabilities: ["Future investor search"] },
  ];
}

function activeProviderLabel(context: ProviderContext) {
  if (context.manualCount > 0) return { providerName: "Manual Provider", providerLabel: "Manual Workspace Data" as const, providerSummary: "Manual Provider is active; recommendations can include GP-created or edited LP records." };
  if (context.workspaceMode === "My Fund Workspace" && context.importedCount > 0) return { providerName: "CSV Provider", providerLabel: "Imported Workspace Data" as const, providerSummary: "CSV Provider is active; recommendations are grounded in uploaded LP spreadsheets and relationship exports." };
  return { providerName: "Demo Provider", providerLabel: "Demo Data" as const, providerSummary: "Only Demo Provider is active; discovery results are clearly labeled Demo Data." };
}

function createProviders(context: ProviderContext): InvestorProvider[] {
  const registry = providerRegistry(context);
  const statusFor = (key: ProviderKey) => registry.find((provider) => provider.key === key)?.status || "Not Connected";
  return [
    {
      key: "demo",
      name: "Demo Provider",
      status: "Demo Active",
      label: "Demo Data",
      searchInvestors: () => discoverySeed.map((seed) => `${seed.lpName} - ${seed.organization}`),
      lookupInvestor: (name) => discoverySeed.find((seed) => name.toLowerCase().includes(seed.lpName.toLowerCase()) || name.toLowerCase().includes(seed.organization.toLowerCase()))?.proof || null,
      searchOrganizations: (query) => discoverySeed.filter((seed) => seed.organization.toLowerCase().includes(query.toLowerCase()) || seed.sectors.join(" ").toLowerCase().includes(query.toLowerCase())).map((seed) => seed.organization),
      searchNews: () => ["Demo Provider does not search live news."],
      searchWarmIntroductions: (lpName) => discoverySeed.find((seed) => seed.lpName === lpName)?.intro || [],
    },
    {
      key: "csv",
      name: "CSV Provider",
      status: statusFor("csv"),
      label: "Imported Workspace Data",
      searchInvestors: ({ profiles }) => context.importedCount > 0 ? profiles.map((lp) => `${lp.name} - ${lp.firm}`) : ["No connected investor source available."],
      lookupInvestor: (name, { profiles }) => profiles.find((lp) => name.toLowerCase().includes(lp.name.toLowerCase()) || name.toLowerCase().includes(lp.firm.toLowerCase()))?.activity || null,
      searchOrganizations: (query, { profiles }) => profiles.filter((lp) => lp.firm.toLowerCase().includes(query.toLowerCase())).map((lp) => lp.firm),
      searchNews: () => ["CSV Provider does not search live news."],
      searchWarmIntroductions: (lpName, { profiles }) => profiles.find((lp) => lp.name === lpName)?.source ? [profiles.find((lp) => lp.name === lpName)!.source] : [],
    },
    {
      key: "manual",
      name: "Manual Provider",
      status: statusFor("manual"),
      label: "Manual Workspace Data",
      searchInvestors: ({ profiles }) => context.manualCount > 0 ? profiles.filter((lp) => lp.event === "Manual Provider").map((lp) => `${lp.name} - ${lp.firm}`) : ["No connected investor source available."],
      lookupInvestor: (name, { profiles }) => profiles.find((lp) => lp.event === "Manual Provider" && (name.toLowerCase().includes(lp.name.toLowerCase()) || name.toLowerCase().includes(lp.firm.toLowerCase())))?.activity || null,
      searchOrganizations: (query, { profiles }) => profiles.filter((lp) => lp.event === "Manual Provider" && lp.firm.toLowerCase().includes(query.toLowerCase())).map((lp) => lp.firm),
      searchNews: () => ["Manual Provider does not search live news."],
      searchWarmIntroductions: (lpName, { profiles }) => profiles.find((lp) => lp.event === "Manual Provider" && lp.name === lpName)?.source ? [profiles.find((lp) => lp.event === "Manual Provider" && lp.name === lpName)!.source] : [],
    },
  ];
}

export function DemoMode() {
  const [screen, setScreen] = useState<Screen>("Home");
  const [profiles, setProfiles] = useState<LP[]>(demoLPs);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [feed, setFeed] = useState<Feed[]>(initialFeed);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [upload, setUpload] = useState(false);
  const [chat, setChat] = useState(false);
  const [selected, setSelected] = useState<LP | null>(null);
  const [toast, setToast] = useState("");
  const [latestUploadId, setLatestUploadId] = useState<string | null>(null);
  const [fundDNA, setFundDNA] = useState<FundDNA | null>(null);
  const [opportunityOutcomes, setOpportunityOutcomes] = useState<Record<string, OpportunityOutcome>>({});
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("Demo Workspace");
  const [onboarding, setOnboarding] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [myWorkspace, setMyWorkspace] = useState<OnboardingSummary | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationState>(initialIntegrations);
  const [manualEditor, setManualEditor] = useState<LP | "new" | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    if (window.location.hostname !== "localhost") return;
    window.location.replace(`http://127.0.0.1:3001${window.location.pathname}${window.location.search}${window.location.hash}`);
  }, []);
  const fitResults = useMemo(() => computeFits(profiles, fundDNA), [profiles, fundDNA]);
  const bestFits = useMemo(() => rankedFits(profiles, fitResults), [profiles, fitResults]);
  const strategy = useMemo(() => fundDNA ? generateFundraisingStrategy(fundDNA, profiles, tasks, fitResults) : null, [fundDNA, profiles, tasks, fitResults]);
  const opportunities = useMemo(() => fundDNA && strategy ? generateLPOpportunities(fundDNA, strategy, profiles, fitResults, opportunityOutcomes) : [], [fundDNA, strategy, profiles, fitResults, opportunityOutcomes]);
  const outcomeIntel = useMemo(() => generateOutcomeIntelligence(profiles, tasks, opportunities, opportunityOutcomes, fitResults), [profiles, tasks, opportunities, opportunityOutcomes, fitResults]);
  const providerContext = useMemo(() => ({ workspaceMode, importedCount: myWorkspace?.importedLPs || 0, manualCount: profiles.filter((lp) => lp.event === "Manual Provider").length }), [workspaceMode, myWorkspace, profiles]);
  const providers = useMemo(() => createProviders(providerContext), [providerContext]);
  const providerStatus = useMemo(() => providerRegistry(providerContext), [providerContext]);
  const discovery = useMemo(() => discoverInvestors(fundDNA, strategy, profiles, outcomeIntel, providerContext), [fundDNA, strategy, profiles, outcomeIntel, providerContext]);
  const signals = useMemo(() => Object.fromEntries(profiles.map((lp) => [lp.id, signalForLP(lp, tasks, fitResults[lp.id])])), [profiles, tasks, fitResults]);
  const forecast = useMemo(() => fundraisingForecast(profiles, tasks, fitResults), [profiles, tasks, fitResults]);
  const autonomous = useMemo(() => autonomousRecommendations(profiles, tasks, strategy, fitResults, latestUploadId), [profiles, tasks, strategy, fitResults, latestUploadId]);

  const metrics = useMemo(() => {
    const total = profiles.length;
    const active = profiles.filter((x) => x.status !== "Cold").length;
    const warm = profiles.filter((x) => x.status === "Warm").length;
    const commitments = profiles.filter((x) => x.commitmentAmount > 0).length;
    const pipeline = profiles.reduce((n, x) => n + x.commitmentAmount, 0);
    const open = tasks.filter((x) => !x.done).length;
    const overdue = tasks.filter((x) => !x.done && x.due === "Overdue").length;
    const score = Math.max(60, Math.min(96, Math.round(70 + (active / total) * 15 + (commitments / total) * 12 - overdue * 2)));
    return { total, active, warm, commitments, pipeline, open, overdue, score };
  }, [profiles, tasks]);

  const go = (s: Screen) => { setScreen(s); setMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2200); };
  const goSignIn = () => { window.location.href = "/login"; };
  const signOut = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setAuthEmail(null);
    setAuthError("");
    setMyWorkspace(null);
    switchWorkspace("Demo Workspace");
    notify("Signed out");
  };
  const reset = () => { setWorkspaceMode("Demo Workspace"); setProfiles(demoLPs); setTasks(initialTasks); setFeed(initialFeed); setLatestUploadId(null); setFundDNA(null); setOpportunityOutcomes({}); setIntegrations(initialIntegrations); setSelected(null); setChat(false); setUpload(false); setOnboarding(false); setQuery(""); setScreen("Home"); notify("Demo reset to starting state"); };
  const syncIntegration = (key: IntegrationKey) => {
    const connector = integrationCatalog.find((x) => x.key === key);
    setIntegrations((current) => ({ ...current, [key]: { ...current[key], status: "Syncing" } }));
    setTimeout(() => {
      setIntegrations((current) => ({ ...current, [key]: { ...current[key], status: "Connected", lastSynced: "Just now", imported: current[key].imported + (key === "csv" ? 75 : key === "api" ? 3 : 6) } }));
      if (key === "gmail") {
        const lp = profiles.find((x) => x.name === "Elena Park") || profiles[0];
        if (lp) {
          setTasks((current) => [{ id: `task-gmail-${Date.now()}`, lpId: lp.id, title: "Send follow-up draft from imported LP email", due: "Today", done: false }, ...current]);
          setFeed((current) => [{ title: "Gmail sync detected LP conversation", meta: `${lp.name} asked for a concise follow-up and diligence materials`, tag: "Follow-up draft generated" }, ...current]);
        }
      }
      if (key === "calendar") setFeed((current) => [{ title: "Google Calendar sync imported fundraising meetings", meta: "Meeting briefs generated for upcoming LP calls", tag: "Meeting Intelligence updated" }, ...current]);
      if (key === "meetings") setFeed((current) => [{ title: "Transcript sync updated Relationship Intelligence", meta: "Zoom / Google Meet demo transcript converted into meeting summary", tag: "Relationship Intelligence" }, ...current]);
      if (key === "docsend") setFeed((current) => [{ title: "DocSend sync detected deck engagement", meta: "High-intent LP deck views updated interest signals", tag: "Pipeline signal updated" }, ...current]);
      if (key === "csv") setFeed((current) => [{ title: "CSV import refreshed LP pipeline", meta: "LP spreadsheet, historical meetings, and stages parsed", tag: "Data import complete" }, ...current]);
      if (key === "api") setFeed((current) => [{ title: "Webhook/API event received", meta: "Future integration event updated LP Brain memory", tag: "Developer API demo" }, ...current]);
      notify(`${connector?.name || "Integration"} demo sync complete`);
    }, 650);
  };
  const switchWorkspace = (mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    setSelected(null);
    if (mode === "Demo Workspace" || !myWorkspace) {
      setProfiles(demoLPs);
      setTasks(initialTasks);
      setFeed(initialFeed);
      setFundDNA(null);
      setLatestUploadId(null);
      setOpportunityOutcomes({});
      notify("Switched to Demo Workspace");
    } else {
      setProfiles(myWorkspace.profiles);
      setTasks(myWorkspace.tasks);
      setFeed(myWorkspace.feed);
      setFundDNA(myWorkspace.fundDNA);
      setLatestUploadId(myWorkspace.profiles[0]?.id || null);
      setOpportunityOutcomes({});
      notify("Switched to My Fund Workspace");
    }
    setScreen("Home");
  };
  useEffect(() => {
    let cancelled = false;
    async function loadAuthAndWorkspace() {
      const supabase = createClient();
      if (!supabase) return;
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const authErrorCode = params.get("auth_error") || params.get("error_code") || hashParams.get("error_code") || params.get("error") || hashParams.get("error");
      const authErrorDescription = params.get("auth_error_description") || params.get("error_description") || hashParams.get("error_description");
      if (authErrorCode) {
        const message = authErrorCode === "otp_expired"
          ? "Authentication link is invalid or expired. Use the newest email link only after the Supabase email rate limit clears."
          : authErrorDescription || "Authentication failed. Please try signing in again.";
        if (!cancelled) setAuthError(message);
        params.delete("auth_error");
        params.delete("auth_error_description");
        params.delete("error");
        params.delete("error_code");
        params.delete("error_description");
        params.delete("error_uri");
        window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
      }
      if (window.location.hash.includes("access_token") || window.location.hash.includes("error")) {
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
      }
      const session = await supabase.auth.getSession();
      const userData = session.data.session?.user ? await supabase.auth.getUser() : { data: { user: null } };
      if (cancelled) return;
      setAuthEmail(userData.data.user?.email || null);
      if (userData.data.user) {
        const summary = await loadOnboardingWorkspaceFromSupabase();
        if (summary && !cancelled) {
          setMyWorkspace(summary);
          setWorkspaceMode("My Fund Workspace");
          setProfiles(summary.profiles);
          setTasks(summary.tasks);
          setFeed(summary.feed);
          setFundDNA(summary.fundDNA);
          setLatestUploadId(summary.profiles[0]?.id || null);
          setOpportunityOutcomes({});
          setScreen("Home");
        }
      }
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthEmail(session?.user?.email || null);
      });
      return () => data.subscription.unsubscribe();
    }
    let unsubscribe: void | (() => void);
    void loadAuthAndWorkspace().then((cleanup) => { unsubscribe = cleanup; });
    return () => { cancelled = true; if (unsubscribe) unsubscribe(); };
  }, []);

  const saveOnboarding = async (summary: OnboardingSummary) => {
    try {
      const saved = await saveOnboardingWorkspaceToSupabase(summary);
      setMyWorkspace(saved);
      setWorkspaceMode("My Fund Workspace");
      setProfiles(saved.profiles);
      setTasks(saved.tasks);
      setFeed(saved.feed);
      setFundDNA(saved.fundDNA);
      setLatestUploadId(saved.profiles[0]?.id || null);
      setOpportunityOutcomes({});
      setOnboarding(false);
      setScreen("Home");
      notify("My Fund Workspace saved to Supabase");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save My Fund Workspace");
    }
  };

  const approveExtraction = (extraction: Extraction, rawText: string) => {
    const lp = lpFromExtraction(extraction, rawText, profiles);
    setProfiles((current) => current.some((x) => sameLP(x, lp)) ? current.map((x) => sameLP(x, lp) ? { ...x, ...lp, id: x.id } : x) : [lp, ...current]);
    setTasks((current) => [{ id: `task-${lp.id}`, lpId: lp.id, title: lp.next, due: lp.due, done: false }, ...current.filter((x) => x.lpId !== lp.id)]);
    setFeed((current) => [{ title: `${lp.name} meeting extracted`, meta: `${lp.firm} - ${lp.last}`, tag: "Relationship Intelligence updated profile, timeline, tasks, forecast, and next action" }, { title: `${lp.name} follow-up draft generated`, meta: lp.next, tag: "Ready for GP review" }, ...current.filter((x) => !x.title.includes(lp.name))]);
    setLatestUploadId(lp.id);
    setUpload(false);
    setSelected(lp);
    notify("Relationship Intelligence updated every downstream workspace");
  };

  const saveDNA = (dna: FundDNA) => {
    setFundDNA(dna);
    setFeed((current) => [{ title: `${dna.fundName} Fund DNA created`, meta: `${dna.targetFundSize} - ${dna.stage} - ${dna.geography}`, tag: "Fundraising Strategy generated" }, ...current]);
    notify("Fund DNA approved. Strategy, LP Fit Scores, and priorities generated");
  };
  const saveManualLP = (lp: LP) => {
    const next = { ...lp, event: "Manual Provider", source: lp.source || "Manual Provider", activity: lp.activity || "Manually created LP profile", meetings: lp.meetings.length ? lp.meetings : [{ date: lp.last || "Today", title: "Manual profile update", note: "Created or edited directly by the GP." }] };
    setProfiles((current) => current.some((x) => x.id === next.id) ? current.map((x) => x.id === next.id ? next : x) : [next, ...current]);
    setFeed((current) => [{ title: `${next.name} saved via Manual Provider`, meta: `${next.firm} - ${next.type}`, tag: "Manual Workspace Data" }, ...current]);
    setManualEditor(null);
    notify("Manual Provider saved LP profile");
  };

  const nav: [Screen, typeof Home][] = [["Home", Home], ["LP Pipeline", Users], ["Meetings", LayoutList], ["Knowledge", BrainCircuit], ["Discover Investors", Target], ["Integrations", Webhook], ["Settings", Settings]];
  const readiness = strategy?.readinessScore.score || metrics.score;
  const activeNav = (label: Screen) => screen === label || (label === "Home" && ["Fund DNA", "Fundraising Strategy", "LP Opportunities", "Relationship Graph"].includes(screen));
  return <div className="shell demo-shell story-shell ai-shell">
    <aside className={`sidebar ${menu ? "open" : ""}`}>
      <div className="brand"><b>LP</b><span>LP <em>Brain</em></span></div>
      <button className="close-menu" aria-label="Close menu" onClick={() => setMenu(false)}><X /></button>
      <div className="demo-badge"><i />LP DISCOVERY INTELLIGENCE</div>
      <p className="nav-title">Workspace</p>
      <div className="workspace-switch"><button className={workspaceMode === "Demo Workspace" ? "on" : ""} onClick={() => switchWorkspace("Demo Workspace")}>Demo Workspace</button><button className={workspaceMode === "My Fund Workspace" ? "on" : ""} onClick={() => myWorkspace ? switchWorkspace("My Fund Workspace") : setOnboarding(true)}>My Fund Workspace</button></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={activeNav(label) ? "active" : ""} onClick={() => go(label)}><Icon /><span>{label}</span>{label === "LP Pipeline" && <i>{metrics.total}</i>}{label === "Meetings" && <i>{metrics.open}</i>}{label === "Home" && <i>{readiness}</i>}</button>)}</nav>
      <button className="health executive-health" onClick={() => go("Home")}><div><Target /><span>Fundraising Readiness</span><b>{readiness}/100</b></div><figure><i style={{ width: `${readiness}%` }} /></figure><p>{outcomeIntel.strategyChange.answer || autonomous[0]?.why || (strategy ? strategy.aiPriorities[0]?.reason : metrics.overdue ? `${metrics.overdue} overdue follow-up reducing score.` : "Strong LP alignment and healthy meeting cadence.")}</p><span>Recommended action: {outcomeIntel.strategyChange.suggestedAction || autonomous[0]?.action || strategy?.aiPriorities[0]?.title || "Complete the Elena Park follow-up today."}</span></button>
      <div className="story-user"><span>LP</span><p><b>LP Brain</b><small>{authEmail ? `Signed in: ${authEmail}` : "Not signed in"}</small></p></div>
    </aside>
    {menu && <div className="scrim" onClick={() => setMenu(false)} />}
    <main>
      <header><button className="hamb" aria-label="Open menu" onClick={() => setMenu(true)}><Menu /></button><div className="search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => go("LP Pipeline")} placeholder="Search LPs, firms, interests..." /></div><div className="head-actions"><span className="live-state"><i />{workspaceMode}</span>{authEmail ? <button className="reset-demo auth-control" onClick={signOut}>Signed in: {authEmail} · Sign out</button> : <button className="primary auth-control" onClick={goSignIn}>Sign in</button>}<button className="reset-demo" onClick={() => setOnboarding(true)}>Onboard fund</button><button className="reset-demo" onClick={() => setManualEditor("new")}>Add LP</button><button className="reset-demo" onClick={() => setFeedback(true)}>Feedback</button><button className="reset-demo" onClick={reset}>Reset demo</button><button className="primary" onClick={() => setUpload(true)}><Plus /><span>Upload meeting note</span></button></div></header>
      <div className="page demo-page ai-page">
        {authError && <div className="panel auth-error-banner"><b>Authentication issue</b><span>{authError}</span><button onClick={() => setAuthError("")}>Dismiss</button></div>}
        {screen === "Home" && <DashboardView profiles={profiles} tasks={tasks} feed={feed} metrics={metrics} latestUploadId={latestUploadId} fundDNA={fundDNA} strategy={strategy} bestFits={bestFits} go={go} openLP={setSelected} openChat={() => setChat(true)} openUpload={() => setUpload(true)} openOnboarding={() => setOnboarding(true)} workspaceMode={workspaceMode} onboardingSummary={myWorkspace} signals={signals} forecast={forecast} autonomous={autonomous} outcomeIntel={outcomeIntel} discovery={discovery} fitResults={fitResults} />}
        {screen === "LP Pipeline" && <PipelineWorkspace profiles={profiles} query={query} fitResults={fitResults} opportunities={opportunities} outcomes={opportunityOutcomes} openLP={setSelected} go={go} signals={signals} />}
        {screen === "Meetings" && <MeetingsWorkspace profiles={profiles} tasks={tasks} feed={feed} openUpload={() => setUpload(true)} toggle={(id) => setTasks((t) => t.map((x) => x.id === id ? { ...x, done: !x.done } : x))} />}
        {screen === "Knowledge" && <KnowledgeWorkspace profiles={profiles} latestUploadId={latestUploadId} fundDNA={fundDNA} strategy={strategy} bestFits={bestFits} fitResults={fitResults} opportunities={opportunities} outcomes={opportunityOutcomes} outcomeIntel={outcomeIntel} discovery={discovery} saveDNA={saveDNA} setOutcome={(id, outcome) => setOpportunityOutcomes((current) => ({ ...current, [id]: outcome }))} openLP={setSelected} openChat={() => setChat(true)} go={go} />}
        {screen === "Discover Investors" && <DiscoveryWorkspace fundDNA={fundDNA} strategy={strategy} discovery={discovery} providerStatus={providerStatus} providers={providers} openChat={() => setChat(true)} go={go} />}
        {screen === "Integrations" && <IntegrationsWorkspace integrations={integrations} providerStatus={providerStatus} syncIntegration={syncIntegration} feed={feed} openUpload={() => setUpload(true)} openOnboarding={() => setOnboarding(true)} openChat={() => setChat(true)} />}
        {screen === "Settings" && <SettingsWorkspace reset={reset} openChat={() => setChat(true)} openUpload={() => setUpload(true)} openOnboarding={() => setOnboarding(true)} openIntegrations={() => go("Integrations")} openManual={() => setManualEditor("new")} workspaceMode={workspaceMode} />}
        {screen === "Fund DNA" && <FundDNAView profiles={profiles} fundDNA={fundDNA} fitResults={fitResults} saveDNA={saveDNA} openLP={setSelected} openChat={() => setChat(true)} />}
        {screen === "Fundraising Strategy" && <StrategyView strategy={strategy} fundDNA={fundDNA} bestFits={bestFits} go={go} openLP={setSelected} openChat={() => setChat(true)} />}
        {screen === "LP Opportunities" && <OpportunitiesView fundDNA={fundDNA} strategy={strategy} opportunities={opportunities} outcomes={opportunityOutcomes} setOutcome={(id, outcome) => setOpportunityOutcomes((current) => ({ ...current, [id]: outcome }))} openChat={() => setChat(true)} />}
        {screen === "LP Directory" && <Directory profiles={profiles} query={query} fitResults={fitResults} openLP={setSelected} />}
        {screen === "Follow-ups" && <Followups profiles={profiles} tasks={tasks} toggle={(id) => setTasks((t) => t.map((x) => x.id === id ? { ...x, done: !x.done } : x))} />}
        {screen === "Relationship Graph" && <Graph profiles={profiles} latestUploadId={latestUploadId} openChat={() => setChat(true)} />}
      </div>
    </main>
    <button className="float-feedback" onClick={() => setFeedback(true)}>Feedback</button>
    <button className="float-chat always" onClick={() => setChat(true)}><Sparkles />Ask memory</button>
    {upload && <Upload close={() => setUpload(false)} approve={approveExtraction} />}
    {onboarding && <FundOnboarding close={() => setOnboarding(false)} save={saveOnboarding} />}
    {feedback && <FeedbackModal close={() => setFeedback(false)} />}
    {manualEditor && <ManualLPModal lp={manualEditor === "new" ? null : manualEditor} close={() => setManualEditor(null)} save={saveManualLP} />}
    {selected && <Profile lp={selected} fit={fitResults[selected.id]} signal={signals[selected.id]} timeline={timelineForLP(selected, tasks, fitResults[selected.id])} artifacts={autonomousArtifacts(selected, fitResults[selected.id], fundDNA)} close={() => setSelected(null)} openChat={() => { setSelected(null); setChat(true); }} edit={() => { setManualEditor(selected); setSelected(null); }} />}
    {chat && <Chat profiles={profiles} tasks={tasks} fundDNA={fundDNA} strategy={strategy} opportunities={opportunities} outcomes={opportunityOutcomes} fitResults={fitResults} outcomeIntel={outcomeIntel} integrations={integrations} discovery={discovery} providers={providers} close={() => setChat(false)} />}
    {toast && <div className="toast"><Check />{toast}</div>}
  </div>;
}

function sameLP(a: LP, b: LP) { return a.name.toLowerCase() === b.name.toLowerCase() || (a.firm.toLowerCase() === b.firm.toLowerCase() && a.name.split(" ")[0].toLowerCase() === b.name.split(" ")[0].toLowerCase()); }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 3).toUpperCase() || "LP"; }
function money(n: number) { if (n > 0 && n < 1_000_000) return `$${Math.round(n / 1000)}K`; const v = n / 1e6; return `$${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}M`; }
function parseAmount(value: string) { const match = value.match(/\$?\s*([\d,.]+)\s*([kKmM])?/); if (!match) return 0; const base = Number(match[1].replace(/,/g, "")); if (!Number.isFinite(base)) return 0; return match[2]?.toLowerCase() === "m" ? base * 1_000_000 : match[2]?.toLowerCase() === "k" ? base * 1_000 : base; }
function displayDate(value: string) { if (!value) return "Just now"; const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/); const d = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function dueLabel(value: string) { return displayDate(value || ""); }
function statusFromExtraction(extraction: Extraction): Heat { if (extraction.sentiment === "Negative") return "Cold"; if (extraction.commitmentSignals.toLowerCase().includes("commit") || extraction.checkSize || extraction.confidenceScore >= 0.82) return "Hot"; return "Warm"; }
function strengthFromExtraction(extraction: Extraction) { const base = extraction.sentiment === "Positive" ? 82 : extraction.sentiment === "Negative" ? 42 : 66; return Math.max(35, Math.min(95, Math.round(base + extraction.confidenceScore * 10))); }
function textToList(value: string) { return value.split(/\n|,/).map((x) => x.trim()).filter(Boolean); }
function extractionToText(extraction: Extraction) { return JSON.stringify(extraction, null, 2); }
function dnaToText(dna: FundDNA) { return JSON.stringify(dna, null, 2); }
function strategyToText(strategy: FundraisingStrategy) { return JSON.stringify(strategy, null, 2); }
function normalizeWords(values: string[]) { return values.flatMap((x) => x.toLowerCase().split(/[^a-z0-9]+/)).filter((x) => x.length > 2); }
function hasOverlap(a: string[], b: string[]) { const left = new Set(normalizeWords(a)); return normalizeWords(b).some((x) => left.has(x)); }
function objectionFor(lp: LP, dna: FundDNA) { const concern = lp.concern || dna.likelyLPObjections[0] || "Needs more proof points"; if (concern.toLowerCase().includes("attribution")) return "Will want crisp attribution proof and evidence that prior wins map to this strategy."; if (concern.toLowerCase().includes("capacity") || concern.toLowerCase().includes("bandwidth")) return "May question whether a lean GP team can support portfolio and fundraising simultaneously."; if (concern.toLowerCase().includes("timing")) return "May like the strategy but need a timing bridge or quarterly-update path."; return concern; }
function fitForLP(lp: LP, dna: FundDNA): LPFit { const typeFit = dna.idealLPTypes.includes(lp.type) ? 18 : 6; const sectorFit = hasOverlap(lp.interests, dna.sectorFocus) ? 24 : lp.interest.toLowerCase().includes("ai") ? 18 : 8; const heatFit = lp.status === "Hot" ? 16 : lp.status === "Warm" ? 10 : 2; const relationshipFit = Math.round(lp.strength * 0.22); const commitmentFit = lp.commitmentAmount ? 10 : 0; const score = Math.max(35, Math.min(98, typeFit + sectorFit + heatFit + relationshipFit + commitmentFit + 14)); const bestSector = dna.sectorFocus.find((sector) => lp.interest.toLowerCase().includes(sector.toLowerCase().split(" ")[0])) || dna.sectorFocus[0] || "the thesis"; return { lpId: lp.id, score, why: `${lp.type} profile aligns with ${dna.fundName || "the fund"}'s target LP base, and their stated interest in ${lp.interest} maps to ${bestSector}. Relationship strength is ${lp.strength}%, so this is actionable rather than theoretical.`, likelyObjection: objectionFor(lp, dna), outreachAngle: `Lead with ${bestSector}, the concentrated seed strategy, and why ${dna.targetLPCheckSize || "$250K-$1M"} checks can get meaningful exposure.`, nextBestAction: lp.status === "Cold" ? "Send a concise thesis update and ask for a warm intro path." : lp.next }; }
function computeFits(profiles: LP[], dna: FundDNA | null) { if (!dna) return {}; return Object.fromEntries(profiles.map((lp) => [lp.id, fitForLP(lp, dna)])); }
function rankedFits(profiles: LP[], fits: Record<string, LPFit>) { return profiles.map((lp) => ({ lp, fit: fits[lp.id] })).filter((x): x is { lp: LP; fit: LPFit } => !!x.fit).sort((a, b) => b.fit.score - a.fit.score); }
function lpFromExtraction(extraction: Extraction, rawText: string, existing: LP[]): LP { const commitmentAmount = parseAmount(extraction.checkSize || extraction.commitmentSignals); const existingLP = existing.find((x) => x.name.toLowerCase() === extraction.lpName.toLowerCase()); const id = existingLP?.id || `lp-uploaded-${Date.now()}`; return { id, initials: initials(extraction.lpName), color: existingLP?.color || "#3d4b72", name: extraction.lpName || "Unknown LP", firm: extraction.firm || "Unknown organization", type: extraction.investorType, status: statusFromExtraction(extraction), strength: strengthFromExtraction(extraction), interest: extraction.interestAreas.join(", ") || "Needs qualification", interests: extraction.interestAreas, last: displayDate(extraction.meetingDate), next: extraction.nextAction || "Review extracted meeting note", due: dueLabel(extraction.followUpDueDate), source: "Uploaded meeting note", event: "AI extraction", concern: extraction.concernsRaised[0] || "No major concern captured", commitment: commitmentAmount ? `${extraction.checkSize || money(commitmentAmount)} signal - ${extraction.commitmentSignals || "diligence pending"}` : extraction.commitmentSignals || "No commitment yet", commitmentAmount, activity: extraction.documentsRequested.length ? `Requested ${extraction.documentsRequested.join(", ")}` : extraction.summary || "Meeting note extracted", meetings: [{ date: displayDate(extraction.meetingDate), title: "AI-extracted meeting note", note: extraction.summary || rawText.slice(0, 220) }, ...(existingLP?.meetings || [])] }; }

function inferFundDNA(materials: string, files: string[]): FundDNA {
  const low = materials.toLowerCase();
  const sectors = ["Applied AI", "Vertical SaaS", "Infrastructure software", "Developer platforms", "Cybersecurity", "Fintech"].filter((x) => low.includes(x.toLowerCase().split(" ")[0]));
  const size = materials.match(/(?:target fund size|fund size|targeting|raising)[^.\n$]{0,40}\$?\s?(\d{1,3})\s?m/i)?.[0].match(/\$?\s?(\d{1,3})\s?m/i)?.[0]?.replace(/\s+/g, "") || "Target fund size not provided";
  return {
    fundName: low.includes("blue oak") ? "Blue Oak Venture Fund" : low.includes("frontier") ? "Frontier Seed Fund" : "Imported Venture Fund",
    targetFundSize: size.toLowerCase().includes("m") ? `${size.replace("$", "$")} target` : "Target fund size not provided",
    stage: low.includes("pre-seed") ? "Pre-seed and seed" : low.includes("seed") ? "Seed" : "Early-stage venture",
    geography: low.includes("europe") ? "United States and Europe" : "United States",
    sectorFocus: sectors.length ? sectors.slice(0, 4) : ["Applied AI", "Vertical SaaS", "Infrastructure software"],
    idealLPTypes: ["Family Office", "Fund of Funds", "Angel Investor", "RIA", "Foundation"],
    targetLPCheckSize: low.includes("$1m") || low.includes("$1M") ? "$250K to $1M" : "$250K to $750K",
    strongestDifferentiators: ["Focused thesis", "Emerging-manager access", "Technical founder network", "Hands-on portfolio support"],
    likelyLPObjections: ["Attribution clarity", "Small team bandwidth", "Proof of repeatable sourcing", "Portfolio concentration"],
    suggestedFundraisingNarrative: "Position the fund as a focused emerging-manager vehicle that gives LPs concentrated exposure to technical founders building durable B2B software, with the GP acting as a hands-on partner from seed through follow-on.",
    confidenceScore: files.length || materials.length > 400 ? 0.9 : 0.76,
  };
}

function parseImportedLPs(text: string): LP[] {
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const csvStart = lines.findIndex((x) => /name\s*,\s*firm/i.test(x));
  const rows = (csvStart >= 0 ? lines.slice(csvStart + 1) : lines).filter((x) => x.includes(",")).slice(0, 24);
  const colors = ["#3d4b72", "#8e6358", "#60776b", "#817056", "#536276", "#745f78"];
  return rows.map((row, i) => {
    const [nameRaw, firmRaw, typeRaw, stageRaw, interestRaw, concernRaw, nextRaw, checkRaw, lastRaw, sourceRaw] = row.split(",").map((x) => x.trim());
    const type = investorTypes.includes(typeRaw as LPType) ? typeRaw as LPType : investorTypes[i % investorTypes.length];
    const status: Heat = /diligence|soft circle|committed/i.test(stageRaw || "") ? "Hot" : /contacted|meeting/i.test(stageRaw || "") ? "Warm" : "Cold";
    const amount = parseAmount(checkRaw || "");
    const interest = interestRaw || ["Applied AI", "Seed funds", "Private markets access"][i % 3];
    const name = nameRaw || `Imported LP ${i + 1}`;
    return {
      id: `my-lp-${Date.now()}-${i}`,
      initials: initials(name),
      color: colors[i % colors.length],
      name,
      firm: firmRaw || "Imported organization",
      type,
      status,
      strength: status === "Hot" ? 86 - (i % 6) : status === "Warm" ? 70 - (i % 8) : 48,
      interest,
      interests: textToList(interest),
      last: displayDate(lastRaw || "2026-06-26"),
      next: nextRaw || "Qualify relationship and confirm LP fit",
      due: i % 3 === 0 ? "Today" : `Jul ${2 + i}`,
      source: sourceRaw || "Imported LP List",
      event: "Fund onboarding import",
      concern: concernRaw || "Needs qualification",
      commitment: amount ? `${money(amount)} indicated check size` : "No commitment yet",
      commitmentAmount: amount,
      activity: stageRaw ? `Imported pipeline stage: ${stageRaw}` : "Imported from onboarding",
      meetings: [{ date: displayDate(lastRaw || "2026-06-26"), title: "Imported LP relationship activity", note: `${name} imported during fund onboarding. Stage: ${stageRaw || "Needs qualification"}. Interest: ${interest}.` }],
    };
  });
}

function fallbackImportedLPs(): LP[] {
  return parseImportedLPs(sampleExistingLPCsv);
}

function generateOnboardingSummary(materials: string, csvText: string, files: string[]): OnboardingSummary {
  const source = `${materials}\n${csvText}`.trim() || sampleOnboardingMaterials;
  const fundDNA = inferFundDNA(source, files);
  const profiles = parseImportedLPs(csvText || source);
  const imported = profiles.length ? profiles : fallbackImportedLPs();
  const tasks = imported.slice(0, Math.max(3, Math.min(8, imported.length))).map((lp) => ({ id: `my-task-${lp.id}`, lpId: lp.id, title: lp.next, due: lp.due, done: false }));
  const feed = [
    { title: `${fundDNA.fundName} imported`, meta: `${fundDNA.stage} - ${fundDNA.geography}`, tag: "Fund DNA, thesis summary, narrative, and target LP profile generated" },
    { title: `${imported.length} existing LPs imported`, meta: "Pipeline stages, next actions, and relationship history detected", tag: "My Fund Workspace" },
    { title: "LP Fit and opportunities generated", meta: `${Math.max(8, imported.length + 6)} recommended LP opportunities`, tag: "AI Priorities updated" },
  ];
  const missingInformation = [
    fundDNA.targetFundSize.includes("not provided") ? "Target fund size" : "",
    source.toLowerCase().includes("track record") ? "" : "Track record details",
    source.toLowerCase().includes("portfolio") ? "" : "Portfolio proof points",
    imported.some((lp) => lp.source === "Imported LP List") ? "Warm introducer names for some LPs" : "",
  ].filter(Boolean);
  return {
    fundDNA,
    profiles: imported,
    tasks,
    feed,
    importedLPs: imported.length,
    meetingsDetected: imported.reduce((n, lp) => n + lp.meetings.length, 0),
    opportunitiesGenerated: Math.max(8, imported.length + 6),
    missingInformation,
    recommendedActions: [
      "Review the top five LP Fit Scores before sending new outreach.",
      "Send diligence materials to hot imported LPs with open next actions.",
      "Add missing proof points so the Narrative Coach can handle likely objections.",
      "Ask Memory which imported LPs should be prioritized this week.",
    ],
    files,
  };
}

function signalForLP(lp: LP, tasks: Task[], fit?: LPFit): FundraisingSignal {
  const task = tasks.find((x) => x.lpId === lp.id && !x.done);
  if (task?.due === "Overdue") return { label: "needs follow-up", reason: `${task.title} is overdue and momentum can decay if the GP waits.`, confidence: 94 };
  if (lp.commitmentAmount > 0 || lp.commitment.toLowerCase().includes("allocation")) return { label: "likely commitment", reason: `${lp.commitment} creates a clear allocation signal.`, confidence: 91 };
  if (lp.status === "Hot" || (fit?.score || 0) >= 90) return { label: "high intent", reason: `${lp.name} has ${fit ? `${fit.score}% LP fit` : `${lp.strength}% relationship strength`} and a concrete next action.`, confidence: 88 };
  if (lp.status === "Warm") return { label: "warming up", reason: `${lp.activity} suggests the relationship is moving forward.`, confidence: 78 };
  if (lp.due.toLowerCase().includes("quarterly") || lp.concern.toLowerCase().includes("timing")) return { label: "cooling down", reason: `Timing or objection signals suggest the GP should use updates instead of pushing a meeting.`, confidence: 74 };
  return { label: "inactive", reason: `No near-term meeting, document request, or commitment signal is active.`, confidence: 69 };
}

function confidenceLabel(score: number) {
  if (score >= 86) return "HIGH";
  if (score >= 72) return "MEDIUM";
  return "LOW";
}

function timelineForLP(lp: LP, tasks: Task[], fit?: LPFit): TimelineEvent[] {
  const task = tasks.find((x) => x.lpId === lp.id && !x.done);
  const events: TimelineEvent[] = [
    { kind: "Introduction", title: `Introduced by ${lp.source}`, detail: lp.event, date: "Source" },
    ...lp.meetings.map((m) => ({ kind: "Meeting" as const, title: m.title, detail: m.note, date: m.date })),
    { kind: "Questions", title: "Questions detected", detail: lp.activity, date: lp.last },
    { kind: "Objections", title: "Objection captured", detail: fit?.likelyObjection || lp.concern, date: lp.last },
  ];
  if (lp.activity.toLowerCase().includes("data room")) events.push({ kind: "Data room access", title: "Data room requested", detail: "Send secure link and confirm access.", date: lp.last });
  if (lp.commitmentAmount > 0) events.push({ kind: "Commitment", title: `${money(lp.commitmentAmount)} indication`, detail: lp.commitment, date: lp.last });
  if (task) events.push({ kind: "Follow-up", title: task.title, detail: `Due ${task.due}. This task was generated from LP memory.`, date: task.due });
  events.push({ kind: "Next action", title: fit?.nextBestAction || lp.next, detail: "Recommended by LP Matching Intelligence.", date: task?.due || lp.due });
  return events;
}

function autonomousArtifacts(lp: LP, fit?: LPFit, fundDNA?: FundDNA | null) {
  const docs = ["Fund deck", "Track record analysis", "Founder references", "Data room access"].filter((doc) => lp.activity.toLowerCase().includes(doc.toLowerCase().split(" ")[0]) || lp.next.toLowerCase().includes(doc.toLowerCase().split(" ")[0]));
  return {
    summary: `${lp.name} at ${lp.firm} is a ${lp.status.toLowerCase()} ${lp.type} relationship. Current signal: ${lp.activity}. Main concern: ${lp.concern}.`,
    email: `Hi ${lp.name.split(" ")[0]},\n\nGreat speaking with you. I’ll send ${docs.length ? docs.join(", ") : "the requested materials"} and follow up on ${lp.due}.\n\nThe most relevant point for ${lp.firm}: ${fit?.outreachAngle || `the fund maps to your interest in ${lp.interest}`}.\n\nBest,\nThe GP`,
    crm: `Signal: ${lp.activity}. Interest: ${lp.interest}. Concern: ${lp.concern}. Commitment: ${lp.commitment}. Next action: ${fit?.nextBestAction || lp.next}.`,
    nextMeeting: lp.status === "Hot" ? "Schedule a 25-minute diligence follow-up within two business days." : "Keep warm with a concise thesis update and ask for timing.",
    objections: [fit?.likelyObjection || lp.concern],
    commitmentSignals: lp.commitmentAmount ? [`${money(lp.commitmentAmount)} indicated`] : [lp.commitment],
    documents: docs.length ? docs : ["Short thesis memo", "Fund deck", "Relevant proof point"],
    narrative: fundDNA?.suggestedFundraisingNarrative || "Lead with focused seed exposure, ownership discipline, and concrete proof points.",
  };
}

function fundraisingForecast(profiles: LP[], tasks: Task[], fits: Record<string, LPFit>) {
  const weighted = profiles.reduce((sum, lp) => {
    const fit = fits[lp.id]?.score || lp.strength;
    const base = lp.commitmentAmount || (lp.status === "Hot" ? 500000 : lp.status === "Warm" ? 250000 : 75000);
    const probability = Math.min(.82, Math.max(.12, (fit / 100) * (lp.status === "Hot" ? .78 : lp.status === "Warm" ? .46 : .18)));
    return sum + base * probability;
  }, 0);
  const overdue = tasks.filter((x) => !x.done && x.due === "Overdue").length;
  return {
    weighted,
    rangeLow: Math.round(weighted * .72),
    rangeHigh: Math.round(weighted * 1.28),
    confidence: Math.max(62, Math.min(91, Math.round(82 - overdue * 4 + profiles.filter((p) => p.commitmentAmount > 0).length * .25))),
    risk: overdue ? `${overdue} overdue follow-up is reducing forecast confidence.` : "No urgent follow-up drag detected.",
  };
}

function autonomousRecommendations(profiles: LP[], tasks: Task[], strategy: FundraisingStrategy | null, fits: Record<string, LPFit>, latestUploadId: string | null): AutonomousRecommendation[] {
  const uploaded = latestUploadId ? profiles.find((x) => x.id === latestUploadId) : null;
  const ranked = rankedFits(profiles, fits);
  const overdue = tasks.find((x) => !x.done && x.due === "Overdue");
  const overdueLP = overdue ? profiles.find((x) => x.id === overdue.lpId) : null;
  const top = ranked[0]?.lp || profiles.find((x) => x.status === "Hot") || profiles[0];
  return [
    uploaded ? { title: `Update ${uploaded.name}'s relationship strategy`, why: `${uploaded.name}'s note created a profile update, timeline events, follow-up task, and commitment signal.`, impact: "Keeps the GP focused on converting the highest-probability LP relationships.", confidence: 96, action: `${uploaded.next.toLowerCase().startsWith("send ") ? uploaded.next : `Send ${uploaded.next.toLowerCase()}`} and schedule the recommended follow-up.`, lpId: uploaded.id } : null,
    overdueLP ? { title: `Rescue ${overdueLP.name} follow-up`, why: `${overdue?.title} is overdue for ${overdueLP.firm}.`, impact: "Protects a warm/high-intent relationship from cooling down.", confidence: 92, action: `Complete: ${overdue?.title}.`, lpId: overdueLP.id } : null,
    top ? { title: strategy?.aiPriorities[0]?.title || `Advance ${top.name}`, why: strategy?.aiPriorities[0]?.reason || `${top.firm} has the strongest combination of relationship signal and next action.`, impact: "Moves the highest-probability LP toward diligence or commitment.", confidence: fits[top.id]?.score || top.strength, action: fits[top.id]?.nextBestAction || top.next, lpId: top.id } : null,
    { title: "Update fundraising forecast", why: "Pipeline, commitments, overdue tasks, and LP fit changed.", impact: "Shows the GP whether fundraising momentum is improving or slipping.", confidence: 86, action: "Review weighted forecast and clear the top risk." },
  ].filter(Boolean) as AutonomousRecommendation[];
}

function generateFundraisingStrategy(dna: FundDNA, profiles: LP[], tasks: Task[], fits: Record<string, LPFit>): FundraisingStrategy {
  const ranked = rankedFits(profiles, fits);
  const top = ranked[0];
  const second = ranked[1];
  const coldLowFit = ranked.find(({ lp, fit }) => lp.status === "Cold" || fit.score < 70);
  const openTasks = tasks.filter((x) => !x.done);
  const overdue = openTasks.filter((x) => x.due === "Overdue").length;
  const hot = profiles.filter((x) => x.status === "Hot").length;
  const commitments = profiles.filter((x) => x.commitmentAmount > 0).length;
  const readinessScore = Math.max(58, Math.min(96, Math.round(68 + hot * 0.35 + commitments * 0.55 + (top?.fit.score || 70) * 0.12 - overdue * 4)));
  const priorityTypes = dna.idealLPTypes.length ? dna.idealLPTypes.slice(0, 4) : ["Family Office", "Fund of Funds", "Angel Investor"];
  const avoidTypes = investorTypes.filter((x) => !priorityTypes.includes(x)).slice(0, 2);
  const topSectors = dna.sectorFocus.slice(0, 3).join(", ") || "the fund thesis";
  const firstAction = top ? { title: `Meet ${top.lp.name} this week`, reason: `${top.lp.firm} is the highest-fit LP at ${top.fit.score}% and the next action is already clear: ${top.fit.nextBestAction}.`, lpId: top.lp.id, urgency: "Today" as const } : { title: "Create Fund DNA", reason: "Strategy recommendations need approved fund positioning before LP prioritization.", urgency: "Today" as const };
  const secondAction = second ? { title: `Ask ${second.lp.source} for a warmer path to ${second.lp.name}`, reason: `${second.lp.name} fits the thesis at ${second.fit.score}% and a trusted introducer can improve conversion odds.`, lpId: second.lp.id, urgency: "This week" as const } : { title: "Qualify the next warm LP", reason: "A second high-fit path gives the GP a backup if the top process slows.", urgency: "This week" as const };
  const delayAction = coldLowFit ? { title: `Delay broad outreach to ${coldLowFit.lp.name}`, reason: `${coldLowFit.lp.firm} is lower-conviction right now; use quarterly updates until timing or fit improves.`, lpId: coldLowFit.lp.id, urgency: "Delay" as const } : { title: "Delay low-fit institutional outreach", reason: "Concentrate on LPs with thesis overlap, warm paths, and near-term allocation capacity first.", urgency: "Delay" as const };
  return {
    idealLPProfile: `LPs writing ${dna.targetLPCheckSize || "focused emerging-manager checks"} who want exposure to ${topSectors}, are comfortable with ${dna.stage || "early-stage"} risk, and value ${dna.strongestDifferentiators[0] || "clear founder access and concentrated ownership"}.`,
    lpTypesToPrioritize: priorityTypes,
    lpTypesToAvoid: avoidTypes.length ? avoidTypes : ["Low-fit LPs with closed allocation windows", "Investors requiring long institutional track records before first diligence"],
    recommendedSequence: ["Convert warmest best-fit LPs first", "Use proof points from those conversations to tighten the narrative", "Ask committed or high-engagement LPs for two targeted introductions", "Run colder institutional outreach only after references and data-room materials are complete"],
    likelyObjections: dna.likelyLPObjections,
    recommendedPositioning: `${dna.suggestedFundraisingNarrative} Lead with ${dna.strongestDifferentiators.slice(0, 2).join(" and ") || "specific founder access and ownership discipline"} rather than generic market excitement.`,
    recommendedProofPoints: ["Attribution by company and role", "Ownership history by round", "Founder references tied to hands-on support", "Pipeline examples mapped to the stated thesis", "Data-room memo explaining why now"],
    suggestedOutreachStrategy: ["Start with relationship-led LPs ranked above 85% fit", "Send a short thesis note before a full deck", "Pair every ask with one proof point that answers the likely objection", "Use quarterly updates for good LPs with weak timing instead of pushing meetings now"],
    geographicPriorities: [dna.geography || "United States", "LPs with existing exposure to the GP's target market", "Remote-first LPs comfortable with emerging manager diligence"],
    targetCheckSizeDistribution: [`Anchor conversations: ${dna.targetLPCheckSize || "$500K-$1M"} checks`, "Momentum checks: $250K-$500K", "Strategic angels and advisors: $100K-$250K"],
    expectedFundraisingRisks: ["Attribution diligence may slow conversion", "Small team bandwidth can create confidence gaps", "Crowded AI narrative requires crisp differentiation", overdue ? `${overdue} overdue follow-up${overdue === 1 ? "" : "s"} can weaken momentum` : "No major follow-up backlog right now"],
    aiPriorities: [firstAction, secondAction, delayAction],
    readinessScore: {
      score: readinessScore,
      helping: [`${hot} hot LP relationships are active`, `${commitments} LPs show commitment or allocation signals`, top ? `${top.lp.name} is a high-fit lead at ${top.fit.score}%` : "Fund DNA is approved"],
      slowing: [overdue ? `${overdue} overdue follow-up${overdue === 1 ? "" : "s"}` : "Proof-point packaging still matters before scaling outreach", "Likely objections need sharper answer snippets", "Cold LPs should not consume prime fundraising time"],
      improveBeforeMoreLPs: ["Prepare a one-page attribution memo", "Organize founder references by objection", "Write a short check-size and allocation-window FAQ"],
    },
    narrativeCoach: {
      pitch30Second: `We are building ${dna.fundName || "an emerging venture fund"} for LPs who want concentrated exposure to ${topSectors}. The edge is ${dna.strongestDifferentiators.slice(0, 2).join(" and ") || "founder access and company-building support"}, with a disciplined ${dna.stage || "early-stage"} strategy designed to create meaningful ownership early.`,
      executiveSummary: `${dna.fundName || "The fund"} backs ${dna.stage || "early-stage"} companies across ${topSectors}. The fundraising message should emphasize repeatable access, ownership discipline, and concrete proof points that reduce attribution and bandwidth concerns.`,
      lpSpecificTalkingPoints: ranked.slice(0, 4).map(({ lp, fit }) => `${lp.name}: lead with ${fit.outreachAngle} Address: ${fit.likelyObjection}`),
      objectionResponses: dna.likelyLPObjections.map((x) => `${x}: answer with one data point, one founder example, and one process detail before sending the full deck.`),
    },
  };
}

const opportunitySeed: Array<{ name: string; organization: string; type: LPType; base: number; introducer: string; bridge: string; objections: string[]; interests: string[] }> = [
  { name: "Marina Volkova", organization: "Harbor Gate Family Office", type: "Family Office", base: 92, introducer: "Elena Park", bridge: "Portfolio Founder", interests: ["Applied AI", "Enterprise software", "Seed funds"], objections: ["Attribution clarity", "Ownership durability"] },
  { name: "Caleb Morgan", organization: "Northline Venture Access", type: "Fund of Funds", base: 89, introducer: "Aisha Patel", bridge: "Emerging Manager Circle", interests: ["Emerging managers", "Portfolio construction", "AI infrastructure"], objections: ["Not enough track record", "Team bandwidth"] },
  { name: "Anika Rao", organization: "Operator Angel Network", type: "Angel Investor", base: 87, introducer: "Priya Shah", bridge: "Founder reference", interests: ["Developer tools", "Founder-led funds", "Applied AI"], objections: ["Check size mismatch", "Timing"] },
  { name: "Miles Bennett", organization: "Bennett Private Wealth", type: "RIA", base: 82, introducer: "Irene Wu", bridge: "Private markets advisor", interests: ["Private markets access", "B2B software", "Co-investments"], objections: ["Fee load", "Liquidity horizon"] },
  { name: "Leah Rosen", organization: "Future Work Foundation", type: "Foundation", base: 78, introducer: "David Mercer", bridge: "Mission-aligned founder", interests: ["Responsible AI", "Economic mobility", "Applied AI"], objections: ["Mission alignment", "Timing"] },
  { name: "Hiro Tan", organization: "Kite Hill Holdings", type: "Family Office", base: 86, introducer: "Mei Tanaka", bridge: "Allocator Forum", interests: ["Infrastructure software", "Developer platforms", "Cybersecurity"], objections: ["Sector mismatch", "Too early"] },
  { name: "Claire Novak", organization: "Summit Bridge Allocators", type: "Fund of Funds", base: 84, introducer: "Rachel Kim", bridge: "Venture Capital Summit", interests: ["Seed funds", "Emerging managers", "Co-investments"], objections: ["No allocation", "Timing"] },
  { name: "Omar Haddad", organization: "Frontier Operator Angels", type: "Angel Investor", base: 81, introducer: "Daniel Cho", bridge: "Portfolio Founder", interests: ["Future of work", "Applied AI", "Enterprise software"], objections: ["Too early", "Check size mismatch"] },
];
const opportunityStatuses: OpportunityStatus[] = ["Not started", "Contacted", "Meeting scheduled", "Diligence", "Soft circle", "Committed", "Passed", "Not a fit"];
const opportunityReasons: OpportunityReason[] = ["", "No allocation", "Too early", "Not enough track record", "Geographic mismatch", "Sector mismatch", "Check size mismatch", "Timing", "Other"];
const discoverySeed: Array<{ lpName: string; organization: string; investorType: LPType; check: string; sectors: string[]; geography: string; stage: string; intro: string[]; objections: string[]; proof: string; base: number; timing: string }> = [
  { lpName: "Sofia Almeida", organization: "Mariner Lane Family Office", investorType: "Family Office", check: "$500K-$1M", sectors: ["Applied AI", "Vertical SaaS", "Infrastructure software"], geography: "United States", stage: "Seed", intro: ["Elena Park", "Portfolio Founder", "Founder reference"], objections: ["Attribution clarity", "Ownership durability"], proof: "Previously backed two emerging AI managers and prefers concentrated seed exposure.", base: 95, timing: "This week" },
  { lpName: "Marcus Lee", organization: "Northstar Emerging Manager Fund", investorType: "Fund of Funds", check: "$1M-$2M", sectors: ["Emerging managers", "Applied AI", "Developer platforms"], geography: "United States", stage: "Pre-seed and seed", intro: ["Emerging Manager Circle", "Allocator Forum"], objections: ["Not enough track record", "Team bandwidth"], proof: "Allocates to sub-$50M emerging managers with AI infrastructure exposure.", base: 93, timing: "This week" },
  { lpName: "Priya Menon", organization: "Operator Angels Collective", investorType: "Angel Investor", check: "$100K-$250K", sectors: ["Developer tools", "Applied AI", "Founder-led funds"], geography: "United States", stage: "Seed", intro: ["Portfolio Founder", "Technical founder network"], objections: ["Check size mismatch", "Timing"], proof: "Angel syndicate members have invested in founder-led seed funds and can move quickly.", base: 90, timing: "Next 7 days" },
  { lpName: "Daniela Ruiz", organization: "Cedar Path Private Wealth", investorType: "RIA", check: "$250K-$500K", sectors: ["Private markets", "B2B software", "Applied AI"], geography: "United States", stage: "Early-stage venture", intro: ["Advisor network", "Existing RIA relationship"], objections: ["Client suitability", "Liquidity horizon"], proof: "Runs a private-market sleeve for clients seeking emerging-manager access.", base: 86, timing: "After proof-point packet" },
  { lpName: "Thomas Greer", organization: "New Horizons Foundation", investorType: "Foundation", check: "$500K-$750K", sectors: ["Responsible AI", "Economic mobility", "Future of work"], geography: "United States", stage: "Seed", intro: ["Mission-aligned founder", "Foundation trustee"], objections: ["Mission alignment", "Governance proof points"], proof: "Has backed responsible AI initiatives and early-stage innovation funds.", base: 84, timing: "Next quarter" },
  { lpName: "Ari Kaplan", organization: "Keystone Digital Holdings", investorType: "Family Office", check: "$750K-$1M", sectors: ["AI infrastructure", "Cybersecurity", "Developer platforms"], geography: "United States", stage: "Seed", intro: ["Cybersecurity founder", "DocSend deck viewer"], objections: ["Crowded AI narrative", "Ownership durability"], proof: "Engaged with AI infrastructure decks and co-invested alongside seed managers.", base: 91, timing: "This week" },
  { lpName: "Mei Nakamura", organization: "Pioneer LP Access", investorType: "Fund of Funds", check: "$1M", sectors: ["Emerging managers", "Vertical SaaS", "Portfolio construction"], geography: "United States and Europe", stage: "Pre-seed and seed", intro: ["Venture Capital Summit", "Allocator Forum"], objections: ["Portfolio construction fit", "Attribution clarity"], proof: "Tracks emerging seed funds with vertical SaaS specialization.", base: 88, timing: "This week" },
  { lpName: "Owen Gallagher", organization: "Gallagher Innovation Trust", investorType: "Family Office", check: "$250K-$500K", sectors: ["Applied AI", "Enterprise software", "Data infrastructure"], geography: "United States", stage: "Seed", intro: ["Founder reference", "Portfolio Founder"], objections: ["Too early", "Data room depth"], proof: "Family office has made repeat allocations to emerging enterprise software managers.", base: 87, timing: "Next 10 days" },
  { lpName: "Lena Hoffmann", organization: "Signal Ridge Wealth", investorType: "RIA", check: "$250K", sectors: ["Private markets", "AI infrastructure", "Co-investments"], geography: "United States", stage: "Early-stage venture", intro: ["Private markets advisor"], objections: ["Fee load", "Client suitability"], proof: "RIA program is expanding alternatives exposure for qualified clients.", base: 81, timing: "After first close update" },
  { lpName: "Noah Stein", organization: "Founders Reinvestment Network", investorType: "Angel Investor", check: "$100K-$250K", sectors: ["Founder-led funds", "Developer platforms", "Applied AI"], geography: "United States", stage: "Pre-seed", intro: ["Portfolio Founder", "Operator Angel Network"], objections: ["Allocation size", "Timing"], proof: "Operator angels in the network recently backed emerging technical GPs.", base: 85, timing: "This week" },
  { lpName: "Grace Okafor", organization: "Equitable Futures Foundation", investorType: "Foundation", check: "$500K", sectors: ["Responsible AI", "Economic mobility", "Workforce automation"], geography: "United States", stage: "Seed", intro: ["Mission-aligned founder"], objections: ["Mission alignment", "Governance proof points"], proof: "Foundation has thematic interest in responsible automation and economic mobility.", base: 79, timing: "Next quarter" },
  { lpName: "Victor Chen", organization: "Atlas Continuity Office", investorType: "Family Office", check: "$500K-$750K", sectors: ["Infrastructure software", "Cybersecurity", "Applied AI"], geography: "United States", stage: "Seed", intro: ["Data infrastructure founder", "Elena Park"], objections: ["Technical differentiation", "Track record depth"], proof: "Invests in technical software funds and prefers warm GP references.", base: 89, timing: "Next 7 days" },
];
function opportunityStatus(id: string, outcomes: Record<string, OpportunityOutcome>): OpportunityOutcome { return outcomes[id] || { status: "Not started", reason: "" }; }
function generateLPOpportunities(dna: FundDNA, strategy: FundraisingStrategy, profiles: LP[], fits: Record<string, LPFit>, outcomes: Record<string, OpportunityOutcome>): LPOpportunity[] {
  const existingNames = new Set(profiles.map((x) => x.name.toLowerCase()));
  const topExisting = rankedFits(profiles, fits).slice(0, 3);
  return opportunitySeed.filter((x) => !existingNames.has(x.name.toLowerCase())).map((seed, i) => {
    const typeBoost = dna.idealLPTypes.includes(seed.type) ? 5 : -4;
    const sectorBoost = hasOverlap(seed.interests, dna.sectorFocus) ? 4 : 0;
    const estimatedFitScore = Math.max(55, Math.min(98, seed.base + typeBoost + sectorBoost - i));
    const confidenceScore = Math.max(65, Math.min(96, estimatedFitScore - 5 + (topExisting[i % Math.max(1, topExisting.length)]?.fit.score || 82) % 7));
    const id = `opp-${seed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const status = opportunityStatus(id, outcomes).status;
    const bestDifferentiator = dna.strongestDifferentiators[i % Math.max(1, dna.strongestDifferentiators.length)] || "clear founder access";
    const bestSector = dna.sectorFocus[i % Math.max(1, dna.sectorFocus.length)] || seed.interests[0];
    return {
      id,
      name: seed.name,
      organization: seed.organization,
      type: seed.type,
      estimatedFitScore,
      confidenceScore,
      status,
      whyRecommended: `${seed.organization} resembles the strongest existing ${seed.type} relationships and maps to ${bestSector}. This is a demo opportunity, not a claim of complete LP database coverage.`,
      likelyInterests: seed.interests,
      likelyObjections: seed.objections,
      suggestedFirstAction: status === "Not started" ? `Ask ${seed.introducer} for a warm introduction` : status === "Contacted" ? "Send a concise thesis memo and ask for a 20-minute call" : status === "Meeting scheduled" ? "Prepare objection-specific proof points before the meeting" : "Update next step from outcome",
      suggestedOutreachAngle: `Lead with ${bestSector}, ${bestDifferentiator}, and how ${dna.targetLPCheckSize || "focused"} checks get concentrated exposure.`,
      introPath: ["The GP", seed.bridge, seed.introducer, seed.name],
      suggestedIntroducer: seed.introducer,
      relationshipConfidence: Math.max(58, Math.min(94, confidenceScore - 3)),
      recommendedIntroAsk: `${seed.introducer}, would you be comfortable introducing The GP to ${seed.name} at ${seed.organization}? The specific reason is fit around ${seed.interests.slice(0, 2).join(" and ")}.`,
      outreachPlaybook: {
        email: `Subject: ${dna.fundName || "Emerging Venture Fund"} + ${seed.interests[0]}\n\nHi ${seed.name.split(" ")[0]},\n\n${seed.introducer} suggested you may be interested in emerging managers focused on ${seed.interests.slice(0, 2).join(" and ")}. The fund is focused on ${dna.sectorFocus.slice(0, 3).join(", ") || "applied AI and B2B software"}, with ${bestDifferentiator.toLowerCase()} as a core edge.\n\nWould it be useful to send a short memo and schedule 20 minutes next week?\n\nBest,\nThe GP`,
        linkedIn: `Hi ${seed.name.split(" ")[0]} — ${seed.introducer} mentioned your interest in ${seed.interests[0]}. The GP is building a focused seed strategy around ${bestSector}. Worth a short intro?`,
        meetingAgenda: ["Confirm allocation window and check-size range", `Test interest in ${seed.interests.slice(0, 2).join(" / ")}`, `Address likely objection: ${seed.objections[0]}`, "Agree on diligence materials and next step"],
        followUpSequence: ["Day 0: warm intro ask", "Day 2: concise thesis note", "Day 5: proof-point follow-up", "Day 12: quarterly-update path if timing is weak"],
      },
    };
  }).sort((a, b) => b.estimatedFitScore - a.estimatedFitScore);
}
function learningInsights(opportunities: LPOpportunity[], outcomes: Record<string, OpportunityOutcome>) {
  const rows = opportunities.map((opp) => ({ opp, outcome: opportunityStatus(opp.id, outcomes) }));
  const passed = rows.filter((x) => x.outcome.status === "Passed" || x.outcome.status === "Not a fit");
  const advanced = rows.filter((x) => ["Meeting scheduled", "Diligence", "Soft circle", "Committed"].includes(x.outcome.status));
  const objections = passed.map((x) => x.outcome.reason || x.opp.likelyObjections[0]).filter(Boolean);
  const typeCounts = advanced.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.opp.type]: (acc[x.opp.type] || 0) + 1 }), {});
  const bestType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || opportunities[0]?.type || "Family Office";
  return {
    objections: objections.length ? objections : opportunities.slice(0, 3).map((x) => x.likelyObjections[0]),
    highestConvertingTypes: [`${bestType}: ${typeCounts[bestType] || 0} advanced opportunities`, "Family Office and Fund of Funds show strongest demo fit"],
    bestIntroSources: [...new Set(opportunities.slice(0, 4).map((x) => x.suggestedIntroducer))],
    strongestSegments: [...new Set(opportunities.slice(0, 4).map((x) => `${x.type} interested in ${x.likelyInterests[0]}`))],
    adjustment: passed.length ? "Tighten objection handling before expanding outbound volume." : "Start with warm intros to the top three opportunities, then use outcomes to refine segments.",
  };
}

function discoverInvestors(dna: FundDNA | null, strategy: FundraisingStrategy | null, profiles: LP[], outcomeIntel: FundraisingOutcomeIntelligence, providerContext: ProviderContext): { opportunities: DiscoveryOpportunity[]; insights: DiscoveryInsights } {
  const provider = activeProviderLabel(providerContext);
  const profileNames = new Set(profiles.map((lp) => `${lp.name} ${lp.firm}`.toLowerCase()));
  const activeTypes = strategy?.lpTypesToPrioritize.length ? strategy.lpTypesToPrioritize : dna?.idealLPTypes.length ? dna.idealLPTypes : ["Family Office", "Fund of Funds", "Angel Investor"];
  const sectors = dna?.sectorFocus.length ? dna.sectorFocus : ["Applied AI", "Vertical SaaS", "Infrastructure software"];
  const geo = dna?.geography || "United States";
  const stage = dna?.stage || "Seed";
  const topSource = outcomeIntel.metrics.bestIntroSource || "Founder referrals";
  const topObjection = outcomeIntel.metrics.topObjection || "Attribution clarity";
  const ranked = discoverySeed.filter((seed) => !profileNames.has(`${seed.lpName} ${seed.organization}`.toLowerCase())).map((seed) => {
    const typeFit = activeTypes.includes(seed.investorType) ? 12 : 4;
    const sectorFit = hasOverlap(seed.sectors, sectors) ? 18 : seed.sectors.some((x) => x.toLowerCase().includes("ai")) ? 10 : 3;
    const geographyFit = seed.geography.includes(geo.split(" ")[0]) || geo.includes(seed.geography.split(" ")[0]) ? 7 : 2;
    const stageFit = seed.stage.toLowerCase().includes(stage.toLowerCase().split(" ")[0]) || stage.toLowerCase().includes(seed.stage.toLowerCase().split(" ")[0]) ? 7 : 3;
    const introFit = seed.intro.some((intro) => intro.toLowerCase().includes(topSource.toLowerCase().split(" ")[0])) ? 5 : 2;
    const confidenceScore = Math.max(62, Math.min(98, seed.base + typeFit + sectorFit + geographyFit + stageFit + introFit - 34));
    const matchingSector = seed.sectors.find((sector) => hasOverlap([sector], sectors)) || seed.sectors[0];
    return { seed, confidenceScore, matchingSector };
  }).sort((a, b) => b.confidenceScore - a.confidenceScore || b.seed.base - a.seed.base);

  const opportunities = ranked.map(({ seed, confidenceScore, matchingSector }, i): DiscoveryOpportunity => ({
    id: `discovery-${seed.lpName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    lpName: seed.lpName,
    organization: seed.organization,
    investorType: seed.investorType,
    rank: i + 1,
    priority: i < 3 ? "P1" : i < 7 ? "P2" : "P3",
    whyMatches: `${seed.organization} matches the fund's ${matchingSector} thesis, ${stage} stage focus, and target LP profile for ${seed.investorType.toLowerCase()} capital.`,
    whyRanksAbove: i === 0 ? "Ranks first because it combines thesis overlap, fast timing, credible check size, and multiple warm intro paths." : `Ranks above lower-priority LPs because confidence is ${confidenceScore}% and the intro path is warmer than broad outbound.`,
    evidence: [seed.proof, `${seed.investorType} is ${activeTypes.includes(seed.investorType) ? "a priority LP type" : "adjacent to priority LP segments"} for this Fund DNA.`, `Outcome Intelligence says ${outcomeIntel.metrics.bestLPType}s and ${topSource} are currently strongest.`],
    confidenceScore,
    expectedCheckSize: seed.check,
    warmIntroPossibilities: seed.intro,
    likelyObjections: [...new Set([topObjection, ...seed.objections])].slice(0, 3),
    suggestedFirstOutreach: `Ask ${seed.intro[0]} for a warm introduction, then send a short ${matchingSector} thesis note with one proof point addressing ${topObjection.toLowerCase()}.`,
    recommendedTiming: seed.timing,
    expectedImpact: i < 3 ? "High — could create a qualified LP meeting this week." : i < 7 ? "Medium — expands the high-fit pipeline without distracting from active diligence." : "Nurture — useful for sequencing after top warm paths.",
    suggestedNextAction: i < 4 ? `Request warm intro through ${seed.intro[0]}` : `Add ${seed.organization} to next discovery outreach batch`,
    providerName: provider.providerName,
    providerLabel: provider.providerLabel,
    providerEvidence: `${provider.providerName} supplied this recommendation context. ${provider.providerSummary}`,
  }));

  return {
    opportunities,
    insights: {
      totalMatches: 34,
      strongFamilyOfficeFits: opportunities.filter((opp) => opp.investorType === "Family Office" && opp.confidenceScore >= 84).length + 8,
      emergingAIManagerInvestors: opportunities.filter((opp) => opp.evidence.join(" ").toLowerCase().includes("emerging") || opp.whyMatches.toLowerCase().includes("ai")).length,
      requiresWarmIntro: opportunities.filter((opp) => opp.warmIntroPossibilities.length > 1).length,
      strongestSegment: `${opportunities[0]?.investorType || "Family Office"}s with ${sectors[0]} exposure`,
      thesisSignal: `${sectors.slice(0, 2).join(" + ")} is the strongest discovery signal from Fund DNA.`,
      providerSummary: provider.providerSummary,
    },
  };
}

function generateOutcomeIntelligence(profiles: LP[], tasks: Task[], opportunities: LPOpportunity[], outcomes: Record<string, OpportunityOutcome>, fits: Record<string, LPFit>): FundraisingOutcomeIntelligence {
  const committed = profiles.filter((lp) => lp.commitmentAmount > 0);
  const passed = profiles.filter((lp) => lp.activity.toLowerCase().includes("passed") || lp.status === "Cold");
  const advanced = profiles.filter((lp) => lp.status === "Hot" || lp.commitmentAmount > 0 || lp.activity.toLowerCase().includes("requested"));
  const byType = investorTypes.map((type) => {
    const rows = profiles.filter((lp) => lp.type === type);
    const wins = rows.filter((lp) => lp.commitmentAmount > 0 || lp.status === "Hot").length;
    return { type, rows: rows.length, wins, rate: rows.length ? wins / rows.length : 0 };
  }).sort((a, b) => b.rate - a.rate || b.wins - a.wins);
  const bestType = byType[0] || { type: "Family Office", rows: 1, wins: 1, rate: 1 };
  const institutional = byType.filter((x) => ["Fund of Funds", "Foundation", "RIA"].includes(x.type)).reduce((n, x) => n + x.rate, 0) / Math.max(1, byType.filter((x) => ["Fund of Funds", "Foundation", "RIA"].includes(x.type)).length);
  const familyRate = byType.find((x) => x.type === "Family Office")?.rate || bestType.rate || 0.1;
  const conversionMultiple = Math.max(1.1, familyRate / Math.max(0.1, institutional || 0.1));
  const objectionCounts = profiles.reduce<Record<string, number>>((acc, lp) => ({ ...acc, [lp.concern]: (acc[lp.concern] || 0) + 1 }), {});
  Object.values(outcomes).forEach((outcome) => { if (outcome.reason) objectionCounts[outcome.reason] = (objectionCounts[outcome.reason] || 0) + 1; });
  const topObjection = Object.entries(objectionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Insufficient track record";
  const sourceCounts = profiles.reduce<Record<string, { total: number; wins: number }>>((acc, lp) => {
    const current = acc[lp.source] || { total: 0, wins: 0 };
    return { ...acc, [lp.source]: { total: current.total + 1, wins: current.wins + (lp.status === "Hot" || lp.commitmentAmount > 0 ? 1 : 0) } };
  }, {});
  const bestSource = Object.entries(sourceCounts).sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0] || ["Founder referrals", { total: 1, wins: 1 }];
  const docsRequested = profiles.filter((lp) => /requested|data room|deck|references|track record/i.test(`${lp.activity} ${lp.next}`));
  const meetingGaps = profiles.map((lp) => Math.max(7, lp.meetings.length > 1 ? 14 + (lp.strength % 9) : 21 + (lp.strength % 11)));
  const medianCommitmentDays = Math.round((committed.length ? committed : advanced).reduce((n, lp) => n + Math.max(18, 55 - Math.round(lp.strength / 2)), 0) / Math.max(1, (committed.length ? committed : advanced).length));
  const healthcare = profiles.filter((lp) => /health|healthcare|bio|science/i.test(lp.interest));
  const generalist = profiles.filter((lp) => /emerging managers|venture funds|private markets|seed funds/i.test(lp.interest));
  const outcomeRows = [
    ...profiles.map((lp) => ({ lp, outcome: lp.commitmentAmount ? "Committed" : lp.activity.toLowerCase().includes("passed") ? "Passed" : lp.status === "Hot" ? "Diligence" : lp.status === "Warm" ? "Meeting scheduled" : "Inactive" })),
    ...opportunities.map((opp) => ({ lp: { type: opp.type, source: opp.suggestedIntroducer, concern: opp.likelyObjections[0], interest: opp.likelyInterests.join(", ") } as LP, outcome: opportunityStatus(opp.id, outcomes).status })),
  ];
  const confidenceBase = Math.min(94, 68 + Math.round(outcomeRows.length / 3));
  const recommendations: OutcomeInsight[] = [
    {
      question: "Why are LPs not converting?",
      answer: `The main conversion drag is ${topObjection.toLowerCase()}, followed by slow follow-up on diligence requests.`,
      evidence: `${passed.length} cold/passed LPs and ${docsRequested.length} LPs with document requests; top objection appears ${objectionCounts[topObjection] || 1} times across meetings, LP profiles, and outcomes.`,
      confidence: confidenceBase,
      suggestedAction: `Create a proof-point packet that directly addresses ${topObjection.toLowerCase()} before the next partner call.`,
      expectedImpact: "Reduces repeated diligence friction and improves follow-through on warm LPs.",
    },
    {
      question: "What objections appear most often?",
      answer: `${topObjection} is the most frequent objection in the current fundraising memory.`,
      evidence: Object.entries(objectionCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(" • "),
      confidence: Math.min(95, confidenceBase + 3),
      suggestedAction: "Update the Narrative Coach and first meeting prep to lead with this objection instead of waiting for LPs to ask.",
      expectedImpact: "Improves meeting quality and shortens diligence cycles.",
    },
    {
      question: "Which LP type converts best?",
      answer: `${bestType.type}s currently convert best. Family offices convert ${conversionMultiple.toFixed(1)}x better than institutional LP segments in this workspace.`,
      evidence: byType.slice(0, 5).map((x) => `${x.type}: ${x.wins}/${x.rows} advanced or committed`).join(" • "),
      confidence: Math.min(92, confidenceBase),
      suggestedAction: `Spend the next outreach block on ${bestType.type}s before expanding lower-converting segments.`,
      expectedImpact: "Increases meeting-to-diligence conversion with the same GP time.",
    },
    {
      question: "Which introduction source performs best?",
      answer: `${bestSource[0]} is the strongest introduction source so far.`,
      evidence: `${bestSource[1].wins}/${bestSource[1].total} LPs from this source are hot or have commitment signals. Warm introductions from founders outperform cold outreach in the current memory.`,
      confidence: Math.min(90, confidenceBase - 2),
      suggestedAction: `Ask ${bestSource[0]} for two more targeted introductions this week.`,
      expectedImpact: "Creates higher-trust LP conversations and reduces cold-start friction.",
    },
    {
      question: "Which outreach messages generate meetings?",
      answer: "Messages that mention a specific sector fit plus a concrete proof point generate the highest-intent next steps.",
      evidence: `${docsRequested.length} LPs requested decks, references, data room access, or track record materials after thesis-specific conversations.`,
      confidence: Math.min(88, confidenceBase - 4),
      suggestedAction: "Lead outreach with one thesis-specific sentence and one proof point, then ask for a 20-minute fit call.",
      expectedImpact: "Improves reply quality and turns curiosity into scheduled diligence conversations.",
    },
    {
      question: "How long does each LP type take to commit?",
      answer: `${bestType.type}s are trending fastest, with an estimated ${medianCommitmentDays}-day time-to-commitment cycle from first meeting to allocation signal.`,
      evidence: `Median modeled from ${meetingGaps.length} meeting histories, ${committed.length} commitments/indications, and stage movement across ${advanced.length} active LPs. ${healthcare.length ? "Healthcare-focused LPs engage more quickly than generalist LPs." : generalist.length ? "Generalist LPs need more proof points before commitment." : "Segment timing will sharpen as more outcomes are captured."}`,
      confidence: Math.min(84, confidenceBase - 8),
      suggestedAction: "Use LP type to set follow-up cadence: faster sequences for high-fit LPs, quarterly nurture for slower segments.",
      expectedImpact: "Protects GP time and prevents over-following low-probability LPs.",
    },
  ];
  return {
    recommendations,
    strategyChange: {
      question: "What should change this week?",
      answer: `Shift this week's fundraising strategy toward ${bestType.type}s via ${bestSource[0]} and address ${topObjection.toLowerCase()} earlier in every meeting.`,
      evidence: `${bestType.type}s show the highest conversion rate; ${bestSource[0]} is the strongest intro source; ${topObjection} is the most repeated objection.`,
      confidence: Math.min(93, confidenceBase + 1),
      suggestedAction: `Prioritize three ${bestType.type} conversations, update the proof-point packet, and ask ${bestSource[0]} for warm introductions.`,
      expectedImpact: "Higher conversion per meeting and faster movement from interest to diligence.",
    },
    metrics: { trackedInteractions: outcomeRows.length, commitmentRate: Math.round((committed.length / Math.max(1, profiles.length)) * 100), topObjection, bestLPType: bestType.type, bestIntroSource: bestSource[0], medianCommitmentDays },
  };
}

function lpLine(lp: LP, i?: number) { const prefix = i ? `${i}. ` : ""; const commitment = lp.commitmentAmount ? `${money(lp.commitmentAmount)} verbal indication` : "No verbal commitment yet"; return `${prefix}${lp.name} - ${lp.firm}. ${lp.status} relationship, ${lp.strength}% strength. ${commitment}. Next: ${lp.next} (${lp.due}).`; }
function findAskedLP(profiles: LP[], low: string) { return profiles.find((lp) => low.includes(lp.name.toLowerCase()) || low.includes(lp.name.split(" ")[0].toLowerCase()) || low.includes(lp.firm.toLowerCase())); }
function findAskedOpportunity(opportunities: LPOpportunity[], low: string) { return opportunities.find((opp) => low.includes(opp.name.toLowerCase()) || low.includes(opp.name.split(" ")[0].toLowerCase()) || low.includes(opp.organization.toLowerCase())); }
function summarizeIntegrations(integrations: IntegrationState) {
  const connected = Object.values(integrations).filter((x) => x.status === "Connected").length;
  const syncing = Object.values(integrations).filter((x) => x.status === "Syncing").length;
  const imported = Object.values(integrations).reduce((n, x) => n + x.imported, 0);
  return { connected, syncing, imported, total: integrationCatalog.length };
}
function answerIntegrationQuestion(low: string, integrations: IntegrationState) {
  if (!/(integration|gmail|calendar|zoom|meet|docsend|csv|webhook|api|sync|email|deck view|transcript)/i.test(low)) return "";
  const summary = summarizeIntegrations(integrations);
  const rows = integrationCatalog.map((item) => {
    const state = integrations[item.key];
    return `- ${item.name}: ${state.status}; last synced ${state.lastSynced}; ${state.imported} demo records/signals. Downstream updates: ${item.downstream.join(", ")}.`;
  }).join("\n");
  if (low.includes("gmail") || low.includes("email")) return `Gmail integration status:\n${integrations.gmail.status}. ${integrations.gmail.signal}\n\nIn this demo, syncing Gmail imports LP conversation signals, creates a follow-up draft, updates the LP timeline, and makes the email available to Ask Memory. Real Gmail OAuth is intentionally not enabled yet.`;
  if (low.includes("calendar")) return `Google Calendar integration status:\n${integrations.calendar.status}. ${integrations.calendar.signal}\n\nCalendar meetings generate prep briefs before the call and update Meeting Intelligence after the meeting.`;
  if (low.includes("zoom") || low.includes("meet") || low.includes("transcript")) return `Zoom / Google Meet integration status:\n${integrations.meetings.status}. ${integrations.meetings.signal}\n\nTranscript sync triggers the Meeting Debrief Agent to extract summary, objections, documents requested, commitment signals, and next actions.`;
  if (low.includes("docsend") || low.includes("deck")) return `DocSend integration status:\n${integrations.docsend.status}. ${integrations.docsend.signal}\n\nDeck views update LP engagement and fundraising signals so high-intent LPs rise in LP matching priorities.`;
  if (low.includes("csv")) return `CSV Import status:\n${integrations.csv.status}. ${integrations.csv.signal}\n\nCSV import can seed LP profiles, historical meetings, pipeline stage, next action, and relationship source.`;
  if (low.includes("webhook") || low.includes("api")) return `Webhooks/API status:\n${integrations.api.status}. ${integrations.api.signal}\n\nDemo endpoint: POST /api/integrations with source, eventType, lpName, organization, summary, nextAction, and confidence. The API returns the downstream LP Brain updates it would queue.`;
  return `Integration overview:\n${summary.connected}/${summary.total} connectors connected, ${summary.syncing} syncing, ${summary.imported} demo records/signals imported.\n\n${rows}\n\nEvery connector is currently a placeholder/demo integration with clean interfaces, so LP Brain can demonstrate the fundraising operating-system workflow without claiming live OAuth access.`;
}
function answerProviderQuestion(low: string, providers: InvestorProvider[]) {
  if (!/(provider|data source|investor source|connected source|crunchbase|pitchbook|affinity|attio|mercury|linkedin|openvc)/i.test(low)) return "";
  const active = providers.filter((provider) => provider.status === "Connected" || provider.status === "Demo Active");
  const real = active.filter((provider) => provider.key !== "demo");
  const rows = providers.map((provider) => `- ${provider.name}: ${provider.status}; label: ${provider.label}`).join("\n");
  const sourceLine = real.length ? `Connected investor source available: ${real.map((provider) => provider.name).join(", ")}.` : active.some((provider) => provider.key === "demo") ? "Only Demo Provider is active, so investor results are labeled Demo Data." : "No connected investor source available.";
  return `Live Intelligence Layer:\n${sourceLine}\n\nProvider interface:\n- searchInvestors()\n- lookupInvestor()\n- searchOrganizations()\n- searchNews()\n- searchWarmIntroductions()\n\nProvider registry:\n${rows}\n\nLP Brain will not fabricate investor data from Crunchbase, PitchBook, Affinity, Attio, Mercury, DocSend, LinkedIn, or OpenVC until credentials are connected.`;
}
function answerDiscoveryQuestion(low: string, discovery: ReturnType<typeof discoverInvestors>) {
  const top = discovery.opportunities.slice(0, 10);
  const asked = top.find((opp) => low.includes(opp.lpName.toLowerCase()) || low.includes(opp.organization.toLowerCase())) || top[0];
  if (!/(discover|discovery|new lp|new investor|investor opportunities|lp discovery|top 10|pursue this week|highest-fit lp|highest fit investor)/i.test(low) && !top.some((opp) => low.includes(opp.lpName.toLowerCase()) || low.includes(opp.organization.toLowerCase()))) return "";
  if (asked && (low.includes("why") || low.includes("rank") || low.includes(asked.lpName.toLowerCase()) || low.includes(asked.organization.toLowerCase()))) {
    return `Discovery reasoning for ${asked.lpName} - ${asked.organization}:\n\nProvider: ${asked.providerName} (${asked.providerLabel})\n${asked.providerEvidence}\n\nWhy selected: ${asked.whyMatches}\n\nWhy it ranks above other LPs: ${asked.whyRanksAbove}\n\nEvidence:\n${asked.evidence.map((x) => `- ${x}`).join("\n")}\n\nConfidence: ${confidenceLabel(asked.confidenceScore)}\nExpected check size: ${asked.expectedCheckSize}\nWarm intro possibilities: ${asked.warmIntroPossibilities.join(", ")}\nLikely objections: ${asked.likelyObjections.join(", ")}\nSuggested first outreach: ${asked.suggestedFirstOutreach}\nRecommended timing: ${asked.recommendedTiming}`;
  }
  if (low.includes("insight") || low.includes("found") || low.includes("matching")) {
    return `Discovery Insights:\n- Provider status: ${discovery.insights.providerSummary}\n- We found ${discovery.insights.totalMatches} LPs matching your Fund DNA.\n- ${discovery.insights.strongFamilyOfficeFits} are strong family office fits.\n- ${discovery.insights.emergingAIManagerInvestors} previously invested in or track emerging AI managers.\n- ${discovery.insights.requiresWarmIntro} likely require warm introductions.\n- Strongest segment: ${discovery.insights.strongestSegment}.\n- Thesis signal: ${discovery.insights.thesisSignal}.`;
  }
  return `Top 10 new LPs to pursue this week:\n${top.map((opp) => `${opp.rank}. ${opp.lpName} - ${opp.organization} (${opp.investorType}). Provider: ${opp.providerName} (${opp.providerLabel}). ${confidenceLabel(opp.confidenceScore)} confidence. Expected check: ${opp.expectedCheckSize}. Why: ${opp.whyMatches} Next: ${opp.suggestedNextAction}.`).join("\n")}`;
}
function answerOutcomeQuestion(low: string, intel: FundraisingOutcomeIntelligence) {
  const match = intel.recommendations.find((insight) => {
    const q = insight.question.toLowerCase();
    return (low.includes("not converting") && q.includes("not converting")) || (low.includes("objection") && q.includes("objections")) || (low.includes("converts") && q.includes("lp type")) || (low.includes("converting") && q.includes("lp type")) || (low.includes("introduction source") && q.includes("introduction source")) || (low.includes("intro source") && q.includes("introduction source")) || (low.includes("outreach message") && q.includes("outreach messages")) || (low.includes("generate meetings") && q.includes("outreach messages")) || (low.includes("time to commit") && q.includes("take to commit")) || (low.includes("take to commit") && q.includes("take to commit"));
  });
  if (low.includes("what should change") || low.includes("strategy this week") || low.includes("learned")) {
    const x = intel.strategyChange;
    return `Fundraising Outcome Intelligence:\n${x.answer}\n\nEvidence: ${x.evidence}\nConfidence: ${confidenceLabel(x.confidence)}\nSuggested action: ${x.suggestedAction}\nExpected impact: ${x.expectedImpact}`;
  }
  if (!match) return "";
  return `${match.question}\n${match.answer}\n\nEvidence: ${match.evidence}\nConfidence: ${confidenceLabel(match.confidence)}\nSuggested action: ${match.suggestedAction}\nExpected impact: ${match.expectedImpact}`;
}

function answerOpportunityQuestion(low: string, opportunities: LPOpportunity[], outcomes: Record<string, OpportunityOutcome>) {
  if (!opportunities.length) return "";
  const active = opportunities.filter((opp) => !["Passed", "Not a fit"].includes(opportunityStatus(opp.id, outcomes).status)); const pool = active.length ? active : opportunities; const top = pool[0], asked = findAskedOpportunity(opportunities, low) || top, insights = learningInsights(opportunities, outcomes);
  if (low.includes("contact next") || low.includes("what should") || low.includes("do today")) return `The GP should contact next:\n${pool.slice(0, 3).map((opp, i) => `${i + 1}. ${opp.name} - ${opp.organization}. ${opp.estimatedFitScore}% estimated fit. Action: ${opp.suggestedFirstAction}. Reason: ${opp.whyRecommended}`).join("\n")}`;
  if (low.includes("highest fit") || low.includes("opportunities have the highest") || low.includes("opportunity pipeline")) return `Highest-fit LP opportunities:\n${opportunities.slice(0, 6).map((opp, i) => `${i + 1}. ${opp.name} - ${opp.organization}: ${opp.estimatedFitScore}% fit, ${confidenceLabel(opp.confidenceScore)} confidence. ${opp.suggestedOutreachAngle}`).join("\n")}`;
  if (low.includes("warm introduction") || low.includes("warm intro") || low.includes("intro")) return `LP opportunities needing warm introductions:\n${opportunities.slice(0, 5).map((opp, i) => `${i + 1}. ${opp.name}: ${opp.introPath.join(" → ")}. Ask: ${opp.recommendedIntroAsk}`).join("\n")}`;
  if (low.includes("draft") || low.includes("outreach")) return `Draft outreach for ${asked.name}:\n${asked.outreachPlaybook.email}\n\nLinkedIn: ${asked.outreachPlaybook.linkedIn}\n\nFollow-up sequence:\n${asked.outreachPlaybook.followUpSequence.map((x) => `- ${x}`).join("\n")}`;
  if (low.includes("passed") || low.includes("learning") || low.includes("learn")) return `Learning from passed / not-fit opportunities:\nMost common objections: ${insights.objections.join(", ")}.\nRecommended adjustment: ${insights.adjustment}`;
  if (low.includes("converting") || low.includes("conversion") || low.includes("lp type")) return `Best converting LP types:\n${insights.highestConvertingTypes.map((x) => `- ${x}`).join("\n")}\nStrongest segments:\n${insights.strongestSegments.map((x) => `- ${x}`).join("\n")}`;
  return "";
}
function lpSummary(lp: LP, fit?: LPFit) { const fitBlock = fit ? `\nLP Fit Score: ${fit.score}%\nWhy this LP fits: ${fit.why}\nLikely objection: ${fit.likelyObjection}\nRecommended outreach angle: ${fit.outreachAngle}` : ""; return `LP: ${lp.name}\nFirm: ${lp.firm}\nInvestor type: ${lp.type}\nRelationship strength: ${lp.strength}%\nCommitment: ${lp.commitmentAmount ? `${money(lp.commitmentAmount)} verbal indication` : lp.commitment}\nLast meeting: ${lp.last}\nCurrent status: ${lp.activity}\nInterests: ${lp.interest}\nConcern: ${lp.concern}\nIntroduction source: ${lp.source} via ${lp.event}\nNext recommended action: ${fit?.nextBestAction || lp.next}${fitBlock}`; }
function draftOutreach(lp: LP, fit?: LPFit, dna?: FundDNA | null) { return `Subject: ${dna?.fundName || "Emerging Venture Fund"} - ${lp.interest}\n\nHi ${lp.name.split(" ")[0]},\n\nGiven your interest in ${lp.interest}, I thought ${dna?.fundName || "the fund"} may be especially relevant. We are building a focused seed fund focused on ${dna?.sectorFocus.slice(0, 3).join(", ") || "applied AI and B2B software"}, with a concentrated strategy designed for meaningful early ownership.\n\nThe reason I think this could fit ${lp.firm}: ${fit?.why || "your existing relationship signals and investment interests map closely to the fund thesis."}\n\nI would suggest we address ${fit?.likelyObjection || lp.concern} directly and share the most relevant proof points first.\n\nWould it be useful to send the concise fund memo and schedule 20 minutes next week?\n\nBest,\nThe GP`; }
function answerMemoryQuestion(question: string, profiles: LP[], tasks: Task[], fundDNA: FundDNA | null, strategy: FundraisingStrategy | null, opportunities: LPOpportunity[], outcomes: Record<string, OpportunityOutcome>, fits: Record<string, LPFit>, outcomeIntel: FundraisingOutcomeIntelligence, integrations: IntegrationState, discovery: ReturnType<typeof discoverInvestors>, providers: InvestorProvider[]) { const low = question.toLowerCase(); const lp = findAskedLP(profiles, low); const ranked = rankedFits(profiles, fits); const providerAnswer = answerProviderQuestion(low, providers); if (providerAnswer) return providerAnswer; const discoveryAnswer = answerDiscoveryQuestion(low, discovery); if (discoveryAnswer) return discoveryAnswer; const integrationAnswer = answerIntegrationQuestion(low, integrations); if (integrationAnswer) return integrationAnswer; const outcomeAnswer = answerOutcomeQuestion(low, outcomeIntel); if (outcomeAnswer) return outcomeAnswer; const oppAnswer = answerOpportunityQuestion(low, opportunities, outcomes); if (oppAnswer) return oppAnswer; if ((low.includes("draft") || low.includes("email") || low.includes("outreach")) && lp) return draftOutreach(lp, fits[lp.id], fundDNA); if (lp) return lpSummary(lp, fits[lp.id]); if (low.includes("strategy") || low.includes("sequence") || low.includes("where should") || low.includes("spend fundraising time")) { if (!strategy) return "Create and approve Fund DNA first. Then LP Brain will generate a fundraising strategy report automatically."; return `Fundraising Strategy:\nIdeal LP profile: ${strategy.idealLPProfile}\n\nRecommended sequence:\n${strategy.recommendedSequence.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\nPositioning: ${strategy.recommendedPositioning}\n\nOutcome Intelligence: ${outcomeIntel.strategyChange.answer}`; } if (low.includes("readiness") || low.includes("score") || low.includes("helping") || low.includes("slowing")) { if (!strategy) return "No readiness score yet. Approve Fund DNA to generate it."; return `Fundraising Readiness Score: ${strategy.readinessScore.score}%\n\nHelping:\n${strategy.readinessScore.helping.map((x) => `- ${x}`).join("\n")}\n\nSlowing:\n${strategy.readinessScore.slowing.map((x) => `- ${x}`).join("\n")}\n\nImprove before meeting more LPs:\n${strategy.readinessScore.improveBeforeMoreLPs.map((x) => `- ${x}`).join("\n")}`; } if (low.includes("pitch") || low.includes("narrative") || low.includes("talking point") || low.includes("executive summary")) { if (!strategy) return "No Narrative Coach yet. Approve Fund DNA to generate it."; return `Narrative Coach:\n30-second pitch: ${strategy.narrativeCoach.pitch30Second}\n\nExecutive summary: ${strategy.narrativeCoach.executiveSummary}\n\nLP-specific talking points:\n${strategy.narrativeCoach.lpSpecificTalkingPoints.map((x) => `- ${x}`).join("\n")}`; } if (low.includes("best fit") || low.includes("best-fit") || low.includes("fit for this fund")) { if (!fundDNA) return "Fund DNA has not been created yet. Open Fund DNA, paste fund materials, then create the fit engine."; return `Best-fit LPs for ${fundDNA.fundName}:\n${ranked.slice(0, 8).map(({ lp, fit }, i) => `${i + 1}. ${lp.name} - ${lp.firm}: ${fit.score}% fit. ${fit.outreachAngle}`).join("\n")}`; } if (low.includes("the gp") || low.includes("prioritize") || low.includes("today")) { if (strategy) return `Today's highest-impact fundraising actions:\n${strategy.aiPriorities.map((x, i) => `${i + 1}. ${x.title}. Reason: ${x.reason}`).join("\n")}\n\nWhat should change this week: ${outcomeIntel.strategyChange.answer}\nSuggested action: ${outcomeIntel.strategyChange.suggestedAction}`; const priority = ranked.length ? ranked.slice(0, 5) : tasks.filter((t) => !t.done).map((task) => ({ task, lp: profiles.find((p) => p.id === task.lpId) })).filter((x): x is { task: Task; lp: LP } => !!x.lp).sort((a, b) => b.lp.strength - a.lp.strength).slice(0, 5).map(({ lp }) => ({ lp, fit: fits[lp.id] })); return `The GP should prioritize:\n${priority.map(({ lp, fit }, i) => `${i + 1}. ${lp.name} - ${lp.firm}. ${fit ? `${fit.score}% LP fit` : `${lp.strength}% relationship strength`}. Next: ${fit?.nextBestAction || lp.next}.`).join("\n")}`; } if (low.includes("objection") || low.includes("prepare")) { const insight = outcomeIntel.recommendations.find((x) => x.question.includes("objections")); if (insight) return `${insight.answer}\n\nEvidence: ${insight.evidence}\nConfidence: ${insight.confidence}%\nSuggested action: ${insight.suggestedAction}\nExpected impact: ${insight.expectedImpact}`; if (strategy) return `Objections to prepare for:\n${strategy.likelyObjections.map((x, i) => `${i + 1}. ${x}. Response: ${strategy.narrativeCoach.objectionResponses[i] || "Use a relevant proof point before sending the full deck."}`).join("\n")}`; const source = ranked.length ? ranked.slice(0, 6) : profiles.slice(0, 6).map((lp) => ({ lp, fit: fits[lp.id] })); return `Objections to prepare for:\n${source.map(({ lp, fit }, i) => `${i + 1}. ${lp.name}: ${fit?.likelyObjection || lp.concern}.`).join("\n")}`; } if (low.includes("follow") || low.includes("this week") || low.includes("due") || low.includes("overdue")) { const due = tasks.filter((t) => !t.done).map((task) => ({ task, lp: profiles.find((p) => p.id === task.lpId) })).filter((x): x is { task: Task; lp: LP } => !!x.lp).sort((a, b) => (a.task.due === "Overdue" ? -1 : b.task.due === "Overdue" ? 1 : b.lp.strength - a.lp.strength)).slice(0, 6); return `LPs needing follow-up this week:\n${due.map((x, i) => `${i + 1}. ${x.lp.name} - ${x.task.title}. Due: ${x.task.due}. Reason: ${x.lp.status} relationship at ${x.lp.strength}% strength; ${x.lp.activity.toLowerCase()}.`).join("\n")}`; } if (low.includes("verbal") || low.includes("commitment") || low.includes("indication")) { const committed = profiles.filter((p) => p.commitmentAmount > 0).sort((a, b) => b.commitmentAmount - a.commitmentAmount).slice(0, 8); return `LPs with verbal commitments or indications:\n${committed.map((p, i) => `${i + 1}. ${p.name} - ${p.firm}: ${money(p.commitmentAmount)}; ${p.commitment}. Next: ${p.next}.`).join("\n")}`; } if (low.includes("strongest") || low.includes("strength") || low.includes("rank")) { const strongest = [...profiles].sort((a, b) => b.strength - a.strength).slice(0, 8); return `Strongest relationships:\n${strongest.map((p, i) => lpLine(p, i + 1)).join("\n")}`; } if (low.includes("fund dna") || low.includes("fund thesis")) return fundDNA ? `Fund DNA:\n${dnaToText(fundDNA)}` : "No Fund DNA yet. Open Fund DNA and use the sample memo or paste fund materials."; return `I found ${profiles.length} LP profiles${fundDNA ? ` and a Fund DNA profile for ${fundDNA.fundName}` : ""}${strategy ? " plus a generated Fundraising Strategy" : ""}. Ask about best-fit LPs, strategy, readiness, narrative, who The GP should prioritize, objections, outreach emails, follow-ups, commitments, conversion, intro sources, investor discovery, integrations, or what LP Brain has learned.`; }

function Title({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) { return <section className="page-title"><div><label>{eyebrow}</label><h1>{title}</h1><p>{copy}</p></div>{action}</section>; }
function Status({ value }: { value: Heat }) { return <span className={`status ${value.toLowerCase()}`}><i />{value}</span>; }
function Metric({ label, value, detail, tone = "" }: { label: string; value: string | number; detail: string; tone?: string }) { return <div className="stat"><div><span className={tone}><Target /></span><em className={tone}>{detail}</em></div><p>{label}</p><h2>{value}</h2></div>; }

function OutcomeInsights({ intel, openChat }: { intel: FundraisingOutcomeIntelligence; openChat: () => void }) {
  return <section className="panel outcome-intelligence"><div className="panel-head"><div><h2>AI Insights: Fundraising Outcome Intelligence</h2><p>LP Brain learns from meetings, LP responses, objections, documents requested, intro sources, stage movement, and commitments.</p></div><button onClick={openChat}>Ask what changed <ArrowRight /></button></div><div className="outcome-metrics"><Metric label="Tracked interactions" value={intel.metrics.trackedInteractions} detail="Meetings, outcomes, tasks, intros" /><Metric label="Commitment rate" value={`${intel.metrics.commitmentRate}%`} detail="Current workspace" /><Metric label="Time to commit" value={`${intel.metrics.medianCommitmentDays}d`} detail="Estimated median" /></div><div className="strategy-change"><label>What should change this week?</label><h3>{intel.strategyChange.answer}</h3><p><b>Evidence:</b> {intel.strategyChange.evidence}</p><p><b>Suggested action:</b> {intel.strategyChange.suggestedAction}</p><p><b>Expected impact:</b> {intel.strategyChange.expectedImpact}</p><span>{intel.strategyChange.confidence}% confidence</span></div><div className="outcome-grid">{intel.recommendations.slice(0, 6).map((insight) => <article key={insight.question}><h3>{insight.question}</h3><p>{insight.answer}</p><small><b>Evidence:</b> {insight.evidence}</small><small><b>Suggested action:</b> {insight.suggestedAction}</small><em>{insight.confidence}% confidence • Expected impact: {insight.expectedImpact}</em></article>)}</div></section>;
}

const LIVE_KEY = "lpbrain_live_mvp_workspace_v1";
type LiveState = {
  workspaceId: string;
  fundInputs: Record<string, string>;
  fundDNA: FundDNARecord | null;
  lps: LiveLPRecord[];
  timeline: LiveTimelineEntry[];
  paths: RelationshipPath[];
  feedback: RecommendationFeedback[];
  outcomes: LPOutcomeEvent[];
  persistence: "checking" | "supabase" | "local";
};
const emptyLiveState: LiveState = { workspaceId: "workspace-local", fundInputs: {}, fundDNA: null, lps: [], timeline: [], paths: [], feedback: [], outcomes: [], persistence: "checking" };
const dnaFieldKeys = ["geography", "sectorPreferences", "stagePreferences", "fundSizePreferences", "checkSizeRange", "emergingManagerAppetite", "timingSignals"] as const;
const relationshipPathTypes: RelationshipPathType[] = ["Direct", "First-degree introduction", "Second-degree introduction", "Weak inferred relationship", "No known path"];
const feedbackOptions: RecommendationFeedbackValue[] = ["Accept", "Reject", "Already Known", "Already Contacted", "Not Relevant", "Save for Later"];
const rejectionReasons: RejectionReason[] = ["Wrong LP type", "Wrong check size", "Wrong geography", "Wrong sector", "Wrong timing", "No credible warm path", "Already allocated", "Relationship conflict", "Insufficient information", "Other"];
const outcomeStages: LPOutcomeEvent["outcomeStage"][] = ["Suggested", "Accepted by GP", "Intro Requested", "Intro Made", "LP Responded", "Meeting Held", "Follow-up", "Diligence", "Data Room Requested", "Soft Indication", "Commitment", "Pass"];

function fieldLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
}

function normalizeLiveState(value: Partial<LiveState>): LiveState {
  return {
    ...emptyLiveState,
    ...value,
    paths: value.paths || [],
    feedback: value.feedback || [],
    outcomes: value.outcomes || [],
    lps: (value.lps || []).map((lp) => ({ ...lp, relationshipStrength: lp.relationshipStrength || "Unknown", priorInteractions: lp.priorInteractions || "Unknown", lpDNA: normalizeLPDNA(lp.lpDNA) })),
  };
}

function lpToDb(lp: LiveLPRecord, ownerId: string) {
  const dna = normalizeLPDNA(lp.lpDNA);
  return {
    id: lp.id,
    workspace_id: lp.workspaceId,
    owner_id: ownerId,
    name: lp.name,
    organization: lp.organization,
    lp_type: lp.lpType,
    email: lp.email,
    relationship_owner: lp.relationshipOwner,
    relationship_source: lp.relationshipSource,
    relationship_strength: lp.relationshipStrength || "Unknown",
    prior_interactions: lp.priorInteractions || "Unknown",
    current_stage: lp.currentStage,
    estimated_commitment_range: lp.estimatedCommitmentRange,
    next_action: lp.nextAction,
    next_action_date: lp.nextActionDate || null,
    notes: lp.notes,
    geography: dna.geography,
    sector_preferences: dna.sectorPreferences,
    stage_preferences: dna.stagePreferences,
    fund_size_preferences: dna.fundSizePreferences,
    check_size_range: dna.checkSizeRange,
    emerging_manager_appetite: dna.emergingManagerAppetite,
    timing_signals: dna.timingSignals,
    lp_dna: dna,
    updated_at: lp.updatedAt,
  };
}

function lpFromDb(row: Record<string, any>): LiveLPRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    organization: row.organization,
    lpType: row.lp_type,
    email: row.email,
    relationshipOwner: row.relationship_owner,
    relationshipSource: row.relationship_source || "Unknown",
    relationshipStrength: row.relationship_strength || "Unknown",
    priorInteractions: row.prior_interactions || "Unknown",
    currentStage: row.current_stage || "Not started",
    estimatedCommitmentRange: row.estimated_commitment_range || "Unknown",
    nextAction: row.next_action || "",
    nextActionDate: row.next_action_date || "",
    notes: row.notes || "",
    lpDNA: normalizeLPDNA(row.lp_dna || {
      geography: row.geography,
      sectorPreferences: row.sector_preferences,
      stagePreferences: row.stage_preferences,
      fundSizePreferences: row.fund_size_preferences,
      checkSizeRange: row.check_size_range,
      emergingManagerAppetite: row.emerging_manager_appetite,
      timingSignals: row.timing_signals,
    }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function pathToDb(path: RelationshipPath, ownerId: string) {
  return { id: path.id, workspace_id: path.workspaceId, owner_id: ownerId, lp_id: path.lpId, source_person: path.sourcePerson, target_person: path.targetPerson, path_type: path.pathType, relationship_strength: path.relationshipStrength, evidence_source: path.evidenceSource, evidence_text: path.evidenceText, notes: path.notes, last_verified_date: path.lastVerifiedDate || null, updated_at: path.updatedAt };
}

function pathFromDb(row: Record<string, any>): RelationshipPath {
  return { id: row.id, workspaceId: row.workspace_id, lpId: row.lp_id, sourcePerson: row.source_person, targetPerson: row.target_person, pathType: row.path_type, relationshipStrength: row.relationship_strength || "Unknown", evidenceSource: row.evidence_source || "", evidenceText: row.evidence_text || "", notes: row.notes || "", lastVerifiedDate: row.last_verified_date || "", createdAt: row.created_at, updatedAt: row.updated_at };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "lp";
}

function isoDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function liveStageFromHeat(status: Heat): LiveLPRecord["currentStage"] {
  if (status === "Hot") return "Diligence";
  if (status === "Warm") return "Contacted";
  return "Not started";
}

function onboardingSummaryWithUuidProfiles(summary: OnboardingSummary): OnboardingSummary {
  const idMap = new Map<string, string>();
  const profiles = summary.profiles.map((profile) => {
    const id = isUuid(profile.id) ? profile.id : uid("lp");
    idMap.set(profile.id, id);
    return { ...profile, id };
  });
  const tasks = summary.tasks.map((task) => ({ ...task, lpId: idMap.get(task.lpId) || task.lpId }));
  return { ...summary, profiles, tasks };
}

function profileToLiveLP(profile: LP, workspaceId: string): LiveLPRecord {
  const now = new Date().toISOString();
  return {
    id: profile.id,
    workspaceId,
    name: profile.name,
    organization: profile.firm,
    lpType: profile.type,
    email: `${slug(`${profile.name}-${profile.firm}`)}@lpbrain.example`,
    relationshipOwner: "The GP",
    relationshipSource: profile.source || "Fund onboarding import",
    relationshipStrength: `${profile.strength}%`,
    priorInteractions: profile.meetings.map((meeting) => `${meeting.date}: ${meeting.title}`).join("\n") || "Imported during onboarding",
    lpDNA: normalizeLPDNA({
      geography: { status: "inferred", value: "Imported workspace data", evidenceSource: profile.source, evidenceText: profile.activity, lastVerifiedDate: now.slice(0, 10) },
      sectorPreferences: { status: "inferred", value: profile.interest || "Unknown", evidenceSource: profile.event, evidenceText: profile.activity, lastVerifiedDate: now.slice(0, 10) },
      stagePreferences: { status: "unknown", value: "Unknown", evidenceSource: "", evidenceText: "", lastVerifiedDate: "" },
      fundSizePreferences: { status: "unknown", value: "Unknown", evidenceSource: "", evidenceText: "", lastVerifiedDate: "" },
      checkSizeRange: { status: profile.commitmentAmount ? "known" : "unknown", value: profile.commitmentAmount ? money(profile.commitmentAmount) : "Unknown", evidenceSource: profile.event, evidenceText: profile.commitment, lastVerifiedDate: now.slice(0, 10) },
      emergingManagerAppetite: { status: "inferred", value: profile.status === "Cold" ? "Needs qualification" : "Potential fit", evidenceSource: profile.event, evidenceText: profile.concern, lastVerifiedDate: now.slice(0, 10) },
      timingSignals: { status: "inferred", value: profile.next || "Unknown", evidenceSource: profile.event, evidenceText: profile.due, lastVerifiedDate: now.slice(0, 10) },
    }),
    currentStage: liveStageFromHeat(profile.status),
    estimatedCommitmentRange: profile.commitmentAmount ? money(profile.commitmentAmount) : "Unknown",
    nextAction: profile.next || "Qualify LP fit",
    nextActionDate: /^\d{4}-\d{2}-\d{2}$/.test(profile.due) ? profile.due : "",
    notes: `${profile.activity}\nConcern: ${profile.concern}\nCommitment: ${profile.commitment}`.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

function profileMeetingsToTimeline(profile: LP, workspaceId: string): LiveTimelineEntry[] {
  const now = new Date().toISOString();
  return profile.meetings.map((meeting) => ({
    id: uid("timeline"),
    workspaceId,
    lpId: profile.id,
    date: isoDate(meeting.date),
    type: "meeting",
    source: profile.event || "Fund onboarding import",
    summary: meeting.title,
    supportingText: meeting.note,
    createdBy: "The GP",
    createdAt: now,
    updatedAt: now,
  }));
}

async function getOrCreateLiveWorkspace(ownerId: string) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const existing = await supabase.from("workspaces").select("*").eq("owner_id", ownerId).eq("mode", "live").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (existing.error) throw new Error("Could not load My Fund Workspace from Supabase.");
  if (existing.data) return existing.data;
  const created = await supabase.from("workspaces").insert({ owner_id: ownerId, name: "My Fund Workspace", mode: "live" }).select("*").single();
  if (created.error || !created.data) throw new Error("Could not create My Fund Workspace in Supabase.");
  return created.data;
}

async function saveOnboardingWorkspaceToSupabase(summary: OnboardingSummary): Promise<OnboardingSummary> {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const userData = await supabase.auth.getUser();
  const ownerId = userData.data.user?.id;
  if (!ownerId) throw new Error("Sign in before saving My Fund Workspace.");
  const workspace = await getOrCreateLiveWorkspace(ownerId);
  const workspaceId = workspace.id as string;
  const savedSummary = onboardingSummaryWithUuidProfiles(summary);
  const now = new Date().toISOString();

  const fundRecord = await supabase.from("fund_dna_records").upsert({
    id: workspaceId,
    workspace_id: workspaceId,
    owner_id: ownerId,
    original_inputs: { onboardingSummary: savedSummary, files: savedSummary.files },
    generated_output: savedSummary.fundDNA,
    status: "approved",
    output_status: "approved",
    approved_at: now,
    updated_at: now,
  }).select("id").single();
  if (fundRecord.error) throw new Error("Could not save Fund DNA to Supabase.");

  const liveLps = savedSummary.profiles.map((profile) => profileToLiveLP(profile, workspaceId));
  if (liveLps.length) {
    const lpResult = await supabase.from("live_lp_records").upsert(liveLps.map((lp) => lpToDb(lp, ownerId)), { onConflict: "workspace_id,email" });
    if (lpResult.error) throw new Error("Could not save LP records to Supabase.");
  }

  const timeline = savedSummary.profiles.flatMap((profile) => profileMeetingsToTimeline(profile, workspaceId));
  if (timeline.length) {
    const timelineResult = await supabase.from("relationship_timeline_entries").upsert(timeline.map((entry) => ({ id: entry.id, workspace_id: entry.workspaceId, owner_id: ownerId, lp_id: entry.lpId, entry_type: entry.type, entry_date: entry.date, source: entry.source, summary: entry.summary, supporting_text: entry.supportingText, created_by: entry.createdBy, updated_at: entry.updatedAt })));
    if (timelineResult.error) throw new Error("Could not save meeting timeline to Supabase.");
  }

  await supabase.from("workspaces").update({ updated_at: now }).eq("id", workspaceId);
  return savedSummary;
}

function onboardingSummaryFromStored(value: unknown): OnboardingSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const summary = value as Partial<OnboardingSummary>;
  if (!summary.fundDNA || !Array.isArray(summary.profiles) || !Array.isArray(summary.tasks) || !Array.isArray(summary.feed)) return null;
  return {
    fundDNA: summary.fundDNA as FundDNA,
    profiles: summary.profiles as LP[],
    tasks: summary.tasks as Task[],
    feed: summary.feed as Feed[],
    importedLPs: Number(summary.importedLPs || summary.profiles.length || 0),
    meetingsDetected: Number(summary.meetingsDetected || 0),
    opportunitiesGenerated: Number(summary.opportunitiesGenerated || 0),
    missingInformation: Array.isArray(summary.missingInformation) ? summary.missingInformation : [],
    recommendedActions: Array.isArray(summary.recommendedActions) ? summary.recommendedActions : [],
    files: Array.isArray(summary.files) ? summary.files : [],
  };
}

async function loadOnboardingWorkspaceFromSupabase(): Promise<OnboardingSummary | null> {
  try {
    const supabase = createClient();
    if (!supabase) return null;
    const userData = await supabase.auth.getUser();
    const ownerId = userData.data.user?.id;
    if (!ownerId) return null;
    const workspace = await supabase.from("workspaces").select("*").eq("owner_id", ownerId).eq("mode", "live").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (workspace.error || !workspace.data) return null;
    const fund = await supabase.from("fund_dna_records").select("original_inputs").eq("workspace_id", workspace.data.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const stored = (fund.data?.original_inputs as { onboardingSummary?: unknown } | null)?.onboardingSummary;
    return onboardingSummaryFromStored(stored);
  } catch {
    return null;
  }
}

function LegacyLiveMvpWorkflow() {
  const [state, setState] = useState<LiveState>(emptyLiveState), [fundJson, setFundJson] = useState(""), [fundFile, setFundFile] = useState<File | null>(null), [lpDraft, setLpDraft] = useState<Partial<LiveLPRecord>>({ relationshipOwner: "The GP", relationshipSource: "Manual", currentStage: "Not started" }), [csv, setCsv] = useState(""), [selectedLP, setSelectedLP] = useState(""), [timelineDraft, setTimelineDraft] = useState<Partial<LiveTimelineEntry>>({ date: new Date().toISOString().slice(0, 10), type: "note", source: "Manual", createdBy: "The GP" }), [meetingNote, setMeetingNote] = useState(""), [meetingDraft, setMeetingDraft] = useState<MeetingExtractionRecord | null>(null), [busy, setBusy] = useState(""), [error, setError] = useState(""), [success, setSuccess] = useState("");
  useEffect(() => { try { const saved = localStorage.getItem(LIVE_KEY); if (saved) setState(JSON.parse(saved)); } catch { setError("Could not load saved local workspace data."); } }, []);
  useEffect(() => { localStorage.setItem(LIVE_KEY, JSON.stringify(state)); }, [state]);
  const selected = state.lps.find((lp) => lp.id === selectedLP) || state.lps[0];
  const thisWeek = prioritizeThisWeek(state.lps, state.timeline);
  const brief = selected ? createMeetingBrief(state.fundDNA, selected, state.timeline.filter((entry) => entry.lpId === selected.id)) : null;
  const setFundInput = (key: string, value: string) => setState((current) => ({ ...current, fundInputs: { ...current.fundInputs, [key]: value } }));
  const setLP = (key: string, value: string) => setLpDraft((current) => ({ ...current, [key]: value }));
  async function generateFundDNA() {
    setBusy("fund"); setError(""); setSuccess("");
    const form = new FormData();
    Object.entries(state.fundInputs).forEach(([key, value]) => form.append(key, value));
    if (fundFile) form.append("file", fundFile);
    try { const res = await fetch("/api/fund-dna", { method: "POST", body: form }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Fund DNA generation failed"); const dna = normalizeFundDNA(data.fundDNA); setFundJson(JSON.stringify(dna, null, 2)); setSuccess("Fund DNA generated. Review/edit JSON before approving."); }
    catch (e) { setError(e instanceof Error ? e.message : "Fund DNA generation failed"); } finally { setBusy(""); }
  }
  function approveFundDNA() { try { setState((current) => ({ ...current, fundDNA: normalizeFundDNA(JSON.parse(fundJson)) })); setSuccess("Fund DNA approved and saved."); setError(""); } catch { setError("Fund DNA JSON is invalid."); } }
  function saveLP() {
    if (!lpDraft.name || !lpDraft.organization || !lpDraft.lpType || !lpDraft.email) return setError("LP name, organization, LP type, and email are required.");
    const now = new Date().toISOString(), lp: LiveLPRecord = { id: uid("live-lp"), workspaceId: state.workspaceId, name: lpDraft.name, organization: lpDraft.organization, lpType: lpDraft.lpType, email: lpDraft.email, relationshipOwner: lpDraft.relationshipOwner || "The GP", relationshipSource: lpDraft.relationshipSource || "Manual", currentStage: lpDraft.currentStage || "Not started", estimatedCommitmentRange: lpDraft.estimatedCommitmentRange || "Unknown", nextAction: lpDraft.nextAction || "Qualify LP fit", nextActionDate: lpDraft.nextActionDate || "", notes: lpDraft.notes || "", createdAt: now, updatedAt: now };
    setState((current) => ({ ...current, lps: [lp, ...current.lps] })); setSelectedLP(lp.id); setLpDraft({ relationshipOwner: "The GP", relationshipSource: "Manual", currentStage: "Not started" }); setSuccess("LP record saved."); setError("");
  }
  function importCsv() { const imported = parseCsvRows(csv).map((row) => lpFromCsv(row, state.workspaceId, state.lps)).filter((lp): lp is LiveLPRecord => Boolean(lp)); setState((current) => ({ ...current, lps: [...imported, ...current.lps] })); setCsv(""); setSuccess(imported.length ? `${imported.length} LP record${imported.length === 1 ? "" : "s"} imported. Duplicate rows skipped.` : "No valid new LP rows found."); }
  function saveTimeline() {
    if (!selected || !timelineDraft.summary || !timelineDraft.date) return setError("Choose an LP and add a timeline date and summary.");
    const now = new Date().toISOString(), entry: LiveTimelineEntry = { id: timelineDraft.id || uid("tl"), workspaceId: state.workspaceId, lpId: selected.id, date: timelineDraft.date, type: timelineDraft.type || "note", source: timelineDraft.source || "Manual", summary: timelineDraft.summary, supportingText: timelineDraft.supportingText || "", createdBy: timelineDraft.createdBy || "The GP", createdAt: timelineDraft.createdAt || now, updatedAt: now };
    setState((current) => ({ ...current, timeline: [entry, ...current.timeline.filter((x) => x.id !== entry.id)] })); setTimelineDraft({ date: new Date().toISOString().slice(0, 10), type: "note", source: "Manual", createdBy: "The GP" }); setSuccess("Timeline entry saved."); setError("");
  }
  async function extractMeeting() {
    if (!meetingNote.trim()) return setError("Paste meeting notes before extracting meeting intelligence.");
    setBusy("meeting"); setError("");
    try { const form = new FormData(); form.append("note", meetingNote); const res = await fetch("/api/upload", { method: "POST", body: form }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Meeting extraction failed"); setMeetingDraft(normalizeMeetingExtraction(data.meetingIntelligence || data.extraction)); setSuccess("Meeting intelligence extracted. Review before saving."); }
    catch (e) { setError(e instanceof Error ? e.message : "Meeting extraction failed"); } finally { setBusy(""); }
  }
  function approveMeeting() { if (!selected || !meetingDraft) return; const entry = timelineEntryFromMeeting(selected.id, state.workspaceId, meetingDraft, meetingNote); setState((current) => ({ ...current, timeline: [entry, ...current.timeline], lps: current.lps.map((lp) => lp.id === selected.id ? { ...lp, nextAction: meetingDraft.nextAction || lp.nextAction, nextActionDate: meetingDraft.nextActionDate || lp.nextActionDate, notes: `${lp.notes}\n${meetingDraft.conciseMeetingSummary}`.trim(), updatedAt: new Date().toISOString() } : lp) })); setMeetingNote(""); setMeetingDraft(null); setSuccess("Meeting intelligence saved to the LP timeline. Pipeline stage was not changed automatically."); }
  return <section className="panel live-mvp-workflow"><div className="panel-head"><div><h2>Live MVP Workflow</h2><p>Fund Setup → LP Record → Timeline → Meeting Prep → Meeting Intelligence → This Week. Demo data stays separate from these live records.</p></div><span>{state.fundDNA ? "Fund DNA approved" : "Setup required"}</span></div><p className="privacy-note">Privacy notice: upload only authorized materials. File type and size are validated; fund decks, transcripts, emails, and sensitive notes are not printed to application logs.</p>{error && <p className="phase-upload-error">{error}</p>}{success && <p className="live-success"><Check />{success}</p>}<div className="live-mvp-grid"><article><h3>1. Fund Setup</h3><div className="live-form-grid">{["fundName", "targetFundSize", "fundStage", "sectors", "geography", "typicalInvestmentCheck"].map((key) => <input key={key} value={state.fundInputs[key] || ""} onChange={(e) => setFundInput(key, e.target.value)} placeholder={key.replace(/([A-Z])/g, " $1")} />)}</div><textarea value={state.fundInputs.gpBackground || ""} onChange={(e) => setFundInput("gpBackground", e.target.value)} placeholder="GP background" /><textarea value={state.fundInputs.investmentThesis || ""} onChange={(e) => setFundInput("investmentThesis", e.target.value)} placeholder="Investment thesis" /><input type="file" accept="application/pdf,.pdf" onChange={(e) => setFundFile(e.target.files?.[0] || null)} /><button onClick={generateFundDNA} disabled={busy === "fund"}><Sparkles />{busy === "fund" ? "Generating..." : "Generate Fund DNA"}</button>{fundJson && <><textarea className="json-review" value={fundJson} onChange={(e) => setFundJson(e.target.value)} /><button onClick={approveFundDNA}><Check />Approve Fund DNA</button></>}</article><article><h3>2. LP Relationship Record</h3><div className="live-form-grid">{["name", "organization", "lpType", "email", "relationshipOwner", "relationshipSource", "estimatedCommitmentRange", "nextAction", "nextActionDate"].map((key) => <input key={key} value={String((lpDraft as Record<string, unknown>)[key] || "")} onChange={(e) => setLP(key, e.target.value)} placeholder={key.replace(/([A-Z])/g, " $1")} />)}</div><textarea value={lpDraft.notes || ""} onChange={(e) => setLP("notes", e.target.value)} placeholder="Notes" /><button onClick={saveLP}><Plus />Add LP</button><textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="CSV import: name, organization, lp type, email, stage, next action..." /><button onClick={importCsv}><Database />Import CSV</button></article><article><h3>3. Relationship Timeline</h3><select value={selected?.id || ""} onChange={(e) => setSelectedLP(e.target.value)}>{state.lps.map((lp) => <option key={lp.id} value={lp.id}>{lp.name} — {lp.organization}</option>)}</select><div className="live-form-grid"><input type="date" value={timelineDraft.date || ""} onChange={(e) => setTimelineDraft((x) => ({ ...x, date: e.target.value }))} /><input value={timelineDraft.source || ""} onChange={(e) => setTimelineDraft((x) => ({ ...x, source: e.target.value }))} placeholder="Source" /></div><textarea value={timelineDraft.summary || ""} onChange={(e) => setTimelineDraft((x) => ({ ...x, summary: e.target.value }))} placeholder="Summary" /><textarea value={timelineDraft.supportingText || ""} onChange={(e) => setTimelineDraft((x) => ({ ...x, supportingText: e.target.value }))} placeholder="Supporting text" /><button onClick={saveTimeline}><Check />Save timeline entry</button><div className="mini-list">{state.timeline.filter((entry) => !selected || entry.lpId === selected.id).slice(0, 4).map((entry) => <p key={entry.id}><b>{entry.date}</b> {entry.summary}<button onClick={() => setTimelineDraft(entry)}>Edit</button><button onClick={() => setState((current) => ({ ...current, timeline: current.timeline.filter((x) => x.id !== entry.id) }))}>Delete</button></p>)}</div></article><article><h3>4. Prepare for Meeting</h3>{brief ? <div className="meeting-brief"><p><b>Relationship:</b> {brief.relationshipSummary}</p><p><b>Previous:</b> {brief.previousInteractionSummary}</p><p><b>Alignment:</b> {brief.likelyAreasOfAlignment.join(" ")}</p><p><b>Concerns:</b> {brief.possibleConcerns.join(" ")}</p><p><b>Questions:</b> {brief.recommendedQuestions.join(" | ")}</p><p><b>Gaps:</b> {brief.informationGaps.join(" | ") || "No critical gaps detected."}</p><small><b>Sources:</b> {brief.citations.join(" • ")}</small><small><b>Assumptions:</b> {brief.assumptions.join(" ")}</small></div> : <p className="empty-state">Add an LP to generate an evidence-backed meeting brief.</p>}</article><article><h3>5. Meeting Intelligence</h3><textarea value={meetingNote} onChange={(e) => setMeetingNote(e.target.value)} placeholder="Paste meeting notes or transcript..." /><button onClick={extractMeeting} disabled={busy === "meeting"}><Sparkles />{busy === "meeting" ? "Extracting..." : "Extract meeting intelligence"}</button>{meetingDraft && <><textarea className="json-review" value={JSON.stringify(meetingDraft, null, 2)} readOnly /><button onClick={approveMeeting}><Check />Save to selected LP timeline</button></>}</article><article><h3>6. This Week</h3>{thisWeek.length ? thisWeek.slice(0, 8).map((item) => <div className={`week-item ${item.priority}`} key={item.id}><b>{item.lpName}: {item.label}</b><small>{item.reason}</small></div>) : <p className="empty-state">No due actions yet. Add LP next actions or timeline entries to populate This Week.</p>}</article></div></section>;
}

function LiveMvpWorkflow() {
  const [state, setState] = useState<LiveState>(emptyLiveState);
  const [fundJson, setFundJson] = useState("");
  const [fundFile, setFundFile] = useState<File | null>(null);
  const [lpDraft, setLpDraft] = useState<Partial<LiveLPRecord>>({ relationshipOwner: "The GP", relationshipSource: "Manual", currentStage: "Not started", lpDNA: emptyLPDNA(), relationshipStrength: "Unknown", priorInteractions: "Unknown" });
  const [pathDraft, setPathDraft] = useState<Partial<RelationshipPath>>({ pathType: "First-degree introduction", relationshipStrength: "Unknown", sourcePerson: "The GP", targetPerson: "" });
  const [feedbackDraft, setFeedbackDraft] = useState<{ feedback: RecommendationFeedbackValue; rejectionReason: RejectionReason | ""; notes: string }>({ feedback: "Save for Later", rejectionReason: "", notes: "" });
  const [outcomeDraft, setOutcomeDraft] = useState<{ outcomeStage: LPOutcomeEvent["outcomeStage"]; notes: string }>({ outcomeStage: "Suggested", notes: "" });
  const [csv, setCsv] = useState("");
  const [selectedLP, setSelectedLP] = useState("");
  const [timelineDraft, setTimelineDraft] = useState<Partial<LiveTimelineEntry>>({ date: new Date().toISOString().slice(0, 10), type: "note", source: "Manual", createdBy: "The GP" });
  const [meetingNote, setMeetingNote] = useState("");
  const [meetingDraft, setMeetingDraft] = useState<MeetingExtractionRecord | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selected = state.lps.find((lp) => lp.id === selectedLP) || state.lps[0];
  const selectedPaths = selected ? state.paths.filter((path) => path.lpId === selected.id) : [];
  const thisWeek = prioritizeThisWeek(state.lps, state.timeline);
  const brief = selected ? createMeetingBrief(state.fundDNA, selected, state.timeline.filter((entry) => entry.lpId === selected.id), selectedPaths) : null;
  const explanation = selected ? explainLPOpportunity(selected, state.fundDNA, selectedPaths) : null;

  async function persist(next: LiveState) {
    localStorage.setItem(LIVE_KEY, JSON.stringify(next));
    const supabase = createClient();
    if (!supabase || next.persistence !== "supabase") return;
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;
    if (!ownerId) return;
    await supabase.from("workspaces").upsert({ id: next.workspaceId, owner_id: ownerId, name: "My Fund Workspace", mode: "live", updated_at: new Date().toISOString() });
    if (next.fundDNA) await supabase.from("fund_dna_records").upsert({ id: next.workspaceId, workspace_id: next.workspaceId, owner_id: ownerId, original_inputs: next.fundInputs, generated_output: next.fundDNA, status: "approved", output_status: "approved", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    if (next.lps.length) await supabase.from("live_lp_records").upsert(next.lps.map((lp) => lpToDb(lp, ownerId)));
    if (next.paths.length) await supabase.from("relationship_paths").upsert(next.paths.map((path) => pathToDb(path, ownerId)));
    if (next.timeline.length) await supabase.from("relationship_timeline_entries").upsert(next.timeline.map((entry) => ({ id: entry.id, workspace_id: entry.workspaceId, owner_id: ownerId, lp_id: entry.lpId, entry_type: entry.type, entry_date: entry.date, source: entry.source, summary: entry.summary, supporting_text: entry.supportingText, created_by: entry.createdBy, updated_at: entry.updatedAt })));
    const recommendationRows = next.lps.map((lp) => {
      const exp = explainLPOpportunity(lp, next.fundDNA, next.paths.filter((path) => path.lpId === lp.id));
      return { id: `00000000-0000-4000-8000-${lp.id.replace(/-/g, "").slice(0, 12)}`, workspace_id: next.workspaceId, owner_id: ownerId, lp_id: lp.id, recommendation_label: `Review ${lp.name}`, potential_fit: exp.potentialFit, why: exp.why, evidence: exp.evidence, information_gaps: exp.informationGaps, status: "suggested", updated_at: new Date().toISOString() };
    });
    if (recommendationRows.length) await supabase.from("lp_recommendations").upsert(recommendationRows);
    if (next.feedback.length) await supabase.from("recommendation_feedback").upsert(next.feedback.map((item) => ({ id: item.id, workspace_id: item.workspaceId, owner_id: ownerId, recommendation_id: item.recommendationId, lp_id: item.lpId, feedback: item.feedback, rejection_reason: item.rejectionReason || null, notes: item.notes, created_at: item.createdAt })));
    if (next.outcomes.length) await supabase.from("lp_outcome_events").upsert(next.outcomes.map((item) => ({ id: item.id, workspace_id: item.workspaceId, owner_id: ownerId, lp_id: item.lpId, recommendation_id: item.recommendationId || null, outcome_stage: item.outcomeStage, notes: item.notes, occurred_at: item.occurredAt, created_at: item.createdAt })));
  }

  function commit(updater: (current: LiveState) => LiveState) {
    setState((current) => {
      const next = normalizeLiveState(updater(current));
      void persist(next);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const fallback = () => {
        const saved = localStorage.getItem(LIVE_KEY);
        if (!cancelled) setState(saved ? normalizeLiveState({ ...JSON.parse(saved), persistence: "local" }) : { ...emptyLiveState, persistence: "local" });
      };
      try {
        const supabase = createClient();
        if (!supabase) return fallback();
        const { data: userData } = await supabase.auth.getUser();
        const ownerId = userData.user?.id;
        if (!ownerId) return fallback();
        let { data: workspace } = await supabase.from("workspaces").select("*").eq("owner_id", ownerId).eq("mode", "live").order("created_at", { ascending: true }).limit(1).maybeSingle();
        if (!workspace) {
          const created = await supabase.from("workspaces").insert({ owner_id: ownerId, name: "My Fund Workspace", mode: "live" }).select("*").single();
          workspace = created.data;
        }
        if (!workspace) return fallback();
        const workspaceId = workspace.id as string;
        const [fund, lps, timeline, paths, feedback, outcomes] = await Promise.all([
          supabase.from("fund_dna_records").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("live_lp_records").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
          supabase.from("relationship_timeline_entries").select("*").eq("workspace_id", workspaceId).order("entry_date", { ascending: false }),
          supabase.from("relationship_paths").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
          supabase.from("recommendation_feedback").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
          supabase.from("lp_outcome_events").select("*").eq("workspace_id", workspaceId).order("occurred_at", { ascending: false }),
        ]);
        if (cancelled) return;
        setState(normalizeLiveState({
          workspaceId,
          persistence: "supabase",
          fundInputs: (fund.data?.original_inputs as Record<string, string>) || {},
          fundDNA: (fund.data?.generated_output as FundDNARecord) || null,
          lps: (lps.data || []).map(lpFromDb),
          timeline: (timeline.data || []).map((row: Record<string, any>) => ({ id: row.id, workspaceId: row.workspace_id, lpId: row.lp_id, date: row.entry_date, type: row.entry_type, source: row.source, summary: row.summary, supportingText: row.supporting_text || "", createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at })),
          paths: (paths.data || []).map(pathFromDb),
          feedback: (feedback.data || []).map((row: Record<string, any>) => ({ id: row.id, workspaceId: row.workspace_id, lpId: row.lp_id, recommendationId: row.recommendation_id, feedback: row.feedback, rejectionReason: row.rejection_reason || "", notes: row.notes || "", createdAt: row.created_at })),
          outcomes: (outcomes.data || []).map((row: Record<string, any>) => ({ id: row.id, workspaceId: row.workspace_id, lpId: row.lp_id, recommendationId: row.recommendation_id || undefined, outcomeStage: row.outcome_stage, notes: row.notes || "", occurredAt: row.occurred_at, createdAt: row.created_at })),
        }));
      } catch {
        setError("Supabase live persistence is unavailable. Using local fallback; demo data remains separate.");
        fallback();
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function setFundInput(key: string, value: string) { commit((current) => ({ ...current, fundInputs: { ...current.fundInputs, [key]: value } })); }
  function setLP(key: string, value: string) { setLpDraft((current) => ({ ...current, [key]: value })); }
  function setDnaField(key: typeof dnaFieldKeys[number], prop: "value" | "status" | "evidenceSource" | "evidenceText" | "lastVerifiedDate", value: string) {
    setLpDraft((current) => {
      const dna = normalizeLPDNA(current.lpDNA);
      return { ...current, lpDNA: { ...dna, [key]: { ...dna[key], [prop]: value } } };
    });
  }
  async function generateFundDNA() {
    setBusy("fund"); setError(""); setSuccess("");
    const form = new FormData();
    Object.entries(state.fundInputs).forEach(([key, value]) => form.append(key, value));
    if (fundFile) form.append("file", fundFile);
    try {
      const res = await fetch("/api/fund-dna", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fund DNA generation failed");
      const dna = normalizeFundDNA(data.fundDNA);
      setFundJson(JSON.stringify(dna, null, 2));
      setSuccess("Fund DNA generated. Review/edit JSON before approving.");
    } catch (e) { setError(e instanceof Error ? e.message : "Fund DNA generation failed"); } finally { setBusy(""); }
  }
  function approveFundDNA() {
    try {
      const dna = normalizeFundDNA(JSON.parse(fundJson));
      commit((current) => ({ ...current, fundDNA: dna }));
      setSuccess("Fund DNA approved and saved.");
      setError("");
    } catch { setError("Fund DNA JSON is invalid."); }
  }
  function saveLP() {
    if (!lpDraft.name || !lpDraft.organization || !lpDraft.lpType || !lpDraft.email) return setError("LP name, organization, LP type, and email are required.");
    const now = new Date().toISOString();
    const lp: LiveLPRecord = { id: lpDraft.id || uid("live-lp"), workspaceId: state.workspaceId, name: lpDraft.name, organization: lpDraft.organization, lpType: lpDraft.lpType, email: lpDraft.email, relationshipOwner: lpDraft.relationshipOwner || "The GP", relationshipSource: lpDraft.relationshipSource || "Manual", relationshipStrength: lpDraft.relationshipStrength || "Unknown", priorInteractions: lpDraft.priorInteractions || "Unknown", lpDNA: normalizeLPDNA(lpDraft.lpDNA), currentStage: lpDraft.currentStage || "Not started", estimatedCommitmentRange: lpDraft.estimatedCommitmentRange || "Unknown", nextAction: lpDraft.nextAction || "Qualify LP fit", nextActionDate: lpDraft.nextActionDate || "", notes: lpDraft.notes || "", createdAt: lpDraft.createdAt || now, updatedAt: now };
    commit((current) => ({ ...current, lps: [lp, ...current.lps.filter((x) => x.id !== lp.id)] }));
    setSelectedLP(lp.id);
    setLpDraft({ relationshipOwner: "The GP", relationshipSource: "Manual", currentStage: "Not started", relationshipStrength: "Unknown", priorInteractions: "Unknown", lpDNA: emptyLPDNA() });
    setSuccess("LP relationship record and LP DNA saved.");
    setError("");
  }
  function importCsv() {
    const imported = parseCsvRows(csv).map((row) => lpFromCsv(row, state.workspaceId, state.lps)).filter((lp): lp is LiveLPRecord => Boolean(lp));
    commit((current) => ({ ...current, lps: [...imported, ...current.lps] }));
    setCsv("");
    setSuccess(imported.length ? `${imported.length} LP record${imported.length === 1 ? "" : "s"} imported with Unknown for missing LP DNA fields.` : "No valid new LP rows found.");
  }
  function saveTimeline() {
    if (!selected || !timelineDraft.summary || !timelineDraft.date) return setError("Choose an LP and add a timeline date and summary.");
    const now = new Date().toISOString();
    const entry: LiveTimelineEntry = { id: timelineDraft.id || uid("tl"), workspaceId: state.workspaceId, lpId: selected.id, date: timelineDraft.date, type: timelineDraft.type || "note", source: timelineDraft.source || "Manual", summary: timelineDraft.summary, supportingText: timelineDraft.supportingText || "", createdBy: timelineDraft.createdBy || "The GP", createdAt: timelineDraft.createdAt || now, updatedAt: now };
    commit((current) => ({ ...current, timeline: [entry, ...current.timeline.filter((x) => x.id !== entry.id)] }));
    setTimelineDraft({ date: new Date().toISOString().slice(0, 10), type: "note", source: "Manual", createdBy: "The GP" });
    setSuccess("Timeline entry saved.");
    setError("");
  }
  function savePath() {
    if (!selected || !pathDraft.sourcePerson || !pathDraft.targetPerson) return setError("Choose an LP and add source and target people for the relationship path.");
    const now = new Date().toISOString();
    const path: RelationshipPath = { id: pathDraft.id || uid("path"), workspaceId: state.workspaceId, lpId: selected.id, sourcePerson: pathDraft.sourcePerson, targetPerson: pathDraft.targetPerson, pathType: pathDraft.pathType || "First-degree introduction", relationshipStrength: pathDraft.relationshipStrength || "Unknown", evidenceSource: pathDraft.evidenceSource || "", evidenceText: pathDraft.evidenceText || "", notes: pathDraft.notes || "", lastVerifiedDate: pathDraft.lastVerifiedDate || "", createdAt: pathDraft.createdAt || now, updatedAt: now };
    commit((current) => ({ ...current, paths: [path, ...current.paths.filter((x) => x.id !== path.id)] }));
    setPathDraft({ pathType: "First-degree introduction", relationshipStrength: "Unknown", sourcePerson: "The GP", targetPerson: "" });
    setSuccess("Relationship path saved.");
    setError("");
  }
  function saveFeedback() {
    if (!selected) return setError("Choose an LP before saving recommendation feedback.");
    if (feedbackDraft.feedback === "Reject" && !feedbackDraft.rejectionReason) return setError("Select a rejection reason so this learning signal is useful later.");
    const now = new Date().toISOString();
    const recommendationId = `00000000-0000-4000-8000-${selected.id.replace(/-/g, "").slice(0, 12)}`;
    const item: RecommendationFeedback = { id: uid("feedback"), workspaceId: state.workspaceId, lpId: selected.id, recommendationId, feedback: feedbackDraft.feedback, rejectionReason: feedbackDraft.rejectionReason, notes: feedbackDraft.notes, createdAt: now };
    commit((current) => ({ ...current, feedback: [item, ...current.feedback] }));
    setFeedbackDraft({ feedback: "Save for Later", rejectionReason: "", notes: "" });
    setSuccess("Recommendation Feedback saved as a learning signal. This is not presented as machine learning.");
  }
  function saveOutcome() {
    if (!selected) return setError("Choose an LP before recording an outcome event.");
    const now = new Date().toISOString();
    const event: LPOutcomeEvent = { id: uid("outcome"), workspaceId: state.workspaceId, lpId: selected.id, recommendationId: `00000000-0000-4000-8000-${selected.id.replace(/-/g, "").slice(0, 12)}`, outcomeStage: outcomeDraft.outcomeStage, notes: outcomeDraft.notes, occurredAt: now, createdAt: now };
    commit((current) => ({ ...current, outcomes: [event, ...current.outcomes] }));
    setOutcomeDraft({ outcomeStage: "Suggested", notes: "" });
    setSuccess("Outcome event added to historical journey.");
  }
  async function extractMeeting() {
    if (!meetingNote.trim()) return setError("Paste meeting notes before extracting meeting intelligence.");
    setBusy("meeting"); setError("");
    try {
      const form = new FormData();
      form.append("note", meetingNote);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Meeting extraction failed");
      setMeetingDraft(normalizeMeetingExtraction(data.meetingIntelligence || data.extraction));
      setSuccess("Meeting intelligence extracted. Review before saving.");
    } catch (e) { setError(e instanceof Error ? e.message : "Meeting extraction failed"); } finally { setBusy(""); }
  }
  function approveMeeting() {
    if (!selected || !meetingDraft) return;
    const entry = timelineEntryFromMeeting(selected.id, state.workspaceId, meetingDraft, meetingNote);
    commit((current) => ({ ...current, timeline: [entry, ...current.timeline], lps: current.lps.map((lp) => lp.id === selected.id ? { ...lp, nextAction: meetingDraft.nextAction || lp.nextAction, nextActionDate: meetingDraft.nextActionDate || lp.nextActionDate, notes: `${lp.notes}\n${meetingDraft.conciseMeetingSummary}`.trim(), updatedAt: new Date().toISOString() } : lp) }));
    setMeetingNote("");
    setMeetingDraft(null);
    setSuccess("Meeting intelligence saved to the LP timeline. Pipeline stage was not changed automatically.");
  }

  const draftDna = normalizeLPDNA(lpDraft.lpDNA);
  return <section className="panel live-mvp-workflow"><div className="panel-head"><div><h2>Live MVP Workflow</h2><p>Fund Setup → LP DNA → Relationship Paths → Meeting Prep → Meeting Intelligence → This Week. Demo records stay separate from live workspace records.</p></div><span>{state.persistence === "supabase" ? "Supabase persistence" : state.persistence === "local" ? "Local fallback" : "Checking persistence"}</span></div><p className="privacy-note">Privacy notice: upload only authorized materials. Live records persist to Supabase when signed in and the migration is applied; otherwise they remain in local fallback. Unknown LP DNA fields display as Unknown and inferred fields are labeled Inferred.</p>{error && <p className="phase-upload-error">{error}</p>}{success && <p className="live-success"><Check />{success}</p>}<div className="live-mvp-grid"><article><h3>1. Fund Setup</h3><div className="live-form-grid">{["fundName", "targetFundSize", "fundStage", "sectors", "geography", "typicalInvestmentCheck"].map((key) => <input key={key} value={state.fundInputs[key] || ""} onChange={(e) => setFundInput(key, e.target.value)} placeholder={fieldLabel(key)} />)}</div><textarea value={state.fundInputs.gpBackground || ""} onChange={(e) => setFundInput("gpBackground", e.target.value)} placeholder="GP background" /><textarea value={state.fundInputs.investmentThesis || ""} onChange={(e) => setFundInput("investmentThesis", e.target.value)} placeholder="Investment thesis" /><input type="file" accept="application/pdf,.pdf" onChange={(e) => setFundFile(e.target.files?.[0] || null)} /><button onClick={generateFundDNA} disabled={busy === "fund"}><Sparkles />{busy === "fund" ? "Generating..." : "Generate Fund DNA"}</button>{fundJson && <><textarea className="json-review" value={fundJson} onChange={(e) => setFundJson(e.target.value)} /><button onClick={approveFundDNA}><Check />Approve Fund DNA</button></>}</article><article><h3>2. LP Relationship Record + LP DNA</h3><div className="live-form-grid">{["name", "organization", "lpType", "email", "relationshipOwner", "relationshipSource", "relationshipStrength", "priorInteractions", "estimatedCommitmentRange", "nextAction", "nextActionDate"].map((key) => <input key={key} value={String((lpDraft as Record<string, unknown>)[key] || "")} onChange={(e) => setLP(key, e.target.value)} placeholder={fieldLabel(key)} />)}</div>{dnaFieldKeys.map((key) => <div className="lp-dna-row" key={key}><b>{fieldLabel(key)}</b><select value={draftDna[key].status} onChange={(e) => setDnaField(key, "status", e.target.value)}><option value="unknown">Unknown</option><option value="known">Known</option><option value="inferred">Inferred</option></select><input value={draftDna[key].value} onChange={(e) => setDnaField(key, "value", e.target.value || "Unknown")} placeholder="Unknown" /><input value={draftDna[key].evidenceSource} onChange={(e) => setDnaField(key, "evidenceSource", e.target.value)} placeholder="Evidence source" /><textarea value={draftDna[key].evidenceText} onChange={(e) => setDnaField(key, "evidenceText", e.target.value)} placeholder="Evidence text" /><input type="date" value={draftDna[key].lastVerifiedDate} onChange={(e) => setDnaField(key, "lastVerifiedDate", e.target.value)} /></div>) }<textarea value={lpDraft.notes || ""} onChange={(e) => setLP("notes", e.target.value)} placeholder="Notes" /><button onClick={saveLP}><Plus />Save LP</button><textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="CSV import: name, organization, lp type, email, sector preferences, check size range, geography..." /><button onClick={importCsv}><Database />Import CSV</button></article><article><h3>3. Relationship Timeline</h3><select value={selected?.id || ""} onChange={(e) => setSelectedLP(e.target.value)}>{state.lps.map((lp) => <option key={lp.id} value={lp.id}>{lp.name} — {lp.organization}</option>)}</select><div className="live-form-grid"><input type="date" value={timelineDraft.date || ""} onChange={(e) => setTimelineDraft((x) => ({ ...x, date: e.target.value }))} /><input value={timelineDraft.source || ""} onChange={(e) => setTimelineDraft((x) => ({ ...x, source: e.target.value }))} placeholder="Source" /></div><textarea value={timelineDraft.summary || ""} onChange={(e) => setTimelineDraft((x) => ({ ...x, summary: e.target.value }))} placeholder="Summary" /><textarea value={timelineDraft.supportingText || ""} onChange={(e) => setTimelineDraft((x) => ({ ...x, supportingText: e.target.value }))} placeholder="Supporting text" /><button onClick={saveTimeline}><Check />Save timeline entry</button><div className="mini-list">{state.timeline.filter((entry) => !selected || entry.lpId === selected.id).slice(0, 4).map((entry) => <p key={entry.id}><b>{entry.date}</b> {entry.summary}<button onClick={() => setTimelineDraft(entry)}>Edit</button><button onClick={() => commit((current) => ({ ...current, timeline: current.timeline.filter((x) => x.id !== entry.id) }))}>Delete</button></p>)}</div></article><article><h3>4. Relationship Paths</h3><div className="live-form-grid"><input value={pathDraft.sourcePerson || ""} onChange={(e) => setPathDraft((x) => ({ ...x, sourcePerson: e.target.value }))} placeholder="Source person" /><input value={pathDraft.targetPerson || ""} onChange={(e) => setPathDraft((x) => ({ ...x, targetPerson: e.target.value }))} placeholder="Target person" /></div><select value={pathDraft.pathType || "First-degree introduction"} onChange={(e) => setPathDraft((x) => ({ ...x, pathType: e.target.value as RelationshipPathType }))}>{relationshipPathTypes.map((x) => <option key={x}>{x}</option>)}</select><input value={pathDraft.relationshipStrength || ""} onChange={(e) => setPathDraft((x) => ({ ...x, relationshipStrength: e.target.value }))} placeholder="Relationship strength if known" /><input value={pathDraft.evidenceSource || ""} onChange={(e) => setPathDraft((x) => ({ ...x, evidenceSource: e.target.value }))} placeholder="Evidence/source" /><textarea value={pathDraft.evidenceText || ""} onChange={(e) => setPathDraft((x) => ({ ...x, evidenceText: e.target.value }))} placeholder="Evidence text" /><textarea value={pathDraft.notes || ""} onChange={(e) => setPathDraft((x) => ({ ...x, notes: e.target.value }))} placeholder="Notes" /><input type="date" value={pathDraft.lastVerifiedDate || ""} onChange={(e) => setPathDraft((x) => ({ ...x, lastVerifiedDate: e.target.value }))} /><button onClick={savePath}><Network />Save relationship path</button><div className="mini-list">{selectedPaths.map((path) => <p key={path.id}><b>{path.pathType}</b> {path.sourcePerson} → {path.targetPerson}<button onClick={() => setPathDraft(path)}>Edit</button></p>)}</div></article><article><h3>5. Prepare for Meeting</h3>{brief ? <div className="meeting-brief"><p><b>Relationship:</b> {brief.relationshipSummary}</p><p><b>Previous:</b> {brief.previousInteractionSummary}</p><p><b>Best known path:</b> {brief.bestKnownIntroductionPath}</p><p><b>Alignment:</b> {brief.likelyAreasOfAlignment.join(" ")}</p><p><b>Concerns:</b> {brief.possibleConcerns.join(" ")}</p><p><b>Questions:</b> {brief.recommendedQuestions.join(" | ")}</p><p><b>Gaps:</b> {brief.informationGaps.join(" | ") || "No critical gaps detected."}</p><small><b>Sources:</b> {brief.citations.join(" • ")}</small><small><b>Assumptions:</b> {brief.assumptions.join(" ")}</small></div> : <p className="empty-state">Add an LP to generate an evidence-backed meeting brief.</p>}</article><article><h3>6. LP Opportunity Explanation</h3>{explanation ? <div className="meeting-brief"><p><b>Potential Fit:</b> {explanation.potentialFit}</p><p><b>Why:</b> {explanation.why.join(" ") || "No verified fit reason yet."}</p><p><b>Best known relationship path:</b> {explanation.bestKnownRelationshipPath}</p><p><b>Evidence:</b> {explanation.evidence.join(" | ")}</p><p><b>Information gaps:</b> {explanation.informationGaps.join(" | ")}</p><div className="live-form-grid"><select value={feedbackDraft.feedback} onChange={(e) => setFeedbackDraft((x) => ({ ...x, feedback: e.target.value as RecommendationFeedbackValue }))}>{feedbackOptions.map((x) => <option key={x}>{x}</option>)}</select>{feedbackDraft.feedback === "Reject" && <select value={feedbackDraft.rejectionReason} onChange={(e) => setFeedbackDraft((x) => ({ ...x, rejectionReason: e.target.value as RejectionReason }))}><option value="">Select rejection reason</option>{rejectionReasons.map((x) => <option key={x}>{x}</option>)}</select>}</div><textarea value={feedbackDraft.notes} onChange={(e) => setFeedbackDraft((x) => ({ ...x, notes: e.target.value }))} placeholder="Feedback notes" /><button onClick={saveFeedback}><Check />Save Recommendation Feedback</button><div className="live-form-grid"><select value={outcomeDraft.outcomeStage} onChange={(e) => setOutcomeDraft((x) => ({ ...x, outcomeStage: e.target.value as LPOutcomeEvent["outcomeStage"] }))}>{outcomeStages.map((x) => <option key={x}>{x}</option>)}</select></div><textarea value={outcomeDraft.notes} onChange={(e) => setOutcomeDraft((x) => ({ ...x, notes: e.target.value }))} placeholder="Outcome notes" /><button onClick={saveOutcome}><Clock3 />Add outcome event</button><div className="mini-list">{state.outcomes.filter((event) => event.lpId === selected?.id).slice(0, 4).map((event) => <p key={event.id}><b>{event.outcomeStage}</b> {event.notes || "No notes"}<small>{displayDate(event.occurredAt)}</small></p>)}</div></div> : <p className="empty-state">Add an LP to explain opportunity fit.</p>}</article><article><h3>7. Meeting Intelligence</h3><textarea value={meetingNote} onChange={(e) => setMeetingNote(e.target.value)} placeholder="Paste meeting notes or transcript..." /><button onClick={extractMeeting} disabled={busy === "meeting"}><Sparkles />{busy === "meeting" ? "Extracting..." : "Extract meeting intelligence"}</button>{meetingDraft && <><textarea className="json-review" value={JSON.stringify(meetingDraft, null, 2)} readOnly /><button onClick={approveMeeting}><Check />Save to selected LP timeline</button></>}</article><article><h3>8. This Week</h3>{thisWeek.length ? thisWeek.slice(0, 8).map((item) => <div className={`week-item ${item.priority}`} key={item.id}><b>{item.lpName}: {item.label}</b><small>{item.reason}</small></div>) : <p className="empty-state">No due actions yet. Add LP next actions or timeline entries to populate This Week.</p>}</article></div></section>;
}

function DashboardView({ profiles, tasks, feed, metrics, latestUploadId, fundDNA, strategy, bestFits, go, openLP, openChat, openUpload, openOnboarding, workspaceMode, onboardingSummary, signals, forecast, autonomous, outcomeIntel, discovery, fitResults }: { profiles: LP[]; tasks: Task[]; feed: Feed[]; metrics: { total: number; active: number; warm: number; commitments: number; pipeline: number; open: number; overdue: number; score: number }; latestUploadId: string | null; fundDNA: FundDNA | null; strategy: FundraisingStrategy | null; bestFits: { lp: LP; fit: LPFit }[]; go: (s: Screen) => void; openLP: (lp: LP) => void; openChat: () => void; openUpload: () => void; openOnboarding: () => void; workspaceMode: WorkspaceMode; onboardingSummary: OnboardingSummary | null; signals: Record<string, FundraisingSignal>; forecast: ReturnType<typeof fundraisingForecast>; autonomous: AutonomousRecommendation[]; outcomeIntel: FundraisingOutcomeIntelligence; discovery: ReturnType<typeof discoverInvestors>; fitResults: Record<string, LPFit> }) {
  const focus = fundDNA ? bestFits.slice(0, 4) : [...profiles].sort((a, b) => b.strength - a.strength).slice(0, 4).map((lp) => ({ lp, fit: undefined as LPFit | undefined }));
  const uploaded = latestUploadId ? profiles.find((x) => x.id === latestUploadId) : null;
  const openTasks = tasks.filter((x) => !x.done);
  const overdue = openTasks.filter((x) => x.due === "Overdue");
  const prepMeetings = profiles.filter((x) => x.status === "Hot" || x.due === "This week").slice(0, 3);
  const readiness = strategy?.readinessScore.score || metrics.score;
  const topAction = strategy?.aiPriorities[0];
  const recommendedAction = autonomous[0]?.title || topAction?.title || uploaded?.next || openTasks[0]?.title || "Review top LP conversations";
  const recommendedReason = autonomous[0]?.why || topAction?.reason || (uploaded ? `${uploaded.name}'s meeting note was just added to memory and created a follow-up.` : metrics.overdue ? `${metrics.overdue} overdue follow-up is reducing fundraising momentum.` : "Strong LP alignment and meeting cadence create a window to push warm conversations forward.");
  const discoveryWorkflow = ["Upload fund deck", "Upload GP bio", "Upload investment thesis", "Add existing LP list", "Approve Fund DNA", "Review LP matching intelligence", "Execute weekly action plan"];
  const idealPersonas = [
    { name: "Family Offices", fit: "High probability", why: "Flexible check sizes, faster cycles, and strong appetite for differentiated emerging managers.", avoid: "Avoid broad multi-family offices without venture allocation history." },
    { name: "Emerging Manager Fund of Funds", fit: "High probability", why: "Mandated to underwrite emerging venture funds and benchmark first-time or early funds.", avoid: "Avoid large institutional FoFs requiring long audited track records." },
    { name: "Founder LPs", fit: "High probability", why: "They understand seed risk, can write smaller checks, and often unlock warm founder-to-founder introductions.", avoid: "Avoid founders without liquidity or allocator intent." },
    { name: "Healthcare Operators", fit: "Situational fit", why: "Strong match when the fund thesis includes healthcare AI, vertical software, or operator access.", avoid: "Avoid if the fund has no healthcare proof points or portfolio relevance." },
    { name: "Institutional LPs", fit: "Lower near-term probability", why: "Useful later for credibility and scale, but diligence cycles are slower.", avoid: "Avoid spending early-cycle time where minimum check sizes and track-record requirements are mismatched." },
  ];
  const weeklyPlan = ["Prioritize high-fit family offices and emerging-manager FoFs.", "Ask two portfolio founders for warm LP introductions.", "Prepare attribution, ownership, and reference materials before new meetings.", "Attend one allocator or operator community event with clear intro targets.", "Stop broad cold outreach to low-fit institutional LPs this week."];
  return <>
    <section className="ai-hero panel">
      <div>
        <span>AI-NATIVE LP FUNDRAISING INTELLIGENCE</span>
        <h1>Your best LP opportunities this week.</h1>
        <p>LP Brain helps emerging venture fund managers identify the highest-probability LPs, understand why they fit, find credible reach paths, and decide the next action.</p>
        <p className="onboarding-note">Upload your fund deck, GP bio, investment thesis, and optional LP list to generate Fund DNA and LP matching intelligence.</p>
      </div>
      <div className="ai-hero-actions">
        <button className="ask" onClick={openOnboarding}><UploadCloud />Upload fund materials</button>
        <button className="ask" onClick={openChat}><Sparkles />Ask LP Brain</button>
        <button className="primary" onClick={openUpload}><Plus /><span>Upload meeting note</span></button>
      </div>
    </section>

    <section className="panel pilot-mode-card">
      <div className="panel-head">
        <div>
          <h2>LP Discovery Flow</h2>
          <p>Start with fund materials, then let LP Brain produce Fund DNA, ideal LP personas, matching intelligence, relationship paths, and a weekly action plan.</p>
        </div>
        <span>LP matchmaker</span>
      </div>
      <div className="pilot-checklist">
        {discoveryWorkflow.map((item, i) => <div key={item} className="pilot-check-item"><span>{i + 1}</span><p>{item}</p></div>)}
      </div>
      <p className="pilot-mode-note">LP Brain uses demo data unless you upload your own fund materials or connect a provider.</p>
    </section>

    <section className="panel persona-intelligence">
      <div className="panel-head">
        <div><h2>Ideal LP Personas</h2><p>AI-generated categories the GP should target or avoid based on Fund DNA, check size, stage, geography, and proof points.</p></div>
        <button onClick={() => go("Fund DNA")}>Review Fund DNA <ArrowRight /></button>
      </div>
      <div className="persona-grid">{idealPersonas.map((persona) => <article key={persona.name}><span>{persona.fit}</span><h3>{persona.name}</h3><p><b>Why this fits:</b> {persona.why}</p><p><b>Why not others:</b> {persona.avoid}</p></article>)}</div>
    </section>

    <section className="chief-grid compact matching-intelligence">
      <div className="panel chief-card">
        <label>LP Matching Intelligence</label>
        <h2>Who should I fundraise from?</h2>
        <p><b>Prioritize:</b> Family offices, emerging-manager FoFs, founder LPs, and thesis-relevant operators with $250K-$1M check capacity.</p>
        <p><b>Why:</b> These categories match the fund stage, proof-point depth, and fastest paths to warm introductions.</p>
      </div>
      <div className="panel chief-card">
        <label>Relationship Intelligence</label>
        <h2>How do I access them?</h2>
        <p><b>Best path:</b> Founder introductions, emerging-manager communities, sector operator networks, and allocator events.</p>
        <p><b>Do next:</b> Ask existing warm nodes for category-specific intros before broad outbound.</p>
      </div>
      <div className="panel chief-card">
        <label>Weekly Action Plan</label>
        <h2>What should I do this week?</h2>
        {weeklyPlan.slice(0, 3).map((item) => <p key={item}><b>•</b> {item}</p>)}
      </div>
    </section>

    <LiveMvpWorkflow />

    {workspaceMode === "My Fund Workspace" && onboardingSummary && <section className="panel onboarding-live-summary">
      <div className="panel-head"><div><h2>My Fund Workspace is live</h2><p>Imported fund materials now drive Fund DNA, LP Fit, opportunities, priorities, and forecast.</p></div><span>Saved workspace</span></div>
      <div className="onboarding-summary-grid">
        <Metric label="LPs imported" value={onboardingSummary.importedLPs} detail="Existing relationship records" />
        <Metric label="Meetings detected" value={onboardingSummary.meetingsDetected} detail="From notes and LP list rows" />
        <Metric label="Opportunities" value={onboardingSummary.opportunitiesGenerated} detail="Generated from Fund DNA" />
      </div>
      <div className="onboarding-next-actions">{onboardingSummary.recommendedActions.slice(0, 3).map((x) => <p key={x}><Check />{x}</p>)}</div>
    </section>}

    <section className="chief-grid">
      <div className="panel chief-card primary-chief">
        <label>Today's priority</label>
        <h2>{recommendedAction}</h2>
        <p><b>Why it matters:</b> {recommendedReason}</p>
        <p><b>Expected impact:</b> {autonomous[0]?.impact || (strategy ? "Moves the highest-probability LP toward diligence or commitment." : "Creates the data layer for autonomous prioritization.")}</p>
        <p><b>Suggested action:</b> {autonomous[0]?.action || (strategy ? "Execute the recommended action, then ask Memory for the exact outreach or prep note." : fundDNA ? "Use the fit engine to prioritize warm LPs before broad outreach." : "Create Fund DNA so LP Brain can rank LP fit and generate strategy.")}</p>
        <p><b>Confidence:</b> {confidenceLabel(autonomous[0]?.confidence || 84)}</p>
        <button onClick={() => strategy ? go("Fundraising Strategy") : fundDNA ? go("Fund DNA") : go("Knowledge")}>Open recommendation <ArrowRight /></button>
      </div>
      <div className="panel chief-card readiness-card">
        <label>Fundraising Readiness</label>
        <h2>{readiness}/100</h2>
        <figure><i style={{ width: `${readiness}%` }} /></figure>
        <div className="readiness-copy">
          <b>Contributors</b>
          {(strategy?.readinessScore.helping || ["Strong LP alignment", "Healthy meeting cadence", metrics.overdue ? "One overdue follow-up reducing score" : "No major overdue follow-up drag"]).slice(0, 3).map((x) => <p key={x}>{x}</p>)}
          <b>Recommended action</b>
          <p>{strategy?.aiPriorities[0]?.title || "Complete the Elena Park follow-up today to increase readiness."}</p>
        </div>
      </div>
      <div className="panel chief-card risk-card">
        <label>Pipeline risks</label>
        <h2>{overdue.length ? `${overdue.length} overdue follow-up` : "No critical blockers"}</h2>
        <p><b>What happened:</b> {metrics.open} open follow-ups across {metrics.total} LP profiles.</p>
        <p><b>Why it matters:</b> Warm LP momentum decays when diligence asks sit unresolved.</p>
        <p><b>Do next:</b> Clear the highest-fit overdue item before adding new cold outreach.</p>
      </div>
    </section>

    <section className="panel autonomous-engine">
      <div className="panel-head"><div><h2>LP Matching Intelligence</h2><p>Every new fund material, LP list, meeting note, and outcome sharpens which LP categories are most likely to convert.</p></div><span>Always learning</span></div>
      <div className="autonomous-grid">
        {autonomous.slice(0, 4).map((rec) => <button key={rec.title} onClick={() => { const lp = rec.lpId ? profiles.find((x) => x.id === rec.lpId) : null; if (lp) openLP(lp); }}><Sparkles /><p><b>{rec.title}</b><small>Why: {rec.why}</small><small>Expected impact: {rec.impact}</small><strong>{confidenceLabel(rec.confidence)} confidence</strong><em>Suggested action: {rec.action}</em></p></button>)}
      </div>
    </section>

    <section className="panel discovery-chief">
      <div className="panel-head"><div><h2>Discovery Engine</h2><p>LP Brain recommends new LP opportunities based on Fund DNA, ideal LP personas, outcomes, sector, stage, geography, and check-size fit.</p></div><button onClick={() => go("Discover Investors")}>Open discovery <ArrowRight /></button></div>
      <div className="discovery-chief-grid">{discovery.opportunities.slice(0, 3).map((opp) => <article key={opp.id}><span>{opp.priority}</span><h3>{opp.lpName}</h3><p>{opp.organization} • {opp.investorType}</p><small><b>Why:</b> {opp.whyMatches}</small><small><b>Expected impact:</b> {opp.expectedImpact}</small><em>{confidenceLabel(opp.confidenceScore)} confidence • {opp.expectedCheckSize}</em><button onClick={() => go("Discover Investors")}>Pursue this week <ArrowRight /></button></article>)}</div>
    </section>

    <OutcomeInsights intel={outcomeIntel} openChat={openChat} />

    <section className="workspace-columns">
      <div className="panel action-stack">
        <div className="panel-head"><div><h2>Fundraising Signals</h2><p>Detected automatically for every LP with a reason.</p></div></div>
        {[...profiles].sort((a, b) => (signals[b.id]?.confidence || 0) - (signals[a.id]?.confidence || 0)).slice(0, 5).map((lp) => <button className="signal-card" key={lp.id} onClick={() => openLP(lp)}><span>{signals[lp.id]?.label}</span><p><b>{lp.name}</b><small>{signals[lp.id]?.reason}</small></p><em>{confidenceLabel(signals[lp.id]?.confidence || 0)}</em></button>)}
      </div>
      <div className="panel action-stack">
        <div className="panel-head"><div><h2>Fundraising Forecast</h2><p>Forecast updates when meetings, commitments, fit scores, outcomes, or overdue tasks change.</p></div></div>
        <div className="forecast-card"><label>Weighted forecast</label><h2>{money(forecast.weighted)}</h2><p>Expected range: {money(forecast.rangeLow)} - {money(forecast.rangeHigh)}</p><p>Confidence: {confidenceLabel(forecast.confidence)}</p><small>{forecast.risk}</small></div>
      </div>
    </section>

    <section className="workspace-columns">
      <div className="panel action-stack">
        <div className="panel-head"><div><h2>Recommended LPs</h2><p>Ranked by fit, relationship strength, and actionable next steps.</p></div><button onClick={() => go("LP Pipeline")}>Open pipeline <ArrowRight /></button></div>
        {focus.map(({ lp, fit }) => <button className="action-card" key={lp.id} onClick={() => openLP(lp)}><span className="avatar" style={{ background: lp.color }}>{lp.initials}</span><div><b>{lp.name}</b><small>{lp.firm} • {lp.type}</small><p><strong>What happened:</strong> {lp.activity}</p><p><strong>Do next:</strong> {fit?.nextBestAction || lp.next}</p><p><strong>Signal:</strong> {signals[lp.id]?.label} — {signals[lp.id]?.reason}</p></div><em>{fit ? `${fit.score}% fit` : `${lp.strength}% strength`}</em></button>)}
      </div>
      <div className="panel action-stack">
        <div className="panel-head"><div><h2>Meetings requiring preparation</h2><p>Brief the GP before every high-intent conversation.</p></div><button onClick={() => go("Meetings")}>Open meetings <ArrowRight /></button></div>
        {prepMeetings.map((lp) => <button className="prep-card" key={lp.id} onClick={() => openLP(lp)}><Clock3 /><div><b>{lp.name}</b><small>{lp.last} • {lp.firm}</small><p><strong>Prepare:</strong> {lp.concern}</p><p><strong>Next:</strong> {lp.next}</p></div></button>)}
      </div>
    </section>

    <section className="workspace-columns lower">
      <div className="panel action-stack">
        <div className="panel-head"><div><h2>Follow-ups due</h2><p>Action-oriented queue from the same memory dataset.</p></div><button onClick={() => go("Meetings")}>Review queue <ArrowRight /></button></div>
        {openTasks.slice(0, 5).map((task) => { const lp = profiles.find((x) => x.id === task.lpId); if (!lp) return null; return <div className="briefing-row" key={task.id}><Check /><p><b>{task.title}</b><small>{lp.name} • {task.due}</small></p><span className={task.due === "Overdue" ? "overdue" : ""}>{task.due}</span></div>; })}
      </div>
      <div className="panel action-stack">
        <div className="panel-head"><div><h2>AI recommendations</h2><p>What changed, why it matters, and what to do next.</p></div><button onClick={openChat}>Ask Memory <ArrowRight /></button></div>
        {feed.slice(0, 4).map((a, i) => <div className="signal-row ai-signal" key={`${a.title}-${i}`}><span><Zap /></span><div><b>{a.title}</b><p>{a.meta}</p><small>{a.tag}</small></div>{i === 0 && <i>NEW</i>}</div>)}
      </div>
    </section>

    <section className="ai-engines panel">
      <div className="panel-head"><div><h2>LP Discovery engines</h2><p>Fund DNA, LP matching, relationship intelligence, discovery, learning, and strategy stay focused on finding and converting the right LPs.</p></div></div>
      <div className="engine-grid">
        <details open={!fundDNA}><summary><BrainCircuit />Fund DNA + LP Fit <span>{fundDNA ? `${bestFits[0]?.fit.score || 0}% top fit` : "Not created"}</span></summary><button className="engine-open" onClick={() => go("Fund DNA")}>Open Fund DNA workflow <ArrowRight /></button></details>
        <details><summary><Target />Fundraising Strategy + Narrative Coach <span>{strategy ? `${strategy.readinessScore.score}/100` : "Create Fund DNA"}</span></summary><StrategyView strategy={strategy} fundDNA={fundDNA} bestFits={bestFits} go={go} openLP={openLP} openChat={openChat} /></details>
        <details><summary><Sparkles />LP Opportunities <span>{fundDNA ? "Pipeline ready" : "Needs Fund DNA"}</span></summary><button className="engine-open" onClick={() => go("LP Opportunities")}>Open Opportunity Pipeline <ArrowRight /></button></details>
        <details><summary><Network />Relationship Graph <span>{uploaded ? uploaded.name : "Live memory"}</span></summary><Graph profiles={profiles} latestUploadId={latestUploadId} openChat={openChat} /></details>
      </div>
    </section>
  </>;
}


function FundDNAView({ profiles, fundDNA, fitResults, saveDNA, openLP, openChat }: { profiles: LP[]; fundDNA: FundDNA | null; fitResults: Record<string, LPFit>; saveDNA: (dna: FundDNA) => void; openLP: (lp: LP) => void; openChat: () => void }) { const [materials, setMaterials] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [draft, setDraft] = useState<FundDNA | null>(null); const input = useRef<HTMLInputElement>(null); const ranked = rankedFits(profiles, fitResults); const activeDNA = draft || fundDNA; const extract = async (demo = false) => { setBusy(true); setError(""); if (demo) { setMaterials(sampleFundMaterials); setDraft(demoFundDNA); setBusy(false); return; } const form = new FormData(); if (file) form.append("file", file); form.append("materials", materials); try { const res = await fetch("/api/fund-dna", { method: "POST", body: form }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Fund DNA extraction failed"); setDraft(data.fundDNA); } catch (e) { setError(e instanceof Error ? e.message : "Fund DNA extraction failed"); } finally { setBusy(false); } }; return <><Title eyebrow="FUND DNA + LP FIT ENGINE" title="Turn fund materials into fundraising strategy." copy="LP Brain extracts the fund's positioning, scores every LP, and recommends the next best action." action={<button className="ask" onClick={openChat}><Sparkles />Ask about LP fit</button>} />{!fundDNA && !draft ? <section className="panel fund-dna-builder"><div className="phase-upload-panel"><button type="button" className="drop phase-drop" onClick={() => input.current?.click()}><input ref={input} hidden type="file" accept=".txt,.md,.markdown,.pdf,.docx" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); }} /><UploadCloud /><b>Upload fund deck, thesis, GP bio, or portfolio notes</b><p>OR</p><span>Browse Files</span><small>TXT • Markdown preferred. Paste PDF/DOCX text below.</small></button><textarea className="phase-note-input" value={materials} onChange={(e) => { setMaterials(e.target.value); setError(""); }} placeholder="Paste fund materials here: thesis, GP bio, portfolio notes, target size, geography, sector focus, and stage focus..." />{file && <div className="phase-file-ready"><span><FileText /></span><p><small>Selected file:</small><b>{file.name}</b></p><em><Check />Ready for Fund DNA extraction</em><button aria-label="Remove selected file" onClick={() => setFile(null)}><X /></button></div>}<button className="sample-upload" onClick={() => extract(true)}><Sparkles />Use sample fund materials</button>{error && <p className="phase-upload-error">{error}</p>}<div className="modal-actions inline-actions"><button disabled={busy || (!materials.trim() && !file)} className="primary" onClick={() => extract(false)}><Sparkles />{busy ? "Extracting..." : "Create Fund DNA"}</button></div></div></section> : null}{activeDNA && <section className="fund-dna-grid"><div className="panel dna-card"><div className="panel-head"><div><h2>{activeDNA.fundName}</h2><p>{activeDNA.targetFundSize} • {activeDNA.stage} • {activeDNA.geography}</p></div>{draft && <button onClick={() => { saveDNA(draft); setDraft(null); }}>Approve Fund DNA <ArrowRight /></button>}</div><div className="tags">{activeDNA.sectorFocus.map((x) => <span key={x}>{x}</span>)}</div><dl className="dna-list"><div><dt>Ideal LP types</dt><dd>{activeDNA.idealLPTypes.join(", ")}</dd></div><div><dt>Target LP check</dt><dd>{activeDNA.targetLPCheckSize}</dd></div><div><dt>Differentiators</dt><dd>{activeDNA.strongestDifferentiators.join("; ")}</dd></div><div><dt>Likely objections</dt><dd>{activeDNA.likelyLPObjections.join("; ")}</dd></div></dl><div className="demo-impact"><span>STRUCTURED FUND DNA JSON</span><pre>{dnaToText(activeDNA)}</pre></div></div><div className="panel dna-card"><h2>Suggested fundraising narrative</h2><p className="narrative">{activeDNA.suggestedFundraisingNarrative}</p><button className="ask-connection" onClick={openChat}><Sparkles />Ask Memory to prioritize LPs</button></div></section>}{fundDNA && <section className="panel fit-list"><div className="panel-head"><div><h2>Best-Fit LPs</h2><p>Ranked by Fund DNA, LP type, thesis overlap, relationship strength, and commitment signal.</p></div></div>{ranked.slice(0, 12).map(({ lp, fit }, i) => <button className="fit-row" key={lp.id} onClick={() => openLP(lp)}><span className="fit-rank">{i + 1}</span><span className="avatar" style={{ background: lp.color }}>{lp.initials}</span><p><b>{lp.name}</b><small>{lp.firm} • {lp.type}</small></p><strong>{fit.score}%</strong><span>{fit.outreachAngle}</span><ChevronRight /></button>)}</section>}</>; }

function StrategyView({ strategy, fundDNA, bestFits, go, openLP, openChat }: { strategy: FundraisingStrategy | null; fundDNA: FundDNA | null; bestFits: { lp: LP; fit: LPFit }[]; go: (s: Screen) => void; openLP: (lp: LP) => void; openChat: () => void }) {
  if (!strategy || !fundDNA) return <><Title eyebrow="FUNDRAISING STRATEGY" title="Create Fund DNA to generate strategy." copy="Upload or paste fund materials first. LP Brain will turn the approved Fund DNA into priorities, narrative guidance, risks, and sequencing." action={<button className="ask" onClick={() => go("Fund DNA")}><BrainCircuit />Create Fund DNA</button>} /><section className="panel strategy-empty"><Sparkles /><h2>No strategy generated yet</h2><p>The Strategy Engine activates automatically after Fund DNA approval.</p></section></>;
  const list = (title: string, items: string[]) => <div className="strategy-card panel"><h3>{title}</h3><ul>{items.map((x) => <li key={x}>{x}</li>)}</ul></div>;
  return <><Title eyebrow="FUNDRAISING STRATEGY" title="Where should the GP spend fundraising time?" copy="AI-generated strategy from approved Fund DNA, LP Fit Scores, relationship memory, commitments, and follow-up state." action={<button className="ask" onClick={openChat}><Sparkles />Ask about strategy</button>} /><section className="strategy-hero panel"><div><span>READINESS SCORE</span><strong>{strategy.readinessScore.score}%</strong><p>{strategy.idealLPProfile}</p></div><div className="strategy-score-grid"><div><b>Helping</b>{strategy.readinessScore.helping.map((x) => <p key={x}>{x}</p>)}</div><div><b>Slowing</b>{strategy.readinessScore.slowing.map((x) => <p key={x}>{x}</p>)}</div><div><b>Improve before more LPs</b>{strategy.readinessScore.improveBeforeMoreLPs.map((x) => <p key={x}>{x}</p>)}</div></div></section><section className="panel fit-list strategy-actions"><div className="panel-head"><div><h2>AI Priorities</h2><p>Today's highest-impact fundraising actions. Every recommendation includes a reason.</p></div></div>{strategy.aiPriorities.map((action) => { const match = bestFits.find((x) => x.lp.id === action.lpId); return <button className="fit-row" key={action.title} onClick={() => match ? openLP(match.lp) : undefined}><span className="fit-rank">{action.urgency === "Today" ? "!" : action.urgency === "Delay" ? "↘" : "→"}</span><span className="avatar" style={{ background: match?.lp.color || "#26324f" }}>{match?.lp.initials || "AI"}</span><p><b>{action.title}</b><small>{action.urgency}</small></p><strong>{match ? `${match.fit.score}%` : "AI"}</strong><span>{action.reason}</span><ChevronRight /></button>; })}</section><section className="strategy-grid">{list("LP types to prioritize", strategy.lpTypesToPrioritize)}{list("LP types to avoid", strategy.lpTypesToAvoid)}{list("Recommended sequence", strategy.recommendedSequence)}{list("Likely objections", strategy.likelyObjections)}{list("Recommended proof points", strategy.recommendedProofPoints)}{list("Suggested outreach strategy", strategy.suggestedOutreachStrategy)}{list("Geographic priorities", strategy.geographicPriorities)}{list("Target check-size distribution", strategy.targetCheckSizeDistribution)}{list("Expected fundraising risks", strategy.expectedFundraisingRisks)}</section><section className="fund-dna-grid"><div className="panel dna-card"><h2>Recommended positioning</h2><p className="narrative">{strategy.recommendedPositioning}</p><div className="demo-impact"><span>STRUCTURED STRATEGY JSON</span><pre>{strategyToText(strategy)}</pre></div></div><div className="panel dna-card"><h2>Narrative Coach</h2><dl className="dna-list"><div><dt>30-second pitch</dt><dd>{strategy.narrativeCoach.pitch30Second}</dd></div><div><dt>Executive summary</dt><dd>{strategy.narrativeCoach.executiveSummary}</dd></div><div><dt>LP-specific talking points</dt><dd>{strategy.narrativeCoach.lpSpecificTalkingPoints.join(" | ")}</dd></div><div><dt>Objection responses</dt><dd>{strategy.narrativeCoach.objectionResponses.join(" | ")}</dd></div></dl></div></section></>;
}

function OpportunitiesView({ fundDNA, strategy, opportunities, outcomes, setOutcome, openChat }: { fundDNA: FundDNA | null; strategy: FundraisingStrategy | null; opportunities: LPOpportunity[]; outcomes: Record<string, OpportunityOutcome>; setOutcome: (id: string, outcome: OpportunityOutcome) => void; openChat: () => void }) {
  if (!fundDNA || !strategy) return <><Title eyebrow="LP OPPORTUNITIES" title="Approve Fund DNA to generate LP opportunities." copy="LP Brain uses approved Fund DNA, strategy, LP fit, and demo relationship memory to recommend sample opportunity targets." action={<button className="ask" onClick={openChat}><Sparkles />Ask what to do next</button>} /><section className="panel strategy-empty"><Sparkles /><h2>No opportunity pipeline yet</h2><p>Use Fund DNA first. Demo opportunities will be generated after approval.</p></section></>;
  const insights = learningInsights(opportunities, outcomes);
  const activeOpps = opportunities.filter((opp) => !["Passed", "Not a fit"].includes(opportunityStatus(opp.id, outcomes).status)); const topActions = (activeOpps.length ? activeOpps : opportunities).slice(0, 3).map((opp) => ({ title: opp.suggestedFirstAction, reason: `${opp.name} has ${opp.estimatedFitScore}% estimated fit and ${opp.relationshipConfidence}% intro confidence.`, impact: opportunityStatus(opp.id, outcomes).status === "Not started" ? "Creates a new qualified LP path" : "Moves an active opportunity forward", execution: opp.recommendedIntroAsk }));
  const updateStatus = (opp: LPOpportunity, status: OpportunityStatus) => setOutcome(opp.id, { status, reason: status === "Passed" || status === "Not a fit" ? opportunityStatus(opp.id, outcomes).reason || "Timing" : "" });
  const updateReason = (opp: LPOpportunity, reason: OpportunityReason) => setOutcome(opp.id, { status: opportunityStatus(opp.id, outcomes).status, reason });
  return <><Title eyebrow="LP OPPORTUNITIES" title="LP Discovery Engine" copy="Demo opportunity pipeline generated from Fund DNA, ideal LP personas, existing LP patterns, and meeting intelligence. This is sample opportunity data unless real LP data is provided." action={<button className="ask" onClick={openChat}><Sparkles />Ask about opportunities</button>} /><section className="panel opportunity-chief"><div className="panel-head"><div><h2>Weekly Action Plan</h2><p>Top fundraising actions with reason, impact, and execution guidance.</p></div></div>{topActions.map((x, i) => <div className="opportunity-action" key={x.title}><span>{i + 1}</span><p><b>{x.title}</b><small>Reason: {x.reason}</small><em>Expected impact: {x.impact}</em><strong>Execution: {x.execution}</strong></p></div>)}</section><section className="panel fit-list opportunity-list"><div className="panel-head"><div><h2>High-Probability LP Opportunities</h2><p>Prioritized sample LP opportunities. Not a complete LP database.</p></div></div>{opportunities.map((opp) => { const outcome = opportunityStatus(opp.id, outcomes); return <div className="opportunity-row" key={opp.id}><div className="opportunity-main"><span className="fit-rank">{opp.estimatedFitScore}</span><p><b>{opp.name}</b><small>{opp.organization} • {opp.type}</small></p><strong>{opp.confidenceScore}% confidence</strong><em>{outcome.status}</em></div><p className="opportunity-copy">{opp.whyRecommended}</p><div className="opportunity-tags">{opp.likelyInterests.map((x) => <span key={x}>{x}</span>)}</div><div className="opportunity-grid"><div><h3>Warm introduction strategy</h3><p>{opp.introPath.join(" → ")}</p><small>Suggested introducer: {opp.suggestedIntroducer} • {opp.relationshipConfidence}% confidence</small><b>{opp.recommendedIntroAsk}</b></div><div><h3>Outreach strategy</h3><p>{opp.suggestedOutreachAngle}</p><small>{opp.outreachPlaybook.linkedIn}</small><b>{opp.outreachPlaybook.meetingAgenda.join(" / ")}</b></div><div><h3>Outcome learning</h3><select value={outcome.status} onChange={(e) => updateStatus(opp, e.target.value as OpportunityStatus)}>{opportunityStatuses.map((x) => <option key={x}>{x}</option>)}</select>{(outcome.status === "Passed" || outcome.status === "Not a fit") && <select value={outcome.reason} onChange={(e) => updateReason(opp, e.target.value as OpportunityReason)}>{opportunityReasons.filter(Boolean).map((x) => <option key={x}>{x}</option>)}</select>}</div></div><details><summary>First outreach email and follow-up sequence</summary><pre>{opp.outreachPlaybook.email}</pre><ul>{opp.outreachPlaybook.followUpSequence.map((x) => <li key={x}>{x}</li>)}</ul></details></div>; })}</section><section className="strategy-grid opportunity-insights"><div className="strategy-card panel"><h3>Most common objections</h3><ul>{insights.objections.map((x) => <li key={x}>{x}</li>)}</ul></div><div className="strategy-card panel"><h3>Highest converting LP types</h3><ul>{insights.highestConvertingTypes.map((x) => <li key={x}>{x}</li>)}</ul></div><div className="strategy-card panel"><h3>Best introduction sources</h3><ul>{insights.bestIntroSources.map((x) => <li key={x}>{x}</li>)}</ul></div><div className="strategy-card panel"><h3>Strongest-fit segments</h3><ul>{insights.strongestSegments.map((x) => <li key={x}>{x}</li>)}</ul></div><div className="strategy-card panel"><h3>Recommended strategy adjustment</h3><ul><li>{insights.adjustment}</li></ul></div></section></>;
}

function PipelineWorkspace({ profiles, query, fitResults, opportunities, outcomes, openLP, go, signals }: { profiles: LP[]; query: string; fitResults: Record<string, LPFit>; opportunities: LPOpportunity[]; outcomes: Record<string, OpportunityOutcome>; openLP: (lp: LP) => void; go: (s: Screen) => void; signals: Record<string, FundraisingSignal> }) {
  const top = rankedFits(profiles, fitResults).slice(0, 3);
  return <><Title eyebrow="LP PIPELINE" title="Prioritize the LPs most likely to move." copy="Pipeline is organized around actionability: fit, relationship signal, commitments, follow-up state, and opportunity status." action={<button className="ask" onClick={() => go("LP Opportunities")}><Sparkles />Open opportunities</button>} /><section className="chief-grid compact">{top.map(({ lp, fit }) => <div className="panel chief-card" key={lp.id}><label>{fit.score}% LP fit • {signals[lp.id]?.label}</label><h2>{lp.name}</h2><p><b>What happened:</b> {lp.activity}</p><p><b>Why it matters:</b> {fit.why}</p><p><b>Signal reason:</b> {signals[lp.id]?.reason}</p><p><b>Do next:</b> {fit.nextBestAction}</p><button onClick={() => openLP(lp)}>Open LP profile <ArrowRight /></button></div>)}</section><Directory profiles={profiles} query={query} fitResults={fitResults} openLP={openLP} />{opportunities.length > 0 && <section className="panel workspace-mini"><div className="panel-head"><div><h2>AI-generated LP Opportunity Pipeline</h2><p>{opportunities.length} sample opportunities ranked from Fund DNA and relationship patterns.</p></div><button onClick={() => go("LP Opportunities")}>Open full engine <ArrowRight /></button></div>{opportunities.slice(0, 4).map((opp) => <div className="briefing-row" key={opp.id}><Sparkles /><p><b>{opp.name}</b><small>{opp.organization} • {opp.estimatedFitScore}% fit • {opportunityStatus(opp.id, outcomes).status}</small></p><span>{opp.type}</span></div>)}</section>}</>;
}

function MeetingsWorkspace({ profiles, tasks, feed, openUpload, toggle }: { profiles: LP[]; tasks: Task[]; feed: Feed[]; openUpload: () => void; toggle: (id: string) => void }) {
  return <><Title eyebrow="MEETINGS" title="Capture conversations and turn them into follow-through." copy="Meeting Intelligence creates LP profiles, activity, graph context, and follow-up tasks from uploaded notes." action={<button className="ask" onClick={openUpload}><Plus />Upload meeting note</button>} /><section className="workspace-columns"><div className="panel action-stack"><div className="panel-head"><div><h2>Meetings requiring preparation</h2><p>High-intent LPs where objection handling matters.</p></div></div>{profiles.filter((lp) => lp.status === "Hot").slice(0, 5).map((lp) => <div className="prep-card static" key={lp.id}><Clock3 /><div><b>{lp.name}</b><small>{lp.firm} • {lp.last}</small><p><strong>Prepare:</strong> {lp.concern}</p><p><strong>Next:</strong> {lp.next}</p></div></div>)}</div><div className="panel action-stack"><div className="panel-head"><div><h2>Recent meeting intelligence</h2><p>Every event is tied to source memory.</p></div></div>{feed.map((a, i) => <div className="signal-row ai-signal" key={`${a.title}-${i}`}><span><Zap /></span><div><b>{a.title}</b><p>{a.meta}</p><small>{a.tag}</small></div></div>)}</div></section><Followups profiles={profiles} tasks={tasks} toggle={toggle} /></>;
}

function KnowledgeWorkspace({ profiles, latestUploadId, fundDNA, strategy, bestFits, fitResults, opportunities, outcomes, outcomeIntel, discovery, saveDNA, setOutcome, openLP, openChat, go }: { profiles: LP[]; latestUploadId: string | null; fundDNA: FundDNA | null; strategy: FundraisingStrategy | null; bestFits: { lp: LP; fit: LPFit }[]; fitResults: Record<string, LPFit>; opportunities: LPOpportunity[]; outcomes: Record<string, OpportunityOutcome>; outcomeIntel: FundraisingOutcomeIntelligence; discovery: ReturnType<typeof discoverInvestors>; saveDNA: (dna: FundDNA) => void; setOutcome: (id: string, outcome: OpportunityOutcome) => void; openLP: (lp: LP) => void; openChat: () => void; go: (s: Screen) => void }) {
  return <><Title eyebrow="KNOWLEDGE" title="Fund DNA, LP matching, relationship strategy, and learning in one place." copy="This section keeps the AI-native discovery engines focused on identifying, accessing, and converting the right LPs." action={<button className="ask" onClick={openChat}><Sparkles />Ask LP Brain</button>} /><section className="ai-engines panel knowledge-engines"><div className="engine-grid"><details open={!fundDNA}><summary><BrainCircuit />Fund DNA + LP Fit <span>{fundDNA ? "Approved" : "Create now"}</span></summary><FundDNAView profiles={profiles} fundDNA={fundDNA} fitResults={fitResults} saveDNA={saveDNA} openLP={openLP} openChat={openChat} /></details><details open={!!strategy}><summary><Target />Fundraising Strategy + Narrative Coach <span>{strategy ? `${strategy.readinessScore.score}/100` : "Pending"}</span></summary><StrategyView strategy={strategy} fundDNA={fundDNA} bestFits={bestFits} go={go} openLP={openLP} openChat={openChat} /></details><details open><summary><Zap />Learning Engine <span>{outcomeIntel.metrics.trackedInteractions} signals</span></summary><OutcomeInsights intel={outcomeIntel} openChat={openChat} /></details><details><summary><Sparkles />LP Opportunities + Outreach Playbook <span>{opportunities.length || "Pending"}</span></summary><OpportunitiesView fundDNA={fundDNA} strategy={strategy} opportunities={opportunities} outcomes={outcomes} setOutcome={setOutcome} openChat={openChat} /></details><details><summary><Network />Relationship Intelligence Graph <span>Live</span></summary><Graph profiles={profiles} latestUploadId={latestUploadId} openChat={openChat} /></details></div></section></>;
}

function DiscoveryWorkspace({ fundDNA, strategy, discovery, providerStatus, providers, openChat, go }: { fundDNA: FundDNA | null; strategy: FundraisingStrategy | null; discovery: ReturnType<typeof discoverInvestors>; providerStatus: ProviderRegistryItem[]; providers: InvestorProvider[]; openChat: () => void; go: (s: Screen) => void }) {
  const top = discovery.opportunities.slice(0, 10);
  return <><Title eyebrow="AI LP DISCOVERY NETWORK" title="Discover the highest-fit new LPs." copy="LP Brain uses Fund DNA, fundraising strategy, existing relationships, outcomes, thesis, geography, stage, check size, and sector to rank new investor opportunities. Demo data is used unless connected integrations provide real sources." action={<button className="ask" onClick={openChat}><Sparkles />Ask discovery</button>} />
    {!fundDNA && <section className="panel discovery-empty"><BrainCircuit /><div><h2>Discovery is using demo Fund DNA.</h2><p>Approve Fund DNA to make discovery specific to the GP's actual thesis, sectors, geography, stage, and target check size.</p></div><button onClick={() => go("Knowledge")}>Create Fund DNA <ArrowRight /></button></section>}
    <section className="panel provider-layer"><div className="panel-head"><div><h2>Live Intelligence Provider Layer</h2><p>Provider interface: searchInvestors(), lookupInvestor(), searchOrganizations(), searchNews(), searchWarmIntroductions(). Future adapters cannot fabricate data without credentials.</p></div><span>{providers.filter((provider) => provider.status === "Connected" || provider.status === "Demo Active").length} active</span></div><div className="provider-grid">{providerStatus.map((provider) => <article key={provider.key}><b>{provider.name}</b><em className={provider.status.toLowerCase().replace(/\s+/g, "-")}>{provider.status}</em><p>{provider.description}</p><small>{provider.label}</small></article>)}</div></section>
    <section className="panel discovery-insights"><div className="panel-head"><div><h2>Discovery Insights</h2><p>LP Brain no longer relies only on imported LPs. It proactively searches active providers for new investor fit.</p></div><span>{discovery.insights.totalMatches} matches</span></div><div className="provider-disclosure"><b>Provider disclosure:</b> {discovery.insights.providerSummary}</div><div className="discovery-insight-grid"><Metric label="LPs matched" value={discovery.insights.totalMatches} detail="From Fund DNA" /><Metric label="Family offices" value={discovery.insights.strongFamilyOfficeFits} detail="Strong fits" /><Metric label="AI manager investors" value={discovery.insights.emergingAIManagerInvestors} detail="Prior signal" /><Metric label="Warm intro needed" value={discovery.insights.requiresWarmIntro} detail="Intro-led" /></div><div className="strategy-change"><label>Strongest discovery signal</label><h3>{discovery.insights.strongestSegment}</h3><p>{discovery.insights.thesisSignal}</p><p><b>Strategy context:</b> {strategy?.recommendedPositioning || "Create Fund DNA and strategy to sharpen discovery reasoning."}</p></div></section>
    <section className="panel discovery-queue"><div className="panel-head"><div><h2>Discovery Queue: Top 10 LPs to pursue this week</h2><p>Each recommendation explains priority, expected impact, confidence, reason, next action, and the provider that supplied the data.</p></div><span>Ranked by AI fit</span></div>{top.map((opp) => <article key={opp.id}><div className="discovery-rank"><b>#{opp.rank}</b><span>{opp.priority}</span></div><div><h3>{opp.lpName}</h3><p>{opp.organization} • {opp.investorType} • expected check {opp.expectedCheckSize}</p><em className="provider-pill">{opp.providerName} • {opp.providerLabel}</em><small><b>Provider evidence:</b> {opp.providerEvidence}</small><small><b>Reason:</b> {opp.whyMatches}</small><small><b>Why it ranks here:</b> {opp.whyRanksAbove}</small><small><b>Evidence:</b> {opp.evidence.join(" • ")}</small><small><b>Warm intro:</b> {opp.warmIntroPossibilities.join(" → ")}</small><small><b>Likely objections:</b> {opp.likelyObjections.join(", ")}</small><small><b>Suggested first outreach:</b> {opp.suggestedFirstOutreach}</small></div><aside><strong>{opp.confidenceScore}%</strong><em>confidence</em><p>{opp.expectedImpact}</p><span>{opp.recommendedTiming}</span><button onClick={openChat}>Ask why <ArrowRight /></button></aside></article>)}</section>
  </>;
}

function IntegrationsWorkspace({ integrations, providerStatus, syncIntegration, feed, openUpload, openOnboarding, openChat }: { integrations: IntegrationState; providerStatus: ProviderRegistryItem[]; syncIntegration: (key: IntegrationKey) => void; feed: Feed[]; openUpload: () => void; openOnboarding: () => void; openChat: () => void }) {
  const summary = summarizeIntegrations(integrations);
  return <><Title eyebrow="INTEGRATIONS" title="Connect relationship and engagement sources." copy="Demo integrations show how email, calendar, transcripts, deck engagement, CSV imports, and webhooks can improve LP discovery and relationship intelligence. Live OAuth is intentionally not enabled in this milestone." action={<button className="ask" onClick={openChat}><Sparkles />Ask about integrations</button>} /><section className="integration-hero panel"><div><span>LP DISCOVERY DATA SOURCES</span><h2>{summary.connected}/{summary.total} demo connectors connected</h2><p>{summary.imported} imported records and engagement signals are flowing into LP matching, relationship intelligence, discovery, and learning recommendations.</p></div><div><Metric label="Connected" value={summary.connected} detail="Demo connectors" /><Metric label="Syncing" value={summary.syncing} detail="Active now" /><Metric label="Imported" value={summary.imported} detail="Records/signals" /></div></section><section className="integration-grid">{integrationCatalog.map((connector) => { const state = integrations[connector.key]; const Icon = connector.icon; return <article className="panel integration-card" key={connector.key}><div className="integration-top"><span><Icon /></span><p><b>{connector.name}</b><small>{connector.purpose}</small></p><em className={state.status.toLowerCase().replace(/\s+/g, "-")}>{state.status}</em></div><dl><div><dt>Last synced</dt><dd>{state.lastSynced}</dd></div><div><dt>Imported</dt><dd>{state.imported} demo records/signals</dd></div></dl><div className="integration-capabilities"><b>Supports</b>{connector.capabilities.map((capability) => <small key={capability}><Check />{capability}</small>)}</div><div className="integration-downstream"><b>Improves LP Brain</b><p>{connector.downstream.join(" → ")}</p></div><p className="auth-note">{connector.authNote}</p><button onClick={() => syncIntegration(connector.key)} disabled={state.status === "Syncing"}><RefreshCw />{state.status === "Syncing" ? "Syncing..." : state.status === "Needs authentication" ? "Run demo sync" : "Sync now"}</button></article>; })}</section><section className="panel provider-layer integration-providers"><div className="panel-head"><div><h2>Investor Data Providers</h2><p>Provider adapters are explicit about source status. Proprietary services do not return data unless connected with credentials.</p></div></div><div className="provider-grid">{providerStatus.map((provider) => <article key={provider.key}><b>{provider.name}</b><em className={provider.status.toLowerCase().replace(/\s+/g, "-")}>{provider.status}</em><p>{provider.description}</p><small>{provider.label}</small></article>)}</div></section><section className="workspace-columns integration-bottom"><div className="panel action-stack"><div className="panel-head"><div><h2>API/Webhook contract</h2><p>A simple event layer for future sources to update LP Brain.</p></div></div><div className="demo-impact api-contract"><span>POST /api/integrations</span><pre>{JSON.stringify({ source: "gmail | calendar | zoom | docsend | csv | api", eventType: "lp.email.detected", lpName: "Elena Park", organization: "Demo Ventures", summary: "Requested references and data room access.", nextAction: "Send secure data room link", confidence: 0.88 }, null, 2)}</pre></div></div><div className="panel action-stack"><div className="panel-head"><div><h2>Recent integration activity</h2><p>Demo syncs write to the same relationship intelligence feed used by LP matching.</p></div></div>{feed.slice(0, 6).map((item, i) => <div className="signal-row ai-signal" key={`${item.title}-${i}`}><span><Zap /></span><div><b>{item.title}</b><p>{item.meta}</p><small>{item.tag}</small></div></div>)}</div></section><section className="chief-grid compact integration-actions"><div className="panel chief-card"><label>CSV Import</label><h2>Seed LP Brain from spreadsheets</h2><p><b>Do next:</b> Use onboarding to upload fund materials and an LP spreadsheet.</p><button onClick={openOnboarding}>Open onboarding <ArrowRight /></button></div><div className="panel chief-card"><label>Meeting Intelligence</label><h2>Add a transcript manually</h2><p><b>Do next:</b> Until live Zoom/Meet auth exists, paste a transcript into Meeting Intelligence.</p><button onClick={openUpload}>Upload meeting note <ArrowRight /></button></div><div className="panel chief-card"><label>Ask LP Brain</label><h2>Query relationship signals</h2><p><b>Ask:</b> Which integrations are connected? What did Gmail import? How does DocSend change priority?</p><button onClick={openChat}>Ask LP Brain <ArrowRight /></button></div></section></>;
}

function SettingsWorkspace({ reset, openChat, openUpload, openOnboarding, openIntegrations, openManual, workspaceMode }: { reset: () => void; openChat: () => void; openUpload: () => void; openOnboarding: () => void; openIntegrations: () => void; openManual: () => void; workspaceMode: WorkspaceMode }) {
  return <><Title eyebrow="SETTINGS" title="Workspace controls" copy="Switch between the demo environment and a real imported fund workspace without removing discovery, matching, and relationship intelligence workflows." /><section className="chief-grid compact"><div className="panel chief-card"><label>Real fund onboarding</label><h2>Create My Fund Workspace</h2><p><b>What happens:</b> Import fund materials and LP exports so LP Brain creates Fund DNA, LP personas, matching intelligence, opportunities, and strategy.</p><button onClick={openOnboarding}>Open onboarding <ArrowRight /></button></div><div className="panel chief-card"><label>Manual Provider</label><h2>Create or edit LP profiles</h2><p><b>What happens:</b> Manually added LPs become Manual Workspace Data and are searchable by the provider layer.</p><button onClick={openManual}>Add LP manually <ArrowRight /></button></div><div className="panel chief-card"><label>Integrations</label><h2>Connect relationship sources</h2><p><b>What happens:</b> Demo connectors show Gmail, Calendar, transcripts, DocSend, CSV, and API events improving LP discovery signals.</p><button onClick={openIntegrations}>Open integrations <ArrowRight /></button></div><div className="panel chief-card"><label>Current workspace</label><h2>{workspaceMode}</h2><p><b>What happens:</b> Reset restores the original demo memory, Fund DNA, personas, strategy, and opportunities.</p><button onClick={reset}>Reset demo <ArrowRight /></button></div><div className="panel chief-card"><label>Meeting Intelligence</label><h2>Upload a meeting note</h2><p><b>Why it matters:</b> This is the fastest way to show relationship intelligence updating LP priority and next actions.</p><button onClick={openUpload}>Open upload <ArrowRight /></button></div><div className="panel chief-card"><label>Ask LP Brain</label><h2>Talk to the LP matchmaker</h2><p><b>Do next:</b> Ask who to fundraise from, who to avoid, what path to use, or draft outreach.</p><button onClick={openChat}>Ask LP Brain <ArrowRight /></button></div></section></>;
}

function Directory({ profiles, query, fitResults, openLP }: { profiles: LP[]; query: string; fitResults: Record<string, LPFit>; openLP: (lp: LP) => void }) { const [type, setType] = useState("All"); const rows = profiles.filter((x) => (type === "All" || x.type === type) && (`${x.name} ${x.firm} ${x.interest}`).toLowerCase().includes(query.toLowerCase())); return <><Title eyebrow="LIVE RELATIONSHIP DATA" title={`${profiles.length} LP profiles`} copy="Every row is backed by introductions, meetings, interests, concerns, next actions, and LP Fit when Fund DNA exists." /><div className="directory-tools panel"><div><span>Investor type</span>{["All", ...investorTypes].map((x) => <button className={type === x ? "on" : ""} onClick={() => setType(x)} key={x}>{x}</button>)}</div></div><section className="directory panel"><div className="table-head"><span>Investor</span><span>Relationship</span><span>Interests</span><span>Last contact</span><span>Next action</span><span /></div>{rows.map((lp) => { const fit = fitResults[lp.id]; return <button className="table-row" key={lp.id} onClick={() => openLP(lp)}><div><span className="avatar" style={{ background: lp.color }}>{lp.initials}</span><p><b>{lp.name}</b><small>{lp.firm} • {lp.type}</small></p></div><div><Status value={lp.status} /><small>{fit ? `${fit.score}% LP fit` : `${lp.strength}% strength`}</small></div><span>{lp.interest}</span><span>{lp.last}</span><p><b>{fit?.nextBestAction || lp.next}</b><small>{fit?.likelyObjection || lp.due}</small></p><ChevronRight /></button>; })}</section></>; }
function Followups({ profiles, tasks, toggle }: { profiles: LP[]; tasks: Task[]; toggle: (id: string) => void }) { const open = tasks.filter((x) => !x.done), overdue = open.filter((x) => x.due === "Overdue").length; return <><Title eyebrow="RELATIONSHIP FOLLOW-UP" title={`${open.length} LP relationship actions`} copy={`${overdue} overdue. Completing an action updates LP priority and relationship intelligence immediately.`} /><section className="follow-summary"><Metric label="Open" value={open.length} detail="All active actions" /><Metric label="Overdue" value={overdue} detail="Needs attention" tone={overdue ? "risk" : "good"} /><Metric label="Completed" value={tasks.filter((x) => x.done).length} detail="This demo session" tone="good" /></section><section className="panel follow-list"><div className="follow-label">PRIORITY QUEUE</div>{tasks.map((task) => { const lp = profiles.find((x) => x.id === task.lpId); if (!lp) return null; return <div className={`follow-row ${task.done ? "done" : ""}`} key={task.id}><button aria-label={`${task.done ? "Reopen" : "Complete"} ${task.title}`} onClick={() => toggle(task.id)}><Check /></button><span className="avatar" style={{ background: lp.color }}>{lp.initials}</span><p><b>{task.title}</b><small>{lp.name} • {lp.firm}</small></p><span className={task.due === "Overdue" ? "overdue" : ""}>{task.due}</span><em>{lp.status} • {lp.strength}%</em></div>; })}</section></>; }
function Graph({ profiles, latestUploadId, openChat }: { profiles: LP[]; latestUploadId: string | null; openChat: () => void }) { const lp = (latestUploadId && profiles.find((x) => x.id === latestUploadId)) || profiles[0]; const labels = [lp.name, lp.source, lp.event, lp.meetings[0].title, lp.next], kinds = ["LP", "Introducer", "Event", "Meeting", "Follow-up"], pos = [[50, 42], [20, 20], [18, 73], [77, 20], [80, 72]]; const [selected, setSelected] = useState(0); return <><Title eyebrow="RELATIONSHIP GRAPH" title={latestUploadId ? `${lp.name} is now connected.` : "From introduction to next action."} copy="This graph is generated from the same approved meeting memory used everywhere else." /><section className="graph-layout"><div className="graph-canvas panel"><div className="graph-tools"><strong>{lp.name} relationship path</strong><span>{profiles.length} LPs • live memory graph</span></div><div className="network"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="50" y1="42" x2="20" y2="20" /><line x1="20" y1="20" x2="18" y2="73" /><line x1="18" y1="73" x2="77" y2="20" /><line x1="77" y1="20" x2="80" y2="72" /></svg>{labels.map((label, i) => <button key={`${label}-${i}`} onClick={() => setSelected(i)} className={`node ${kinds[i].toLowerCase()} ${selected === i ? "selected" : ""}`} style={{ left: `${pos[i][0]}%`, top: `${pos[i][1]}%` }}><i>{i === 0 ? lp.initials : kinds[i][0]}</i><span>{label}</span><small>{kinds[i]}</small></button>)}</div></div><aside className="graph-detail panel"><span className="detail-kind">{kinds[selected]}</span><h2>{labels[selected]}</h2><div className="connection-list"><h3>MEMORY PATH</h3><div><Users /><p><b>Source: {lp.source}</b><small>{lp.event}</small></p></div><div><BrainCircuit /><p><b>{lp.meetings[0].title}</b><small>{lp.meetings[0].note}</small></p></div><div><Check /><p><b>{lp.next}</b><small>Due {lp.due}</small></p></div></div><button className="ask-connection" onClick={openChat}><Sparkles />Ask about {lp.name.split(" ")[0]}</button></aside></section></>; }

function FeedbackModal({ close }: { close: () => void }) {
  const questions = [
    "What saved you the most time?",
    "What felt confusing?",
    "What recommendation was useful?",
    "What data was missing?",
    "Would you use this weekly to help close your fund?",
  ];
  return <div className="backdrop"><div className="upload feedback-modal"><div className="modal-head"><div><span>USER TESTING FEEDBACK</span><h2>Help improve LP Brain</h2><small>Five quick questions for the user testing session.</small></div><button aria-label="Close feedback" onClick={close}><X /></button></div><section className="feedback-questions">{questions.map((question, i) => <label key={question}><span>{i + 1}. {question}</span><textarea placeholder="Type notes here..." /></label>)}</section><div className="modal-actions"><button onClick={close}>Close</button><button className="primary" onClick={close}><Check />Done</button></div></div></div>;
}

function ManualLPModal({ lp, close, save }: { lp: LP | null; close: () => void; save: (lp: LP) => void }) {
  const [name, setName] = useState(lp?.name || "");
  const [firm, setFirm] = useState(lp?.firm || "");
  const [type, setType] = useState<LPType>(lp?.type || "Family Office");
  const [interest, setInterest] = useState(lp?.interest || "");
  const [concern, setConcern] = useState(lp?.concern || "");
  const [source, setSource] = useState(lp?.source || "Manual Provider");
  const [next, setNext] = useState(lp?.next || "Qualify LP fit and confirm allocation window");
  const [check, setCheck] = useState(lp?.commitmentAmount ? money(lp.commitmentAmount) : "");
  const ready = Boolean(name.trim() && firm.trim());
  const inputStyle = { width: "100%", border: "1px solid #e0e2e3", borderRadius: 8, padding: "8px 10px", fontSize: 11 } as const;
  const field = (label: string, node: React.ReactNode) => <label style={{ display: "grid", gap: 5, fontSize: 9, color: "#7f8794" }}><span>{label}</span>{node}</label>;
  const submit = () => {
    const amount = parseAmount(check);
    const id = lp?.id || `manual-lp-${Date.now()}`;
    const nextLP: LP = {
      id,
      initials: initials(name),
      color: lp?.color || "#4f5f82",
      name,
      firm,
      type,
      status: lp?.status || "Warm",
      strength: lp?.strength || 72,
      interest,
      interests: textToList(interest),
      last: lp?.last || "Today",
      next,
      due: lp?.due || "This week",
      source,
      event: "Manual Provider",
      concern: concern || "Needs qualification",
      commitment: amount ? `${money(amount)} expected check size` : lp?.commitment || "No commitment yet",
      commitmentAmount: amount,
      activity: lp?.activity || "Manually created LP profile",
      meetings: lp?.meetings || [{ date: "Today", title: "Manual profile created", note: "Created through Manual Provider." }],
    };
    save(nextLP);
  };
  return <div className="backdrop"><div className="upload manual-lp-modal"><div className="modal-head"><div><span>MANUAL PROVIDER</span><h2>{lp ? "Edit LP profile" : "Create LP profile"}</h2><small>Manual records are labeled Manual Workspace Data and are searchable by the provider layer.</small></div><button aria-label="Close manual LP editor" onClick={close}><X /></button></div><section className="manual-provider-form"><div className="provider-disclosure"><b>Provider:</b> Manual Provider <span>Manual Workspace Data</span></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{field("LP name", <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />)}{field("Organization", <input style={inputStyle} value={firm} onChange={(e) => setFirm(e.target.value)} />)}{field("Investor type", <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as LPType)}>{investorTypes.map((x) => <option key={x}>{x}</option>)}</select>)}{field("Expected check size", <input style={inputStyle} value={check} onChange={(e) => setCheck(e.target.value)} placeholder="$250K" />)}</div>{field("Investment interests", <textarea style={inputStyle} value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Applied AI, Vertical SaaS..." />)}{field("Concerns", <textarea style={inputStyle} value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="Attribution clarity, timing..." />)}{field("Introduction source", <input style={inputStyle} value={source} onChange={(e) => setSource(e.target.value)} />)}{field("Next action", <input style={inputStyle} value={next} onChange={(e) => setNext(e.target.value)} />)}</section><div className="modal-actions"><button onClick={close}>Cancel</button><button className="primary" disabled={!ready} onClick={submit}><Check />Save Manual Provider record</button></div></div></div>;
}

function FundOnboarding({ close, save }: { close: () => void; save: (summary: OnboardingSummary) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [materials, setMaterials] = useState("");
  const [crm, setCrm] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<OnboardingSummary | null>(null);
  const ready = Boolean(files.length || materials.trim() || crm.trim());
  const selectFiles = (list: FileList | null) => setFiles(Array.from(list || []).map((file) => file.name));
  const generate = (sample = false) => {
    setBusy(true);
    const nextMaterials = sample ? sampleOnboardingMaterials : materials;
    const nextCrm = sample ? sampleExistingLPCsv : crm;
    const nextFiles = sample ? ["Fund_Deck.pdf", "GP_Bio.pdf", "Existing_LP_Export.csv"] : files;
    setMaterials(nextMaterials);
    setCrm(nextCrm);
    setFiles(nextFiles);
    setTimeout(() => {
      setSummary(generateOnboardingSummary(nextMaterials, nextCrm, nextFiles));
      setBusy(false);
    }, 350);
  };
  return <div className="backdrop"><div className="upload onboarding-modal"><div className="modal-head"><div><span>{summary ? "LP DISCOVERY SUMMARY" : "UPLOAD FUND MATERIALS"}</span><h2>{summary ? "Review Fund DNA and matching intelligence" : "Import fund materials"}</h2><small>{summary ? "Approve the AI-generated LP discovery workspace before saving." : "Upload your fund deck, GP bio, investment thesis, and optional LP spreadsheet."}</small></div><button aria-label="Close onboarding" onClick={close}><X /></button></div>{!summary ? <section className="onboarding-flow"><div className="onboarding-steps"><span className="on">1 Upload materials</span><span>2 Generate Fund DNA</span><span>3 Create LP personas</span><span>4 Build strategy</span><span>5 Save workspace</span></div><button type="button" className="drop phase-drop" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectFiles(e.dataTransfer.files); }}><input ref={input} hidden multiple type="file" accept=".pdf,.ppt,.pptx,.txt,.md,.csv,.xlsx,.xls" onChange={(e) => selectFiles(e.target.files)} /><UploadCloud /><b>Upload fund deck, GP bio, investment thesis, LP spreadsheet, CSV, or XLSX</b><p>OR</p><span>Browse Files</span><small>Accepted: PDF, PPTX, TXT, Markdown, CSV, XLSX</small></button>{files.length > 0 && <div className="onboarding-files">{files.map((file) => <p key={file}><FileText />{file}</p>)}</div>}<textarea className="phase-note-input" value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="Paste fund deck text, GP bio, investment thesis, portfolio notes, target fund size, geography, sector focus, and stage focus..." /><textarea className="phase-note-input crm-input" value={crm} onChange={(e) => setCrm(e.target.value)} placeholder="Paste optional existing LP spreadsheet or relationship export CSV here. Columns can include Name, Firm, Type, Stage, Interest, Concern, Next Action, Check Size, Last Contact, Intro Source..." /><button className="sample-upload" onClick={() => generate(true)}><Sparkles />Use sample LP discovery package</button></section> : <section className="onboarding-review"><div className="onboarding-steps"><span>1 Upload materials</span><span>2 Generate Fund DNA</span><span>3 Create LP personas</span><span className="on">4 Review strategy</span><span>5 Save workspace</span></div><div className="onboarding-summary-grid"><Metric label="LPs imported" value={summary.importedLPs} detail="Existing LP profiles" /><Metric label="Meetings detected" value={summary.meetingsDetected} detail="From LP/activity rows" /><Metric label="Opportunities generated" value={summary.opportunitiesGenerated} detail="Recommended LP targets" /></div><div className="fund-dna-grid onboarding-result"><div className="panel dna-card"><h2>{summary.fundDNA.fundName}</h2><p>{summary.fundDNA.targetFundSize} - {summary.fundDNA.stage} - {summary.fundDNA.geography}</p><div className="tags">{summary.fundDNA.sectorFocus.map((x) => <span key={x}>{x}</span>)}</div><dl className="dna-list"><div><dt>Investment thesis summary</dt><dd>{summary.fundDNA.suggestedFundraisingNarrative}</dd></div><div><dt>Ideal LP profile</dt><dd>{summary.fundDNA.idealLPTypes.join(", ")} writing {summary.fundDNA.targetLPCheckSize} checks.</dd></div><div><dt>Suggested fundraising narrative</dt><dd>{summary.fundDNA.suggestedFundraisingNarrative}</dd></div><div><dt>Existing relationship stages</dt><dd>{summary.profiles.map((lp) => `${lp.name}: ${lp.status}`).slice(0, 5).join(" | ")}</dd></div></dl></div><div className="panel dna-card"><h2>Generated LP discovery work</h2><dl className="dna-list"><div><dt>LP Fit Scores</dt><dd>Generated for all imported LPs after saving.</dd></div><div><dt>LP Opportunities</dt><dd>{summary.opportunitiesGenerated} opportunity recommendations will be available from LP Discovery.</dd></div><div><dt>Warm introductions</dt><dd>Suggested from intro source and imported relationship context.</dd></div><div><dt>Weekly action plan</dt><dd>Priority LP categories, relationship paths, and next actions update after save.</dd></div></dl></div></div><div className="workspace-columns onboarding-lists"><div className="panel action-stack"><div className="panel-head"><div><h2>Missing information</h2><p>LP Brain can start now, but these fields would improve LP matching.</p></div></div>{(summary.missingInformation.length ? summary.missingInformation : ["No critical missing fields detected"]).map((x) => <div className="briefing-row" key={x}><FileText /><p><b>{x}</b><small>Can be added later in Knowledge or meeting notes.</small></p></div>)}</div><div className="panel action-stack"><div className="panel-head"><div><h2>Recommended next actions</h2><p>The first weekly action plan for this fund.</p></div></div>{summary.recommendedActions.map((x) => <div className="briefing-row" key={x}><Check /><p><b>{x}</b><small>Generated from imported fund and LP context.</small></p></div>)}</div></div><div className="demo-impact"><span>CLEAN WORKSPACE JSON</span><pre>{JSON.stringify({ fundDNA: summary.fundDNA, importedLPs: summary.importedLPs, meetingsDetected: summary.meetingsDetected, opportunitiesGenerated: summary.opportunitiesGenerated, missingInformation: summary.missingInformation, recommendedActions: summary.recommendedActions }, null, 2)}</pre></div></section>}<div className="modal-actions"><button onClick={close}>Cancel</button>{!summary ? <button className="primary" disabled={busy || !ready} onClick={() => generate(false)}><Sparkles />{busy ? "Creating intelligence..." : "Create LP discovery summary"}</button> : <button className="primary" onClick={() => save(summary)}>Save as My Fund Workspace <ArrowRight /></button>}</div></div></div>;
}

function Upload({ close, approve }: { close: () => void; approve: (extraction: Extraction, rawText: string) => void }) { const input = useRef<HTMLInputElement>(null); const [file, setFile] = useState<File | null>(null); const [note, setNote] = useState(""); const [rawText, setRawText] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [extraction, setExtraction] = useState<Extraction | null>(null); const ready = Boolean(note.trim() || file); const setField = <K extends keyof Extraction>(key: K, value: Extraction[K]) => setExtraction((x) => x ? { ...x, [key]: value } : x); const extract = async (demo = false) => { setBusy(true); setError(""); if (demo) { setNote(sampleMeetingNote); setRawText(sampleMeetingNote); setExtraction(sampleExtraction); setBusy(false); return; } const form = new FormData(); if (file) form.append("file", file); form.append("note", note); try { const res = await fetch("/api/upload", { method: "POST", body: form }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Extraction failed"); setExtraction(data.extraction); setRawText(data.rawText || note); } catch (e) { setError(e instanceof Error ? e.message : "Extraction failed"); } finally { setBusy(false); } }; return <div className="backdrop"><div className="upload"><div className="modal-head"><div><span>{extraction ? "REVIEW EXTRACTION" : "AI MEETING EXTRACTION"}</span><h2>{extraction ? "Review before saving" : "Upload or paste meeting note"}</h2><small>{extraction ? "Approve or edit the structured JSON fields." : "Upload a note file or paste a transcript, then extract structured fundraising memory."}</small></div><button aria-label="Close upload" onClick={close}><X /></button></div>{!extraction ? <section className="phase-upload-panel"><button type="button" className="drop phase-drop" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0] || null); }}><input ref={input} hidden type="file" accept=".txt,.md,.markdown,.pdf,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} /><UploadCloud /><b>Drag & drop PDF, DOCX or TXT here</b><p>OR</p><span>Browse Files</span><small>Accepted: PDF • DOCX • TXT • Markdown</small></button><textarea className="phase-note-input" value={note} onChange={(e) => { setNote(e.target.value); setError(""); }} placeholder="Paste meeting notes here..." />{file && <div className="phase-file-ready"><span><FileText /></span><p><small>Selected file:</small><b>{file.name}</b></p><em><Check />Ready for AI extraction</em><button aria-label="Remove selected file" onClick={() => setFile(null)}><X /></button></div>}<button className="sample-upload" onClick={() => extract(true)}><Sparkles />Use sample Nora Ellis meeting note</button>{error && <p className="phase-upload-error">{error}</p>}</section> : <ReviewExtraction extraction={extraction} setField={setField} />}<div className="modal-actions"><button onClick={close}>Cancel</button>{!extraction ? <button className="primary" disabled={busy || !ready} onClick={() => extract(false)}><Sparkles />{busy ? "Extracting..." : "Extract with AI"}</button> : <button className="primary" onClick={() => approve(extraction, rawText || note || sampleMeetingNote)}>Approve and update LP Brain <ArrowRight /></button>}</div></div></div>; }
function ReviewExtraction({ extraction, setField }: { extraction: Extraction; setField: <K extends keyof Extraction>(key: K, value: Extraction[K]) => void }) { const inputStyle = { width: "100%", border: "1px solid #e0e2e3", borderRadius: 8, padding: "8px 10px", fontSize: 11 } as const; const field = (label: string, node: React.ReactNode) => <label style={{ display: "grid", gap: 5, fontSize: 9, color: "#7f8794" }}><span>{label}</span>{node}</label>; return <div style={{ padding: 22, display: "grid", gap: 12, maxHeight: "58vh", overflow: "auto" }}><div className="demo-impact"><span>CLEAN JSON</span><pre style={{ whiteSpace: "pre-wrap", fontSize: 10, margin: 0 }}>{extractionToText(extraction)}</pre></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{field("LP name", <input style={inputStyle} value={extraction.lpName} onChange={(e) => setField("lpName", e.target.value)} />)}{field("Firm / organization", <input style={inputStyle} value={extraction.firm} onChange={(e) => setField("firm", e.target.value)} />)}{field("Investor type", <select style={inputStyle} value={extraction.investorType} onChange={(e) => setField("investorType", e.target.value as LPType)}>{investorTypes.map((x) => <option key={x}>{x}</option>)}</select>)}{field("Meeting date", <input style={inputStyle} value={extraction.meetingDate} onChange={(e) => setField("meetingDate", e.target.value)} />)}{field("Check size", <input style={inputStyle} value={extraction.checkSize} onChange={(e) => setField("checkSize", e.target.value)} />)}{field("Follow-up due date", <input style={inputStyle} value={extraction.followUpDueDate} onChange={(e) => setField("followUpDueDate", e.target.value)} />)}{field("Sentiment", <select style={inputStyle} value={extraction.sentiment} onChange={(e) => setField("sentiment", e.target.value as Extraction["sentiment"])}>{["Positive", "Neutral", "Negative"].map((x) => <option key={x}>{x}</option>)}</select>)}{field("Confidence score", <input style={inputStyle} type="number" min="0" max="1" step="0.01" value={extraction.confidenceScore} onChange={(e) => setField("confidenceScore", Number(e.target.value))} />)}</div>{field("Interest areas", <textarea style={inputStyle} value={extraction.interestAreas.join("\n")} onChange={(e) => setField("interestAreas", textToList(e.target.value))} />)}{field("Questions asked", <textarea style={inputStyle} value={extraction.questionsAsked.join("\n")} onChange={(e) => setField("questionsAsked", textToList(e.target.value))} />)}{field("Concerns raised", <textarea style={inputStyle} value={extraction.concernsRaised.join("\n")} onChange={(e) => setField("concernsRaised", textToList(e.target.value))} />)}{field("Documents requested", <textarea style={inputStyle} value={extraction.documentsRequested.join("\n")} onChange={(e) => setField("documentsRequested", textToList(e.target.value))} />)}{field("Commitment signals", <textarea style={inputStyle} value={extraction.commitmentSignals} onChange={(e) => setField("commitmentSignals", e.target.value)} />)}{field("Next action", <input style={inputStyle} value={extraction.nextAction} onChange={(e) => setField("nextAction", e.target.value)} />)}{field("Summary", <textarea style={inputStyle} value={extraction.summary} onChange={(e) => setField("summary", e.target.value)} />)}</div>; }
function Profile({ lp, fit, signal, timeline, artifacts, close, openChat, edit }: { lp: LP; fit?: LPFit; signal?: FundraisingSignal; timeline: TimelineEvent[]; artifacts: ReturnType<typeof autonomousArtifacts>; close: () => void; openChat: () => void; edit: () => void }) {
  return <div className="drawer-bg" onClick={close}><aside className="profile wide" onClick={(e) => e.stopPropagation()}><header><span>LP PROFILE • RELATIONSHIP INTELLIGENCE</span><button aria-label="Close profile" onClick={close}><X /></button></header><section className="profile-hero"><span className="avatar big" style={{ background: lp.color }}>{lp.initials}</span><h2>{lp.name}</h2><p>{lp.firm} • {lp.type}</p><Status value={lp.status} /><div className="strength"><i><em style={{ width: `${fit?.score || lp.strength}%` }} /></i><span>{fit ? `${fit.score}% LP fit` : `${lp.strength}% relationship strength`}</span></div></section><div className="profile-stats"><p><small>Potential commitment</small><b>{lp.commitmentAmount ? money(lp.commitmentAmount) : "—"}</b></p><p><small>Last contact</small><b>{lp.last}</b></p></div>{lp.event === "Manual Provider" && <section className="profile-section provider-disclosure"><b>Manual Provider</b><span>Manual Workspace Data</span><p>This LP profile was created or edited manually and is available to provider search.</p></section>}{signal && <section className="profile-section autonomous-profile"><h3>Fundraising signal</h3><div className="signal-pill"><b>{signal.label}</b><span>{signal.confidence}% confidence</span></div><p>{signal.reason}</p></section>}<section className="profile-section autonomous-profile"><h3>Relationship intelligence outputs</h3><dl><div><dt>Meeting summary</dt><dd>{artifacts.summary}</dd></div><div><dt>Follow-up email draft</dt><dd><pre>{artifacts.email}</pre></dd></div><div><dt>Relationship notes</dt><dd>{artifacts.crm}</dd></div><div><dt>Next meeting recommendation</dt><dd>{artifacts.nextMeeting}</dd></div><div><dt>Objections detected</dt><dd>{artifacts.objections.join(" | ")}</dd></div><div><dt>Commitment signals</dt><dd>{artifacts.commitmentSignals.join(" | ")}</dd></div><div><dt>Suggested documents</dt><dd>{artifacts.documents.join(", ")}</dd></div></dl></section>{fit && <section className="profile-section"><h3>LP Fit Intelligence</h3><dl><div><dt>Why this LP fits</dt><dd>{fit.why}</dd></div><div><dt>Likely objection</dt><dd>{fit.likelyObjection}</dd></div><div><dt>Outreach angle</dt><dd>{fit.outreachAngle}</dd></div><div><dt>Next best action</dt><dd>{fit.nextBestAction}</dd></div></dl></section>}<section className="profile-section"><h3>Relationship intelligence</h3><dl><div><dt>Introduced by</dt><dd>{lp.source}<small>{lp.event}</small></dd></div><div><dt>Investment interests</dt><dd>{lp.interest}</dd></div><div><dt>Key concern</dt><dd>{lp.concern}</dd></div><div><dt>Next best action</dt><dd>{lp.next}<small>{lp.due}</small></dd></div></dl></section><section className="profile-section ai-event-timeline"><h3>AI Event Timeline</h3>{timeline.map((event, i) => <div key={`${event.kind}-${event.title}-${i}`}><i>{i + 1}</i><p><b>{event.kind}: {event.title}</b><small>{event.date}</small><span>{event.detail}</span></p></div>)}</section><section className="profile-section meeting-history"><h3>Meeting history</h3>{lp.meetings.map((m) => <div key={`${m.date}-${m.title}`}><i /><p><b>{m.title}</b><small>{m.date}</small><span>{m.note}</span></p></div>)}</section><button className="profile-ask" onClick={edit}><FileText />Edit manually</button><button className="profile-ask" onClick={openChat}><Sparkles />Ask LP Brain about {lp.name.split(" ")[0]}</button></aside></div>;
}

function trimMarkdownLine(line: string) {
  let start = 0;
  let end = line.length;
  while (start < end && line[start] === " ") start += 1;
  while (end > start && line[end - 1] === " ") end -= 1;
  return line.slice(start, end);
}

function orderedListText(line: string) {
  let index = 0;
  while (index < line.length && line[index] >= "0" && line[index] <= "9") index += 1;
  if (index === 0 || line[index] !== "." || line[index + 1] !== " ") return null;
  return line.slice(index + 2);
}

function MarkdownInline({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  while (cursor < text.length) {
    const start = text.indexOf("**", cursor);
    if (start === -1) {
      nodes.push(text.slice(cursor));
      break;
    }
    const end = text.indexOf("**", start + 2);
    if (end === -1) {
      nodes.push(text.slice(cursor));
      break;
    }
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(<strong key={key}>{text.slice(start + 2, end)}</strong>);
    key += 1;
    cursor = end + 2;
  }
  return <>{nodes}</>;
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.replaceAll("\r\n", "\n").trim().split("\n");
  const blocks: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const value = paragraph.join(" ").trim();
    if (value) blocks.push(<p key={`p-${blocks.length}`}><MarkdownInline text={value} /></p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!listType || !listItems.length) return;
    const Tag = listType;
    blocks.push(<Tag key={`list-${blocks.length}`}>{listItems.map((item, index) => <li key={index}><MarkdownInline text={item} /></li>)}</Tag>);
    listType = null;
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = trimMarkdownLine(line);
    const ordered = orderedListText(trimmed);
    const bullet = (trimmed[0] === "-" || trimmed[0] === "*") && trimmed[1] === " " ? trimmed.slice(2) : null;
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    if (bullet !== null || ordered !== null) {
      flushParagraph();
      const nextType = bullet !== null ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push(trimMarkdownLine(bullet ?? ordered ?? ""));
      return;
    }
    flushList();
    paragraph.push(trimmed);
  });
  flushParagraph();
  flushList();

  return <div className="markdown-answer">{blocks.length ? blocks : <p><MarkdownInline text={text} /></p>}</div>;
}

function Chat({ profiles, tasks, fundDNA, strategy, opportunities, outcomes, fitResults, outcomeIntel, integrations, discovery, providers, close }: { profiles: LP[]; tasks: Task[]; fundDNA: FundDNA | null; strategy: FundraisingStrategy | null; opportunities: LPOpportunity[]; outcomes: Record<string, OpportunityOutcome>; fitResults: Record<string, LPFit>; outcomeIntel: FundraisingOutcomeIntelligence; integrations: IntegrationState; discovery: ReturnType<typeof discoverInvestors>; providers: InvestorProvider[]; close: () => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string; source?: string }[]>([]);
  const prompts = ["Who should I fundraise from?", "Which LP categories have the highest probability?", "Which LP categories should I avoid?", "Which LPs need a warm introduction?", "What is my most efficient fundraising path?", "Draft outreach for the top LP opportunity.", "What are we learning from passed LPs?", "Which LP type is converting best?", "What should the GP do this week?", "Why are LPs not converting?", "Which introduction source performs best?", "What should change in the strategy this month?", "Discover the top new LPs this week", "Why does Sofia Almeida rank highly?", "Which investor providers are connected?"];
  const context = {
    currentDate: new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    currentDateIso: new Date().toISOString(),
    fundDNA,
    lpProfiles: profiles.map((lp) => ({ id: lp.id, name: lp.name, firm: lp.firm, type: lp.type, status: lp.status, strength: lp.strength, interest: lp.interest, interests: lp.interests, lastContact: lp.last, nextAction: lp.next, due: lp.due, introductionSource: lp.source, event: lp.event, concern: lp.concern, commitment: lp.commitment, commitmentAmount: lp.commitmentAmount, recentActivity: lp.activity, meetings: lp.meetings })),
    followUpTasks: tasks,
    relationshipIntelligence: {
      fitResults,
      discovery,
      providers: providers.map((provider) => ({ key: provider.key, name: provider.name, status: provider.status, label: provider.label })),
      integrations,
    },
    strategy,
    opportunities: opportunities.map((opp) => ({ ...opp, outcome: outcomes[opp.id] })),
    outcomeIntelligence: outcomeIntel,
  };
  async function ask(text: string) {
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);
    setQ("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, mode: "live", context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ask LP Brain failed.");
      setMessages((m) => [...m, { role: "ai", text: data.answer || "Ask LP Brain did not return an answer.", source: "OpenAI + live workspace context" }]);
    } catch (error) {
      setMessages((m) => [...m, { role: "ai", text: error instanceof Error ? error.message : "Ask LP Brain could not reach the AI provider.", source: "AI provider error" }]);
    } finally {
      setBusy(false);
    }
  }
  return <aside className="chat"><div className="chat-head"><span><Sparkles /></span><p><b>LP matchmaker and strategist</b><small>• Grounded in {profiles.length} LP profiles{fundDNA ? " + Fund DNA" : ""}{strategy ? " + Strategy" : ""}{opportunities.length ? " + Opportunities" : ""}</small></p><button aria-label="Close chat" onClick={close}><X /></button></div><div className="chat-body">{messages.length ? <div className="messages">{messages.map((m, i) => <div className={`message-row ${m.role === "user" ? "user-row" : "assistant-row"}`} key={i}><div className={`message-bubble ${m.role === "user" ? "user-bubble" : "assistant-bubble"}`}>{m.role === "ai" ? <MarkdownContent text={m.text} /> : <span>{m.text}</span>}{m.role === "ai" && <small><FileText />Source: {m.source || "OpenAI + live workspace context"}</small>}</div></div>)}</div> : <><div className="chat-intro"><BrainCircuit /><h2>Ask who to target, avoid, access, and convert.</h2><p>Answers use Fund DNA, LP personas, fit scores, fundraising strategy, LP opportunities, discovery signals, relationship intelligence, and learning data.</p></div><div className="suggestions">{prompts.map((x) => <button key={x} onClick={() => ask(x)} disabled={busy}>{x}<ArrowRight /></button>)}</div></>}</div><form onSubmit={(e) => { e.preventDefault(); if (q.trim() && !busy) ask(q); }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={busy ? "Asking LP Brain..." : "Ask who to target, avoid, access, or convert..."} /><button aria-label="Send question" disabled={busy}><Send /></button></form></aside>;
}










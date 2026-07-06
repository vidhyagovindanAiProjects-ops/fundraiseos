"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, BrainCircuit, Check, ChevronRight, Clock3, FileText, Home, LayoutList, Menu, Network, Plus, Search, Send, Settings, Sparkles, Target, UploadCloud, Users, X, Zap } from "lucide-react";
import { activities as seedActivity, demoLPs, type Heat, type LP, type LPType } from "@/lib/demo-data";

type Screen = "Home" | "LP Pipeline" | "Meetings" | "Knowledge" | "Settings" | "Fund DNA" | "Fundraising Strategy" | "LP Opportunities" | "LP Directory" | "Follow-ups" | "Relationship Graph";
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

Existing CRM export:
${sampleExistingLPCsv}`;

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
  const fitResults = useMemo(() => computeFits(profiles, fundDNA), [profiles, fundDNA]);
  const bestFits = useMemo(() => rankedFits(profiles, fitResults), [profiles, fitResults]);
  const strategy = useMemo(() => fundDNA ? generateFundraisingStrategy(fundDNA, profiles, tasks, fitResults) : null, [fundDNA, profiles, tasks, fitResults]);
  const opportunities = useMemo(() => fundDNA && strategy ? generateLPOpportunities(fundDNA, strategy, profiles, fitResults, opportunityOutcomes) : [], [fundDNA, strategy, profiles, fitResults, opportunityOutcomes]);
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
  const reset = () => { setWorkspaceMode("Demo Workspace"); setProfiles(demoLPs); setTasks(initialTasks); setFeed(initialFeed); setLatestUploadId(null); setFundDNA(null); setOpportunityOutcomes({}); setSelected(null); setChat(false); setUpload(false); setOnboarding(false); setQuery(""); setScreen("Home"); notify("Demo reset to starting state"); };
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
  const saveOnboarding = (summary: OnboardingSummary) => {
    setMyWorkspace(summary);
    setWorkspaceMode("My Fund Workspace");
    setProfiles(summary.profiles);
    setTasks(summary.tasks);
    setFeed(summary.feed);
    setFundDNA(summary.fundDNA);
    setLatestUploadId(summary.profiles[0]?.id || null);
    setOpportunityOutcomes({});
    setOnboarding(false);
    setScreen("Home");
    notify("My Fund Workspace created from imported fundraising materials");
  };

  const approveExtraction = (extraction: Extraction, rawText: string) => {
    const lp = lpFromExtraction(extraction, rawText, profiles);
    setProfiles((current) => current.some((x) => sameLP(x, lp)) ? current.map((x) => sameLP(x, lp) ? { ...x, ...lp, id: x.id } : x) : [lp, ...current]);
    setTasks((current) => [{ id: `task-${lp.id}`, lpId: lp.id, title: lp.next, due: lp.due, done: false }, ...current.filter((x) => x.lpId !== lp.id)]);
    setFeed((current) => [{ title: `${lp.name} meeting extracted`, meta: `${lp.firm} - ${lp.last}`, tag: "Autonomous Engine updated profile, timeline, tasks, forecast, and next action" }, { title: `${lp.name} follow-up draft generated`, meta: lp.next, tag: "Ready for GP review" }, ...current.filter((x) => !x.title.includes(lp.name))]);
    setLatestUploadId(lp.id);
    setUpload(false);
    setSelected(lp);
    notify("Autonomous Engine updated every downstream workspace");
  };

  const saveDNA = (dna: FundDNA) => {
    setFundDNA(dna);
    setFeed((current) => [{ title: `${dna.fundName} Fund DNA created`, meta: `${dna.targetFundSize} - ${dna.stage} - ${dna.geography}`, tag: "Fundraising Strategy generated" }, ...current]);
    notify("Fund DNA approved. Strategy, LP Fit Scores, and priorities generated");
  };

  const nav: [Screen, typeof Home][] = [["Home", Home], ["LP Pipeline", Users], ["Meetings", LayoutList], ["Knowledge", BrainCircuit], ["Settings", Settings]];
  const readiness = strategy?.readinessScore.score || metrics.score;
  const activeNav = (label: Screen) => screen === label || (label === "Home" && ["Fund DNA", "Fundraising Strategy", "LP Opportunities", "Relationship Graph"].includes(screen));
  return <div className="shell demo-shell story-shell ai-shell"><aside className={`sidebar ${menu ? "open" : ""}`}><div className="brand"><b>LP</b><span>LP <em>Brain</em></span></div><button className="close-menu" aria-label="Close menu" onClick={() => setMenu(false)}><X /></button><div className="demo-badge"><i />AI CHIEF OF STAFF</div><p className="nav-title">Workspace</p><div className="workspace-switch"><button className={workspaceMode === "Demo Workspace" ? "on" : ""} onClick={() => switchWorkspace("Demo Workspace")}>Demo Workspace</button><button className={workspaceMode === "My Fund Workspace" ? "on" : ""} onClick={() => myWorkspace ? switchWorkspace("My Fund Workspace") : setOnboarding(true)}>My Fund Workspace</button></div><nav>{nav.map(([label, Icon]) => <button key={label} className={activeNav(label) ? "active" : ""} onClick={() => go(label)}><Icon /><span>{label}</span>{label === "LP Pipeline" && <i>{metrics.total}</i>}{label === "Meetings" && <i>{metrics.open}</i>}{label === "Home" && <i>{readiness}</i>}</button>)}</nav><button className="health executive-health" onClick={() => go("Home")}><div><Target /><span>Fundraising Readiness</span><b>{readiness}/100</b></div><figure><i style={{ width: `${readiness}%` }} /></figure><p>{autonomous[0]?.why || (strategy ? strategy.aiPriorities[0]?.reason : metrics.overdue ? `${metrics.overdue} overdue follow-up reducing score.` : "Strong LP alignment and healthy meeting cadence.")}</p><span>Recommended action: {autonomous[0]?.action || strategy?.aiPriorities[0]?.title || "Complete the Elena Park follow-up today."}</span></button><div className="story-user"><span>LP</span><p><b>LP Brain</b><small>{workspaceMode}</small></p></div></aside>{menu && <div className="scrim" onClick={() => setMenu(false)} />}<main><header><button className="hamb" aria-label="Open menu" onClick={() => setMenu(true)}><Menu /></button><div className="search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => go("LP Pipeline")} placeholder="Search LPs, firms, interests..." /></div><div className="head-actions"><span className="live-state"><i />{workspaceMode}</span><button className="reset-demo" onClick={() => setOnboarding(true)}>Onboard fund</button><button className="reset-demo" onClick={() => setFeedback(true)}>Feedback</button><button className="reset-demo" onClick={reset}>Reset demo</button><button className="primary" onClick={() => setUpload(true)}><Plus /><span>Upload meeting note</span></button></div></header><div className="page demo-page ai-page">{screen === "Home" && <DashboardView profiles={profiles} tasks={tasks} feed={feed} metrics={metrics} latestUploadId={latestUploadId} fundDNA={fundDNA} strategy={strategy} bestFits={bestFits} go={go} openLP={setSelected} openChat={() => setChat(true)} openUpload={() => setUpload(true)} openOnboarding={() => setOnboarding(true)} workspaceMode={workspaceMode} onboardingSummary={myWorkspace} signals={signals} forecast={forecast} autonomous={autonomous} fitResults={fitResults} />} {screen === "LP Pipeline" && <PipelineWorkspace profiles={profiles} query={query} fitResults={fitResults} opportunities={opportunities} outcomes={opportunityOutcomes} openLP={setSelected} go={go} signals={signals} />} {screen === "Meetings" && <MeetingsWorkspace profiles={profiles} tasks={tasks} feed={feed} openUpload={() => setUpload(true)} toggle={(id) => setTasks((t) => t.map((x) => x.id === id ? { ...x, done: !x.done } : x))} />} {screen === "Knowledge" && <KnowledgeWorkspace profiles={profiles} latestUploadId={latestUploadId} fundDNA={fundDNA} strategy={strategy} bestFits={bestFits} fitResults={fitResults} opportunities={opportunities} outcomes={opportunityOutcomes} saveDNA={saveDNA} setOutcome={(id, outcome) => setOpportunityOutcomes((current) => ({ ...current, [id]: outcome }))} openLP={setSelected} openChat={() => setChat(true)} go={go} />} {screen === "Settings" && <SettingsWorkspace reset={reset} openChat={() => setChat(true)} openUpload={() => setUpload(true)} openOnboarding={() => setOnboarding(true)} workspaceMode={workspaceMode} />} {screen === "Fund DNA" && <FundDNAView profiles={profiles} fundDNA={fundDNA} fitResults={fitResults} saveDNA={saveDNA} openLP={setSelected} openChat={() => setChat(true)} />} {screen === "Fundraising Strategy" && <StrategyView strategy={strategy} fundDNA={fundDNA} bestFits={bestFits} go={go} openLP={setSelected} openChat={() => setChat(true)} />} {screen === "LP Opportunities" && <OpportunitiesView fundDNA={fundDNA} strategy={strategy} opportunities={opportunities} outcomes={opportunityOutcomes} setOutcome={(id, outcome) => setOpportunityOutcomes((current) => ({ ...current, [id]: outcome }))} openChat={() => setChat(true)} />} {screen === "LP Directory" && <Directory profiles={profiles} query={query} fitResults={fitResults} openLP={setSelected} />} {screen === "Follow-ups" && <Followups profiles={profiles} tasks={tasks} toggle={(id) => setTasks((t) => t.map((x) => x.id === id ? { ...x, done: !x.done } : x))} />} {screen === "Relationship Graph" && <Graph profiles={profiles} latestUploadId={latestUploadId} openChat={() => setChat(true)} />}</div></main><button className="float-feedback" onClick={() => setFeedback(true)}>Feedback</button><button className="float-chat always" onClick={() => setChat(true)}><Sparkles />Ask memory</button>{upload && <Upload close={() => setUpload(false)} approve={approveExtraction} />} {onboarding && <FundOnboarding close={() => setOnboarding(false)} save={saveOnboarding} />} {feedback && <FeedbackModal close={() => setFeedback(false)} />} {selected && <Profile lp={selected} fit={fitResults[selected.id]} signal={signals[selected.id]} timeline={timelineForLP(selected, tasks, fitResults[selected.id])} artifacts={autonomousArtifacts(selected, fitResults[selected.id], fundDNA)} close={() => setSelected(null)} openChat={() => { setSelected(null); setChat(true); }} />} {chat && <Chat profiles={profiles} tasks={tasks} fundDNA={fundDNA} strategy={strategy} opportunities={opportunities} outcomes={opportunityOutcomes} fitResults={fitResults} close={() => setChat(false)} />} {toast && <div className="toast"><Check />{toast}</div>}</div>;
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
      source: sourceRaw || "Imported CRM",
      event: "Fund onboarding import",
      concern: concernRaw || "Needs qualification",
      commitment: amount ? `${money(amount)} indicated check size` : "No commitment yet",
      commitmentAmount: amount,
      activity: stageRaw ? `Imported pipeline stage: ${stageRaw}` : "Imported from onboarding",
      meetings: [{ date: displayDate(lastRaw || "2026-06-26"), title: "Imported CRM activity", note: `${name} imported during fund onboarding. Stage: ${stageRaw || "Needs qualification"}. Interest: ${interest}.` }],
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
    imported.some((lp) => lp.source === "Imported CRM") ? "Warm introducer names for some LPs" : "",
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
  events.push({ kind: "Next action", title: fit?.nextBestAction || lp.next, detail: "Recommended by the Autonomous Fundraising Engine.", date: task?.due || lp.due });
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
    uploaded ? { title: `Process ${uploaded.name}'s meeting automatically`, why: `${uploaded.name}'s note created a profile update, timeline events, follow-up task, and commitment signal.`, impact: "Keeps the GP from manually updating CRM notes, tasks, and strategy.", confidence: 96, action: `${uploaded.next.toLowerCase().startsWith("send ") ? uploaded.next : `Send ${uploaded.next.toLowerCase()}`} and schedule the recommended follow-up.`, lpId: uploaded.id } : null,
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

function lpLine(lp: LP, i?: number) { const prefix = i ? `${i}. ` : ""; const commitment = lp.commitmentAmount ? `${money(lp.commitmentAmount)} verbal indication` : "No verbal commitment yet"; return `${prefix}${lp.name} - ${lp.firm}. ${lp.status} relationship, ${lp.strength}% strength. ${commitment}. Next: ${lp.next} (${lp.due}).`; }
function findAskedLP(profiles: LP[], low: string) { return profiles.find((lp) => low.includes(lp.name.toLowerCase()) || low.includes(lp.name.split(" ")[0].toLowerCase()) || low.includes(lp.firm.toLowerCase())); }
function findAskedOpportunity(opportunities: LPOpportunity[], low: string) { return opportunities.find((opp) => low.includes(opp.name.toLowerCase()) || low.includes(opp.name.split(" ")[0].toLowerCase()) || low.includes(opp.organization.toLowerCase())); }
function answerOpportunityQuestion(low: string, opportunities: LPOpportunity[], outcomes: Record<string, OpportunityOutcome>) {
  if (!opportunities.length) return "";
  const active = opportunities.filter((opp) => !["Passed", "Not a fit"].includes(opportunityStatus(opp.id, outcomes).status)); const pool = active.length ? active : opportunities; const top = pool[0], asked = findAskedOpportunity(opportunities, low) || top, insights = learningInsights(opportunities, outcomes);
  if (low.includes("contact next") || low.includes("what should") || low.includes("do today")) return `The GP should contact next:\n${pool.slice(0, 3).map((opp, i) => `${i + 1}. ${opp.name} - ${opp.organization}. ${opp.estimatedFitScore}% estimated fit. Action: ${opp.suggestedFirstAction}. Reason: ${opp.whyRecommended}`).join("\n")}`;
  if (low.includes("highest fit") || low.includes("opportunities have the highest") || low.includes("opportunity pipeline")) return `Highest-fit LP opportunities:\n${opportunities.slice(0, 6).map((opp, i) => `${i + 1}. ${opp.name} - ${opp.organization}: ${opp.estimatedFitScore}% fit, ${opp.confidenceScore}% confidence. ${opp.suggestedOutreachAngle}`).join("\n")}`;
  if (low.includes("warm introduction") || low.includes("warm intro") || low.includes("intro")) return `LP opportunities needing warm introductions:\n${opportunities.slice(0, 5).map((opp, i) => `${i + 1}. ${opp.name}: ${opp.introPath.join(" → ")}. Ask: ${opp.recommendedIntroAsk}`).join("\n")}`;
  if (low.includes("draft") || low.includes("outreach")) return `Draft outreach for ${asked.name}:\n${asked.outreachPlaybook.email}\n\nLinkedIn: ${asked.outreachPlaybook.linkedIn}\n\nFollow-up sequence:\n${asked.outreachPlaybook.followUpSequence.map((x) => `- ${x}`).join("\n")}`;
  if (low.includes("passed") || low.includes("learning") || low.includes("learn")) return `Learning from passed / not-fit opportunities:\nMost common objections: ${insights.objections.join(", ")}.\nRecommended adjustment: ${insights.adjustment}`;
  if (low.includes("converting") || low.includes("conversion") || low.includes("lp type")) return `Best converting LP types:\n${insights.highestConvertingTypes.map((x) => `- ${x}`).join("\n")}\nStrongest segments:\n${insights.strongestSegments.map((x) => `- ${x}`).join("\n")}`;
  return "";
}
function lpSummary(lp: LP, fit?: LPFit) { const fitBlock = fit ? `\nLP Fit Score: ${fit.score}%\nWhy this LP fits: ${fit.why}\nLikely objection: ${fit.likelyObjection}\nRecommended outreach angle: ${fit.outreachAngle}` : ""; return `LP: ${lp.name}\nFirm: ${lp.firm}\nInvestor type: ${lp.type}\nRelationship strength: ${lp.strength}%\nCommitment: ${lp.commitmentAmount ? `${money(lp.commitmentAmount)} verbal indication` : lp.commitment}\nLast meeting: ${lp.last}\nCurrent status: ${lp.activity}\nInterests: ${lp.interest}\nConcern: ${lp.concern}\nIntroduction source: ${lp.source} via ${lp.event}\nNext recommended action: ${fit?.nextBestAction || lp.next}${fitBlock}`; }
function draftOutreach(lp: LP, fit?: LPFit, dna?: FundDNA | null) { return `Subject: ${dna?.fundName || "Emerging Venture Fund"} - ${lp.interest}\n\nHi ${lp.name.split(" ")[0]},\n\nGiven your interest in ${lp.interest}, I thought ${dna?.fundName || "the fund"} may be especially relevant. We are building a focused seed fund focused on ${dna?.sectorFocus.slice(0, 3).join(", ") || "applied AI and B2B software"}, with a concentrated strategy designed for meaningful early ownership.\n\nThe reason I think this could fit ${lp.firm}: ${fit?.why || "your existing relationship signals and investment interests map closely to the fund thesis."}\n\nI would suggest we address ${fit?.likelyObjection || lp.concern} directly and share the most relevant proof points first.\n\nWould it be useful to send the concise fund memo and schedule 20 minutes next week?\n\nBest,\nThe GP`; }
function answerMemoryQuestion(question: string, profiles: LP[], tasks: Task[], fundDNA: FundDNA | null, strategy: FundraisingStrategy | null, opportunities: LPOpportunity[], outcomes: Record<string, OpportunityOutcome>, fits: Record<string, LPFit>) { const low = question.toLowerCase(); const lp = findAskedLP(profiles, low); const ranked = rankedFits(profiles, fits); const oppAnswer = answerOpportunityQuestion(low, opportunities, outcomes); if (oppAnswer) return oppAnswer; if ((low.includes("draft") || low.includes("email") || low.includes("outreach")) && lp) return draftOutreach(lp, fits[lp.id], fundDNA); if (lp) return lpSummary(lp, fits[lp.id]); if (low.includes("strategy") || low.includes("sequence") || low.includes("where should") || low.includes("spend fundraising time")) { if (!strategy) return "Create and approve Fund DNA first. Then LP Brain will generate a fundraising strategy report automatically."; return `Fundraising Strategy:\nIdeal LP profile: ${strategy.idealLPProfile}\n\nRecommended sequence:\n${strategy.recommendedSequence.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\nPositioning: ${strategy.recommendedPositioning}`; } if (low.includes("readiness") || low.includes("score") || low.includes("helping") || low.includes("slowing")) { if (!strategy) return "No readiness score yet. Approve Fund DNA to generate it."; return `Fundraising Readiness Score: ${strategy.readinessScore.score}%\n\nHelping:\n${strategy.readinessScore.helping.map((x) => `- ${x}`).join("\n")}\n\nSlowing:\n${strategy.readinessScore.slowing.map((x) => `- ${x}`).join("\n")}\n\nImprove before meeting more LPs:\n${strategy.readinessScore.improveBeforeMoreLPs.map((x) => `- ${x}`).join("\n")}`; } if (low.includes("pitch") || low.includes("narrative") || low.includes("talking point") || low.includes("executive summary")) { if (!strategy) return "No Narrative Coach yet. Approve Fund DNA to generate it."; return `Narrative Coach:\n30-second pitch: ${strategy.narrativeCoach.pitch30Second}\n\nExecutive summary: ${strategy.narrativeCoach.executiveSummary}\n\nLP-specific talking points:\n${strategy.narrativeCoach.lpSpecificTalkingPoints.map((x) => `- ${x}`).join("\n")}`; } if (low.includes("best fit") || low.includes("best-fit") || low.includes("fit for this fund")) { if (!fundDNA) return "Fund DNA has not been created yet. Open Fund DNA, paste fund materials, then create the fit engine."; return `Best-fit LPs for ${fundDNA.fundName}:\n${ranked.slice(0, 8).map(({ lp, fit }, i) => `${i + 1}. ${lp.name} - ${lp.firm}: ${fit.score}% fit. ${fit.outreachAngle}`).join("\n")}`; } if (low.includes("the gp") || low.includes("prioritize") || low.includes("today")) { if (strategy) return `Today's highest-impact fundraising actions:\n${strategy.aiPriorities.map((x, i) => `${i + 1}. ${x.title}. Reason: ${x.reason}`).join("\n")}`; const priority = ranked.length ? ranked.slice(0, 5) : tasks.filter((t) => !t.done).map((task) => ({ task, lp: profiles.find((p) => p.id === task.lpId) })).filter((x): x is { task: Task; lp: LP } => !!x.lp).sort((a, b) => b.lp.strength - a.lp.strength).slice(0, 5).map(({ lp }) => ({ lp, fit: fits[lp.id] })); return `The GP should prioritize:\n${priority.map(({ lp, fit }, i) => `${i + 1}. ${lp.name} - ${lp.firm}. ${fit ? `${fit.score}% LP fit` : `${lp.strength}% relationship strength`}. Next: ${fit?.nextBestAction || lp.next}.`).join("\n")}`; } if (low.includes("objection") || low.includes("prepare")) { if (strategy) return `Objections to prepare for:\n${strategy.likelyObjections.map((x, i) => `${i + 1}. ${x}. Response: ${strategy.narrativeCoach.objectionResponses[i] || "Use a relevant proof point before sending the full deck."}`).join("\n")}`; const source = ranked.length ? ranked.slice(0, 6) : profiles.slice(0, 6).map((lp) => ({ lp, fit: fits[lp.id] })); return `Objections to prepare for:\n${source.map(({ lp, fit }, i) => `${i + 1}. ${lp.name}: ${fit?.likelyObjection || lp.concern}.`).join("\n")}`; } if (low.includes("follow") || low.includes("this week") || low.includes("due") || low.includes("overdue")) { const due = tasks.filter((t) => !t.done).map((task) => ({ task, lp: profiles.find((p) => p.id === task.lpId) })).filter((x): x is { task: Task; lp: LP } => !!x.lp).sort((a, b) => (a.task.due === "Overdue" ? -1 : b.task.due === "Overdue" ? 1 : b.lp.strength - a.lp.strength)).slice(0, 6); return `LPs needing follow-up this week:\n${due.map((x, i) => `${i + 1}. ${x.lp.name} - ${x.task.title}. Due: ${x.task.due}. Reason: ${x.lp.status} relationship at ${x.lp.strength}% strength; ${x.lp.activity.toLowerCase()}.`).join("\n")}`; } if (low.includes("verbal") || low.includes("commitment") || low.includes("indication")) { const committed = profiles.filter((p) => p.commitmentAmount > 0).sort((a, b) => b.commitmentAmount - a.commitmentAmount).slice(0, 8); return `LPs with verbal commitments or indications:\n${committed.map((p, i) => `${i + 1}. ${p.name} - ${p.firm}: ${money(p.commitmentAmount)}; ${p.commitment}. Next: ${p.next}.`).join("\n")}`; } if (low.includes("strongest") || low.includes("strength") || low.includes("rank")) { const strongest = [...profiles].sort((a, b) => b.strength - a.strength).slice(0, 8); return `Strongest relationships:\n${strongest.map((p, i) => lpLine(p, i + 1)).join("\n")}`; } if (low.includes("fund dna") || low.includes("fund thesis")) return fundDNA ? `Fund DNA:\n${dnaToText(fundDNA)}` : "No Fund DNA yet. Open Fund DNA and use the sample memo or paste fund materials."; return `I found ${profiles.length} LP profiles${fundDNA ? ` and a Fund DNA profile for ${fundDNA.fundName}` : ""}${strategy ? " plus a generated Fundraising Strategy" : ""}. Ask about best-fit LPs, strategy, readiness, narrative, who The GP should prioritize, objections, outreach emails, follow-ups, commitments, or relationship strength.`; }

function Title({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) { return <section className="page-title"><div><label>{eyebrow}</label><h1>{title}</h1><p>{copy}</p></div>{action}</section>; }
function Status({ value }: { value: Heat }) { return <span className={`status ${value.toLowerCase()}`}><i />{value}</span>; }
function Metric({ label, value, detail, tone = "" }: { label: string; value: string | number; detail: string; tone?: string }) { return <div className="stat"><div><span className={tone}><Target /></span><em className={tone}>{detail}</em></div><p>{label}</p><h2>{value}</h2></div>; }

function DashboardView({ profiles, tasks, feed, metrics, latestUploadId, fundDNA, strategy, bestFits, go, openLP, openChat, openUpload, openOnboarding, workspaceMode, onboardingSummary, signals, forecast, autonomous, fitResults }: { profiles: LP[]; tasks: Task[]; feed: Feed[]; metrics: { total: number; active: number; warm: number; commitments: number; pipeline: number; open: number; overdue: number; score: number }; latestUploadId: string | null; fundDNA: FundDNA | null; strategy: FundraisingStrategy | null; bestFits: { lp: LP; fit: LPFit }[]; go: (s: Screen) => void; openLP: (lp: LP) => void; openChat: () => void; openUpload: () => void; openOnboarding: () => void; workspaceMode: WorkspaceMode; onboardingSummary: OnboardingSummary | null; signals: Record<string, FundraisingSignal>; forecast: ReturnType<typeof fundraisingForecast>; autonomous: AutonomousRecommendation[]; fitResults: Record<string, LPFit> }) {
  const focus = fundDNA ? bestFits.slice(0, 4) : [...profiles].sort((a, b) => b.strength - a.strength).slice(0, 4).map((lp) => ({ lp, fit: undefined as LPFit | undefined }));
  const uploaded = latestUploadId ? profiles.find((x) => x.id === latestUploadId) : null;
  const openTasks = tasks.filter((x) => !x.done);
  const overdue = openTasks.filter((x) => x.due === "Overdue");
  const prepMeetings = profiles.filter((x) => x.status === "Hot" || x.due === "This week").slice(0, 3);
  const readiness = strategy?.readinessScore.score || metrics.score;
  const topAction = strategy?.aiPriorities[0];
  const recommendedAction = autonomous[0]?.title || topAction?.title || uploaded?.next || openTasks[0]?.title || "Review top LP conversations";
  const recommendedReason = autonomous[0]?.why || topAction?.reason || (uploaded ? `${uploaded.name}'s meeting note was just added to memory and created a follow-up.` : metrics.overdue ? `${metrics.overdue} overdue follow-up is reducing fundraising momentum.` : "Strong LP alignment and meeting cadence create a window to push warm conversations forward.");
  return <>
    <section className="ai-hero panel">
      <div>
        <span>AI CHIEF OF STAFF</span>
        <h1>Good morning. Here is where fundraising time should go.</h1>
        <p>LP Brain reads the fund thesis, LP memory, meeting notes, follow-ups, strategy, opportunities, and graph context to recommend the next best actions.</p>
        <p className="onboarding-note">Upload your fund deck and LP spreadsheet to create your AI fundraising workspace.</p>
      </div>
      <div className="ai-hero-actions">
        <button className="ask" onClick={openOnboarding}><UploadCloud />Onboard fund</button>
        <button className="ask" onClick={openChat}><Sparkles />Ask Memory</button>
        <button className="primary" onClick={openUpload}><Plus /><span>Upload meeting note</span></button>
      </div>
    </section>

    {workspaceMode === "My Fund Workspace" && onboardingSummary && <section className="panel onboarding-live-summary">
      <div className="panel-head"><div><h2>My Fund Workspace is live</h2><p>Imported fund materials now drive Fund DNA, LP Fit, opportunities, priorities, and forecast.</p></div><span>Saved workspace</span></div>
      <div className="onboarding-summary-grid">
        <Metric label="LPs imported" value={onboardingSummary.importedLPs} detail="Existing relationship records" />
        <Metric label="Meetings detected" value={onboardingSummary.meetingsDetected} detail="From notes and CRM rows" />
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
        <p><b>Confidence:</b> {autonomous[0]?.confidence || 84}%</p>
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
      <div className="panel-head"><div><h2>Autonomous Fundraising Engine</h2><p>Every new meeting, Fund DNA update, opportunity, outcome, and Ask Memory interaction recalculates downstream work automatically.</p></div><span>Always on</span></div>
      <div className="autonomous-grid">
        {autonomous.slice(0, 4).map((rec) => <button key={rec.title} onClick={() => { const lp = rec.lpId ? profiles.find((x) => x.id === rec.lpId) : null; if (lp) openLP(lp); }}><Sparkles /><p><b>{rec.title}</b><small>Why: {rec.why}</small><small>Expected impact: {rec.impact}</small><strong>{rec.confidence}% confidence</strong><em>Suggested action: {rec.action}</em></p></button>)}
      </div>
    </section>

    <section className="workspace-columns">
      <div className="panel action-stack">
        <div className="panel-head"><div><h2>Fundraising Signals</h2><p>Detected automatically for every LP with a reason.</p></div></div>
        {[...profiles].sort((a, b) => (signals[b.id]?.confidence || 0) - (signals[a.id]?.confidence || 0)).slice(0, 5).map((lp) => <button className="signal-card" key={lp.id} onClick={() => openLP(lp)}><span>{signals[lp.id]?.label}</span><p><b>{lp.name}</b><small>{signals[lp.id]?.reason}</small></p><em>{signals[lp.id]?.confidence}%</em></button>)}
      </div>
      <div className="panel action-stack">
        <div className="panel-head"><div><h2>Fundraising Forecast</h2><p>Forecast updates when meetings, commitments, fit scores, outcomes, or overdue tasks change.</p></div></div>
        <div className="forecast-card"><label>Weighted forecast</label><h2>{money(forecast.weighted)}</h2><p>Expected range: {money(forecast.rangeLow)} - {money(forecast.rangeHigh)}</p><p>Confidence: {forecast.confidence}%</p><small>{forecast.risk}</small></div>
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
      <div className="panel-head"><div><h2>AI Workspace engines</h2><p>Strategy, Fund DNA, LP opportunities, relationship graph, and Narrative Coach live here—not as CRM tabs.</p></div></div>
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
  return <><Title eyebrow="LP OPPORTUNITIES" title="AI LP Acquisition Engine" copy="Demo opportunity pipeline generated from Fund DNA, strategy, existing LP patterns, and meeting intelligence. This is sample opportunity data unless real LP data is provided." action={<button className="ask" onClick={openChat}><Sparkles />Ask about opportunities</button>} /><section className="panel opportunity-chief"><div className="panel-head"><div><h2>Daily Chief of Staff</h2><p>Today's top 3 fundraising actions with impact and execution guidance.</p></div></div>{topActions.map((x, i) => <div className="opportunity-action" key={x.title}><span>{i + 1}</span><p><b>{x.title}</b><small>Reason: {x.reason}</small><em>Expected impact: {x.impact}</em><strong>Execution: {x.execution}</strong></p></div>)}</section><section className="panel fit-list opportunity-list"><div className="panel-head"><div><h2>LP Opportunity Pipeline</h2><p>Prioritized sample LP opportunities. Not a complete LP database.</p></div></div>{opportunities.map((opp) => { const outcome = opportunityStatus(opp.id, outcomes); return <div className="opportunity-row" key={opp.id}><div className="opportunity-main"><span className="fit-rank">{opp.estimatedFitScore}</span><p><b>{opp.name}</b><small>{opp.organization} • {opp.type}</small></p><strong>{opp.confidenceScore}% confidence</strong><em>{outcome.status}</em></div><p className="opportunity-copy">{opp.whyRecommended}</p><div className="opportunity-tags">{opp.likelyInterests.map((x) => <span key={x}>{x}</span>)}</div><div className="opportunity-grid"><div><h3>Warm introduction planner</h3><p>{opp.introPath.join(" → ")}</p><small>Suggested introducer: {opp.suggestedIntroducer} • {opp.relationshipConfidence}% confidence</small><b>{opp.recommendedIntroAsk}</b></div><div><h3>Outreach playbook</h3><p>{opp.suggestedOutreachAngle}</p><small>{opp.outreachPlaybook.linkedIn}</small><b>{opp.outreachPlaybook.meetingAgenda.join(" / ")}</b></div><div><h3>Outcome tracking</h3><select value={outcome.status} onChange={(e) => updateStatus(opp, e.target.value as OpportunityStatus)}>{opportunityStatuses.map((x) => <option key={x}>{x}</option>)}</select>{(outcome.status === "Passed" || outcome.status === "Not a fit") && <select value={outcome.reason} onChange={(e) => updateReason(opp, e.target.value as OpportunityReason)}>{opportunityReasons.filter(Boolean).map((x) => <option key={x}>{x}</option>)}</select>}</div></div><details><summary>First outreach email and follow-up sequence</summary><pre>{opp.outreachPlaybook.email}</pre><ul>{opp.outreachPlaybook.followUpSequence.map((x) => <li key={x}>{x}</li>)}</ul></details></div>; })}</section><section className="strategy-grid opportunity-insights"><div className="strategy-card panel"><h3>Most common objections</h3><ul>{insights.objections.map((x) => <li key={x}>{x}</li>)}</ul></div><div className="strategy-card panel"><h3>Highest converting LP types</h3><ul>{insights.highestConvertingTypes.map((x) => <li key={x}>{x}</li>)}</ul></div><div className="strategy-card panel"><h3>Best introduction sources</h3><ul>{insights.bestIntroSources.map((x) => <li key={x}>{x}</li>)}</ul></div><div className="strategy-card panel"><h3>Strongest-fit segments</h3><ul>{insights.strongestSegments.map((x) => <li key={x}>{x}</li>)}</ul></div><div className="strategy-card panel"><h3>Recommended strategy adjustment</h3><ul><li>{insights.adjustment}</li></ul></div></section></>;
}

function PipelineWorkspace({ profiles, query, fitResults, opportunities, outcomes, openLP, go, signals }: { profiles: LP[]; query: string; fitResults: Record<string, LPFit>; opportunities: LPOpportunity[]; outcomes: Record<string, OpportunityOutcome>; openLP: (lp: LP) => void; go: (s: Screen) => void; signals: Record<string, FundraisingSignal> }) {
  const top = rankedFits(profiles, fitResults).slice(0, 3);
  return <><Title eyebrow="LP PIPELINE" title="Prioritize the LPs most likely to move." copy="Pipeline is organized around actionability: fit, relationship signal, commitments, follow-up state, and opportunity status." action={<button className="ask" onClick={() => go("LP Opportunities")}><Sparkles />Open opportunities</button>} /><section className="chief-grid compact">{top.map(({ lp, fit }) => <div className="panel chief-card" key={lp.id}><label>{fit.score}% LP fit • {signals[lp.id]?.label}</label><h2>{lp.name}</h2><p><b>What happened:</b> {lp.activity}</p><p><b>Why it matters:</b> {fit.why}</p><p><b>Signal reason:</b> {signals[lp.id]?.reason}</p><p><b>Do next:</b> {fit.nextBestAction}</p><button onClick={() => openLP(lp)}>Open LP profile <ArrowRight /></button></div>)}</section><Directory profiles={profiles} query={query} fitResults={fitResults} openLP={openLP} />{opportunities.length > 0 && <section className="panel workspace-mini"><div className="panel-head"><div><h2>AI-generated LP Opportunity Pipeline</h2><p>{opportunities.length} sample opportunities ranked from Fund DNA and relationship patterns.</p></div><button onClick={() => go("LP Opportunities")}>Open full engine <ArrowRight /></button></div>{opportunities.slice(0, 4).map((opp) => <div className="briefing-row" key={opp.id}><Sparkles /><p><b>{opp.name}</b><small>{opp.organization} • {opp.estimatedFitScore}% fit • {opportunityStatus(opp.id, outcomes).status}</small></p><span>{opp.type}</span></div>)}</section>}</>;
}

function MeetingsWorkspace({ profiles, tasks, feed, openUpload, toggle }: { profiles: LP[]; tasks: Task[]; feed: Feed[]; openUpload: () => void; toggle: (id: string) => void }) {
  return <><Title eyebrow="MEETINGS" title="Capture conversations and turn them into follow-through." copy="Meeting Intelligence creates LP profiles, activity, graph context, and follow-up tasks from uploaded notes." action={<button className="ask" onClick={openUpload}><Plus />Upload meeting note</button>} /><section className="workspace-columns"><div className="panel action-stack"><div className="panel-head"><div><h2>Meetings requiring preparation</h2><p>High-intent LPs where objection handling matters.</p></div></div>{profiles.filter((lp) => lp.status === "Hot").slice(0, 5).map((lp) => <div className="prep-card static" key={lp.id}><Clock3 /><div><b>{lp.name}</b><small>{lp.firm} • {lp.last}</small><p><strong>Prepare:</strong> {lp.concern}</p><p><strong>Next:</strong> {lp.next}</p></div></div>)}</div><div className="panel action-stack"><div className="panel-head"><div><h2>Recent meeting intelligence</h2><p>Every event is tied to source memory.</p></div></div>{feed.map((a, i) => <div className="signal-row ai-signal" key={`${a.title}-${i}`}><span><Zap /></span><div><b>{a.title}</b><p>{a.meta}</p><small>{a.tag}</small></div></div>)}</div></section><Followups profiles={profiles} tasks={tasks} toggle={toggle} /></>;
}

function KnowledgeWorkspace({ profiles, latestUploadId, fundDNA, strategy, bestFits, fitResults, opportunities, outcomes, saveDNA, setOutcome, openLP, openChat, go }: { profiles: LP[]; latestUploadId: string | null; fundDNA: FundDNA | null; strategy: FundraisingStrategy | null; bestFits: { lp: LP; fit: LPFit }[]; fitResults: Record<string, LPFit>; opportunities: LPOpportunity[]; outcomes: Record<string, OpportunityOutcome>; saveDNA: (dna: FundDNA) => void; setOutcome: (id: string, outcome: OpportunityOutcome) => void; openLP: (lp: LP) => void; openChat: () => void; go: (s: Screen) => void }) {
  return <><Title eyebrow="KNOWLEDGE" title="The fund, LP memory, strategy, and graph in one place." copy="This section keeps the AI-native knowledge engines available without turning them into dashboard navigation." action={<button className="ask" onClick={openChat}><Sparkles />Ask Memory</button>} /><section className="ai-engines panel knowledge-engines"><div className="engine-grid"><details open={!fundDNA}><summary><BrainCircuit />Fund DNA + LP Fit <span>{fundDNA ? "Approved" : "Create now"}</span></summary><FundDNAView profiles={profiles} fundDNA={fundDNA} fitResults={fitResults} saveDNA={saveDNA} openLP={openLP} openChat={openChat} /></details><details open={!!strategy}><summary><Target />Fundraising Strategy + Narrative Coach <span>{strategy ? `${strategy.readinessScore.score}/100` : "Pending"}</span></summary><StrategyView strategy={strategy} fundDNA={fundDNA} bestFits={bestFits} go={go} openLP={openLP} openChat={openChat} /></details><details><summary><Sparkles />LP Opportunities + Outreach Playbook <span>{opportunities.length || "Pending"}</span></summary><OpportunitiesView fundDNA={fundDNA} strategy={strategy} opportunities={opportunities} outcomes={outcomes} setOutcome={setOutcome} openChat={openChat} /></details><details><summary><Network />Relationship Graph <span>Live</span></summary><Graph profiles={profiles} latestUploadId={latestUploadId} openChat={openChat} /></details></div></section></>;
}

function SettingsWorkspace({ reset, openChat, openUpload, openOnboarding, workspaceMode }: { reset: () => void; openChat: () => void; openUpload: () => void; openOnboarding: () => void; workspaceMode: WorkspaceMode }) {
  return <><Title eyebrow="SETTINGS" title="Workspace controls" copy="Switch between the demo environment and a real imported fund workspace without removing any core workflows." /><section className="chief-grid compact"><div className="panel chief-card"><label>Real fund onboarding</label><h2>Create My Fund Workspace</h2><p><b>What happens:</b> Import fund materials and LP exports so LP Brain creates Fund DNA, LP profiles, priorities, opportunities, and forecast.</p><button onClick={openOnboarding}>Open onboarding <ArrowRight /></button></div><div className="panel chief-card"><label>Current workspace</label><h2>{workspaceMode}</h2><p><b>What happens:</b> Reset restores the original demo memory, tasks, Fund DNA, strategy, and opportunities.</p><button onClick={reset}>Reset demo <ArrowRight /></button></div><div className="panel chief-card"><label>Meeting Intelligence</label><h2>Upload a meeting note</h2><p><b>Why it matters:</b> This is the fastest way to show LP Brain updating memory and next actions.</p><button onClick={openUpload}>Open upload <ArrowRight /></button></div><div className="panel chief-card"><label>Ask Memory</label><h2>Talk to the Chief of Staff</h2><p><b>Do next:</b> Ask who to contact, what objections to prepare for, or draft outreach.</p><button onClick={openChat}>Ask Memory <ArrowRight /></button></div></section></>;
}

function Directory({ profiles, query, fitResults, openLP }: { profiles: LP[]; query: string; fitResults: Record<string, LPFit>; openLP: (lp: LP) => void }) { const [type, setType] = useState("All"); const rows = profiles.filter((x) => (type === "All" || x.type === type) && (`${x.name} ${x.firm} ${x.interest}`).toLowerCase().includes(query.toLowerCase())); return <><Title eyebrow="LIVE RELATIONSHIP DATA" title={`${profiles.length} LP profiles`} copy="Every row is backed by introductions, meetings, interests, concerns, next actions, and LP Fit when Fund DNA exists." /><div className="directory-tools panel"><div><span>Investor type</span>{["All", ...investorTypes].map((x) => <button className={type === x ? "on" : ""} onClick={() => setType(x)} key={x}>{x}</button>)}</div></div><section className="directory panel"><div className="table-head"><span>Investor</span><span>Relationship</span><span>Interests</span><span>Last contact</span><span>Next action</span><span /></div>{rows.map((lp) => { const fit = fitResults[lp.id]; return <button className="table-row" key={lp.id} onClick={() => openLP(lp)}><div><span className="avatar" style={{ background: lp.color }}>{lp.initials}</span><p><b>{lp.name}</b><small>{lp.firm} • {lp.type}</small></p></div><div><Status value={lp.status} /><small>{fit ? `${fit.score}% LP fit` : `${lp.strength}% strength`}</small></div><span>{lp.interest}</span><span>{lp.last}</span><p><b>{fit?.nextBestAction || lp.next}</b><small>{fit?.likelyObjection || lp.due}</small></p><ChevronRight /></button>; })}</section></>; }
function Followups({ profiles, tasks, toggle }: { profiles: LP[]; tasks: Task[]; toggle: (id: string) => void }) { const open = tasks.filter((x) => !x.done), overdue = open.filter((x) => x.due === "Overdue").length; return <><Title eyebrow="FOLLOW-UP INTELLIGENCE" title={`${open.length} open follow-ups`} copy={`${overdue} overdue. Completing a task updates the dashboard immediately.`} /><section className="follow-summary"><Metric label="Open" value={open.length} detail="All active tasks" /><Metric label="Overdue" value={overdue} detail="Needs attention" tone={overdue ? "risk" : "good"} /><Metric label="Completed" value={tasks.filter((x) => x.done).length} detail="This demo session" tone="good" /></section><section className="panel follow-list"><div className="follow-label">PRIORITY QUEUE</div>{tasks.map((task) => { const lp = profiles.find((x) => x.id === task.lpId); if (!lp) return null; return <div className={`follow-row ${task.done ? "done" : ""}`} key={task.id}><button aria-label={`${task.done ? "Reopen" : "Complete"} ${task.title}`} onClick={() => toggle(task.id)}><Check /></button><span className="avatar" style={{ background: lp.color }}>{lp.initials}</span><p><b>{task.title}</b><small>{lp.name} • {lp.firm}</small></p><span className={task.due === "Overdue" ? "overdue" : ""}>{task.due}</span><em>{lp.status} • {lp.strength}%</em></div>; })}</section></>; }
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
  return <div className="backdrop"><div className="upload onboarding-modal"><div className="modal-head"><div><span>{summary ? "ONBOARDING SUMMARY" : "REAL FUND ONBOARDING"}</span><h2>{summary ? "Review My Fund Workspace" : "Import fund materials"}</h2><small>{summary ? "Approve the AI-generated workspace before saving." : "Upload your fund deck and LP spreadsheet to create your AI fundraising workspace."}</small></div><button aria-label="Close onboarding" onClick={close}><X /></button></div>{!summary ? <section className="onboarding-flow"><div className="onboarding-steps"><span className="on">1 Import Fund</span><span>2 AI creates workspace</span><span>3 Generate priorities</span><span>4 Review summary</span><span>5 Save workspace</span></div><button type="button" className="drop phase-drop" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectFiles(e.dataTransfer.files); }}><input ref={input} hidden multiple type="file" accept=".pdf,.ppt,.pptx,.txt,.md,.csv,.xlsx,.xls" onChange={(e) => selectFiles(e.target.files)} /><UploadCloud /><b>Upload fund deck, PPTX, one-pager, GP bio, CSV, or XLSX</b><p>OR</p><span>Browse Files</span><small>Accepted: PDF, PPTX, TXT, Markdown, CSV, XLSX</small></button>{files.length > 0 && <div className="onboarding-files">{files.map((file) => <p key={file}><FileText />{file}</p>)}</div>}<textarea className="phase-note-input" value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="Paste fund deck text, one-pager, investment thesis, GP bio, portfolio notes, target fund size, geography, sector focus, and stage focus..." /><textarea className="phase-note-input crm-input" value={crm} onChange={(e) => setCrm(e.target.value)} placeholder="Paste existing LP spreadsheet or CRM export CSV here. Columns can include Name, Firm, Type, Stage, Interest, Concern, Next Action, Check Size, Last Contact, Intro Source..." /><button className="sample-upload" onClick={() => generate(true)}><Sparkles />Use sample real-fund onboarding package</button></section> : <section className="onboarding-review"><div className="onboarding-steps"><span>1 Import Fund</span><span>2 AI creates workspace</span><span>3 Generate priorities</span><span className="on">4 Review summary</span><span>5 Save workspace</span></div><div className="onboarding-summary-grid"><Metric label="LPs imported" value={summary.importedLPs} detail="Existing LP profiles" /><Metric label="Meetings detected" value={summary.meetingsDetected} detail="From CRM/activity rows" /><Metric label="Opportunities generated" value={summary.opportunitiesGenerated} detail="Recommended LP targets" /></div><div className="fund-dna-grid onboarding-result"><div className="panel dna-card"><h2>{summary.fundDNA.fundName}</h2><p>{summary.fundDNA.targetFundSize} - {summary.fundDNA.stage} - {summary.fundDNA.geography}</p><div className="tags">{summary.fundDNA.sectorFocus.map((x) => <span key={x}>{x}</span>)}</div><dl className="dna-list"><div><dt>Investment thesis summary</dt><dd>{summary.fundDNA.suggestedFundraisingNarrative}</dd></div><div><dt>Target LP profile</dt><dd>{summary.fundDNA.idealLPTypes.join(", ")} writing {summary.fundDNA.targetLPCheckSize} checks.</dd></div><div><dt>Suggested fundraising narrative</dt><dd>{summary.fundDNA.suggestedFundraisingNarrative}</dd></div><div><dt>Existing pipeline stages</dt><dd>{summary.profiles.map((lp) => `${lp.name}: ${lp.status}`).slice(0, 5).join(" | ")}</dd></div></dl></div><div className="panel dna-card"><h2>Generated downstream work</h2><dl className="dna-list"><div><dt>LP Fit Scores</dt><dd>Generated for all imported LPs after saving.</dd></div><div><dt>LP Opportunities</dt><dd>{summary.opportunitiesGenerated} opportunity recommendations will be available from the AI Workspace.</dd></div><div><dt>Warm introductions</dt><dd>Suggested from intro source and imported relationship context.</dd></div><div><dt>AI Priorities and forecast</dt><dd>Today's fundraising actions, readiness, and forecast update automatically after save.</dd></div></dl></div></div><div className="workspace-columns onboarding-lists"><div className="panel action-stack"><div className="panel-head"><div><h2>Missing information</h2><p>LP Brain can start now, but these fields would improve recommendations.</p></div></div>{(summary.missingInformation.length ? summary.missingInformation : ["No critical missing fields detected"]).map((x) => <div className="briefing-row" key={x}><FileText /><p><b>{x}</b><small>Can be added later in Knowledge or meeting notes.</small></p></div>)}</div><div className="panel action-stack"><div className="panel-head"><div><h2>Recommended next actions</h2><p>The first operating plan for this fund workspace.</p></div></div>{summary.recommendedActions.map((x) => <div className="briefing-row" key={x}><Check /><p><b>{x}</b><small>Generated from imported fund and LP context.</small></p></div>)}</div></div><div className="demo-impact"><span>CLEAN WORKSPACE JSON</span><pre>{JSON.stringify({ fundDNA: summary.fundDNA, importedLPs: summary.importedLPs, meetingsDetected: summary.meetingsDetected, opportunitiesGenerated: summary.opportunitiesGenerated, missingInformation: summary.missingInformation, recommendedActions: summary.recommendedActions }, null, 2)}</pre></div></section>}<div className="modal-actions"><button onClick={close}>Cancel</button>{!summary ? <button className="primary" disabled={busy || !ready} onClick={() => generate(false)}><Sparkles />{busy ? "Creating workspace..." : "Create onboarding summary"}</button> : <button className="primary" onClick={() => save(summary)}>Save as My Fund Workspace <ArrowRight /></button>}</div></div></div>;
}

function Upload({ close, approve }: { close: () => void; approve: (extraction: Extraction, rawText: string) => void }) { const input = useRef<HTMLInputElement>(null); const [file, setFile] = useState<File | null>(null); const [note, setNote] = useState(""); const [rawText, setRawText] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [extraction, setExtraction] = useState<Extraction | null>(null); const ready = Boolean(note.trim() || file); const setField = <K extends keyof Extraction>(key: K, value: Extraction[K]) => setExtraction((x) => x ? { ...x, [key]: value } : x); const extract = async (demo = false) => { setBusy(true); setError(""); if (demo) { setNote(sampleMeetingNote); setRawText(sampleMeetingNote); setExtraction(sampleExtraction); setBusy(false); return; } const form = new FormData(); if (file) form.append("file", file); form.append("note", note); try { const res = await fetch("/api/upload", { method: "POST", body: form }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Extraction failed"); setExtraction(data.extraction); setRawText(data.rawText || note); } catch (e) { setError(e instanceof Error ? e.message : "Extraction failed"); } finally { setBusy(false); } }; return <div className="backdrop"><div className="upload"><div className="modal-head"><div><span>{extraction ? "REVIEW EXTRACTION" : "AI MEETING EXTRACTION"}</span><h2>{extraction ? "Review before saving" : "Upload or paste meeting note"}</h2><small>{extraction ? "Approve or edit the structured JSON fields." : "Upload a note file or paste a transcript, then extract structured fundraising memory."}</small></div><button aria-label="Close upload" onClick={close}><X /></button></div>{!extraction ? <section className="phase-upload-panel"><button type="button" className="drop phase-drop" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0] || null); }}><input ref={input} hidden type="file" accept=".txt,.md,.markdown,.pdf,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} /><UploadCloud /><b>Drag & drop PDF, DOCX or TXT here</b><p>OR</p><span>Browse Files</span><small>Accepted: PDF • DOCX • TXT • Markdown</small></button><textarea className="phase-note-input" value={note} onChange={(e) => { setNote(e.target.value); setError(""); }} placeholder="Paste meeting notes here..." />{file && <div className="phase-file-ready"><span><FileText /></span><p><small>Selected file:</small><b>{file.name}</b></p><em><Check />Ready for AI extraction</em><button aria-label="Remove selected file" onClick={() => setFile(null)}><X /></button></div>}<button className="sample-upload" onClick={() => extract(true)}><Sparkles />Use sample Nora Ellis meeting note</button>{error && <p className="phase-upload-error">{error}</p>}</section> : <ReviewExtraction extraction={extraction} setField={setField} />}<div className="modal-actions"><button onClick={close}>Cancel</button>{!extraction ? <button className="primary" disabled={busy || !ready} onClick={() => extract(false)}><Sparkles />{busy ? "Extracting..." : "Extract with AI"}</button> : <button className="primary" onClick={() => approve(extraction, rawText || note || sampleMeetingNote)}>Approve and update LP Brain <ArrowRight /></button>}</div></div></div>; }
function ReviewExtraction({ extraction, setField }: { extraction: Extraction; setField: <K extends keyof Extraction>(key: K, value: Extraction[K]) => void }) { const inputStyle = { width: "100%", border: "1px solid #e0e2e3", borderRadius: 8, padding: "8px 10px", fontSize: 11 } as const; const field = (label: string, node: React.ReactNode) => <label style={{ display: "grid", gap: 5, fontSize: 9, color: "#7f8794" }}><span>{label}</span>{node}</label>; return <div style={{ padding: 22, display: "grid", gap: 12, maxHeight: "58vh", overflow: "auto" }}><div className="demo-impact"><span>CLEAN JSON</span><pre style={{ whiteSpace: "pre-wrap", fontSize: 10, margin: 0 }}>{extractionToText(extraction)}</pre></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{field("LP name", <input style={inputStyle} value={extraction.lpName} onChange={(e) => setField("lpName", e.target.value)} />)}{field("Firm / organization", <input style={inputStyle} value={extraction.firm} onChange={(e) => setField("firm", e.target.value)} />)}{field("Investor type", <select style={inputStyle} value={extraction.investorType} onChange={(e) => setField("investorType", e.target.value as LPType)}>{investorTypes.map((x) => <option key={x}>{x}</option>)}</select>)}{field("Meeting date", <input style={inputStyle} value={extraction.meetingDate} onChange={(e) => setField("meetingDate", e.target.value)} />)}{field("Check size", <input style={inputStyle} value={extraction.checkSize} onChange={(e) => setField("checkSize", e.target.value)} />)}{field("Follow-up due date", <input style={inputStyle} value={extraction.followUpDueDate} onChange={(e) => setField("followUpDueDate", e.target.value)} />)}{field("Sentiment", <select style={inputStyle} value={extraction.sentiment} onChange={(e) => setField("sentiment", e.target.value as Extraction["sentiment"])}>{["Positive", "Neutral", "Negative"].map((x) => <option key={x}>{x}</option>)}</select>)}{field("Confidence score", <input style={inputStyle} type="number" min="0" max="1" step="0.01" value={extraction.confidenceScore} onChange={(e) => setField("confidenceScore", Number(e.target.value))} />)}</div>{field("Interest areas", <textarea style={inputStyle} value={extraction.interestAreas.join("\n")} onChange={(e) => setField("interestAreas", textToList(e.target.value))} />)}{field("Questions asked", <textarea style={inputStyle} value={extraction.questionsAsked.join("\n")} onChange={(e) => setField("questionsAsked", textToList(e.target.value))} />)}{field("Concerns raised", <textarea style={inputStyle} value={extraction.concernsRaised.join("\n")} onChange={(e) => setField("concernsRaised", textToList(e.target.value))} />)}{field("Documents requested", <textarea style={inputStyle} value={extraction.documentsRequested.join("\n")} onChange={(e) => setField("documentsRequested", textToList(e.target.value))} />)}{field("Commitment signals", <textarea style={inputStyle} value={extraction.commitmentSignals} onChange={(e) => setField("commitmentSignals", e.target.value)} />)}{field("Next action", <input style={inputStyle} value={extraction.nextAction} onChange={(e) => setField("nextAction", e.target.value)} />)}{field("Summary", <textarea style={inputStyle} value={extraction.summary} onChange={(e) => setField("summary", e.target.value)} />)}</div>; }
function Profile({ lp, fit, signal, timeline, artifacts, close, openChat }: { lp: LP; fit?: LPFit; signal?: FundraisingSignal; timeline: TimelineEvent[]; artifacts: ReturnType<typeof autonomousArtifacts>; close: () => void; openChat: () => void }) {
  return <div className="drawer-bg" onClick={close}><aside className="profile wide" onClick={(e) => e.stopPropagation()}><header><span>LP PROFILE • AUTONOMOUS MEMORY</span><button aria-label="Close profile" onClick={close}><X /></button></header><section className="profile-hero"><span className="avatar big" style={{ background: lp.color }}>{lp.initials}</span><h2>{lp.name}</h2><p>{lp.firm} • {lp.type}</p><Status value={lp.status} /><div className="strength"><i><em style={{ width: `${fit?.score || lp.strength}%` }} /></i><span>{fit ? `${fit.score}% LP fit` : `${lp.strength}% relationship strength`}</span></div></section><div className="profile-stats"><p><small>Potential commitment</small><b>{lp.commitmentAmount ? money(lp.commitmentAmount) : "—"}</b></p><p><small>Last contact</small><b>{lp.last}</b></p></div>{signal && <section className="profile-section autonomous-profile"><h3>Fundraising signal</h3><div className="signal-pill"><b>{signal.label}</b><span>{signal.confidence}% confidence</span></div><p>{signal.reason}</p></section>}<section className="profile-section autonomous-profile"><h3>Autonomous downstream work</h3><dl><div><dt>Meeting summary</dt><dd>{artifacts.summary}</dd></div><div><dt>Follow-up email draft</dt><dd><pre>{artifacts.email}</pre></dd></div><div><dt>CRM notes</dt><dd>{artifacts.crm}</dd></div><div><dt>Next meeting recommendation</dt><dd>{artifacts.nextMeeting}</dd></div><div><dt>Objections detected</dt><dd>{artifacts.objections.join(" | ")}</dd></div><div><dt>Commitment signals</dt><dd>{artifacts.commitmentSignals.join(" | ")}</dd></div><div><dt>Suggested documents</dt><dd>{artifacts.documents.join(", ")}</dd></div></dl></section>{fit && <section className="profile-section"><h3>LP Fit Intelligence</h3><dl><div><dt>Why this LP fits</dt><dd>{fit.why}</dd></div><div><dt>Likely objection</dt><dd>{fit.likelyObjection}</dd></div><div><dt>Outreach angle</dt><dd>{fit.outreachAngle}</dd></div><div><dt>Next best action</dt><dd>{fit.nextBestAction}</dd></div></dl></section>}<section className="profile-section"><h3>Relationship intelligence</h3><dl><div><dt>Introduced by</dt><dd>{lp.source}<small>{lp.event}</small></dd></div><div><dt>Investment interests</dt><dd>{lp.interest}</dd></div><div><dt>Key concern</dt><dd>{lp.concern}</dd></div><div><dt>Next best action</dt><dd>{lp.next}<small>{lp.due}</small></dd></div></dl></section><section className="profile-section ai-event-timeline"><h3>AI Event Timeline</h3>{timeline.map((event, i) => <div key={`${event.kind}-${event.title}-${i}`}><i>{i + 1}</i><p><b>{event.kind}: {event.title}</b><small>{event.date}</small><span>{event.detail}</span></p></div>)}</section><section className="profile-section meeting-history"><h3>Meeting history</h3>{lp.meetings.map((m) => <div key={`${m.date}-${m.title}`}><i /><p><b>{m.title}</b><small>{m.date}</small><span>{m.note}</span></p></div>)}</section><button className="profile-ask" onClick={openChat}><Sparkles />Ask memory about {lp.name.split(" ")[0]}</button></aside></div>;
}

function Chat({ profiles, tasks, fundDNA, strategy, opportunities, outcomes, fitResults, close }: { profiles: LP[]; tasks: Task[]; fundDNA: FundDNA | null; strategy: FundraisingStrategy | null; opportunities: LPOpportunity[]; outcomes: Record<string, OpportunityOutcome>; fitResults: Record<string, LPFit>; close: () => void }) { const [q, setQ] = useState(""); const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]); const ask = (text: string) => { const answer = answerMemoryQuestion(text, profiles, tasks, fundDNA, strategy, opportunities, outcomes, fitResults); const autoNote = "\n\nAutonomous update: Ask Memory logged this question, refreshed priorities, checked LP signals, recalculated forecast context, and kept recommended actions synchronized with live memory."; setMessages((m) => [...m, { role: "user", text }, { role: "ai", text: answer + autoNote }]); setQ(""); }; const prompts = ["Who should I contact next?", "Which LP opportunities have the highest fit?", "Which LPs need a warm introduction?", "Draft outreach for the top LP opportunity.", "What are we learning from passed LPs?", "Which LP type is converting best?", "What should the GP do today?"]; return <aside className="chat"><div className="chat-head"><span><Sparkles /></span><p><b>Fundraising chief of staff</b><small>• Grounded in {profiles.length} LP profiles{fundDNA ? " + Fund DNA" : ""}{strategy ? " + Strategy" : ""}{opportunities.length ? " + Opportunities" : ""}</small></p><button aria-label="Close chat" onClick={close}><X /></button></div><div className="chat-body">{messages.length ? <div className="messages">{messages.map((m, i) => <div className={m.role} key={i}><span style={{ whiteSpace: "pre-line" }}>{m.text}</span>{m.role === "ai" && <small><FileText />Source: live memory state</small>}</div>)}</div> : <><div className="chat-intro"><BrainCircuit /><h2>Ask what to do next.</h2><p>Answers use LP memory, Fund DNA, fit scores, fundraising strategy, and LP opportunities.</p></div><div className="suggestions">{prompts.map((x) => <button key={x} onClick={() => ask(x)}>{x}<ArrowRight /></button>)}</div></>}</div><form onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q); }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about opportunities, strategy, intros, or outreach..." /><button aria-label="Send question"><Send /></button></form></aside>; }

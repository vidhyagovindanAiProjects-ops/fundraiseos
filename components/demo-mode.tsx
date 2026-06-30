"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, BrainCircuit, Check, ChevronRight, Clock3, FileText, Home, LayoutList, Menu, Network, Plus, Search, Send, Sparkles, Target, UploadCloud, Users, X, Zap } from "lucide-react";
import { activities as seedActivity, demoLPs, type Heat, type LP, type LPType } from "@/lib/demo-data";

type Screen = "Dashboard" | "LP Directory" | "Follow-ups" | "Relationship Graph";
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

const investorTypes: LPType[] = ["Family Office", "Fund of Funds", "Angel Investor", "RIA", "Foundation"];
const sampleMeetingNote = `Meeting: Nora Ellis, Redwood Family Office
Date: June 27, 2026
Introduced by Maya Feldman at the ZAS Founder Dinner.

Nora is evaluating ZAS Ventures Fund II for Redwood Family Office. She is interested in applied AI, vertical SaaS, and infrastructure software. She asked for the fund deck, track record by company, ownership history, and two founder references. Her main concern is Fund II attribution and whether the team can keep ownership targets with a concentrated seed strategy.

She said Redwood could consider a $750K allocation after reviewing the data room and references. Sentiment was positive, but she wants materials before her Monday partner discussion.

Next action: send track record analysis and founder references by July 2, 2026.`;

const sampleExtraction: Extraction = {
  lpName: "Nora Ellis",
  firm: "Redwood Family Office",
  investorType: "Family Office",
  meetingDate: "2026-06-27",
  interestAreas: ["Applied AI", "Vertical SaaS", "Infrastructure software"],
  checkSize: "$750K",
  questionsAsked: ["Can ZAS show track record by company?", "How has ownership trended across Fund I?", "Can Redwood speak with two founders?"],
  concernsRaised: ["Fund II attribution", "Maintaining ownership targets with a concentrated seed strategy"],
  documentsRequested: ["Fund deck", "Track record analysis", "Founder references", "Data room access"],
  commitmentSignals: "Potential $750K allocation after reviewing data room and references.",
  nextAction: "Send track record analysis and founder references",
  followUpDueDate: "2026-07-02",
  sentiment: "Positive",
  confidenceScore: 0.91,
  summary: "Nora Ellis expressed positive interest in ZAS Ventures Fund II and requested diligence materials before a partner discussion.",
};

const initialTasks: Task[] = demoLPs.slice(0, 12).map((lp) => ({ id: `task-${lp.id}`, lpId: lp.id, title: lp.next, due: lp.due, done: false }));
const initialFeed: Feed[] = seedActivity.slice(0, 4);

export function DemoMode() {
  const [screen, setScreen] = useState<Screen>("Dashboard");
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

  const metrics = useMemo(() => {
    const total = profiles.length;
    const active = profiles.filter((x) => x.status !== "Cold").length;
    const warm = profiles.filter((x) => x.status === "Warm").length;
    const cold = profiles.filter((x) => x.status === "Cold").length;
    const commitments = profiles.filter((x) => x.commitmentAmount > 0).length;
    const pipeline = profiles.reduce((n, x) => n + x.commitmentAmount, 0);
    const open = tasks.filter((x) => !x.done).length;
    const overdue = tasks.filter((x) => !x.done && x.due === "Overdue").length;
    const score = Math.max(60, Math.min(96, Math.round(70 + (active / total) * 15 + (commitments / total) * 12 - overdue * 2)));
    return { total, active, warm, cold, commitments, pipeline, open, overdue, score };
  }, [profiles, tasks]);

  const go = (s: Screen) => { setScreen(s); setMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2200); };
  const reset = () => { setProfiles(demoLPs); setTasks(initialTasks); setFeed(initialFeed); setLatestUploadId(null); setSelected(null); setChat(false); setUpload(false); setQuery(""); setScreen("Dashboard"); notify("Demo reset to starting state"); };

  const approveExtraction = (extraction: Extraction, rawText: string) => {
    const lp = lpFromExtraction(extraction, rawText, profiles);
    setProfiles((current) => current.some((x) => sameLP(x, lp)) ? current.map((x) => sameLP(x, lp) ? { ...x, ...lp, id: x.id } : x) : [lp, ...current]);
    setTasks((current) => [{ id: `task-${lp.id}`, lpId: lp.id, title: lp.next, due: lp.due, done: false }, ...current.filter((x) => x.lpId !== lp.id)]);
    setFeed((current) => [{ title: `${lp.name} meeting extracted`, meta: `${lp.firm} · ${lp.last}`, tag: "AI extraction reviewed + approved" }, ...current.filter((x) => !x.title.includes(lp.name))]);
    setLatestUploadId(lp.id);
    setUpload(false);
    setSelected(lp);
    notify("AI extraction approved and saved across FundraiseOS");
  };

  const nav: [Screen, typeof Home][] = [["Dashboard", Home], ["LP Directory", Users], ["Follow-ups", LayoutList], ["Relationship Graph", Network]];
  return <div className="shell demo-shell story-shell"><aside className={`sidebar ${menu ? "open" : ""}`}><div className="brand"><b>F</b><span>Fundraise<em>OS</em></span></div><button className="close-menu" aria-label="Close menu" onClick={() => setMenu(false)}><X /></button><div className="demo-badge"><i />DEMO MODE</div><p className="nav-title">ZAS Ventures • Fund II</p><nav>{nav.map(([label, Icon]) => <button key={label} className={screen === label ? "active" : ""} onClick={() => go(label)}><Icon /><span>{label}</span>{label === "LP Directory" && <i>{metrics.total}</i>}{label === "Follow-ups" && <i>{metrics.open}</i>}</button>)}</nav><button className="health" onClick={() => go("Dashboard")}><div><Target /><span>Fundraising health</span><b>{metrics.score}</b></div><figure><i style={{ width: `${metrics.score}%` }} /></figure><p>{metrics.overdue ? `${metrics.overdue} overdue tasks are reducing momentum.` : "No overdue follow-ups."}</p><span>Derived from live demo data</span></button><div className="story-user"><span>ZV</span><p><b>ZAS Ventures</b><small>$15M Fund II target</small></p></div></aside>{menu && <div className="scrim" onClick={() => setMenu(false)} />}<main><header><button className="hamb" aria-label="Open menu" onClick={() => setMenu(true)}><Menu /></button><div className="search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => go("LP Directory")} placeholder="Search LPs, firms, interests..." /></div><div className="head-actions"><span className="live-state"><i />Live demo data</span><button className="reset-demo" onClick={reset}>Reset demo</button><button className="primary" onClick={() => setUpload(true)}><Plus /><span>Upload meeting note</span></button></div></header><div className="page demo-page">{screen === "Dashboard" && <DashboardView profiles={profiles} tasks={tasks} feed={feed} metrics={metrics} latestUploadId={latestUploadId} go={go} openLP={setSelected} openChat={() => setChat(true)} openUpload={() => setUpload(true)} />} {screen === "LP Directory" && <Directory profiles={profiles} query={query} openLP={setSelected} />} {screen === "Follow-ups" && <Followups profiles={profiles} tasks={tasks} toggle={(id) => setTasks((t) => t.map((x) => x.id === id ? { ...x, done: !x.done } : x))} />} {screen === "Relationship Graph" && <Graph profiles={profiles} latestUploadId={latestUploadId} openChat={() => setChat(true)} />}</div></main><button className="float-chat always" onClick={() => setChat(true)}><Sparkles />Ask memory</button>{upload && <Upload close={() => setUpload(false)} approve={approveExtraction} />} {selected && <Profile lp={selected} close={() => setSelected(null)} openChat={() => { setSelected(null); setChat(true); }} />} {chat && <Chat profiles={profiles} tasks={tasks} close={() => setChat(false)} />} {toast && <div className="toast"><Check />{toast}</div>}</div>;
}

function sameLP(a: LP, b: LP) { return a.name.toLowerCase() === b.name.toLowerCase() || (a.firm.toLowerCase() === b.firm.toLowerCase() && a.name.split(" ")[0].toLowerCase() === b.name.split(" ")[0].toLowerCase()); }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 3).toUpperCase() || "LP"; }
function money(n: number) { if (n > 0 && n < 1_000_000) return `$${Math.round(n / 1000)}K`; const v = n / 1e6; return `$${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}M`; }
function parseAmount(value: string) { const match = value.match(/\$?\s*([\d,.]+)\s*([kKmM])?/); if (!match) return 0; const base = Number(match[1].replace(/,/g, "")); if (!Number.isFinite(base)) return 0; return match[2]?.toLowerCase() === "m" ? base * 1_000_000 : match[2]?.toLowerCase() === "k" ? base * 1_000 : base; }
function displayDate(value: string) { if (!value) return "Just now"; const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/); const d = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function dueLabel(value: string) { return displayDate(value || ""); }
function statusFromExtraction(extraction: Extraction): Heat { if (extraction.sentiment === "Negative") return "Cold"; if (extraction.commitmentSignals.toLowerCase().includes("commit") || extraction.checkSize || extraction.confidenceScore >= 0.82) return "Hot"; return "Warm"; }
function strengthFromExtraction(extraction: Extraction) { const base = extraction.sentiment === "Positive" ? 82 : extraction.sentiment === "Negative" ? 42 : 66; return Math.max(35, Math.min(95, Math.round(base + extraction.confidenceScore * 10))); }
function lpFromExtraction(extraction: Extraction, rawText: string, existing: LP[]): LP {
  const commitmentAmount = parseAmount(extraction.checkSize || extraction.commitmentSignals);
  const existingLP = existing.find((x) => x.name.toLowerCase() === extraction.lpName.toLowerCase());
  const id = existingLP?.id || `lp-uploaded-${Date.now()}`;
  return {
    id,
    initials: initials(extraction.lpName),
    color: existingLP?.color || "#3d4b72",
    name: extraction.lpName || "Unknown LP",
    firm: extraction.firm || "Unknown organization",
    type: extraction.investorType,
    status: statusFromExtraction(extraction),
    strength: strengthFromExtraction(extraction),
    interest: extraction.interestAreas.join(", ") || "Needs qualification",
    interests: extraction.interestAreas,
    last: displayDate(extraction.meetingDate),
    next: extraction.nextAction || "Review extracted meeting note",
    due: dueLabel(extraction.followUpDueDate),
    source: "Uploaded meeting note",
    event: "AI extraction",
    concern: extraction.concernsRaised[0] || "No major concern captured",
    commitment: commitmentAmount ? `${extraction.checkSize || money(commitmentAmount)} signal · ${extraction.commitmentSignals || "diligence pending"}` : extraction.commitmentSignals || "No commitment yet",
    commitmentAmount,
    activity: extraction.documentsRequested.length ? `Requested ${extraction.documentsRequested.join(", ")}` : extraction.summary || "Meeting note extracted",
    meetings: [{ date: displayDate(extraction.meetingDate), title: "AI-extracted meeting note", note: extraction.summary || rawText.slice(0, 220) }, ...(existingLP?.meetings || [])],
  };
}

function extractionToText(extraction: Extraction) { return JSON.stringify(extraction, null, 2); }
function textToList(value: string) { return value.split(/\n|,/).map((x) => x.trim()).filter(Boolean); }
function lpLine(lp: LP, i?: number) { const prefix = i ? `${i}. ` : ""; const commitment = lp.commitmentAmount ? `${money(lp.commitmentAmount)} verbal indication` : "No verbal commitment yet"; return `${prefix}${lp.name} — ${lp.firm}. ${lp.status} relationship, ${lp.strength}% strength. ${commitment}. Next: ${lp.next} (${lp.due}).`; }
function findAskedLP(profiles: LP[], low: string) { return profiles.find((lp) => low.includes(lp.name.toLowerCase()) || low.includes(lp.name.split(" ")[0].toLowerCase()) || low.includes(lp.firm.toLowerCase())); }
function lpSummary(lp: LP) { const last = lp.name === "Elena Park" ? "Last week" : lp.last; const status = lp.name === "Elena Park" ? "Reviewing the data room" : lp.activity; const next = lp.name === "Elena Park" ? "Follow up within 48 hours after confirming data room access." : `${lp.next} by ${lp.due}.`; return `LP: ${lp.name}
Firm: ${lp.firm}
Investor type: ${lp.type}
Relationship strength: ${lp.strength}%
Commitment: ${lp.commitmentAmount ? `${money(lp.commitmentAmount)} verbal indication` : lp.commitment}
Last meeting: ${last}
Current status: ${status}
Interests: ${lp.interest}
Concern: ${lp.concern}
Introduction source: ${lp.source} via ${lp.event}
Next recommended action: ${next}`; }
function answerMemoryQuestion(question: string, profiles: LP[], tasks: Task[]) { const low = question.toLowerCase(), lp = findAskedLP(profiles, low), elena = profiles.find((x) => x.name === "Elena Park") || profiles[0]; if (lp) return lpSummary(lp); if (low.includes("data room") || low.includes("dataroom") || low.includes("share access")) return `${elena.name} at ${elena.firm} requested access to the data room. Recommended next step: send the secure data room link today, confirm she can access the diligence materials, and schedule a follow-up meeting within the next two business days. This matters because she has a ${money(elena.commitmentAmount)} verbal indication tied to diligence progress.`; if (low.includes("follow") || low.includes("this week") || low.includes("due") || low.includes("overdue")) { const ranked = tasks.filter((t) => !t.done).map((t) => ({ task: t, lp: profiles.find((p) => p.id === t.lpId) })).filter((x): x is { task: Task; lp: LP } => !!x.lp).sort((a, b) => (a.task.due === "Overdue" ? -1 : b.task.due === "Overdue" ? 1 : b.lp.strength - a.lp.strength)).slice(0, 6); return `LPs needing follow-up this week:
${ranked.map((x, i) => `${i + 1}. ${x.lp.name} — ${x.task.title}. Due: ${x.task.due}. Reason: ${x.lp.status} relationship at ${x.lp.strength}% strength; ${x.lp.activity.toLowerCase()}.`).join("\n")}`; } if (low.includes("verbal") || low.includes("commitment") || low.includes("committed") || low.includes("indication")) { const committed = profiles.filter((p) => p.commitmentAmount > 0).sort((a, b) => b.commitmentAmount - a.commitmentAmount).slice(0, 8); return `LPs with verbal commitments or indications:
${committed.map((p, i) => `${i + 1}. ${p.name} — ${p.firm}: ${money(p.commitmentAmount)}; ${p.commitment}. Next: ${p.next}.`).join("\n")}`; } if (low.includes("strongest") || low.includes("strength") || low.includes("best relationship") || low.includes("rank")) { const strongest = [...profiles].sort((a, b) => b.strength - a.strength).slice(0, 8); return `Strongest relationships, ranked by relationship score:
${strongest.map((p, i) => lpLine(p, i + 1)).join("\n")}`; } if (low.includes("reference")) { const refs = profiles.filter((p) => p.activity.toLowerCase().includes("reference") || p.next.toLowerCase().includes("reference")).slice(0, 6); return `Reference-related requests:
${refs.map((p, i) => `${i + 1}. ${p.name} — ${p.firm}. ${p.activity}; next action is ${p.next} (${p.due}).`).join("\n")}`; } if (low.includes("deck")) { const deck = profiles.filter((p) => p.activity.toLowerCase().includes("deck")).slice(0, 6); return `LPs who asked for the deck:
${deck.map((p, i) => `${i + 1}. ${p.name} — ${p.firm}. Status: ${p.status}; strength ${p.strength}%; next action: ${p.next}.`).join("\n")}`; } if (low.includes("ai") || low.includes("interested in")) { const ai = profiles.filter((p) => p.interest.toLowerCase().includes("ai")).slice(0, 8); return `LPs with AI-related interest:
${ai.map((p, i) => `${i + 1}. ${p.name} — ${p.firm}: ${p.interest}. Current concern: ${p.concern}.`).join("\n")}`; } if (low.includes("concern") || low.includes("risk")) { const risks = [...profiles].sort((a, b) => b.strength - a.strength).slice(0, 6); return `Top relationship concerns to manage:
${risks.map((p, i) => `${i + 1}. ${p.name} — ${p.concern}. Recommended action: ${p.next}.`).join("\n")}`; } if (low.includes("introduced") || low.includes("introducer") || low.includes("who introduced")) return `${elena.name} was introduced by ${elena.source} at ${elena.event}. The relationship path is LP → ${elena.source} → ${elena.event} → ${elena.meetings[0].title} → ${elena.next}.`; if (low.includes("upload") || low.includes("happened")) return `The last approved extraction updates the LP profile, activity feed, relationship graph, follow-up tasks, dashboard metrics, and Ask Memory context from the same JSON object.`; if (low.includes("next") || low.includes("what should")) return `Highest-impact next action: send Elena Park data room access today, confirm access, then schedule a follow-up within two business days. Why: Elena is the strongest relationship at 92% strength and has a $1M verbal indication pending diligence.`; return `I found ${profiles.length} LP profiles in the fundraising memory. Ask about a specific LP, follow-ups this week, verbal commitments, relationship strength, data room access, introductions, interests, or concerns.`; }

function Title({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) { return <section className="page-title"><div><label>{eyebrow}</label><h1>{title}</h1><p>{copy}</p></div>{action}</section>; }
function Status({ value }: { value: Heat }) { return <span className={`status ${value.toLowerCase()}`}><i />{value}</span>; }
function Metric({ label, value, detail, tone = "" }: { label: string; value: string | number; detail: string; tone?: string }) { return <div className="stat"><div><span className={tone}><Target /></span><em className={tone}>{detail}</em></div><p>{label}</p><h2>{value}</h2></div>; }

function DashboardView({ profiles, tasks, feed, metrics, latestUploadId, go, openLP, openChat, openUpload }: { profiles: LP[]; tasks: Task[]; feed: Feed[]; metrics: { total: number; active: number; warm: number; cold: number; commitments: number; pipeline: number; open: number; overdue: number; score: number }; latestUploadId: string | null; go: (s: Screen) => void; openLP: (lp: LP) => void; openChat: () => void; openUpload: () => void }) { const focus = [...profiles].sort((a, b) => b.strength - a.strength).slice(0, 4); const uploaded = latestUploadId ? profiles.find((x) => x.id === latestUploadId) : null; return <><Title eyebrow="ZAS Ventures • Fund II" title="Remember every LP. Know exactly what to do next." copy="One live view of every relationship, commitment, and follow-up." action={<button className="ask" onClick={openChat}><Sparkles />Ask fundraising memory</button>} /><section className="demo-story panel"><div><span>PHASE 1 WORKFLOW</span><h2>{uploaded ? `${uploaded.name} is now connected across your fundraising memory.` : "Turn a meeting note into reviewed relationship intelligence."}</h2><p>{uploaded ? "The approved extraction updated the profile, activity, graph, follow-up task, metrics, and chat context together." : "Upload or paste a note, review the AI extraction, then approve it into FundraiseOS."}</p></div><button onClick={openUpload}><UploadCloud />{uploaded ? "Upload another note" : "Start extraction"}<ArrowRight /></button></section><section className="stats story-stats"><Metric label="LP profiles" value={metrics.total} detail={uploaded ? "+1 from approved extraction" : "15 per investor type"} tone="good" /><Metric label="Active LPs" value={metrics.active} detail={`${metrics.warm} warm relationships`} tone="good" /><Metric label="Open follow-ups" value={metrics.open} detail={`${metrics.overdue} overdue`} tone={metrics.overdue ? "risk" : "good"} /><Metric label="Outstanding commitments" value={metrics.commitments} detail={`${money(metrics.pipeline)} indicated`} /><Metric label="Fundraising health" value={metrics.score} detail="Calculated live" tone="good" /></section><section className="demo-grid"><div className="panel focus-panel"><div className="panel-head"><div><h2>Highest-leverage LPs</h2><p>Ranked from the same live relationship dataset.</p></div><button onClick={() => go("LP Directory")}>View directory <ArrowRight /></button></div>{focus.map((lp) => <button className="lp-row" key={lp.id} onClick={() => openLP(lp)}><span className="avatar" style={{ background: lp.color }}>{lp.initials}</span><p><b>{lp.name}</b><small>{lp.firm}</small></p><div><Status value={lp.status} /><small>{lp.interest}</small></div><p><b>{lp.next}</b><small className={lp.due === "Overdue" ? "overdue" : ""}>{lp.due}</small></p><ChevronRight /></button>)}</div><div className="panel signals story-feed"><div className="panel-head"><div><h2>Activity feed</h2><p>Every event is tied to a source memory.</p></div></div>{feed.map((a, i) => <div className="signal-row" key={a.title}><span><Zap /></span><div><b>{a.title}</b><p>{a.meta}</p><small>{a.tag}</small></div>{i === 0 && <i>NEW</i>}</div>)}</div></section><section className="next-action panel"><div><Clock3 /><p><span>NEXT BEST ACTION</span><b>{tasks.find((x) => !x.done)?.title}</b><small>{profiles.find((x) => x.id === tasks.find((t) => !t.done)?.lpId)?.name} · {tasks.find((x) => !x.done)?.due}</small></p></div><button onClick={() => go("Follow-ups")}>Open follow-up queue <ArrowRight /></button></section></>; }

function Directory({ profiles, query, openLP }: { profiles: LP[]; query: string; openLP: (lp: LP) => void }) { const [type, setType] = useState("All"); const rows = profiles.filter((x) => (type === "All" || x.type === type) && (`${x.name} ${x.firm} ${x.interest}`).toLowerCase().includes(query.toLowerCase())); return <><Title eyebrow="LIVE RELATIONSHIP DATA" title={`${profiles.length} LP profiles`} copy="Every row is backed by introductions, meetings, interests, concerns, and next actions." /><div className="directory-tools panel"><div><span>Investor type</span>{["All", ...investorTypes].map((x) => <button className={type === x ? "on" : ""} onClick={() => setType(x)} key={x}>{x}</button>)}</div></div><section className="directory panel"><div className="table-head"><span>Investor</span><span>Relationship</span><span>Interests</span><span>Last contact</span><span>Next action</span><span /></div>{rows.map((lp) => <button className="table-row" key={lp.id} onClick={() => openLP(lp)}><div><span className="avatar" style={{ background: lp.color }}>{lp.initials}</span><p><b>{lp.name}</b><small>{lp.firm} · {lp.type}</small></p></div><div><Status value={lp.status} /><small>{lp.strength}% strength</small></div><span>{lp.interest}</span><span>{lp.last}</span><p><b>{lp.next}</b><small>{lp.due}</small></p><ChevronRight /></button>)}</section></>; }
function Followups({ profiles, tasks, toggle }: { profiles: LP[]; tasks: Task[]; toggle: (id: string) => void }) { const open = tasks.filter((x) => !x.done), overdue = open.filter((x) => x.due === "Overdue").length; return <><Title eyebrow="FOLLOW-UP INTELLIGENCE" title={`${open.length} open follow-ups`} copy={`${overdue} overdue. Completing a task updates the dashboard immediately.`} /><section className="follow-summary"><Metric label="Open" value={open.length} detail="All active tasks" /><Metric label="Overdue" value={overdue} detail="Needs attention" tone={overdue ? "risk" : "good"} /><Metric label="Completed" value={tasks.filter((x) => x.done).length} detail="This demo session" tone="good" /></section><section className="panel follow-list"><div className="follow-label">PRIORITY QUEUE</div>{tasks.map((task) => { const lp = profiles.find((x) => x.id === task.lpId); if (!lp) return null; return <div className={`follow-row ${task.done ? "done" : ""}`} key={task.id}><button aria-label={`${task.done ? "Reopen" : "Complete"} ${task.title}`} onClick={() => toggle(task.id)}><Check /></button><span className="avatar" style={{ background: lp.color }}>{lp.initials}</span><p><b>{task.title}</b><small>{lp.name} · {lp.firm}</small></p><span className={task.due === "Overdue" ? "overdue" : ""}>{task.due}</span><em>{lp.status} · {lp.strength}%</em></div>; })}</section></>; }
function Graph({ profiles, latestUploadId, openChat }: { profiles: LP[]; latestUploadId: string | null; openChat: () => void }) { const lp = (latestUploadId && profiles.find((x) => x.id === latestUploadId)) || profiles[0]; const labels = [lp.name, lp.source, lp.event, lp.meetings[0].title, lp.next], kinds = ["LP", "Introducer", "Event", "Meeting", "Follow-up"], pos = [[50, 42], [20, 20], [18, 73], [77, 20], [80, 72]]; const [selected, setSelected] = useState(0); return <><Title eyebrow="RELATIONSHIP GRAPH" title={latestUploadId ? `${lp.name} is now connected.` : "From introduction to next action."} copy="This graph is generated from the same approved meeting memory used everywhere else." /><section className="graph-layout"><div className="graph-canvas panel"><div className="graph-tools"><strong>{lp.name} relationship path</strong><span>{profiles.length} LPs · live memory graph</span></div><div className="network"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="50" y1="42" x2="20" y2="20" /><line x1="20" y1="20" x2="18" y2="73" /><line x1="18" y1="73" x2="77" y2="20" /><line x1="77" y1="20" x2="80" y2="72" /></svg>{labels.map((label, i) => <button key={`${label}-${i}`} onClick={() => setSelected(i)} className={`node ${kinds[i].toLowerCase()} ${selected === i ? "selected" : ""}`} style={{ left: `${pos[i][0]}%`, top: `${pos[i][1]}%` }}><i>{i === 0 ? lp.initials : kinds[i][0]}</i><span>{label}</span><small>{kinds[i]}</small></button>)}</div></div><aside className="graph-detail panel"><span className="detail-kind">{kinds[selected]}</span><h2>{labels[selected]}</h2><div className="connection-list"><h3>MEMORY PATH</h3><div><Users /><p><b>Source: {lp.source}</b><small>{lp.event}</small></p></div><div><BrainCircuit /><p><b>{lp.meetings[0].title}</b><small>{lp.meetings[0].note}</small></p></div><div><Check /><p><b>{lp.next}</b><small>Due {lp.due}</small></p></div></div><button className="ask-connection" onClick={openChat}><Sparkles />Ask about {lp.name.split(" ")[0]}</button></aside></section></>; }

function Upload({ close, approve }: { close: () => void; approve: (extraction: Extraction, rawText: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const ready = Boolean(note.trim() || file);
  const selectFile = (nextFile?: File | null) => {
    if (!nextFile) return;
    setFile(nextFile);
    setError("");
  };
  const setField = <K extends keyof Extraction>(key: K, value: Extraction[K]) => setExtraction((x) => x ? { ...x, [key]: value } : x);
  const extract = async (demo = false) => {
    setBusy(true); setError("");
    if (demo) { setNote(sampleMeetingNote); setRawText(sampleMeetingNote); setExtraction(sampleExtraction); setBusy(false); return; }
    const form = new FormData();
    if (file) form.append("file", file);
    form.append("note", note);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setExtraction(data.extraction);
      setRawText(data.rawText || note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setBusy(false);
    }
  };
  return <div className="backdrop"><div className="upload"><div className="modal-head"><div><span>{extraction ? "REVIEW EXTRACTION" : "AI MEETING EXTRACTION"}</span><h2>{extraction ? "Review before saving" : "Upload or paste meeting note"}</h2><small>{extraction ? "Approve or edit the structured JSON fields." : "Upload a note file or paste a transcript, then extract structured fundraising memory."}</small></div><button aria-label="Close upload" onClick={close}><X /></button></div>{!extraction ? <section className="phase-upload-panel"><button type="button" className="drop phase-drop" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectFile(e.dataTransfer.files?.[0]); }}><input ref={input} hidden type="file" accept=".txt,.md,.markdown,.pdf,.docx" onChange={(e) => selectFile(e.target.files?.[0])} /><UploadCloud /><b>Drag & drop PDF, DOCX or TXT here</b><p>OR</p><span>Browse Files</span><small>Accepted: PDF • DOCX • TXT • Markdown</small></button><textarea className="phase-note-input" value={note} onChange={(e) => { setNote(e.target.value); setError(""); }} placeholder="Paste meeting notes here..." />{file && <div className="phase-file-ready"><span><FileText /></span><p><small>Selected file:</small><b>{file.name}</b></p><em><Check />Ready for AI extraction</em><button aria-label="Remove selected file" onClick={() => setFile(null)}><X /></button></div>}<button className="sample-upload" onClick={() => extract(true)}><Sparkles />Use sample Nora Ellis meeting note</button>{error && <p className="phase-upload-error">{error}</p>}</section> : <ReviewExtraction extraction={extraction} setField={setField} />}<div className="modal-actions"><button onClick={close}>Cancel</button>{!extraction ? <button className="primary" disabled={busy || !ready} onClick={() => extract(false)}><Sparkles />{busy ? "Extracting..." : "Extract with AI"}</button> : <button className="primary" onClick={() => approve(extraction, rawText || note || sampleMeetingNote)}>Approve and update FundraiseOS <ArrowRight /></button>}</div></div></div>;
}
function ReviewExtraction({ extraction, setField }: { extraction: Extraction; setField: <K extends keyof Extraction>(key: K, value: Extraction[K]) => void }) { const inputStyle = { width: "100%", border: "1px solid #e0e2e3", borderRadius: 8, padding: "8px 10px", fontSize: 11 } as const; const field = (label: string, node: React.ReactNode) => <label style={{ display: "grid", gap: 5, fontSize: 9, color: "#7f8794" }}><span>{label}</span>{node}</label>; return <div style={{ padding: 22, display: "grid", gap: 12, maxHeight: "58vh", overflow: "auto" }}><div className="demo-impact"><span>CLEAN JSON</span><pre style={{ whiteSpace: "pre-wrap", fontSize: 10, margin: 0 }}>{extractionToText(extraction)}</pre></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{field("LP name", <input style={inputStyle} value={extraction.lpName} onChange={(e) => setField("lpName", e.target.value)} />)}{field("Firm / organization", <input style={inputStyle} value={extraction.firm} onChange={(e) => setField("firm", e.target.value)} />)}{field("Investor type", <select style={inputStyle} value={extraction.investorType} onChange={(e) => setField("investorType", e.target.value as LPType)}>{investorTypes.map((x) => <option key={x}>{x}</option>)}</select>)}{field("Meeting date", <input style={inputStyle} value={extraction.meetingDate} onChange={(e) => setField("meetingDate", e.target.value)} />)}{field("Check size", <input style={inputStyle} value={extraction.checkSize} onChange={(e) => setField("checkSize", e.target.value)} />)}{field("Follow-up due date", <input style={inputStyle} value={extraction.followUpDueDate} onChange={(e) => setField("followUpDueDate", e.target.value)} />)}{field("Sentiment", <select style={inputStyle} value={extraction.sentiment} onChange={(e) => setField("sentiment", e.target.value as Extraction["sentiment"])}>{["Positive", "Neutral", "Negative"].map((x) => <option key={x}>{x}</option>)}</select>)}{field("Confidence score", <input style={inputStyle} type="number" min="0" max="1" step="0.01" value={extraction.confidenceScore} onChange={(e) => setField("confidenceScore", Number(e.target.value))} />)}</div>{field("Interest areas", <textarea style={inputStyle} value={extraction.interestAreas.join("\n")} onChange={(e) => setField("interestAreas", textToList(e.target.value))} />)}{field("Questions asked", <textarea style={inputStyle} value={extraction.questionsAsked.join("\n")} onChange={(e) => setField("questionsAsked", textToList(e.target.value))} />)}{field("Concerns raised", <textarea style={inputStyle} value={extraction.concernsRaised.join("\n")} onChange={(e) => setField("concernsRaised", textToList(e.target.value))} />)}{field("Documents requested", <textarea style={inputStyle} value={extraction.documentsRequested.join("\n")} onChange={(e) => setField("documentsRequested", textToList(e.target.value))} />)}{field("Commitment signals", <textarea style={inputStyle} value={extraction.commitmentSignals} onChange={(e) => setField("commitmentSignals", e.target.value)} />)}{field("Next action", <input style={inputStyle} value={extraction.nextAction} onChange={(e) => setField("nextAction", e.target.value)} />)}{field("Summary", <textarea style={inputStyle} value={extraction.summary} onChange={(e) => setField("summary", e.target.value)} />)}</div>; }
function Profile({ lp, close, openChat }: { lp: LP; close: () => void; openChat: () => void }) { return <div className="drawer-bg" onClick={close}><aside className="profile wide" onClick={(e) => e.stopPropagation()}><header><span>LP PROFILE · LIVE MEMORY</span><button aria-label="Close profile" onClick={close}><X /></button></header><section className="profile-hero"><span className="avatar big" style={{ background: lp.color }}>{lp.initials}</span><h2>{lp.name}</h2><p>{lp.firm} · {lp.type}</p><Status value={lp.status} /><div className="strength"><i><em style={{ width: `${lp.strength}%` }} /></i><span>{lp.strength}% relationship strength</span></div></section><div className="profile-stats"><p><small>Potential commitment</small><b>{lp.commitmentAmount ? money(lp.commitmentAmount) : "—"}</b></p><p><small>Last contact</small><b>{lp.last}</b></p></div><section className="profile-section"><h3>Relationship intelligence</h3><dl><div><dt>Introduced by</dt><dd>{lp.source}<small>{lp.event}</small></dd></div><div><dt>Investment interests</dt><dd>{lp.interest}</dd></div><div><dt>Key concern</dt><dd>{lp.concern}</dd></div><div><dt>Next best action</dt><dd>{lp.next}<small>{lp.due}</small></dd></div></dl></section><section className="profile-section meeting-history"><h3>Meeting history</h3>{lp.meetings.map((m) => <div key={`${m.date}-${m.title}`}><i /><p><b>{m.title}</b><small>{m.date}</small><span>{m.note}</span></p></div>)}</section><button className="profile-ask" onClick={openChat}><Sparkles />Ask memory about {lp.name.split(" ")[0]}</button></aside></div>; }
function Chat({ profiles, tasks, close }: { profiles: LP[]; tasks: Task[]; close: () => void }) { const [q, setQ] = useState(""), [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]); const ask = (text: string) => { const answer = answerMemoryQuestion(text, profiles, tasks); setMessages((m) => [...m, { role: "user", text }, { role: "ai", text: answer }]); setQ(""); }; return <aside className="chat"><div className="chat-head"><span><Sparkles /></span><p><b>Fundraising memory</b><small>● Grounded in {profiles.length} LP profiles</small></p><button aria-label="Close chat" onClick={close}><X /></button></div><div className="chat-body">{messages.length ? <div className="messages">{messages.map((m, i) => <div className={m.role} key={i}><span style={{ whiteSpace: "pre-line" }}>{m.text}</span>{m.role === "ai" && <small><FileText />Source: live memory state</small>}</div>)}</div> : <><div className="chat-intro"><BrainCircuit /><h2>Ask what changed—and what to do next.</h2><p>Answers use the same relationship state as the dashboard and graph.</p></div><div className="suggestions">{["Tell me about Elena Park", "Who needs follow-up this week?", "Which LPs have verbal commitments?"].map((x) => <button key={x} onClick={() => ask(x)}>{x}<ArrowRight /></button>)}</div></>}</div><form onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q); }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about the fundraising memory..." /><button aria-label="Send question"><Send /></button></form></aside>; }

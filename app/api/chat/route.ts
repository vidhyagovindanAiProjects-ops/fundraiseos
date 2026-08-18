import OpenAI from "openai";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { groundedSystemPrompt, groundedWorkspaceAnswer, groundingPreflight } from "@/lib/chat-grounding";
import { buildAuthenticatedWorkspaceContext, requiresServerWorkspaceContext } from "@/lib/workspace-security";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini";
const PROMPT_VERSION = "ask-memory-grounded-v3";
const demoContext = `Elena Park at Northstar Family Office was introduced by Marcus Chen. She is interested in AI infrastructure, asked for the data room, and is concerned about attribution clarity. David Mercer at Hawthorne Endowment asked for founder references and focuses on enterprise AI. Aisha Patel at Crescent Peak is interested in AI and developer tools and asked for a partner meeting.`;

function compact(value: unknown, maxChars = 24000) {
  const text = JSON.stringify(value ?? {}, null, 2);
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n...[truncated]` : text;
}

type CookieToSet = Parameters<SetAllCookies>[0][number];

function jsonWithAuthCookies(body: unknown, init: ResponseInit | undefined, cookiesToSet: CookieToSet[]) {
  const response = NextResponse.json(body, init);
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

async function loadLiveWorkspaceMemory(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookiesToSet: CookieToSet[] = [];
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      error: NextResponse.json({ error: "Live Ask LP Brain requires Supabase authentication, but Supabase is not configured.", code: "missing_supabase_config" }, { status: 501 }),
      cookiesToSet,
    };
  }
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(nextCookies: Parameters<SetAllCookies>[0]) {
        cookiesToSet.push(...nextCookies);
      },
    },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const ownerId = userData.user?.id;
  if (userError || !ownerId) {
    return {
      error: jsonWithAuthCookies({ error: "Sign in before using Ask LP Brain with My Fund Workspace.", code: "authentication_required" }, { status: 401 }, cookiesToSet),
      cookiesToSet,
    };
  }
  const workspace = await supabase.from("workspaces").select("*").eq("owner_id", ownerId).eq("mode", "live").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (workspace.error) {
    return {
      error: jsonWithAuthCookies({ error: "Could not load your My Fund Workspace from Supabase. Ask LP Brain did not use demo or local fallback data.", code: "workspace_load_failed" }, { status: 502 }, cookiesToSet),
      cookiesToSet,
    };
  }
  if (!workspace.data) {
    return {
      memory: { currentDateIso: new Date().toISOString(), workspace: null, fundDNA: null, lpProfiles: [], followUpTasks: [], relationshipIntelligence: {} },
      cookiesToSet,
    };
  }
  const workspaceId = workspace.data.id;
  const [fund, lps, timeline, paths, feedback, outcomes] = await Promise.all([
    supabase.from("fund_dna_records").select("*").eq("owner_id", ownerId).eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("live_lp_records").select("*").eq("owner_id", ownerId).eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
    supabase.from("relationship_timeline_entries").select("*").eq("owner_id", ownerId).eq("workspace_id", workspaceId).order("entry_date", { ascending: false }),
    supabase.from("relationship_paths").select("*").eq("owner_id", ownerId).eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
    supabase.from("recommendation_feedback").select("*").eq("owner_id", ownerId).eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("lp_outcome_events").select("*").eq("owner_id", ownerId).eq("workspace_id", workspaceId).order("occurred_at", { ascending: false }),
  ]);
  const failed = [fund, lps, timeline, paths, feedback, outcomes].find((result) => result.error);
  if (failed?.error) {
    return {
      error: jsonWithAuthCookies({ error: "Could not load complete My Fund Workspace context from Supabase. Ask LP Brain did not use demo or local fallback data.", code: "workspace_context_load_failed" }, { status: 502 }, cookiesToSet),
      cookiesToSet,
    };
  }
  return {
    memory: buildAuthenticatedWorkspaceContext({
      ownerId,
      workspace: workspace.data,
      fundRecord: fund.data,
      lpRows: lps.data,
      timelineRows: timeline.data,
      pathRows: paths.data,
      feedbackRows: feedback.data,
      outcomeRows: outcomes.data,
    }),
    cookiesToSet,
  };
}

export async function POST(request: NextRequest) {
  let body: { question?: string; mode?: string; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const { question, mode, context } = body;
  if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 });

  if (!process.env.OPENAI_API_KEY) {
    if (mode === "demo") {
      return NextResponse.json({
        answer: `Demo Workspace answer from clearly labeled demo memory: ${demoContext}`,
        sources: ["Demo LP profiles", "Demo meeting notes"],
        mode: "demo",
      });
    }
    return NextResponse.json({
      error: "AI memory is unavailable because the server-side AI provider is not configured.",
      code: "missing_openai_key",
    }, { status: 501 });
  }

  const liveLoad = requiresServerWorkspaceContext(mode) ? await loadLiveWorkspaceMemory(request) : null;
  if (liveLoad?.error) return liveLoad.error;

  const memory = liveLoad?.memory ?? context ?? (mode === "demo" ? { demoMemory: demoContext } : null);
  const responseCookies = liveLoad?.cookiesToSet || [];
  if (!memory) {
    return jsonWithAuthCookies({
      answer: "Insufficient workspace evidence: no workspace context was supplied. I can only answer using LPs, people, organizations, meetings, commitments, relationship paths, and dates already in the workspace.",
      sources: ["Fundraising memory"],
      trace: {
        model: "grounding-preflight",
        promptVersion: PROMPT_VERSION,
        timestamp: new Date().toISOString(),
        sourceRecordIds: [],
        outputStatus: "insufficient_workspace_evidence",
      },
    }, undefined, responseCookies);
  }
  const groundingBlock = groundingPreflight(question, memory);
  if (groundingBlock) {
    console.info("[ask-memory] Grounding preflight blocked answer", {
      promptVersion: PROMPT_VERSION,
      reason: groundingBlock.reason,
      hasContext: Boolean(memory),
    });
    return jsonWithAuthCookies({
      answer: groundingBlock.answer,
      sources: ["Fundraising memory"],
      trace: {
        model: "grounding-preflight",
        promptVersion: PROMPT_VERSION,
        timestamp: new Date().toISOString(),
        sourceRecordIds: ["memory-context"],
        outputStatus: "insufficient_workspace_evidence",
      },
    }, undefined, responseCookies);
  }

  const groundedAnswer = groundedWorkspaceAnswer(question, memory);
  if (groundedAnswer) {
    console.info("[ask-memory] Grounded workspace answer generated", {
      promptVersion: PROMPT_VERSION,
      reason: groundedAnswer.reason,
      hasContext: Boolean(memory),
    });
    return jsonWithAuthCookies({
      answer: groundedAnswer.answer,
      sources: ["Fundraising memory"],
      trace: {
        model: "grounding-deterministic",
        promptVersion: PROMPT_VERSION,
        timestamp: new Date().toISOString(),
        sourceRecordIds: ["memory-context"],
        outputStatus: "grounded_workspace_answer",
      },
    }, undefined, responseCookies);
  }

  console.info("[ask-memory] OpenAI request started", {
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    hasContext: Boolean(memory),
    questionLength: question.length,
  });

  let completion;
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: groundedSystemPrompt(),
        },
        {
          role: "user",
          content: `Fundraising memory context:\n${compact(memory)}\n\nUser question:\n${question}`,
        },
      ],
      temperature: 0.2,
    });
    console.info("[ask-memory] OpenAI request succeeded", {
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      finishReason: completion.choices[0]?.finish_reason,
    });
  } catch (error) {
    console.error("[ask-memory] OpenAI request failed", {
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      message: error instanceof Error ? error.message : "Unknown OpenAI error",
    });
    return jsonWithAuthCookies({
      error: "Ask LP Brain could not reach the AI provider. Please try again or check the server logs.",
      code: "openai_request_failed",
    }, { status: 502 }, responseCookies);
  }

  return jsonWithAuthCookies({
    answer: completion.choices[0]?.message?.content || "Ask LP Brain did not return an answer.",
    sources: ["Fundraising memory"],
    trace: {
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      timestamp: new Date().toISOString(),
      sourceRecordIds: ["memory-context"],
      outputStatus: "succeeded",
    },
  }, undefined, responseCookies);
}

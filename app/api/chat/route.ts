import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini";
const PROMPT_VERSION = "ask-memory-mvp-v2";
const demoContext = `Elena Park at Northstar Family Office was introduced by Marcus Chen. She is interested in AI infrastructure, asked for the data room, and is concerned about attribution clarity. David Mercer at Hawthorne Endowment asked for founder references and focuses on enterprise AI. Aisha Patel at Crescent Peak is interested in AI and developer tools and asked for a partner meeting.`;

function compact(value: unknown, maxChars = 24000) {
  const text = JSON.stringify(value ?? {}, null, 2);
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n...[truncated]` : text;
}

export async function POST(request: Request) {
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

  const memory = context ?? { demoMemory: demoContext };
  console.info("[ask-memory] OpenAI request started", {
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    hasContext: Boolean(context),
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
          content: [
            "You are LP Brain, an AI-native LP discovery and relationship intelligence assistant for emerging venture fund managers.",
            "Answer the user's exact question using only the supplied fundraising memory context.",
            "Use Fund DNA, LP profiles, relationship intelligence, strategy, opportunities, outcomes, and tasks when present.",
            "If the user requests a count or format, follow it exactly.",
            "Separate facts from recommendations when useful.",
            "Do not invent LP preferences, commitments, relationship paths, or external investor data.",
            "Return clean concise prose or bullets. Do not return raw JSON.",
          ].join(" "),
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
    return NextResponse.json({
      error: "Ask LP Brain could not reach the AI provider. Please try again or check the server logs.",
      code: "openai_request_failed",
    }, { status: 502 });
  }

  return NextResponse.json({
    answer: completion.choices[0]?.message?.content || "Ask LP Brain did not return an answer.",
    sources: ["Fundraising memory"],
    trace: {
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      timestamp: new Date().toISOString(),
      sourceRecordIds: ["memory-context"],
      outputStatus: "succeeded",
    },
  });
}

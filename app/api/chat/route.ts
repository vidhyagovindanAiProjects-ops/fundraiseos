import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini";
const PROMPT_VERSION = "ask-memory-mvp-v2";
const demoContext = `Elena Park at Northstar Family Office was introduced by Marcus Chen. She is interested in AI infrastructure, asked for the data room, and is concerned about attribution clarity. David Mercer at Hawthorne Endowment asked for founder references and focuses on enterprise AI. Aisha Patel at Crescent Peak is interested in AI and developer tools and asked for a partner meeting.`;

export async function POST(request: Request) {
  let body: { question?: string; mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const { question, mode } = body;
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

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "Answer only from the fundraising memory supplied. Be concise and name sources. Surface assumptions and evidence. Do not invent LP preferences, commitments, or relationship paths." },
      { role: "user", content: `Memory:\n${demoContext}\n\nQuestion: ${question}` },
    ],
    temperature: 0.2,
  });

  return NextResponse.json({
    answer: completion.choices[0].message.content,
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

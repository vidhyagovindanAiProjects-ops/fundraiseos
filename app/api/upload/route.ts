import OpenAI from "openai";
import { NextResponse } from "next/server";
import { normalizeMeetingExtraction, validateMeetingExtraction } from "@/lib/ai-schemas";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MODEL = process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini";
const PROMPT_VERSION = "meeting-intelligence-mvp-v1";

function clean(value: unknown) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, 60000);
}

async function extractSimplePdfText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const decoded = buffer.toString("latin1");
  return Array.from(decoded.matchAll(/\(([^()]{5,})\)\s*Tj/g)).map((match) => match[1]).join(" ").replace(/\\([()\\])/g, "$1").replace(/\s+/g, " ").trim();
}

async function readMeetingText(form: FormData) {
  const pasted = clean(form.get("note"));
  const file = form.get("file");
  if (pasted) return { text: pasted, document: { name: "Pasted meeting note", size: pasted.length, type: "text/plain" } };
  if (!(file instanceof File) || file.size === 0) return { text: "", document: null };
  if (file.size > MAX_FILE_BYTES) return { text: "", document: { name: file.name, size: file.size, type: file.type || "unknown" }, error: "Meeting note file is too large. Maximum size is 8MB.", status: 413 };
  const lower = file.name.toLowerCase();
  const isText = file.type === "text/plain" || lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown");
  const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
  if (isText) return { text: clean(await file.text()), document: { name: file.name, size: file.size, type: file.type || "text/plain" } };
  if (isPdf) return { text: clean(await extractSimplePdfText(file)), document: { name: file.name, size: file.size, type: file.type || "application/pdf" } };
  return { text: "", document: { name: file.name, size: file.size, type: file.type || "unknown" }, error: "Upload TXT, Markdown, or PDF meeting notes, or paste the transcript text.", status: 415 };
}

async function createCompletion(client: OpenAI, note: string) {
  return client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `Prompt version ${PROMPT_VERSION}. Extract meeting intelligence for an emerging VC fundraising LP conversation. Return only JSON with keys: lpName, organization, lpType, conciseMeetingSummary, questionsAsked, objections, positiveSignals, negativeSignals, commitmentsOrPromises, followUpTasks, nextAction, nextActionDate, suggestedPipelineStage, assumptions, evidence. evidence must cite source snippets from the note for every material conclusion. Do not invent LP investment history, check size, preferences, or personal details. Do not change pipeline stage; only suggest one.`,
      },
      { role: "user", content: note },
    ],
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const read = await readMeetingText(form);
  if ("error" in read) return NextResponse.json({ error: read.error, document: read.document }, { status: read.status });
  if (!read.text) return NextResponse.json({ error: "Paste meeting notes or upload a TXT/Markdown/PDF note." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      error: "OPENAI_API_KEY is not configured. Meeting intelligence requires a server-side AI provider. Your note was not analyzed.",
      code: "missing_openai_key",
      document: read.document,
    }, { status: 501 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let content = "{}";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await createCompletion(client, read.text);
      content = completion.choices[0]?.message?.content || "{}";
      const extraction = normalizeMeetingExtraction(JSON.parse(content) as Record<string, unknown>);
      const missing = validateMeetingExtraction(extraction);
      if (missing.length) throw new Error(`Missing required meeting fields: ${missing.join(", ")}`);
      const legacyExtraction = {
        lpName: clean((JSON.parse(content) as Record<string, unknown>).lpName),
        firm: clean((JSON.parse(content) as Record<string, unknown>).organization),
        investorType: clean((JSON.parse(content) as Record<string, unknown>).lpType) || "Family Office",
        meetingDate: "",
        interestAreas: extraction.positiveSignals,
        checkSize: "",
        questionsAsked: extraction.questionsAsked,
        concernsRaised: extraction.objections,
        documentsRequested: extraction.followUpTasks.filter((task) => /deck|memo|reference|data room|track record/i.test(task)),
        commitmentSignals: extraction.commitmentsOrPromises.join("; "),
        nextAction: extraction.nextAction,
        followUpDueDate: extraction.nextActionDate,
        sentiment: extraction.negativeSignals.length > extraction.positiveSignals.length ? "Negative" : extraction.positiveSignals.length ? "Positive" : "Neutral",
        confidenceScore: 0.7,
        summary: extraction.conciseMeetingSummary,
      };
      return NextResponse.json({
        document: read.document,
        extraction: legacyExtraction,
        meetingIntelligence: extraction,
        rawText: read.text,
        source: "openai",
        trace: {
          promptVersion: PROMPT_VERSION,
          model: MODEL,
          timestamp: new Date().toISOString(),
          sourceRecordIds: [read.document?.name || "pasted-note"],
          outputStatus: "succeeded",
        },
      });
    } catch (error) {
      if (attempt === 1) {
        return NextResponse.json({
          error: error instanceof Error ? error.message : "OpenAI returned invalid meeting JSON. Please retry.",
          raw: content,
          trace: { promptVersion: PROMPT_VERSION, model: MODEL, timestamp: new Date().toISOString(), sourceRecordIds: [read.document?.name || "pasted-note"], outputStatus: "failed" },
        }, { status: 502 });
      }
    }
  }
}

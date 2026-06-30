import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const investorTypes = ["Family Office", "Fund of Funds", "Angel Investor", "RIA", "Foundation"] as const;
const sentiments = ["Positive", "Neutral", "Negative"] as const;

const emptyExtraction = {
  lpName: "",
  firm: "",
  investorType: "Family Office",
  meetingDate: "",
  interestAreas: [] as string[],
  checkSize: "",
  questionsAsked: [] as string[],
  concernsRaised: [] as string[],
  documentsRequested: [] as string[],
  commitmentSignals: "",
  nextAction: "",
  followUpDueDate: "",
  sentiment: "Neutral",
  confidenceScore: 0.7,
  summary: "",
};

function normalizeExtraction(raw: Record<string, unknown>) {
  const list = (value: unknown) =>
    Array.isArray(value)
      ? value.map(String).map((x) => x.trim()).filter(Boolean)
      : typeof value === "string" && value.trim()
        ? value.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)
        : [];
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const investorType = investorTypes.includes(raw.investorType as any) ? raw.investorType : emptyExtraction.investorType;
  const sentiment = sentiments.includes(raw.sentiment as any) ? raw.sentiment : emptyExtraction.sentiment;
  const confidence = Number(raw.confidenceScore);
  return {
    lpName: text(raw.lpName),
    firm: text(raw.firm),
    investorType,
    meetingDate: text(raw.meetingDate),
    interestAreas: list(raw.interestAreas),
    checkSize: text(raw.checkSize),
    questionsAsked: list(raw.questionsAsked),
    concernsRaised: list(raw.concernsRaised),
    documentsRequested: list(raw.documentsRequested),
    commitmentSignals: text(raw.commitmentSignals),
    nextAction: text(raw.nextAction),
    followUpDueDate: text(raw.followUpDueDate),
    sentiment,
    confidenceScore: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.7,
    summary: text(raw.summary),
  };
}

async function readMeetingText(form: FormData) {
  const pasted = String(form.get("note") || "").trim();
  const file = form.get("file");
  if (pasted) return { text: pasted, document: { name: "Pasted meeting note", size: pasted.length, type: "text/plain" } };
  if (!(file instanceof File)) return { text: "", document: null };
  const isText = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
  if (!isText) {
    return {
      text: "",
      document: { name: file.name, size: file.size, type: file.type || "unknown" },
      error: "For Phase 1, paste the transcript text or upload a .txt meeting note. PDF/DOCX parsing will be added later.",
    };
  }
  return { text: (await file.text()).trim(), document: { name: file.name, size: file.size, type: file.type || "text/plain" } };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const { text, document, error } = await readMeetingText(form);
  if (error) return NextResponse.json({ error, document }, { status: 415 });
  if (!text) return NextResponse.json({ error: "Paste a meeting note or upload a .txt transcript." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured. Add it to your environment to run real AI extraction, or use the demo fallback sample note.",
        code: "missing_openai_key",
        document,
      },
      { status: 501 },
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Extract fundraising meeting-note data for an emerging VC fund. Return only JSON with keys: lpName, firm, investorType, meetingDate, interestAreas, checkSize, questionsAsked, concernsRaised, documentsRequested, commitmentSignals, nextAction, followUpDueDate, sentiment, confidenceScore, summary. investorType must be one of Family Office, Fund of Funds, Angel Investor, RIA, Foundation. sentiment must be Positive, Neutral, or Negative. confidenceScore must be 0 to 1.",
      },
      { role: "user", content: text },
    ],
  });

  const content = completion.choices[0]?.message?.content || "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "OpenAI returned invalid JSON. Please retry.", raw: content }, { status: 502 });
  }

  return NextResponse.json({
    document,
    extraction: normalizeExtraction(parsed),
    rawText: text,
    source: "openai",
  });
}

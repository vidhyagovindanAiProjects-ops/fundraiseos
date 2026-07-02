import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const emptyFundDNA = {
  fundName: "",
  targetFundSize: "",
  stage: "",
  geography: "",
  sectorFocus: [] as string[],
  idealLPTypes: [] as string[],
  targetLPCheckSize: "",
  strongestDifferentiators: [] as string[],
  likelyLPObjections: [] as string[],
  suggestedFundraisingNarrative: "",
  confidenceScore: 0.75,
};

function list(value: unknown) {
  return Array.isArray(value)
    ? value.map(String).map((x) => x.trim()).filter(Boolean)
    : typeof value === "string" && value.trim()
      ? value.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)
      : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFundDNA(raw: Record<string, unknown>) {
  const confidence = Number(raw.confidenceScore);
  return {
    fundName: text(raw.fundName),
    targetFundSize: text(raw.targetFundSize),
    stage: text(raw.stage),
    geography: text(raw.geography),
    sectorFocus: list(raw.sectorFocus),
    idealLPTypes: list(raw.idealLPTypes),
    targetLPCheckSize: text(raw.targetLPCheckSize),
    strongestDifferentiators: list(raw.strongestDifferentiators),
    likelyLPObjections: list(raw.likelyLPObjections),
    suggestedFundraisingNarrative: text(raw.suggestedFundraisingNarrative),
    confidenceScore: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : emptyFundDNA.confidenceScore,
  };
}

async function readFundMaterials(form: FormData) {
  const pasted = String(form.get("materials") || "").trim();
  const file = form.get("file");
  if (pasted) return { text: pasted, document: { name: "Pasted fund materials", size: pasted.length, type: "text/plain" } };
  if (!(file instanceof File)) return { text: "", document: null };
  const lower = file.name.toLowerCase();
  const isText = file.type === "text/plain" || lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown");
  if (!isText) {
    return {
      text: "",
      document: { name: file.name, size: file.size, type: file.type || "unknown" },
      error: "Paste the fund deck/thesis text or upload a TXT/Markdown file. PDF/DOCX binary parsing is not enabled in this demo environment.",
    };
  }
  return { text: (await file.text()).trim(), document: { name: file.name, size: file.size, type: file.type || "text/plain" } };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const { text: materials, document, error } = await readFundMaterials(form);
  if (error) return NextResponse.json({ error, document }, { status: 415 });
  if (!materials) return NextResponse.json({ error: "Paste fund materials or upload a TXT/Markdown fund memo." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured. Add it to your environment to run real Fund DNA extraction, or use the demo fallback.",
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
          "You extract a structured Fund DNA profile for an emerging venture fund and return only JSON. Required keys: fundName, targetFundSize, stage, geography, sectorFocus, idealLPTypes, targetLPCheckSize, strongestDifferentiators, likelyLPObjections, suggestedFundraisingNarrative, confidenceScore. sectorFocus, idealLPTypes, strongestDifferentiators, and likelyLPObjections must be arrays of strings. confidenceScore must be 0 to 1.",
      },
      { role: "user", content: materials },
    ],
  });

  const content = completion.choices[0]?.message?.content || "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "OpenAI returned invalid Fund DNA JSON. Please retry.", raw: content }, { status: 502 });
  }

  return NextResponse.json({
    document,
    fundDNA: normalizeFundDNA(parsed),
    rawText: materials,
    source: "openai",
  });
}

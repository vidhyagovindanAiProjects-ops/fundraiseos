import { NextResponse } from "next/server";
import { normalizeFundDNA, validateFundDNA } from "@/lib/ai-schemas";
import { generateStructuredJSON, MissingAIProviderError } from "@/lib/server-ai";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MODEL = process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini";
const PROMPT_VERSION = "fund-dna-mvp-v1";

function cleanInput(value: FormDataEntryValue | null) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, 60000);
}

async function extractPdfText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const decoded = buffer.toString("latin1");
  const chunks = Array.from(decoded.matchAll(/\(([^()]{8,})\)\s*Tj/g)).map((match) => match[1]);
  const tjChunks = Array.from(decoded.matchAll(/\[((?:.|\n){8,}?)\]\s*TJ/g)).flatMap((match) => Array.from(match[1].matchAll(/\(([^()]{3,})\)/g)).map((part) => part[1]));
  return [...chunks, ...tjChunks].join(" ").replace(/\\([()\\])/g, "$1").replace(/\s+/g, " ").trim();
}

async function readFundMaterials(form: FormData) {
  const fields = {
    fundName: cleanInput(form.get("fundName")),
    targetFundSize: cleanInput(form.get("targetFundSize")),
    fundStage: cleanInput(form.get("fundStage")),
    sectors: cleanInput(form.get("sectors")),
    geography: cleanInput(form.get("geography")),
    typicalInvestmentCheck: cleanInput(form.get("typicalInvestmentCheck")),
    gpBackground: cleanInput(form.get("gpBackground")),
    investmentThesis: cleanInput(form.get("investmentThesis")),
    pastedMaterials: cleanInput(form.get("materials")),
  };
  const file = form.get("file");
  let pdfText = "";
  let document = null as null | { name: string; size: number; type: string; extractedTextLength: number };
  if (file instanceof File && file.size > 0) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return { error: "Upload a PDF fund deck. TXT fields can be pasted into the form.", status: 415, fields, document };
    if (file.size > MAX_FILE_BYTES) return { error: "PDF file is too large. Maximum size is 12MB.", status: 413, fields, document };
    pdfText = await extractPdfText(file);
    document = { name: file.name, size: file.size, type: file.type || "application/pdf", extractedTextLength: pdfText.length };
  }
  const text = [
    `Fund name: ${fields.fundName}`,
    `Target fund size: ${fields.targetFundSize}`,
    `Fund stage: ${fields.fundStage}`,
    `Investment sectors: ${fields.sectors}`,
    `Geography: ${fields.geography}`,
    `Typical investment check: ${fields.typicalInvestmentCheck}`,
    `GP background: ${fields.gpBackground}`,
    `Investment thesis: ${fields.investmentThesis}`,
    fields.pastedMaterials ? `Additional pasted materials:\n${fields.pastedMaterials}` : "",
    pdfText ? `Extracted PDF deck text:\n${pdfText}` : "",
  ].filter(Boolean).join("\n\n");
  return { text, fields, document };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const read = await readFundMaterials(form);
  if ("error" in read) return NextResponse.json({ error: read.error, document: read.document }, { status: read.status });
  if (!read.text.replace(/Fund name:|Target fund size:|Fund stage:|Investment sectors:|Geography:|Typical investment check:|GP background:|Investment thesis:/g, "").trim()) {
    return NextResponse.json({ error: "Enter fund details or upload a PDF fund deck before generating Fund DNA." }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      error: "OPENAI_API_KEY is not configured. Fund DNA generation requires a server-side AI provider. Your inputs were not analyzed.",
      code: "missing_openai_key",
      document: read.document,
      inputPreview: read.fields,
    }, { status: 501 });
  }

  try {
      const result = await generateStructuredJSON({
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        sourceRecordIds: [read.document?.name || "manual-inputs"],
        system: "Extract a traceable Fund DNA record for a U.S. emerging venture fund. Return only JSON with keys: fundName, targetFundSize, fundStage, sectors, geography, typicalInvestmentCheck, gpBackground, investmentThesis, fundSummary, investmentStrategy, differentiation, idealLPProfile, likelyFundraisingStrengths, likelyLPConcerns, recommendedPositioning, confidence, evidence. confidence must be low, medium, or high. evidence must be an object mapping every material conclusion to short quoted or paraphrased snippets from the supplied inputs. Do not invent fund facts, LP preferences, check sizes, or performance data.",
        user: read.text,
      });
      if (!result.parsed) throw result.error || new Error("OpenAI returned invalid Fund DNA JSON. Please retry.");
      const parsed = result.parsed;
      const fundDNA = normalizeFundDNA(parsed);
      const missing = validateFundDNA(fundDNA);
      if (missing.length) throw new Error(`Missing required Fund DNA fields: ${missing.join(", ")}`);
      return NextResponse.json({
        document: read.document,
        fundDNA,
        source: "openai",
        trace: result.trace,
        rawText: read.text,
      });
  } catch (error) {
    if (error instanceof MissingAIProviderError) return NextResponse.json({ error: error.message, code: error.code }, { status: 501 });
    return NextResponse.json({
      error: error instanceof Error ? error.message : "OpenAI returned invalid Fund DNA JSON. Please retry.",
      trace: { promptVersion: PROMPT_VERSION, model: MODEL, timestamp: new Date().toISOString(), sourceRecordIds: [read.document?.name || "manual-inputs"], outputStatus: "failed" },
    }, { status: 502 });
  }
}

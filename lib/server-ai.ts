import OpenAI from "openai";

export type AITrace = {
  promptVersion: string;
  model: string;
  timestamp: string;
  sourceRecordIds: string[];
  outputStatus: "succeeded" | "failed";
};

export class MissingAIProviderError extends Error {
  code = "missing_openai_key";
  constructor(message = "OPENAI_API_KEY is not configured. Server-side AI is unavailable.") {
    super(message);
  }
}

export function aiTrace(promptVersion: string, model: string, sourceRecordIds: string[], outputStatus: AITrace["outputStatus"]): AITrace {
  return { promptVersion, model, timestamp: new Date().toISOString(), sourceRecordIds, outputStatus };
}

export async function generateStructuredJSON({
  model,
  promptVersion,
  sourceRecordIds,
  system,
  user,
  timeoutMs = 25000,
}: {
  model: string;
  promptVersion: string;
  sourceRecordIds: string[];
  system: string;
  user: string;
  timeoutMs?: number;
}) {
  if (!process.env.OPENAI_API_KEY) throw new MissingAIProviderError();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: timeoutMs });
  let raw = "{}";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `Prompt version ${promptVersion}. ${system}` },
          { role: "user", content: user },
        ],
      });
      raw = completion.choices[0]?.message?.content || "{}";
      return { parsed: JSON.parse(raw) as Record<string, unknown>, raw, trace: aiTrace(promptVersion, model, sourceRecordIds, "succeeded") };
    } catch (error) {
      if (attempt === 1) {
        return { parsed: null, raw, error, trace: aiTrace(promptVersion, model, sourceRecordIds, "failed") };
      }
    }
  }
  return { parsed: null, raw, error: new Error("AI generation failed"), trace: aiTrace(promptVersion, model, sourceRecordIds, "failed") };
}

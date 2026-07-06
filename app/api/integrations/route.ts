import { NextResponse } from "next/server";

const supportedSources = ["gmail", "calendar", "zoom", "google-meet", "docsend", "csv", "api"];

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const source = String(body.source || "").toLowerCase();
  const eventType = String(body.eventType || "");
  const lpName = String(body.lpName || "");

  if (!supportedSources.includes(source)) {
    return NextResponse.json({ error: "Unsupported integration source", supportedSources }, { status: 400 });
  }

  if (!eventType || !lpName) {
    return NextResponse.json({ error: "eventType and lpName are required" }, { status: 400 });
  }

  const organization = String(body.organization || "Unknown organization");
  const summary = String(body.summary || "Integration event received.");
  const nextAction = String(body.nextAction || "Review integration event and confirm next best action.");
  const confidence = Number(body.confidence || 0.74);

  return NextResponse.json({
    ok: true,
    mode: "demo",
    message: "Integration event accepted. In production this would enqueue downstream LP Brain memory updates.",
    event: { source, eventType, lpName, organization, summary, nextAction, confidence },
    downstreamUpdates: [
      "LP profile",
      "Relationship timeline",
      "Activity feed",
      "Follow-up tasks",
      "AI Priorities",
      "Ask Memory context",
      "Fundraising forecast",
    ],
  });
}

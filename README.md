# LP Brain

AI-native fundraising chief of staff for emerging venture fund managers.

## Current workflows

- Meeting-note extraction: upload or paste notes, review/edit structured JSON, then approve into memory.
- Fund DNA: paste fund materials, extract a structured fund profile, and approve it.
- LP Matching Intelligence: every LP and LP category is ranked against the approved Fund DNA.
- Ideal LP Personas: target and avoid categories with reasoning.
- Relationship Intelligence: warm introduction paths, community/event suggestions, and outreach strategy.
- Weekly Action Plan: focused actions to identify, access, and convert high-probability LPs.
- Ask LP Brain: grounded answers across Fund DNA, LP personas, fit scores, discovery, relationship paths, objections, and outreach drafts.
- Live MVP Workflow: fund setup, LP records, relationship timelines, meeting prep, meeting intelligence, and This Week priorities using one live workspace dataset.

## Environment variables

The demo works without keys. Real AI extraction requires:

```env
OPENAI_API_KEY=
OPENAI_EXTRACTION_MODEL=gpt-4o-mini
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

If `OPENAI_API_KEY` is missing, LP Brain shows a clear error and keeps demo fallback samples available.

## Demo path

1. Open the homepage.
2. Confirm the hero says: **Your AI Fundraising Chief of Staff.**
3. Open **Upload fund materials**.
4. Use the sample LP discovery package or paste fund deck / GP bio / thesis text.
5. Review Fund DNA, ideal LP profile, and recommended next actions.
6. Review **Ideal LP Personas**, **LP Matching Intelligence**, and the **Live MVP Workflow** on the homepage.
7. Open **Discover Investors** and review high-probability LP opportunities.
8. Open Ask LP Brain and try:
   - Who should I fundraise from?
   - Which LP categories have the highest probability?
   - Which LP categories should I avoid?
   - What is my most efficient fundraising path?
   - What should the GP do this week?
9. Open **Upload meeting note**.
10. Use the sample Nora Ellis meeting note.
11. Review/edit JSON and approve the relationship update.

## Build

```bash
pnpm build
```

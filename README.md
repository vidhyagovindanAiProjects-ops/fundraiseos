# LP Brain

AI Fundraising Chief of Staff for emerging venture funds.

## Current workflows

- Meeting-note extraction: upload or paste notes, review/edit structured JSON, then approve into memory.
- Fund DNA: paste fund materials, extract a structured fund profile, and approve it.
- LP Fit Scores: every LP is ranked against the approved Fund DNA.
- Best-Fit LPs: ranked list with fit explanations, likely objections, outreach angles, and next best action.
- Ask Memory: grounded answers across LP profiles, Fund DNA, follow-ups, objections, and outreach drafts.

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
2. Confirm the hero says: **Raise Your Venture Fund with an AI Chief of Staff**.
3. Open **Fund DNA**.
4. Use the sample fund materials.
5. Approve the Fund DNA JSON.
6. Review **Best-Fit LPs**.
7. Open Elena Park and review LP Fit Intelligence.
8. Open Ask Memory and try:
   - Which LPs are the best fit for this fund?
   - Why is Elena Park a good match?
   - Which LPs should the GP prioritize this week?
   - What objections should we prepare for?
   - Draft a first outreach email for Elena Park.
9. Open **Upload meeting note**.
10. Use the sample Nora Ellis meeting note.
11. Review/edit JSON and approve the update.

## Build

```bash
pnpm build
```

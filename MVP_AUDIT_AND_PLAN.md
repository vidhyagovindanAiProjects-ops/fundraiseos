# LP Brain MVP Audit and Implementation Notes

## Current architecture

- Next.js App Router application.
- Main product UI is `components/demo-mode.tsx`.
- Server AI routes:
  - `app/api/fund-dna/route.ts`
  - `app/api/upload/route.ts`
  - `app/api/chat/route.ts`
  - `app/api/integrations/route.ts`
- Supabase browser client helper: `lib/supabase/client.ts`.
- Existing database migration: `supabase/migrations/001_fundraiseos.sql`.
- Demo data seed: `lib/demo-data.ts`.

## Real vs mocked functionality before this pass

### Real

- Login can send Supabase OTP if `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.
- Fund DNA and meeting extraction routes can call OpenAI if `OPENAI_API_KEY` is configured.
- Initial Supabase migration contains RLS policies on demo-oriented LP, document, memory, and action tables.

### Mocked / hardcoded

- Most LP profiles, discovery results, relationship graph data, integrations, Ask Memory answers, and dashboard metrics were derived from in-memory demo records.
- Demo and live workspace separation was mostly visual.
- Meeting prep and weekly prioritization were not backed by explicit rules.

### Incomplete / risky

- PDF fund deck parsing was not enabled.
- The main UI did not persist live LP records, Fund DNA, timelines, or meeting intelligence.
- Relationship timeline CRUD did not exist for user-created LP records.
- “AI” responses were often demo fallback content.
- There were no unit/integration/e2e tests.

## Minimum implementation completed

- Added schema-normalized Fund DNA and Meeting Intelligence records with confidence labels and evidence maps.
- Added safer server-side AI routes:
  - upload validation by file type and size
  - simple PDF text extraction path
  - structured JSON output
  - retry/error handling
  - prompt version, model, timestamp, source IDs, and output status
  - no silent demo fallback when AI provider is missing
- Added `Live MVP Workflow` in the existing homepage:
  1. Fund setup with PDF deck upload and typed fund inputs.
  2. Fund DNA generation, JSON review/edit, and approval.
  3. Manual LP creation.
  4. CSV LP import with duplicate skipping.
  5. Relationship timeline add/edit/delete.
  6. Evidence-backed meeting prep.
  7. Meeting notes extraction, review, and save to timeline.
  8. Rules-based `This Week` priorities.
- Added local persistence fallback under `localStorage` key `lpbrain_live_mvp_workspace_v1`.
- Added Supabase migration `002_live_mvp.sql` for production persistence and tenant-isolated live records.
- Added unit tests for:
  - structured AI output parsing
  - CSV duplicate handling
  - This Week prioritization rules
  - evidence-backed meeting prep

## Database migrations

- `supabase/migrations/001_fundraiseos.sql`
- `supabase/migrations/002_live_mvp.sql`

The second migration adds:

- `workspaces`
- `fund_dna_records`
- `live_lp_records`
- `relationship_timeline_entries`
- `meeting_intelligence_records`
- `ai_generation_traces`

All new tables have owner-based RLS policies.

## Environment variables

```env
OPENAI_API_KEY=
OPENAI_EXTRACTION_MODEL=gpt-4o-mini
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

If `OPENAI_API_KEY` is missing, AI generation returns a visible setup error and does not pretend analysis succeeded.

## Setup and deployment

```bash
pnpm install
pnpm test
pnpm build
pnpm dev
```

For Supabase production persistence:

1. Apply migrations in `supabase/migrations`.
2. Configure Supabase auth.
3. Set Supabase and OpenAI environment variables in Vercel.
4. Deploy from the connected GitHub repository.

## Test results

Command:

```bash
node --experimental-strip-types --test tests/core.test.mjs
```

Result:

- 5 tests passed
- 0 failed

Production build:

```bash
next build
```

Result:

- Build completed successfully.

## Known limitations

- PDF extraction is intentionally simple and may not extract text from all compressed/scanned PDFs.
- Live MVP UI persists to localStorage unless Supabase wiring is extended from the migration into client CRUD calls.
- No OCR for scanned decks.
- No Gmail, calendar, LinkedIn, DocSend, data room, compliance, fund accounting, or portfolio management.
- No hidden claims of predictive accuracy or guaranteed closes.
- E2E browser automation is still needed for the full 10-step ship criteria after Vercel deployment.

## Prioritized backlog

### Required before pilot

- Wire the live MVP workflow to Supabase CRUD instead of localStorage fallback.
- Add authenticated workspace selector and sign-out UX.
- Add real PDF parser/OCR fallback for scanned or compressed PDFs.
- Add integration test for Supabase RLS using test users.
- Add Playwright e2e for the full ship criteria flow.

### Useful after pilot

- Richer CSV import mapping UI.
- More structured LP type/stage enums in the live UI.
- Export meeting brief to PDF/Markdown.
- Better duplicate resolution for imported LPs.
- Timeline filters by type/source/date.

### Long-term vision

- Connected provider architecture for verified investor data.
- Warm-intro graph based on user-owned relationship sources.
- Team collaboration with role-based access.
- Workflow analytics based on actual outcomes.

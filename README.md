# FundraiseOS

AI-native relationship intelligence for emerging fund managers. Remember every LP conversation. Never miss the next best action.

## MVP

- Passwordless email authentication with Supabase Auth, plus local demo fallback
- Phase 1 meeting-note extraction: paste notes or upload TXT, review/edit structured AI fields, then approve into the live fundraising memory
- Automatically generated LP profiles and 75-record demo seed
- Fundraising memory chat with source citations and demo memory fallback
- Interactive LP → source → event → meeting → follow-up relationship graph
- Dataset-derived fundraising health, commitments, follow-ups, and next actions
- Responsive desktop and mobile dashboard

Deliberately excluded: Gmail, Outlook, calendar sync, CRM integrations, automated outreach, and Affinity replacement.

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local`. The app runs without keys in demo mode. To enable live services and real meeting-note extraction, set:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   OPENAI_API_KEY=
   OPENAI_EXTRACTION_MODEL=gpt-4o-mini
   ```

   If `OPENAI_API_KEY` is missing, the upload modal shows a clear error for real extraction and keeps the local sample-note fallback available for demos.

3. Start the app:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). The passwordless auth screen is at `/login`.

## Phase 1 extraction workflow

1. Click **Upload meeting note**.
2. Paste a meeting note/transcript or upload a `.txt` note.
3. Click **Extract with AI**.
4. Review the structured JSON extraction:
   - LP name
   - Firm / organization
   - Investor type
   - Meeting date
   - Interest areas
   - Check size
   - Questions asked
   - Concerns raised
   - Documents requested
   - Commitment signals
   - Next action
   - Follow-up due date
   - Sentiment
   - Confidence score
5. Edit any field.
6. Click **Approve and update FundraiseOS**.
7. The approved JSON updates the LP profile, follow-up tasks, activity feed, relationship graph, dashboard metrics, and Ask Memory context.

For local testing without an OpenAI key, use **Use sample Nora Ellis meeting note**. See [SAMPLE_MEETING_NOTE.md](./SAMPLE_MEETING_NOTE.md) and [TEST_CASES.md](./TEST_CASES.md).

## Supabase database

The migration in `supabase/migrations/001_fundraiseos.sql` enables pgvector, row-level security, tenant-owned LP profiles, documents, memories, action items, and semantic memory search.

To create the local database and automatically load 75 realistic LP profiles:

```bash
supabase start
supabase db reset
```

`supabase/seed.sql` creates fifteen Family Offices, fifteen Funds of Funds, fifteen RIAs, fifteen Angel Investors, and fifteen Foundations, including introductions, events, meetings, interests, concerns, follow-up dates, and commitments.

## ZAS Ventures demo path

1. Open `/login` and enter any email to use local demo authentication.
2. From the dashboard, open Elena Park to show relationship strength, meeting history, and next best action.
3. Click **Upload meeting note** → **Use sample Nora Ellis meeting note**.
4. Review the extracted fields and click **Approve and update FundraiseOS**.
5. Open Relationship Graph to show Nora → uploaded meeting note → AI extraction → extracted meeting → next action.
6. Ask Memory: “Tell me about Nora Ellis.”
7. Click **Reset demo** to restore the exact 75-LP starting state.

This path demonstrates: upload/paste → extraction → review/edit → approval → LP profile → graph update → follow-up task → grounded AI answer.

## Verification

```bash
pnpm build
```

Demo mode keeps all product interactions available without transmitting data. Production auth and RLS require valid Supabase credentials; production AI extraction requires an OpenAI key.

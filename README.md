# FundraiseOS

AI-native relationship intelligence for emerging fund managers. Remember every LP conversation. Never miss the next best action.

## MVP

- Passwordless email authentication with Supabase Auth (plus local demo fallback)
- PDF, DOCX, and TXT upload flow with structured extraction response
- Automatically generated LP profiles and 75-record demo seed
- Fundraising memory chat with source citations and OpenAI fallback
- Interactive LP → Introducer → Event → Meeting → Action relationship graph
- Dataset-derived fundraising health, commitments, follow-ups, and next actions
- Responsive desktop and mobile dashboard

Deliberately excluded: Gmail, Outlook, calendar sync, CRM integrations, automated outreach, and Affinity replacement.

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local`. The app runs without keys in demo mode. To enable live services, set:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   OPENAI_API_KEY=
   ```

3. Start the app:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). The passwordless auth screen is at `/login`.

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
2. From Overview, open Elena Park to show relationship strength, meeting history, and next best action.
3. Click **Upload meeting note** → **Use prepared Nora Ellis meeting note**.
4. Extract the meeting and open the generated Nora Ellis profile.
5. Open Relationship Graph to show Nora → Maya Feldman → ZAS Founder Dinner → Introductory meeting → Send track record.
6. Ask Memory: “What happened after the upload?”
7. Click **Reset demo** to restore the exact 75-LP starting state.

This path demonstrates: upload → extraction → LP profile → graph update → grounded AI answer.

## Verification

```bash
pnpm build
```

Demo mode keeps all product interactions available without transmitting data. Production auth and RLS require valid Supabase credentials; production AI answers require an OpenAI key.

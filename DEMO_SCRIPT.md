# FundraiseOS — ZAS Ventures Demo Script

## Before the room joins

1. Confirm `http://localhost:3000` is open.
2. Click **Reset demo**.
3. Confirm the sidebar shows **LP Directory 75** and **Follow-ups 12**.
4. Keep the browser at desktop size and begin on **Dashboard**.

## The five-minute story

### 1. Establish the problem

Show the Dashboard.

Say:

> “FundraiseOS remembers every LP relationship and tells us exactly what to do next. ZAS starts with 75 LP profiles, and every number here comes from the same live relationship dataset.”

Point out:

- 75 LP profiles
- 63 active LPs
- 12 open follow-ups
- 19 outstanding commitments
- $15.25M indicated pipeline

### 2. Add one meeting memory

Click **Upload meeting note** → **Use prepared Nora Ellis meeting note** → **Extract meeting memory**.

While extraction runs, say:

> “This is a meeting note from Nora Ellis at Redwood Family Office. FundraiseOS extracts the LP, introduction, interests, concern, meeting context, and next action.”

When the five updated surfaces appear, click **Apply updates across FundraiseOS**.

### 3. Show the generated LP profile

The Nora Ellis profile opens automatically.

Say:

> “Nora is now a structured LP profile. We know Maya Feldman introduced her at the ZAS Founder Dinner, she cares about applied AI and vertical SaaS, she raised Fund I attribution, and we owe her a track-record analysis by June 27.”

Close the profile.

### 4. Prove the rest of the system changed

On Dashboard, point out:

- LP profiles changed from 75 to 76
- Active LPs changed from 63 to 64
- Follow-ups changed from 12 to 13
- Commitments changed from 19 to 20
- Pipeline changed from $15.25M to $16.0M
- Nora’s processed meeting is first in Activity Feed

Say:

> “This was one update—not five manual CRM edits.”

Click **Follow-ups** and show **Send track record analysis** for Nora Ellis.

### 5. Show relationship intelligence

Click **Relationship Graph**.

Say:

> “The note also changed the relationship graph: Nora connects to Maya Feldman, the ZAS Founder Dinner, the introductory meeting, and the follow-up we just created.”

Click graph nodes if the team wants to inspect the path.

### 6. Close with AI memory

Click **Ask memory**. Ask:

> “What happened after the upload?”

The answer should explain that Nora’s profile, graph path, June 27 follow-up, activity, and chat context were updated, and that the LP count moved from 75 to 76.

Say:

> “That is the product: every LP conversation becomes durable memory and an explicit next action.”

## Recovery

If the demo has already been run, close any open panel and click **Reset demo**. This restores 75 LPs and 12 follow-ups.

## Known limitations

- Demo state is browser-memory only and resets on page reload.
- The prepared Nora Ellis note uses deterministic demo extraction; arbitrary file parsing is intentionally hidden.
- Supabase persistence and live OpenAI retrieval require configured credentials and are not part of this local demo path.
- Do not refresh between upload and the final chat question.

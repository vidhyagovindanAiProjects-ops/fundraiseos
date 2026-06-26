# FundraiseOS — ZAS Demo QA Checklist

Tested against the production build on June 23, 2026.

## Build and runtime

- [x] `next build` completed successfully.
- [x] Production server started at `http://localhost:3000`.
- [x] Browser console reported zero errors after the full workflow.
- [x] Mobile viewport tested at 390×844 with no horizontal overflow.
- [x] Mobile sidebar is hidden by default and the menu control is visible.

## Tested pages and surfaces

- [x] Dashboard renders from a clean reset.
- [x] LP Directory renders 75 records.
- [x] Family Office filter renders exactly 15 records.
- [x] Generated Nora Ellis LP profile displays introduction, interests, concern, meeting, commitment, and follow-up.
- [x] Follow-up page displays the generated Nora Ellis task.
- [x] Relationship Graph displays Nora → Maya Feldman → ZAS Founder Dinner → Introductory meeting → Send track record analysis.
- [x] AI Memory Chat answers from the uploaded Nora memory.

## Tested end-to-end workflow

- [x] Reset begins at 75 LPs and 12 follow-ups.
- [x] **Upload meeting note** opens the demo workflow.
- [x] Prepared Nora Ellis note loads.
- [x] Extraction completes and lists all five affected surfaces.
- [x] Applying extraction opens the generated Nora profile.
- [x] LP count changes 75 → 76.
- [x] Active LP count changes 63 → 64.
- [x] Follow-up count changes 12 → 13.
- [x] Commitment count changes 19 → 20.
- [x] Pipeline changes $15.25M → $16.0M.
- [x] Activity Feed adds Nora’s processed meeting.
- [x] Follow-up queue adds “Send track record analysis.”
- [x] Graph changes to Nora’s relationship path.
- [x] Chat answers “What happened after the upload?” accurately.
- [x] Completing Nora’s task changes open follow-ups 13 → 12.
- [x] **Reset demo** restores the 75-LP, 12-follow-up starting state.

## Consistency checks

- [x] Elena’s profile and follow-up both use the same “Today” due date.
- [x] Sidebar counts match page counts.
- [x] Dashboard metrics are calculated from the same LP and task state used by Directory, Follow-ups, Graph, Profile, and Chat.
- [x] Uploaded Nora data is not duplicated when the prepared note is applied again.

## Remaining risks

- Demo state is not persisted and is lost on refresh.
- Extraction is deterministic for the prepared Nora note; arbitrary PDF/DOCX/TXT parsing is not exposed.
- Live Supabase authentication, database writes, and OpenAI retrieval were not exercised because the local demo has no production credentials.
- Browser refresh during the narrative requires restarting with **Reset demo** and rerunning the upload.

# FundraiseOS Phase 1 Test Cases

## 1. Missing OpenAI key keeps demo fallback available

1. Do not set `OPENAI_API_KEY`.
2. Open FundraiseOS.
3. Click **Upload meeting note**.
4. Paste any meeting note and click **Extract with AI**.
5. Expected: clear error explaining `OPENAI_API_KEY` is missing.
6. Click **Use sample Nora Ellis meeting note**.
7. Expected: editable review screen appears with structured fields.

## 2. Review and approve extracted sample

1. From the review screen, edit any field, such as `Next action`.
2. Click **Approve and update FundraiseOS**.
3. Expected:
   - LP profile opens for the extracted LP.
   - Follow-up task is added.
   - Activity feed shows the extracted meeting.
   - Dashboard LP count and follow-up count update.
   - Relationship Graph centers on the extracted LP.
   - Ask Memory can answer questions about the extracted LP.

## 3. Real AI extraction with OpenAI key

1. Set `OPENAI_API_KEY`.
2. Paste the contents of `SAMPLE_MEETING_NOTE.md`.
3. Click **Extract with AI**.
4. Expected JSON fields:
   - LP name: Nora Ellis
   - Firm: Redwood Family Office
   - Investor type: Family Office
   - Interest areas include applied AI / vertical SaaS
   - Check size: about `$750K`
   - Documents requested include deck, track record, references
   - Follow-up due date: July 2, 2026
   - Sentiment: Positive

## 4. TXT upload

1. Save `SAMPLE_MEETING_NOTE.md` text as `.txt`.
2. Upload it via **Upload meeting note**.
3. Click **Extract with AI**.
4. Expected: same review flow as pasted note.

## 5. PDF/DOCX Phase 1 behavior

1. Upload a `.pdf` or `.docx`.
2. Expected: clear Phase 1 message asking the user to paste transcript text or upload `.txt`.

# ⚠️ SECURITY NOTICE — READ THIS FIRST

While reviewing this project, I found that `backend/.env` and `frontend/.env`
are tracked in git history (commits `b02b236`, `0c81a3e`, and earlier). That
file contained **real, live credentials**:

- A Supabase Postgres password, embedded directly in `DATABASE_URL` / `DIRECT_URL`
- A Gmail SMTP app password (`SMTP_PASS`)

If this repository's remote (`github.com/susahu020/ConnectHub`) has ever been
public, or shared with anyone, or forked, those credentials must be treated
as compromised — right now, regardless of anything else in this review.

## Do this immediately, in this order

1. **Rotate the Supabase database password.** In the Supabase dashboard:
   Project Settings → Database → reset the password. Update `DATABASE_URL`
   wherever it's actually used (your local `.env`, Render env vars, etc.)
   with the new password. The old one in git history is dead the moment you
   rotate it — you do not need to scrub git history for this to be safe,
   though it's good hygiene to do later (`git filter-repo` or BFG).

2. **Revoke the Gmail app password** at
   https://myaccount.google.com/apppasswords and generate a new one (or
   better, switch to a transactional email provider like Resend/Brevo for
   production — see DEPLOYMENT.md).

3. **Rotate your JWT secrets too**, out of caution — while I didn't find
   evidence the *actual* production JWT secret was committed (the code fell
   back to a shared hardcoded default, which is its own bug — fixed in this
   round of changes), if you had ever put a real one in `.env`, treat it as
   burned along with the rest.

4. I've replaced the committed `backend/.env` and `frontend/.env` with
   placeholder values in this delivered copy, and removed them from git
   tracking going forward (`git rm --cached`) — but **you** need to run
   `git add -A && git commit` on your real repo for that to take effect
   there, and the old values remain visible in your git *history* until you
   rewrite it. Rotating the credentials (steps 1–2) matters more than
   scrubbing history — a rotated credential in old history is inert.

## Why this matters beyond "best practice"

This isn't a style nitpick — a leaked DB password on a hosted Postgres
instance is a direct path to reading/writing every table in this schema
(users, chat messages, HR/payroll data, RBAC roles). Please do steps 1–2
before anything else in this delivery, even before redeploying.

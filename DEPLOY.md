# Deploy My Budget to Fly.io — step by step (browser only)

You do **not** need to install anything or use a terminal. Everything below
happens in your web browser. When you're done, the app runs 24/7 on Fly.io,
and every change you push to GitHub redeploys automatically.

There are two robots involved:
- **GitHub Actions** runs in GitHub's cloud and pushes your code to Fly.
- **Fly.io** is where the app actually runs.

---

## Phase 1 — Create a Fly.io account (~5 min)

1. Go to **https://fly.io** and click **Sign Up** (top right).
2. Sign up (you can use "Sign up with GitHub" to make it quick).
3. Verify your email if asked.
4. **Add a payment method.** Fly requires a card on file even for tiny apps.
   This app is small (one 256 MB machine + a 1 GB volume) and is designed to
   sleep when idle, so the cost is very low — often within Fly's allowance.
   - Go to **https://fly.io/dashboard** → your org → **Billing** → add a card.

## Phase 2 — Create a Fly access token (~2 min)

1. Go to **https://fly.io/user/personal_access_tokens**
   (or: dashboard → click your name/avatar, top right → **Access Tokens**).
2. Under **Personal Access Tokens**, type a name like `github-deploy`.
3. (Leave expiry as you like; "never" is fine for personal use.)
4. Click **Create token**.
5. **Copy the whole token now** — it starts with `FlyV1 ` and is long.
   You won't be able to see it again. Paste it somewhere temporary for a moment.

## Phase 3 — Give the token to GitHub (~2 min)

1. Open your repo on GitHub: **https://github.com/buckeye451/budgetingwebapp**
2. Click **Settings** (top of the repo).
   - If you don't see Settings, make sure you're signed in as the repo owner.
3. In the left sidebar: **Secrets and variables** → **Actions**.
4. Click **New repository secret**.
5. **Name:** `FLY_API_TOKEN` (exactly this, all caps, with underscores).
6. **Secret:** paste the whole `FlyV1 ...` token.
7. Click **Add secret**.

## Phase 4 — Pick your app name and region (~3 min)

Fly app names are **globally unique**, so pick something personal, e.g.
`budget-jane-7821`. Allowed characters: lowercase letters, numbers, and hyphens.

1. In your repo, open the file **`fly.toml`** (click it in the file list).
2. Click the **pencil icon** (top right of the file) to edit.
3. Change this line:
   ```
   app = "my-budget-changeme"
   ```
   to your unique name, e.g.:
   ```
   app = "budget-jane-7821"
   ```
4. Change the region to one near you on this line:
   ```
   primary_region = "iad"
   ```
   Common codes: `iad` (US East), `ord` (US Central), `sjc`/`lax` (US West),
   `lhr` (London), `fra` (Frankfurt), `syd` (Sydney). Full list:
   https://fly.io/docs/reference/regions/
5. Scroll down, click **Commit changes…**, keep "Commit directly to the
   `claude/wonderful-bohr-7lsp5c` branch", then **Commit changes**.

**That commit automatically starts a deploy.** Because the token is already
set (Phase 3), this first run will create your app, create the data volume,
and deploy — all by itself.

## Phase 5 — Watch it deploy (~3 min)

1. In your repo, click the **Actions** tab (top).
2. You'll see a run named after your commit, under **Deploy to Fly.io**.
   Click it, then click the **deploy** job to watch the steps live.
3. Wait for all steps to finish with green checkmarks. The last step,
   **Deploy**, prints a URL like `https://budget-jane-7821.fly.dev`.

If a step fails, see **Troubleshooting** below.

## Phase 6 — Open it on your phone (~2 min)

1. On your phone's browser, go to **`https://<your-app-name>.fly.dev`**
   (the URL from the previous step).
2. You'll land on the login page. Tap **Create one** and set your username +
   password. **The first account becomes the owner**; after that, sign-ups are
   closed (so no one else can register).
3. Open the ☰ menu to set your monthly budget, then start tracking.

**Add it to your home screen** so it feels like a real app:
- **iPhone (Safari):** tap the Share button → **Add to Home Screen**.
- **Android (Chrome):** tap the ⋮ menu → **Add to Home screen**.

---

## Everyday use: making changes later

Any change you commit on the `claude/wonderful-bohr-7lsp5c` branch (even
editing a file in the GitHub web UI) automatically redeploys within a couple of
minutes. You can also redeploy manually: **Actions** tab → **Deploy to Fly.io**
→ **Run workflow**.

## Optional extras

- **Let a second device/person register later.** Add another secret/setting:
  Fly dashboard → your app → **Secrets**, add `SIGNUP_CODE` = some long random
  string. Then new accounts can be created by entering that code.
- **Back up your data.** Your data lives on the Fly volume. The simplest backup
  is via the Fly dashboard's app → **Volumes** (snapshots are taken
  automatically), or ask for a download script.

## Troubleshooting

- **A workflow run failed before you set the token.** That's expected — ignore
  any run from before Phase 3. The run triggered by your `fly.toml` edit is the
  one that matters.
- **"Name is not available" when creating the app.** Someone already took that
  app name. Edit `fly.toml` again with a more unique name and commit.
- **Error mentioning the organization / `--org personal`.** If your Fly account
  uses a differently-named org, tell me its slug and I'll adjust the workflow.
- **Deploy succeeded but the page won't load.** Give it a few seconds — the app
  sleeps when idle and wakes on the first request.
- **You need to see logs.** Fly dashboard → your app → **Monitoring**, or
  GitHub **Actions** → the run → the **Deploy** step output.

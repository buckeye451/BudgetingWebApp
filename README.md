# My Budget

A private web app for tracking your monthly spending budget, with a real
backend and login. Your data is stored server-side in SQLite and scoped to
your account, so it syncs across every device you sign in from.

## Features

- **Login / account** — username + password auth (passwords hashed with scrypt).
- **Private by default** — the first account registers freely; after that,
  registration is closed unless you set a `SIGNUP_CODE` (see below).
- **Hamburger settings menu** — set your monthly budget total.
- **Weekly sliders** — distribute the monthly budget across the weeks of the month.
- **Daily sliders** — set each day's spending limit within a week.
- **Daily spending entry** — type what you spent and hit *Add*; it subtracts
  from the day, week, and month totals automatically.
- **Negatives turn red** — when you overspend, the remaining amount shows a
  minus sign and turns red.
- **Month navigation** — move between months with the arrows in the top bar.
- **Per-entry history** — each spend is listed under its day and can be removed.

## Architecture

- **Backend:** Node.js + Express (`server/`), serving a JSON API and the
  static frontend.
- **Database:** SQLite via `better-sqlite3`, stored at `data/budget.db`.
- **Auth:** httpOnly session cookies; sessions and users live in the database.
- **Frontend:** plain HTML/CSS/JS in `public/`, talking to the API.

## Running it

```bash
npm install
npm start
# then open http://localhost:3000
```

The first time you open it, you'll be sent to the login page — click
**Create one** to make your account. That first account is the owner.

### Configuration (environment variables)

| Variable        | Default       | Purpose                                                        |
| --------------- | ------------- | -------------------------------------------------------------- |
| `PORT`          | `3000`        | Port to listen on.                                             |
| `DATA_DIR`      | `./data`      | Where the SQLite database is stored.                           |
| `SIGNUP_CODE`   | *(unset)*     | If set, allows extra accounts to register using this code.     |
| `COOKIE_SECURE` | `false`       | Set to `true` when serving over HTTPS so cookies are secured.  |

After your account exists, new sign-ups are blocked unless `SIGNUP_CODE` is
set — keeping the instance private to you.

> **Deploying:** run it behind HTTPS (e.g. a reverse proxy) and set
> `COOKIE_SECURE=true`. Keep the `data/` directory backed up — it holds your
> database. The old browser-only version is gone; data now lives server-side.

## Deploying to Fly.io

This repo includes a `Dockerfile` and `fly.toml` ready for [Fly.io](https://fly.io).
The SQLite database is kept on a persistent volume mounted at `/data`.

**One-time setup:**

1. Install the CLI and sign in:
   ```bash
   # macOS: brew install flyctl    (or see https://fly.io/docs/flyctl/install/)
   fly auth signup   # or: fly auth login
   ```
2. Pick a unique app name and your nearest region. Edit `fly.toml`:
   - change `app = "my-budget-changeme"` to something unique
   - set `primary_region` to a code near you (e.g. `iad`, `lhr`, `sjc` — see
     https://fly.io/docs/reference/regions/)
3. Create the app and the volume that holds your data:
   ```bash
   fly apps create <your-app-name>
   fly volumes create budget_data --region <your-region> --size 1
   ```

**Deploy:**

```bash
fly deploy
```

When it finishes, open `https://<your-app-name>.fly.dev` on your phone and
tap **Create one** to make your account (the first account is the owner;
after that, sign-ups are closed). Add it to your home screen for an app-like
feel: Share → *Add to Home Screen*.

**Notes:**
- `COOKIE_SECURE=true` is already set (Fly serves over HTTPS), so your login
  cookie is sent securely.
- The app scales to zero when idle to keep costs minimal and wakes on the next
  request — the first hit after a while may take a second or two.
- To allow a second device/person to register later, set a signup code:
  ```bash
  fly secrets set SIGNUP_CODE=some-long-random-string
  ```
- Back up your data anytime with `fly ssh console -C "cat /data/budget.db" > backup.db`.

### Auto-deploy from GitHub

`.github/workflows/fly-deploy.yml` redeploys the app automatically on every
push to the default branch (you can also trigger it manually from the repo's
**Actions** tab). To enable it, give GitHub a Fly deploy token:

1. Create a token scoped to this app:
   ```bash
   fly tokens create deploy -a <your-app-name>
   ```
2. In your GitHub repo: **Settings → Secrets and variables → Actions →
   New repository secret**, name it `FLY_API_TOKEN`, and paste the token
   (include the whole `FlyV1 ...` string).

After that, every push deploys. Until the secret is set, the workflow will run
but fail at the deploy step — that's expected.

> The workflow triggers on the current default branch. If you rename it (e.g.
> to `main`), update the branch name under `on.push.branches` in the workflow.

## How budgeting works

1. Open the **hamburger menu** and set your **monthly budget total**.
   By default it splits evenly across the weeks and days of the month.
2. Adjust the **weekly sliders** to give some weeks more or less.
   Changing a week re-splits that week evenly across its days.
3. On the main screen, pick a **week tab**, then fine-tune the **daily sliders**
   for that week if you want.
4. For each day, enter an amount in the box and press **Add** (or Enter).
   The day, week, and month "remaining" values update instantly.

## Data & privacy

- All data lives server-side in `data/budget.db`, scoped to your user account.
- Sign in from any device to see the same data.
- Back up by copying the `data/` directory.

## Ideas for next steps

- Categories (groceries, gas, eating out) with per-category budgets.
- Notes on each spending entry.
- A small chart of spending over the month.
- Export / import your data as a JSON file.
- Password change / account management screen.

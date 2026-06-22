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

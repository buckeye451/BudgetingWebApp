# My Budget

A private, single-user web app for tracking your monthly spending budget.
Everything runs in your browser — there's no server and no account. Your data
is saved in the browser's `localStorage`, so it stays on your device only.

## Features

- **Hamburger settings menu** — set your monthly budget total.
- **Weekly sliders** — distribute the monthly budget across the weeks of the month.
- **Daily sliders** — set each day's spending limit within a week.
- **Daily spending entry** — type what you spent and hit *Add*; it subtracts
  from the day, week, and month totals automatically.
- **Negatives turn red** — when you overspend, the remaining amount shows a
  minus sign and turns red.
- **Month navigation** — move between months with the arrows in the top bar.
- **Per-entry history** — each spend is listed under its day and can be removed.

## Running it

No build step or dependencies. Either:

1. **Just open the file** — double-click `index.html` (or drag it into your browser).
2. **Or serve it locally** (recommended so `localStorage` is stable per origin):

   ```bash
   # Python 3
   python3 -m http.server 8000
   # then open http://localhost:8000
   ```

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

- All data lives in `localStorage` under the key `myBudget.v1`.
- Clearing your browser data, or using a different browser/device, starts fresh.
- To back up, you can copy that value from your browser's dev tools, or export
  it (a future enhancement — see below).

## Ideas for next steps

- Export / import your data as a JSON file (for backup and moving devices).
- Categories (groceries, gas, eating out) with per-category budgets.
- Notes on each spending entry.
- A small chart of spending over the month.
- Optional cloud sync if you ever want it on multiple devices.

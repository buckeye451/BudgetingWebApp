# Insurance Verification SmartVideo CloudPage (Redesign)

`insurance-verification-cloudpage.html` is a rebuilt version of the SFMC CloudPage that
plays a personalized SundaySky SmartVideo and drives subscribers to verify their insurance
on MyInsuranceInfo.com. It keeps the same data flow (AMPscript + SSJS + `CPINotices`
Data Extension) but fixes the reliability issues in the original page and replaces the
bland layout with a modern, interactive, lender-branded experience.

## What was broken in the original (and is now fixed)

1. **Page crashed when the lookup failed.** `smartVideoData.length` was read outside the
   `try/catch`, so any lookup error (or a missing row) threw and blanked the page.
   The lookup and row access are now fully guarded, and the page renders with sensible
   defaults when no row exists.
2. **Video POST fired even with no payload.** The SundaySky call now only runs when a row
   with a `JSON` payload was actually found, and any HTTP/parse error falls back gracefully
   instead of breaking the page.
3. **`?debug=1` mode itself threw errors.** The old debug block referenced variables that
   didn't exist in scope (`jsonlength`, `obj.playerToken`, `playerToken` before assignment).
   Debug output is now a safe, structured comment block including any error notes collected
   during the request. It no longer echoes the raw payload or player token.
4. **Unreliable variable output.** `<ctrl:var />` tags were replaced with
   `Variable.SetValue(...)` + AMPscript `%%=v(@...)=%%`, the documented SSJS→AMPscript
   bridge on CloudPages.
5. **Invalid markup.** Duplicate `<!DOCTYPE html>`, `<input>` elements inside `<head>`,
   and a `<style>` block between `</head>` and `<body>` are all corrected.
6. **Unvalidated brand color.** `BackgroundColor` from the DE is now validated as a 3/6
   digit hex value with a fallback, so a bad value can no longer corrupt the whole
   stylesheet.
7. **~10,000 lines of inlined Bootstrap.** The full framework copy pasted into the page
   (with lender-color substitutions scattered through it) is replaced by the Bootstrap 5.3
   CDN build plus ~150 lines of custom CSS driven by a single `--brand` CSS variable.
8. **jQuery removed.** It was loaded but never used.

## What's new for the subscriber

- **Verification status banner** — uses the `IsVerified` field to show either a green
  "You're all set" confirmation or an amber "Action needed" call-to-action.
- **Video loading state + fallback** — a spinner shows while the SmartVideo player boots,
  and if no token/payload is available the video area shows a friendly fallback card with
  a Verify button instead of an empty black box.
- **More information on the page**: a 3-step "How It Works" section, a "Why are we asking?"
  explainer with trust points (secure, ~2 minutes, avoid lender-placed insurance costs),
  and a 5-question FAQ accordion.
- **Interactive polish**: sticky blurred navbar with anchor navigation, smooth scrolling,
  hover-lift cards, scroll-reveal animations (automatically disabled for users with
  `prefers-reduced-motion`), and a final CTA band + branded footer.
- **Lender theming everywhere** from one variable: buttons, accents, section tints, and
  the accordion all derive from the `BackgroundColor` DE field via CSS `color-mix()`.

## Deploying in Marketing Cloud

1. In Web Studio → CloudPages, open the landing page and replace its content with the full
   contents of `insurance-verification-cloudpage.html`.
2. Publish. No Data Extension changes are required — the page uses the same `CPINotices`
   DE and the same fields (`UniqueMemberID`, `JSON`, `SmartVideoCreativeID`, `LenderName`,
   `LenderLogo`, `LenderWebsiteURL`, `LenderAddress`, `LenderCity`, `LenderState`,
   `LenderZip`, `BackgroundColor`, `IsVerified`).
3. Test with `?u=<UniqueMemberID>` to impersonate a subscriber and `&debug=1` to see the
   diagnostic HTML comment (view page source).

### Recommendations for a follow-up

- Move the SundaySky API keys out of page code into a restricted key-management Data
  Extension or use SFMC's Key Management, so keys aren't visible to anyone with page edit
  access.
- `color-mix()` requires evergreen browsers (2023+). If you must support very old
  browsers, replace the three `color-mix()` usages with precomputed tint columns in the DE.

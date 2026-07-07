# Shipping to the App Store — TODO

Status of DoReMingo v1 launch (free, offline, general audience 4+).
v1 ships all three modes incl. Daily Melody (local-only, no data collected).
IAP/lifetime deferred to post-launch.

Strategy (from 2026-07 launch research): the viral loop is web-first —
emoji share grid → link → recipient plays the daily **in the browser, no
install** → App Store via smart banner. Wordle/Heardle/Bandle all grew this
way (Bandle: solo dev, zero paid marketing, 100k+ daily players). The iOS app
is the retention surface; **doremingo.com is the acquisition surface**.
Realistic baseline without this loop: 50–1,500 lifetime downloads (median
indie outcome). Distribution beats polish.

## Done (in repo)
- [x] `Info.plist`: `ITSAppUsesNonExemptEncryption = false` (silences encryption prompt each upload)
- [x] `Info.plist`: `UIRequiredDeviceCapabilities` `armv7` → `arm64`
- [x] App icon 1024×1024, no alpha — verified
- [x] `.gitignore` covers certs/profiles/Team ID (public repo safe)

## 1. Apple account (start first — slow)
**Decision: enrol as Organization under the Ltd** — liability shield, company name as public seller (not personal name), app royalties = Ltd income (kept out of personal Self Assessment).
- [x] D-U-N-S assigned (held)
- [ ] **STUCK (2026-07): enrolment blocked on D-U-N-S issues.** Unblock path:
  - Verify D&B record matches Companies House **exactly** — legal name "OK Do! Ltd" (punctuation included), registered address, phone. Mismatch is the #1 enrolment blocker.
  - Request corrections via D&B UK (dnb.co.uk → update company info); changes take ~5 business days to propagate to Apple, sometimes 2 weeks.
  - Apple's D-U-N-S lookup tool shows what Apple sees: https://developer.apple.com/enroll/duns-lookup/
  - If record is correct but Apple still rejects: reply to the enrolment email / call Apple Developer Support directly — they can re-pull the D&B record manually.
- [ ] Enrol Apple Developer Program ($99/yr) as Organization: https://developer.apple.com/enroll
  - Choose **Organization**, not Individual
  - Attest legal authority to bind the company (director/officer)
  - Apple may phone the number on the D-U-N-S record to verify — ensure it reaches you
  - Timeline: hours to ~2 weeks once D-U-N-S clears
- [ ] Apple ID 2FA enabled (use a company-owned Apple ID, not personal)
- [ ] Accept latest agreements in App Store Connect, incl. **Paid Apps Agreement** (required before Small Business Program AND before any future IAP)
- [ ] Tax + banking forms — Ltd bank account + Ltd tax details + W-8BEN-E (US tax, Ltd as beneficial owner). Do early; blocks payouts not review.
- Note: Apple = merchant of record. Apple collects + remits customer VAT to HMRC/foreign authorities. Royalty paid to Ltd is outside UK VAT scope (overseas B2B). Ltd just books it as income (corp tax).

### Order
Enrol org → accept Paid Apps + banking → apply Small Business (§1b). Enrol is the long pole; rest takes minutes once it clears. (Web launch §1c shipped independently while enrolment stuck.)

## 1b. Small Business Program — 15% commission
Separate opt-in, **after** org enrolment + Paid Apps Agreement accepted. No downside at our scale; do now even though app is free (rate goes live the moment you ever charge).
- [ ] Apply: https://developer.apple.com/app-store/small-business-program/
  - Eligibility: <$1M USD proceeds prior calendar year → new dev qualifies automatically
  - Account Holder (org) must submit
  - No IAP needed to apply. Approval covers rest of current calendar year; auto-renews.

## 1c. www.doremingo.com web launch — ✅ LIVE 2026-07-03
Landing `/` (SEO + app upsell), game `/daily/` (**Daily only** — Learn/Warmup
are app-exclusive, the upsell), privacy `/privacy-policy/`. Landing source in
`site/`; `bin/publish-web.sh` assembles the whole site into the public repo
(= the on-demand web↔app sync — rerun it whenever the web should catch up
with the app source). Game runs daily-only via a `location.pathname` check
in `js/main.js` — same source everywhere else stays the full app.
- [x] DNS: `www` CNAME → GitHub Pages; site live at https://www.doremingo.com/
- [x] Public repo Pages custom domain `www.doremingo.com` (CNAME file shipped via `site/`)
- [x] First publish via `bin/publish-web.sh` — daily game confirmed working on the new domain
- [x] Landing page `site/index.html` — SEO (title/OG/schema.org), share-grid hero, how-it-works, app-upsell section ("coming soon" badge → swap for App Store badge at launch)
- [x] Privacy policy migrated → https://www.doremingo.com/privacy-policy/; okdo repo pushed with redirect stub + doremingo.com links
- [x] Game `index.html` canonical/og/schema → `/daily/` with Daily-specific copy (unfurl fix, incl. og:image = 512px icon)
- [x] Share URL → `https://www.doremingo.com/daily` (`js/daily/share.js`, test-covered)
- [x] PWA manifest + PNG icons — installable web app
- [x] Daily-only web mode: back button hidden, own page title, result view carries "see the full game" nudge → landing
- [x] README play-link → doremingo.com/daily

Remaining (non-blocking polish):
- [x] og:image — 1200×630 share card live at /og-image.png (regenerate: headless Chrome on `site/og-card.html`), wired into landing + /daily with `summary_large_image`. Note: WhatsApp caches unfurls ~1 month per URL — old previews linger.
- [ ] Smart App Banner on `/daily/`: `<meta name="apple-itunes-app" content="app-id=APP_ID">` — **after** App Store Connect record exists (needs the numeric Apple app ID)
- [ ] Search Console: register www.doremingo.com, submit for indexing
- [ ] codeme.lt/doremingo old URL: won't redirect automatically (path under the user-site domain) — replace with a "moved to doremingo.com" stub or leave to rot
- Note: keep "no data collected" true on web too — no analytics scripts on doremingo.com for v1.

## 2. App identity
- [ ] Register App ID `uk.co.okdo.doremingo` (or let Xcode auto-create) — bundle id set in `capacitor.config.json` + pbxproj; rebranded from legacy `lt.codeme.doremingo` to match OK Do! Ltd / okdo.co.uk
- [ ] Create app record in App Store Connect — confirm name "DoReMingo" is globally unique
- [ ] Version `1.0.0`, build `1` (bump build every upload)

## 3. Signing
- [ ] Xcode → Signing & Capabilities → "Automatically manage signing" + select Team
- [ ] Confirm no certs/profiles staged in git

## 4. Device family — iPad supported
- [x] Confirm TARGETED_DEVICE_FAMILY includes iPad (1,2) in project settings — `= "1,2"` in both build configs
- [x] Test layout on iPad simulator (game must look right, not stretched iPhone) — verified at iPad dims (portrait 1024×1366 + landscape) in browser: centered ~480px column, full-bleed bg, not stretched, both orientations OK. Polish-only note: wide side margins on iPad (phone-column centered); acceptable for v1, optional future = scale column on large screens.
- [x] Keep `~ipad` orientations in `Info.plist` (already present) — confirmed present

## 5. Assets
Product-page quality is an explicit Apple featuring criterion and the main
conversion lever (games convert ~5% page-view→install; each half-star of
rating ≈ +20% downloads).
- [ ] iPhone screenshots — 6.9" and 6.7" mandatory (generate from simulator)
  - Frame 1: Daily share grid / result (the differentiator — no ear-training competitor has a shared daily)
  - Frame 2: gameplay with Mingo mascot; then Learn progression, Warmup
  - Short caption text per frame ("One melody a day, same for everyone")
- [ ] iPad screenshots — 13" mandatory (iPad supported)
- [ ] Optional but high-value: 15–30s app preview video (autoplays in search results)

## 6. Store listing
- [x] Description, subtitle, keywords drafted → `docs/APP_STORE_LISTING.md`
- [x] Support URL — LIVE: https://www.okdo.co.uk/doremingo/support/
- [x] Privacy Policy URL — REQUIRED even offline. Give Apple: **https://www.doremingo.com/privacy-policy/** ("no data collected" for v1; old okdo.co.uk URL redirects). Marketing URL: https://www.doremingo.com/
- [ ] Privacy nutrition labels → "No Data Collected" for v1
- [ ] Age rating questionnaire → expect 4+
- [x] Category: **Primary Education, Secondary Music** (rationale in `docs/APP_STORE_LISTING.md`)
- [ ] **Metadata-only localization** — localize title/subtitle/keywords per storefront without translating the app (verified Apple-supported; non-English storefronts have ~10x lower keyword competition). Solfège IS the native note-naming in these markets — unfair advantage. Start with: FR, IT, ES, PT-BR, JA. UI already sings Do-Re-Mi, so full app localization later is unusually cheap.
- [ ] Subtitle A/B thought: test "daily music puzzle" phrasing vs current — ~60% of downloads come from search, ~half of queries are generic terms.

## 6b. Featuring nomination (do BEFORE launch — 6–8 weeks lead)
Self-serve, free, most devs never do it: App Store Connect → Apps → Featuring
→ Nominations → type "App Launch". Apple's stated minimum lead is 2–3 weeks;
6–8 weeks recommended. Never guaranteed; costs nothing. App of the Day for a
niche app ≈ 5,000–20,000 downloads in 24h.
- [ ] Write nomination as soon as ASC record exists; attach up to 5 URLs (TestFlight public link, doremingo.com, brand guide, press kit)
- Apple's seven criteria: UX, UI design, innovation, uniqueness, accessibility, localization, product page. **Lead with accessibility** (VoiceOver announcements, colorblind daily cues, reduced-motion support — all shipped) + uniqueness (only ear-training app with a Wordle-style shared daily) + pedagogy (Kodály movable-do).
- [ ] Re-nominate on every meaningful update ("App Enhancements" type) — repeat shots on goal.
- [ ] Later: In-App Events (iPhone/iPad) for themed weeks; attach to nominations.

## 7. Pre-submit verification
- [ ] Audio plays on real device; check silent-switch behavior — static OK (samples + `silence.wav` bundled, iOS-scheme workaround in `audio.js`); still needs real-device confirm
- [~] Works fully offline (airplane mode test) — static PASS: all assets local (`assets/samples`, `assets/fonts`, `silence.wav`), no CDN/remote fetch. Final airplane-mode device test still advised.
- [x] No browser chrome / external-link dumps (avoid Guideline 4.2 minimum-functionality reject) — PASS: full game, no external clickable links in UI (only non-clickable `<meta>` tags)
- [x] No placeholder text, no "beta"/"test" wording, no broken links — PASS on placeholder/beta (zero hits; the two "test" matches are a code comment + regex, not user-visible). Footer `VERSION` bumped `0.0.1` → `1.0.0` to match App Store.
- [x] `PrivacyInfo.xcprivacy` privacy manifest in `ios/App/App/` + wired into the Xcode Resources phase — no tracking, no collected data, UserDefaults `CA92.1` (Capacitor Preferences). Capacitor's own SPM packages ship their plugin manifests.
- [ ] Device pass for growth mechanics (§7b 03/04): review sheet requests at a delight moment; reminder offer after 2nd daily → notification actually fires at 09:00; streak-risk fires 19:00 and clears on completion; menu toggle works
- [x] `index.html` canonical/og/schema URLs updated codeme.lt → doremingo.com (see §1c)

## 7b. Growth mechanics (tracked in `.scratch/growth-mechanics/issues/`)
Review prompt + share funnel ideally land in the v1.0 build, notifications can be 1.1.
- [x] 01 — Share link → playable daily on doremingo.com (live: share text → www.doremingo.com/daily, cold load lands in the puzzle)
- [ ] 02 — "Get the app" nudge on web daily result (dormant until App Store URL set)
- [x] 03 — Review prompt at delight moments (3rd daily solve / 7-day streak) — built + unit-tested; device verification pending
- [x] 04 — Opt-in local notifications: daily-ready + streak-at-risk — built + unit-tested; device verification pending (add both to §7 device test pass)

## 8. Build + submit
- [ ] `npm run cap:sync` (rebuild `www/` → `ios/.../public`)
- [ ] Xcode → Product → Archive → Distribute → App Store Connect
- [ ] TestFlight pass first (catch crashes before review) — consider public TestFlight link shared in 1–2 Reddit threads for early feedback + nomination fodder
- [ ] Submit for review (~24–48h typical)

## 9. Launch week (one-time effort burst)
- [ ] Story-driven posts (not ads) in r/musictheory, r/piano, r/Guitar, r/WeAreTheMusicMakers, r/choir — personal "I built this" framing; niche Reddit story posts have out-performed Product Hunt #1 launches
- [ ] Show HN — pitch the **web** version (HN plays in-browser, won't install)
- [ ] Product Hunt — do it, expect little (~10% featured rate since 2024 algo change)
- [ ] One batch email to music-ed creators (YouTube/TikTok: Adam Neely, David Bennett, Charles Cornell tier + smaller theory streamers) — "guess today's melody" hook. Bandle's growth inflection was a single streamer pickup. High variance, near-zero cost.

## Post-launch (deferred)
- [ ] Monthly small App Store updates — ranking signal + "App Enhancements" featuring nomination each time
- [ ] Respond to every review (solo-dev edge; keeps rating ≥4.0 target)
- [ ] Watch App Store Connect peer-group benchmarks (free percentile data: conversion, D1/D7/D28 retention) — decide from data, not vibes
- [ ] IAP/lifetime: add StoreKit product + configure in App Store Connect. Category norm: one-time unlock $5–7 (Tenuto $4.99, Complete Ear Trainer $6.99) beats subscription for goodwill; freemium converts ~2% of downloads. Window: Functional Ear Trainer is moving free→subscription — "genuinely free daily" wins switchers now.
- [ ] Android via Capacitor — Functional Ear Trainer has 1M+ Play downloads; cheap port later
- [ ] Any future feature that sends data (server dailies, leaderboards): update privacy labels + privacy policy BEFORE that build ships
- Skip: paid promo platforms (Indie App Santa etc., $300–800) until organic signal exists; sustained community grinding (violates low-effort constraint — structural loops substitute)

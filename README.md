# KULBANDHAN — Phase 1

## Backend
cd backend && cp .env.example .env   # set MONGODB_URI + JWT secrets; add Navamsha key and data-encryption key when ready
npm install && npm run dev
curl http://localhost:4000/api/health

OTP_PROVIDER=mock prints codes in the server console (no SMS sent).

## Mobile
cd mobile && cp .env.example .env    # set EXPO_PUBLIC_API_URL to your PC's LAN IP
npm install && npx expo install --fix && npx expo start

## Seed test data
cd backend && npm run seed      # creates 5 clearly-marked (TEST) profiles
cd backend && npm run seed:kundli # creates 4 KUNDLI TEST profiles for mutual-match/Kundli flow; development login code is 123456
If KUNDLI_DATA_ENCRYPTION_KEY is not a valid base64-encoded 32-byte key, profiles are still created but birth inputs are skipped. Fix the key and rerun `npm run seed:kundli` to add them encrypted.

## Flow
Register -> OTP (see backend console) -> Profile form -> Discover -> profile -> Send Interest -> other user Accepts -> Match -> Chat

## Vedic Kundli and matching
Navamsha is called only by the backend. Set `NAVAMSHA_API_KEY` in `backend/.env`; never put it in the Expo environment. Also set `KUNDLI_DATA_ENCRYPTION_KEY` to a locally generated base64-encoded 32-byte key before saving birth details. Generate one locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and do not share or commit it.

Settings are explicit: `KUNDLI_AYANAMSHA=lahiri`, `KUNDLI_NODE_TYPE=mean`, `KUNDLI_OBSERVATION_POINT=topocentric`, `KUNDLI_ZODIAC_SYSTEM=sidereal`, `KUNDLI_HOUSE_SYSTEM=whole_sign`, and `KUNDLI_CALCULATION_METHOD=navamsha-engine`. The app collects exact local birth time, IANA timezone, offset at birth, and coordinates. The backend encrypts birth inputs and cached raw/normalized provider responses with AES-256-GCM. Users can delete birth time/location and derived charts; account date of birth remains for age eligibility until account deletion.

Navamsha returns the D1 chart, D9 and supported vargas, planetary positions, Panchang, Vimshottari periods, Ashtakoot breakdown, and evidence-backed dosha responses. North Indian Ashtakoot is kept separate from South Indian 10-porutham Rajju/Vedha results. The app does not infer missing cancellation rules or calculate astrology locally. Raw provider payloads and normalized report data are stored separately and encrypted. Reports are only available after a mutual match; exact birth coordinates are not returned to the other member.

Before production, validate several charts against a trusted astrologer using matching timezone, ayanamsha, node type, observation point, and house settings. Do not treat vendor examples or the free launch tier as a substitute for that validation. Navamsha documents 10,000 monthly launch credits for indie developers and a 10-requests-per-3-seconds free rate limit. Its terms reserve Free for solo/indie projects; company apps should use Growth (currently listed at ₹999/month) or Scale. Verify current pricing, limits, and plan eligibility in the dashboard.

Backend checks: `cd backend && npm run typecheck && npm test`. The provider tests use a fake local key and stubbed HTTP; they do not contact Navamsha.

## Payments (part 3)
RAZORPAY_PROVIDER=mock (default): development profile unlocks can be simulated with /payments/dev-confirm. Premium subscriptions are disabled until their advertised benefits are implemented. All payment orders are rejected in production and whenever live checkout is selected because the mobile Razorpay checkout is not wired in yet.
Before accepting real payments: integrate the native/web checkout, collect razorpayPaymentId + signature for /payments/verify, and retain /payments/webhook signature verification. Never trust the client alone.
Configured catalog prices (paise): premium_1m ₹499, premium_3m ₹1299, profile_unlock ₹99. Subscription products are not currently purchasable; catalog amounts in backend/src/payments/catalog.ts are not an offer for sale.

## Photos and real-time chat (part 4)
CLOUDINARY_PROVIDER=mock (default): photos are stored as base64 data URIs directly in MongoDB - fine for development, not for production (set CLOUDINARY_PROVIDER=live + CLOUDINARY_* keys to upload to Cloudinary for real).
Photos: up to 6 per profile, JPEG/PNG/WebP, 2MB max, public or private. Private photos need an explicit access request the owner approves (independent of interest/match status, per the spec).
Chat now runs on Socket.IO (chat/[id] screen): joinConversation, sendMessage, typingStart/Stop, messageSeen. Sender identity always comes from the authenticated socket, never the client payload. The old HTTP polling endpoints (GET/POST /chat/:matchId/messages) still work as a fallback/initial-load.

## AI features (part 5)
AI_PROVIDER=mock (default): AI Search and Match Explanation run on deterministic rules (regex/keyword parsing and structured comparisons) - no LLM needed, and the app labels these results as rule-based. Profile Assist just reformats the user's own text without an API key.
AI_PROVIDER=live + ANTHROPIC_API_KEY: AI Search and Profile Assist call the Claude API (model claude-sonnet-4-6). Match Explanation stays rule-based always, by design (spec section 25: explainable, not an opaque AI verdict).
Safety: chat messages are scanned with a regex classifier (money requests, outside links, threats) - deterministic, not LLM-based, so it's instant and has no false-positive cost from hallucination. A flag shows only to the recipient as a dismissible banner; it is never sent to the other person or used to auto-punish anyone.
Added Report and Block: POST /reports, POST/DELETE /blocks, GET /blocks. Blocked users disappear from Discover/Interests and can no longer message each other (checked in both the HTTP and Socket.IO send paths).

## Verification, moderation, admin panel (part 6)
Promote yourself to admin: cd backend && npm run seed:admin -- you@example.com (creates/promotes the account; log in via OTP as usual, code prints in the server console).
Admin panel: http://localhost:4000/admin - a minimal vanilla-JS page (no separate build/deploy step) served by the backend. Sections: Dashboard, Reports (dismiss/suspend/ban), Verification queue (approve/reject), Users (search + moderate), Audit Log. Every moderation/verification action writes an audit_logs entry.
User-side verification: Profile -> Verification. Mobile is auto-verified via OTP; Photo/Identity/Education/Family are submitted for admin review (mock - no real ID-check or liveness vendor wired in). Approved badges show on profile cards and profile view, each labelled with exactly what was checked (e.g. "ID Verified"), matching the spec's "badges must state what was verified" rule.
Moderation states (active/under_review/restricted/suspended/banned) already existed on the User model since Phase 1; this part adds the admin UI to change them and blocks a suspended/banned user's login (checked in authService).

Account deletion: DELETE /api/account/me removes profile, photos, verification submissions, login identifiers, OTPs, sessions, interests, and access grants. Retained matches/chat records, payment orders, safety reports, and audit entries are anonymized; chat message text is removed. Authenticated requests recheck account status so existing access tokens stop working after deletion.

# Empower18 MVP plan

## Product outcome

Empower18 is a mobile-first Warwickshire career-navigation platform for young people aged 16–18. The MVP helps a participant discover realistic routes, find verified opportunities, prepare applications, track progress, and reach appropriate support.

## Approved design direction

- **Design movement:** warm humanist public-service product with editorial clarity and light operational density.
- **Core principles:** clarity before complexity; next-step coaching; trustworthy opportunity data; inclusive and safeguarding-aware by default.
- **Color philosophy:** deep ink creates trust and legibility; blue signals action and wayfinding; amber marks attention without alarm; warm paper keeps the product approachable; green is reserved for verified/success states.
- **Layout paradigm:** a strong vertical content spine with asymmetric side rails for local context, saved work, and support. Dense opportunity lists open into calmer detail views.
- **Signature elements:** E18 compass mark; district chips for Warwickshire; “Your next step” action card; verification metadata shown as a first-class field.
- **Interaction philosophy:** every primary screen ends with a small, understandable next action. Progressive disclosure keeps the first viewport calm while advanced filters and metadata remain available.
- **Animation:** 160–220ms ease-out transitions for route changes, chips, drawers, and completion feedback. No scroll hijacking. Respect reduced motion.
- **Typography:** Manrope for display/headlines and Source Sans 3 for body/UI copy. Large headings use tight line-height; body copy stays at 16px minimum.
- **Brand essence:** a friendly, trustworthy local guide that turns uncertainty into practical next steps. Personality: encouraging, grounded, capable.
- **Brand voice:** direct, warm, plain-English. Example lines: “You do not need the whole plan today.” / “Here are three routes worth exploring next.”
- **Wordmark & logo:** a compact E18 compass/checkmark mark with a small orbit line, paired with the Empower18 wordmark.
- **Signature brand color:** Warwick blue `#246BCE`.

## Implementation approach

The MVP uses the initialized React/Express/tRPC/Drizzle project. The frontend contains a complete clickable product shell with realistic but clearly labelled sample opportunity data, client-side state for saved opportunities, onboarding, application statuses, notifications, and preferences. The starter Manus OAuth flow is preserved for real sign-in. Backend/database contracts remain ready for the next increment; current sample content is isolated in `client/src/data.ts` so it can be replaced by tRPC procedures without redesigning the UI.

## Routes

- `/` public goal-first entry
- `/onboarding` progressive profile setup
- `/dashboard` student home
- `/opportunities` searchable marketplace
- `/opportunities/:id` opportunity detail
- `/careers` career explorer and pathway planner
- `/applications` application tracker
- `/tools` CV, application and interview tools
- `/notifications` reminders and preferences
- `/support` support and safeguarding signposting
- `/settings` privacy, consent, accessibility and account controls
- `/admin` administrator-ready verification/content view
- `/404` not found

## Project structure

- `client/src/App.tsx` — route map, shared state, platform shell.
- `client/src/data.ts` — typed sample data and labels that mirror the MVP checklist.
- `client/src/pages/Home.tsx` — public landing and onboarding entry.
- `client/src/pages/Onboarding.tsx` — progressive registration/profile flow.
- `client/src/pages/Platform.tsx` — signed-in-ready screens and reusable page modules.
- `client/src/index.css` — tokens, responsive layout, states, and visual language.
- `public/manus-routes.json` — route manifest for the managed preview/publisher.
- `server/routers.ts`, `server/db.ts`, `drizzle/schema.ts` — existing auth/db foundation retained for persistence work.

## Data and safety boundaries

No opportunity is presented as live without a visible source, verification state, and last-checked date. Sample content is labelled as a prototype dataset. Mentoring and messaging are represented as safeguarded signposting, not open direct contact. AI tools are framed as editable suggestions, never as authors of achievements or qualifications.

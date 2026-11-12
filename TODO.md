# Empower18 MVP TODO

- [x] **Public goal-first entry** — Show a clear Empower18 proposition for Warwickshire young people; provide six intent paths for finding opportunities, exploring careers, comparing routes, building a CV, preparing applications, and getting support; include sign-in and demo exploration actions; keep language plain and supportive.

- [x] **Student registration and onboarding** — Provide progressive onboarding for name, age band, location/postcode area, education level, career interests, preferred industries/routes, skills and experience, accessibility preferences, and goals; mark school, qualifications and predicted grades as optional; include “Prefer not to say” where appropriate; show progress, back/next controls, and a completion state.

- [x] **Student dashboard** — Provide a personal welcome, next-step action, recommended opportunities, deadlines, saved opportunities, application progress, career goals, pathway actions, suggested skills, resources, reminders, notifications, quick links, and progress overview; avoid fabricated outcome percentages.

- [x] **Opportunity marketplace** — Support search by keyword; filters for district, category, route, age eligibility, education level, deadline, compensation, working arrangement and verified-only; categories include apprenticeships, work experience, jobs, courses, events, scholarships, competitions, volunteering and support; show responsive list/card views; allow save and add-to-tracker actions.

- [x] **Opportunity detail and verification** — Show organisation, description, responsibilities, eligibility, qualifications, skills, compensation, location, working arrangement, opening/closing dates, application instructions, official source link, source attribution, last verified date, listing status, save, add-to-tracker and report-incorrect actions; clearly distinguish verified and unverified content.

- [x] **Application tracker** — Support Interested, Preparing, Applied, Assessment, Interview, Offer, Rejected and Withdrawn statuses; show notes, deadlines, interview/assessment dates, reminders, history, list/calendar/kanban-ready navigation, and application statistics without implying unsupported success rates.

- [x] **Career explorer and pathway planner** — Provide interest prompts, industry/profession cards, route comparison between university, apprenticeship, T Level, vocational, direct employment and entrepreneurship, required qualifications/skills, relevant experience, employers, progression, and save-roadmap interactions.

- [x] **AI and preparation tools shell** — Provide editable CV builder, cover-letter/application assistant, interview preparation, UCAS/personal-statement helper, explain-suggestion copy, and responsible-AI notes that the tool never invents achievements.

- [x] **Notifications and reminders** — Provide new-opportunity, deadline, application, interview, assessment, saved-listing, mentor/event and weekly-digest settings; show in-app notification states plus email preference controls.

- [x] **Support and safeguarding** — Provide signposting for careers advice, education/training guidance, NEET support, apprenticeship guidance, SEND support, finance, housing, mental wellbeing, youth organisations and employment support; make reporting and safeguarding help visible; note that specialist organisations provide support.

- [x] **Accessibility and privacy** — Use mobile-first responsive layouts, keyboard focus, screen-reader labels, clear typography, contrast-safe semantic colors, accessible forms, helpful errors, loading/empty/success states, reasonable-adjustments support, privacy/consent controls, data deletion/account closure controls, and no unnecessary registration barriers.

- [x] **Administrator-ready foundation** — Provide an admin view concept for users, opportunities, verification, expiry, duplicate/report review, content, resources, events, notifications, permissions, audit logging, data export and impact reporting; keep it clearly separate from the student experience.

- [x] **Technical foundation** — Keep the initialized React/Express/tRPC/Drizzle structure; preserve Manus OAuth; add a route manifest; isolate sample data so database/tRPC procedures can replace it later; keep build, typecheck and dev server commands working.

## Notes for the next increment

This checkpoint is a complete, clickable frontend MVP with realistic sample data and honest prototype labelling. Real account persistence, opportunity ingestion/verification workflows, live organisation links, and database-backed tracker state are intentionally left as the next increment; the existing server, Manus OAuth and Drizzle foundation are preserved for that work.

- [x] **UI/UX Pro Max quality pass** — Apply the supplied guidance for accessibility, 44px+ touch targets, skip navigation, focus visibility, required form fields, explicit control labels, mobile safe-area behavior, predictable navigation, and reduced-motion support; re-run typecheck/build and confirm mobile screenshots after the changes.

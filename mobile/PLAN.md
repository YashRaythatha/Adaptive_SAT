# Adaptive SAT Mobile App — Phase-wise Implementation Plan

This document breaks down the mobile app build into **phases** with concrete tasks and deliverables. The app uses the **same backend API** as the web app; no backend changes are required.

---

## Stack

- **React Native with Expo** (TypeScript) — one codebase for Android and iOS
- **Expo Router** (file-based routing) or React Navigation
- **AsyncStorage** for user id / session (replacing web’s sessionStorage)
- **Config**: `API_BASE_URL` via env / app config (different for emulator vs device vs prod)

---

## Phase 1: Project setup, config, and API client

**Goal:** Have a runnable Expo app that can talk to the backend and read/write user id.

| # | Task | Deliverable |
|---|------|-------------|
| 1.1 | Create Expo app in `mobile/` (blank TypeScript template) | `package.json`, `app.json`, `App.tsx` or `app/_layout.tsx`, `tsconfig.json` |
| 1.2 | Add API base URL config | `src/config.ts` or `.env` + `app.config.js`: dev (emulator/simulator) vs prod. Android emulator: `http://10.0.2.2:8000`, iOS simulator: `http://localhost:8000`, physical device: your machine’s LAN IP or tunnel. |
| 1.3 | Implement API client | `src/api/client.ts`: `getBase()`, `request()`, `get()`, `post()`, `ApiError`. Same endpoints as web: health, users, practice (start, next, answer, end, targeted/start), exam (start, next, answer, advance, time_remaining, result, review, history, weak_areas), progress/skills. |
| 1.4 | User id storage | `src/storage.ts`: get/set user object (id, name, email) using AsyncStorage. API client reads `user_id` from here (async) instead of sessionStorage. |
| 1.5 | Wire API client to storage | Client uses async `getUserId()` (from storage); export `api` and use in screens. |

**Done when:** App runs on one platform (e.g. Android emulator), calls `GET /api/health`, and can call `POST /api/users` and store the returned user in AsyncStorage.

---

## Phase 2: Auth and navigation shell

**Goal:** User can “log in” (create user) and land on a dashboard; navigation structure is in place.

| # | Task | Deliverable |
|---|------|-------------|
| 2.1 | Setup screen | Single screen: name + email inputs, “Get started” → `POST /api/users` → save user to AsyncStorage → navigate to Dashboard. |
| 2.2 | Auth gate | On app load, read user from storage; if missing → Setup, else → Dashboard. (Splash or root layout decides.) |
| 2.3 | Navigation structure | Bottom tabs or stack: Dashboard (home), Practice, Exam, Progress, Exam History. Optional: drawer. |
| 2.4 | Dashboard screen | Placeholder with buttons: “Start full exam”, “Start practice”, “Progress”, “Exam history”. Navigate to correct screen on press. |
| 2.5 | Sign out | Clear AsyncStorage user and redirect to Setup. |

**Done when:** User can create account, see Dashboard, and navigate to empty Practice / Exam / Progress / History screens. ✅ (Phase 2 complete)

---

## Phase 3: Practice flow

**Goal:** User can start a practice session (by section), answer questions one by one, and see a simple result.

| # | Task | Deliverable |
|---|------|-------------|
| 3.1 | Practice start screen | Choose section (RW / Math). “Start practice” → `api.startPractice(section)` → navigate to Practice session with `sessionId`. |
| 3.2 | Practice session screen | One question at a time: question text, choices A–D, “Submit” → `api.submitPracticeAnswer()` → show correct/incorrect + explanation (optional), then “Next” → `api.getNextPracticeQuestion()`. If null, session over. |
| 3.3 | Practice end | When no more questions, call `api.endPractice(sessionId)`, show simple “Session complete” and button back to Dashboard/Practice. |
| 3.4 | Weak areas on Practice (optional) | If time: list weak areas from `api.getWeakAreas()`, tap one → `api.startTargetedPractice(skillName)` → same Practice session screen. |

**Done when:** User can complete a full practice session (by section) and return to Dashboard. ✅ (Phase 3 complete)

---

## Phase 4: Exam flow (core)

**Goal:** User can start an exam, answer questions with a visible module timer, and handle break and end.

| # | Task | Deliverable |
|---|------|-------------|
| 4.1 | Exam start | “Start full exam” → `api.startExam()` → navigate to Exam session with `sessionId`. |
| 4.2 | Exam session screen | Show current section/module, **module timer** (poll `api.getExamTimeRemaining(sessionId)` every second, display MM:SS). One question; submit → `api.submitExamAnswer()` → load next via `api.getNextExamQuestion(sessionId)`. |
| 4.3 | Time expiry | When `seconds_remaining` is 0 or `expired === true`, call `api.advanceExam(sessionId)` once, then handle response: ACTIVE (new module), BREAK, or ENDED. |
| 4.4 | Advance / no more questions | When `getNextExamQuestion` returns null, call `api.advanceExam(sessionId)` and handle ACTIVE / BREAK / ENDED. |
| 4.5 | Break screen | When advance returns `status: 'BREAK'`, show 10‑minute break UI (countdown optional), “Continue to Math” button → call advance again → go to next ACTIVE or ENDED. |
| 4.6 | Exam ended | When status is ENDED, call `api.getExamResult(sessionId)` and navigate to Exam result screen. |

**Done when:** User can run through an exam (at least one module), see timer, and reach either break or result screen. ✅ (Phase 4 complete)

---

## Phase 5: Exam result, review, and history

**Goal:** User sees scores and weak areas, can open full review and exam history.

| # | Task | Deliverable |
|---|------|-------------|
| 5.1 | Exam result screen | Display total / RW / Math scores, correct count, skills breakdown. List weak areas; “Practice” per skill → targeted practice. Buttons: “View full review”, “Exam history”, “Dashboard”. |
| 5.2 | Exam review screen | `api.getExamReview(sessionId)` → list all 98 questions (expandable or scroll). Each item: question text, choices, correct answer, user answer, is_correct, explanation, skill. |
| 5.3 | Exam history screen | `api.getExamHistory()` → list past exams (date, total score, RW/Math). Tap row → navigate to Exam review for that `sessionId`. |
| 5.4 | Deep links / params | Exam result → “View full review” passes `sessionId` to Review. History → tap passes `sessionId` to Review. |

**Done when:** User can open any past exam and see full question-by-question review. ✅ (Phase 5 complete)

---

## Phase 6: Progress and weak areas

**Goal:** Progress screen shows skills and mastery; weak areas are usable from Dashboard or Practice.

| # | Task | Deliverable |
|---|------|-------------|
| 6.1 | Progress screen | `api.getSkills()` → list skills with section and mastery; simple list or grouped by section (RW / Math). |
| 6.2 | Weak areas on Dashboard (optional) | After first exam, show “Your weak areas” with “Practice” per skill → targeted practice. |
| 6.3 | Error handling | Network errors, 4xx/5xx: show message and retry where appropriate. |

**Done when:** Progress is visible; weak areas are accessible and start targeted practice. ✅ (Phase 6 complete)

---

## Phase 7: Polish and builds

**Goal:** Reliable behavior on device, then build for store.

| # | Task | Deliverable |
|---|------|-------------|
| 7.1 | Module timer edge cases | No double advance on expiry; break screen shows once; correct transition to Math after break. |
| 7.2 | Loading and empty states | Spinners for API calls; empty state for no exams / no weak areas. |
| 7.3 | Android build | EAS Build or local: generate AAB/APK; test on device/emulator. |
| 7.4 | iOS build | EAS Build or Xcode: build for simulator and device; test. |
| 7.5 | App icon and splash | Add icon and splash screen for both platforms. |
| 7.6 | API URL for production | Config or env for production backend URL; document for store builds. |

**Done when:** App runs on real devices and is ready for store submission (Phase 8).

---

## Phase 8: Distribution (later)

| # | Task |
|---|------|
| 8.1 | Android: sign AAB, create Play Store listing, upload. |
| 8.2 | iOS: certificates, provisioning, App Store listing, upload via Transporter/Xcode. |

---

## File structure (target / current)

```
mobile/
├── App.tsx                    # Root: SafeAreaProvider, AuthProvider, NavigationContainer, RootNavigator
├── app.json
├── src/
│   ├── api/
│   │   └── client.ts          # All API calls
│   ├── config.ts              # API_BASE_URL
│   ├── context/
│   │   └── AuthContext.tsx    # user, setUser, signOut, isLoading
│   ├── navigation/
│   │   ├── RootNavigator.tsx  # Auth gate + Stack (Setup | Main tabs)
│   │   └── types.ts           # RootStackParamList, MainTabParamList
│   ├── screens/
│   │   ├── SetupScreen.tsx    # Name + email → create user → Dashboard
│   │   ├── DashboardScreen.tsx # Buttons: Practice, Exam, Progress, History, Sign out
│   │   └── PlaceholderScreen.tsx # Practice / Exam / Progress / History (Phase 3+)
│   └── storage.ts             # AsyncStorage user (getUser, setUser, getUserId)
├── package.json
├── tsconfig.json
├── PLAN.md                    # This file
└── README.md
```

---

## Suggested order to implement

1. **Phase 1** — Setup + API + storage (this phase).
2. **Phase 2** — Setup screen, auth gate, Dashboard, nav.
3. **Phase 3** — Practice flow (start → questions → end).
4. **Phase 4** — Exam flow (timer, break, result).
5. **Phase 5** — Result screen, review screen, history list.
6. **Phase 6** — Progress, weak areas.
7. **Phase 7** — Polish, builds, icon/splash.

Next step: **Phase 7** (Polish: loading/empty states, timer edge cases, builds, icon/splash).

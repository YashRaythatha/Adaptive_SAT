# Adaptive SAT — Mobile App (Android + iOS)

This folder contains the **mobile app** (Expo / React Native, TypeScript). The **web app** (frontend + backend) is unchanged; the mobile app uses the **same backend API**.

---

## Quick start (Phase 1 + 2 done)

1. **Backend** must be running (e.g. `cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000`).
2. **Copy env** (optional): `cp .env.example .env` and set `EXPO_PUBLIC_API_URL`:
   - iOS Simulator: `http://localhost:8000`
   - Android Emulator: `http://10.0.2.2:8000`
   - Physical device: `http://YOUR_PC_IP:8000`
3. **Install and run**:
   ```bash
   npm install
   npx expo start
   ```
   Then press `a` for Android or `i` for iOS (or scan QR with Expo Go on a device).

The app shows "Backend connected" when it reaches the API; otherwise it shows an error.

**Phase-wise plan:** See **`PLAN.md`** in this folder for the full implementation plan (Phase 1–8).

---

## How to check the mobile app works

1. **Start the backend** (from repo root or `backend/`):
   ```bash
   cd backend
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   Leave this running. Confirm in a browser: http://127.0.0.1:8000/api/health should return `{"status":"ok"}`.

2. **Set the API URL** (if not already done):
   - Ensure `mobile/.env` exists with `EXPO_PUBLIC_API_URL=http://localhost:8000`.
   - **Android Emulator:** use `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000` (emulator’s alias for your machine’s localhost).
   - **Physical device:** use your computer’s LAN IP, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.100:8000`, and ensure the backend is reachable (same Wi‑Fi, firewall allows port 8000).

3. **Start the mobile app** (from `mobile/`):
   ```bash
   cd mobile
   npm install
   npx expo start
   ```

4. **Open the app**:
   - **Windows:** You cannot run the iOS simulator (Xcode is Mac-only). Use one of:
     - **Android:** Press **`a`** in the terminal (requires [Android Studio](https://developer.android.com/studio) with an emulator). Or install **Expo Go** on an Android phone, ensure it’s on the same Wi‑Fi as your PC, and **scan the QR code**.
     - **Web:** Press **`w`** to open the app in your browser (quick way to test; set `EXPO_PUBLIC_API_URL=http://localhost:8000`).
     - **Physical iPhone:** Install **Expo Go** from the App Store, scan the QR code (same Wi‑Fi as PC; in `.env` use your PC’s IP for `EXPO_PUBLIC_API_URL`).
   - **Mac:** Press **`i`** for iOS Simulator (Xcode required) or **`a`** for Android; or scan QR with Expo Go.

5. **What you should see**:
   - **Working:** Screen shows “Adaptive SAT Mobile”, “Phase 1: API client”, the API URL, and **“Backend connected”** in green.
   - **Not working:** Red error text, e.g. “Failed to fetch” or “Network request failed”. Fix: check backend is running, correct `EXPO_PUBLIC_API_URL` for your platform, then restart Expo (`npx expo start` again).

After changing `.env`, restart Expo (stop with Ctrl+C, then run `npx expo start` again) so the new URL is picked up.

---

## "Project is incompatible with this version of Expo Go"

This project uses **Expo SDK 55**. The **Expo Go** app on the App Store / Play Store is often still built for **SDK 54**, so you may see:

> Project is incompatible with this version of Expo Go. The project you requested requires a newer version of Expo Go.

**Options (no need to downgrade the project):**

1. **Use the app in the browser (easiest)**  
   In the terminal where Expo is running, press **`w`**. The app opens in your browser and works the same (same API, Practice, Exam, etc.). Use `EXPO_PUBLIC_API_URL=http://localhost:8000` in `mobile/.env`.

2. **iPhone: use Expo Go for SDK 55 via TestFlight**  
   Install the beta that supports SDK 55: join the TestFlight build at **[testflight.apple.com/join/GZJxxfUU](https://testflight.apple.com/join/GZJxxfUU)** and install **Expo Go** from TestFlight. Then scan the QR code from `npx expo start` as usual.

3. **Android**  
   You can try installing the latest Expo Go from the Play Store. If it still says incompatible, use **`w`** for web or run on an emulator with **`a`** (Android Studio) if your Expo/React Native versions match the emulator’s Expo Go.

4. **Development build (optional)**  
   For a standalone app that doesn’t depend on Expo Go, use [EAS Build](https://docs.expo.dev/build/introduction/) or a local development build.

---

## Running on another computer (e.g. a friend’s PC)

Use these steps to run the **whole project** (backend + mobile app) on a different machine.

### Prerequisites on that computer

- **Node.js 18+** (for mobile and optionally frontend)
- **Python 3.11+** (for backend)
- **PostgreSQL** (backend database)
- **Git** (to clone the repo)

### 1. Get the code

- **Option A:** Clone the repo: `git clone <repo-url>` then `cd Adaptive_SAT`
- **Option B:** Copy the whole `Adaptive_SAT` folder (e.g. via USB or zip)

### 2. Backend (required for the mobile app)

1. Create a PostgreSQL database (e.g. `adaptive_sat`). See `backend/sql/SETUP_DATABASE.md` if needed.
2. Copy `backend/.env.example` to `backend/.env` and set:
   - `DATABASE_URL` (e.g. `postgresql://user:password@localhost:5432/adaptive_sat`)
   - `OPENAI_API_KEY` (for question generation; optional for basic run)
3. From the repo root:
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate    # Windows
   # source .venv/bin/activate   # Mac/Linux
   pip install -r requirements.txt
   alembic upgrade head
   python -m app.scripts.seed   # optional: seed skills and sample data
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   Leave this terminal open. Check: open http://127.0.0.1:8000/api/health — should show `{"status":"ok"}`.

### 3. Mobile app

1. In a **new** terminal:
   ```bash
   cd mobile
   ```
2. Create env file:
   - **Windows:** `copy .env.example .env`
   - **Mac/Linux:** `cp .env.example .env`
3. Edit `mobile/.env` and set `EXPO_PUBLIC_API_URL`:
   - **Running in browser (easiest):** `http://localhost:8000`
   - **Android emulator on same PC:** `http://10.0.2.2:8000`
   - **Phone (Expo Go) on same Wi‑Fi:** `http://<THIS_PC_IP>:8000` (e.g. `http://192.168.1.100:8000`). Ensure the backend is reachable (firewall allows port 8000).
4. Install and start:
   ```bash
   npm install
   npx expo start
   ```
5. Open the app:
   - Press **`w`** to run in the browser (works on any OS).
   - Press **`a`** for Android (needs Android Studio + emulator).
   - Or scan the QR code with **Expo Go** on a phone (use the PC’s IP in `.env` as above).

When the app loads, it should show **“Backend connected”** if the URL is correct and the backend is running.

---

- **No changes** to the existing backend or web frontend.
- Mobile app talks to the same `backend` API (e.g. `https://your-api.com` or same host with a different port in dev).

---

## Recommended approach: React Native or Flutter

| Option | Pros | Cons |
|--------|------|------|
| **React Native** (Expo or bare) | Same language as web (JS/TS), large ecosystem, can share some types/logic with web if you want later. | Two platforms from one codebase; need to run Android Studio / Xcode for builds. |
| **Flutter** (Dart) | Single codebase, fast UI, good tooling. | Different language from backend and web. |
| **Native (Kotlin + Swift)** | Best platform fit. | Two separate codebases and more effort. |

**Practical choice:** **React Native with Expo** — one TypeScript codebase, shared API client logic, and you get Android + iOS from the same project. Alternatively **Flutter** if you prefer Dart and one codebase.

---

## Proposed folder structure

```
mobile/
├── App.tsx              # Root component (Phase 1: health check)
├── src/
│   ├── config.ts       # API base URL (EXPO_PUBLIC_API_URL)
│   ├── storage.ts      # AsyncStorage user (getUser, setUser, getUserId)
│   └── api/
│       └── client.ts    # Full API client (users, practice, exam, progress, history, review, weak_areas)
├── PLAN.md             # Phase-wise implementation plan
├── package.json
├── app.json
└── .env.example        # EXPO_PUBLIC_API_URL
```

---

## Implementation flow (high level)

### Phase 1: Setup and API

1. **Choose stack** — React Native (Expo) or Flutter; create the project inside `mobile/`.
2. **Configure API base URL** — Same backend as web (e.g. `https://your-backend.com` or `http://10.0.2.2:8000` for Android emulator, `http://localhost:8000` for iOS simulator). Use env/config so you can switch for dev vs prod.
3. **API client** — Implement the same calls as web: users, practice, exam (start, next, answer, advance, time_remaining, result, review, history, weak_areas), progress. Reuse or mirror the web API request/response shapes (no backend changes).

### Phase 2: Auth and session

4. **User creation / “login”** — One screen: name + email → `POST /api/users` → store returned user **id** (and optionally name/email) locally (e.g. AsyncStorage / SecureStore). No password; same idea as web (sessionStorage).
5. **Session** — Send `user_id` with every request that needs it (in body or query). Backend does not use cookies for this app; same stateless pattern as web.

### Phase 3: Core screens (mirror web flow)

6. **Setup** — Create user (name, email); then go to Dashboard.
7. **Dashboard** — Buttons: Start Full Exam, Start Practice. Link to Progress, Exam History.
8. **Practice** — Choose section (RW / Math) → start session → **Practice session** screen: show one question, choices, submit → next question until done; then show simple result / return to dashboard.
9. **Exam** — Start exam → **Exam session** screen:
   - Show **module timer** (poll `GET /api/exam/time_remaining` every second, display MM:SS).
   - One question at a time; submit answer → next (or advance when no more questions / time expired).
   - When backend returns **BREAK** (after RW Module 2), show **10‑minute break** screen (countdown, “Continue to Math Section”).
   - When **ENDED**, show **result** (scores, weak areas). Option to “View detailed review” and “Exam history”.
10. **Exam result** — Total / RW / Math scores, weak areas, button to open **full review** (all 98 questions with correct answer, your answer, explanation).
11. **Exam review** — Same data as web: `GET /api/exam/review?session_id=&user_id=` → list/expand or scroll through all questions with explanations.
12. **Exam history** — `GET /api/exam/history` → list past exams (date, score); tap one → open that exam’s review (same API as above).
13. **Progress** — `GET /api/progress/skills` → show skills and mastery.

### Phase 4: Polish and builds

14. **Module time expired** — When timer hits 0 or API returns `expired`, call **advance** and then load next module/break/result (same logic as web: no duplicate advance so break screen is shown correctly).
15. **Error handling** — Network errors, 4xx/5xx; show messages and retry where it makes sense.
16. **Android build** — Generate release build (e.g. AAB/APK) via Expo/React Native or Flutter; test on device/emulator.
17. **iOS build** — Same codebase; build via Xcode (Expo/RN or Flutter); test on simulator/device. You need an Apple Developer account for real devices and App Store.
18. **App icons and splash** — Add app icon and splash screen for both platforms.

### Phase 5: Distribution (later)

19. **Android** — Google Play Store: sign the app, create store listing, upload AAB.
20. **iOS** — App Store: certificates, provisioning, store listing, upload via Xcode/Transporter.

---

## Flow summary (no backend changes)

- **Backend** — Stays as-is. Same API, same DB, same env.
- **Web** — Unchanged. Same frontend and UX.
- **Mobile** — New app in `mobile/` that:
  - Uses the **same API** (user, practice, exam, progress, history, review, weak areas).
  - Reuses the **same flow**: setup → dashboard → practice or exam → exam session (with timer, break, result) → review / history.
  - Stores **user id** locally and sends it with requests (no backend change).
- **Builds** — From the `mobile/` project you produce both **Android** and **iOS** apps (one codebase with React Native or Flutter).

---

## Suggested next steps (when you start)

1. Create the React Native (Expo) or Flutter project **inside `mobile/`**.
2. Add a **config** for `API_BASE_URL` (and use it for all requests).
3. Implement **API client** (users, practice, exam, progress, history, review) and **Setup** + **Dashboard** screens.
4. Implement **Practice** flow (start → next → answer → end).
5. Implement **Exam** flow (start → next → answer → advance, timer, break, result → review/history).
6. Implement **Progress** and **Exam history** (list + review).
7. Test on Android and iOS; then prepare store builds when ready.

No code changes are required in `backend/` or `frontend/` for the mobile app to work.

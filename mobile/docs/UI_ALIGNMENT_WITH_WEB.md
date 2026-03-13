# Mobile UI alignment with web app

This document lists changes to make the mobile app UI match the web version (same product feel).

## 1. Design tokens (done)

- **`src/theme.ts`** – Central theme with web colors and spacing.
- **Primary color**: Web uses **#030213** (near black) for header and primary buttons. Mobile was using **#2563eb** (blue); all primary actions should use **#030213** and white text.
- **Muted text**: Use **#717182** (web `muted-foreground`) instead of #64748b.
- **Borders**: Use **rgba(0,0,0,0.1)** to match web `--border`.
- **Radius**: Use **10px** for cards (web `--radius: 0.625rem`), 8px for buttons.

## 2. Header / app bar

- **Web**: Sticky header with dark background (#030213), “Adaptive SAT” title, nav links, “Hi, {name}”, theme toggle, Sign out.
- **Mobile**: Use a **custom header** (or stack `headerStyle`) with:
  - Background **#030213**, text white.
  - Title “Adaptive SAT” on main screens.
  - Optional: show “Hi, {name}” in header or keep in content.
- **Tab bar**: Style active tab with primary color (#030213) so it matches the web header.

## 3. Dashboard

- **Web**: “Welcome back, {name}! 👋” + short subtitle; two large **cards** (Practice = teal gradient, Exam = amber gradient) with icon, title, description, “Start Practice →” / “Start Exam →”; links “View your progress” / “Exam history”.
- **Mobile**:
  - Use same **copy**: “Welcome back, {name}! 👋” and the same one-line subtitle.
  - Replace plain buttons with **two card-style rows**:
    - **Practice**: teal-tinted card (bg ~#f0fdfa, border teal), BookOpen-style icon, “Practice Session” title, short description, “Start Practice” CTA.
    - **Exam**: amber-tinted card (bg ~#fffbeb, border amber), FileText-style icon, “Full Practice Exam” title, short description, “Start Exam” CTA.
  - Add **secondary links** for “View your progress” and “Exam history” (text link style, primary color).
  - Keep “Your weak areas” section; style rows with theme borders and muted text.

## 4. Practice start

- **Web**: Section chosen as **cards** (RW / Math) with clear selected state; “Start Practice” primary button.
- **Mobile**: Already card-like; ensure **selected state** uses primary #030213 (border + subtle bg) instead of blue. Use theme spacing and radius.

## 5. Buttons

- **Primary**: Background **#030213**, text white, radius 8, hover/press opacity.
- **Secondary / outline**: Border **rgba(0,0,0,0.1)** or theme.border, bg transparent, text #030213; pressed state light gray bg (#e9ebef).
- **Destructive**: Use **#d4183d** for “End exam” / danger actions.

## 6. Cards and lists

- **Cards**: bg #fff, border theme.border, **radius 10**, padding 24, optional shadow (e.g. shadowColor #000, shadowOpacity 0.05, shadowRadius 4).
- **List rows**: Border bottom theme.border; text primary #030213, secondary muted #717182.

## 7. Setup / onboarding

- **Web**: Simple form; primary CTA “Get started” with primary color.
- **Mobile**: Use **#030213** for the main button; keep input border theme.border; title “Adaptive SAT” and same subtitle tone.

## 8. Exam result / summary

- **Web**: Trophy icon, “Exam Complete! 🎉”, total score large (amber), RW/Math boxes, “View full review”, “Take Another Exam”, “Back to Dashboard”.
- **Mobile**: Same structure and copy; use **amber** for score highlight (#b45309 / #f59e0b); same button hierarchy (primary = View review, outline = Dashboard / History).

## 9. Typography

- **Titles**: 24px (web text-2xl), weight 600.
- **Section titles**: 20px (text-xl), weight 600.
- **Body**: 16px; **muted** 14px, color #717182.
- **Captions**: 12px, muted.

## 10. Spacing

- **Page**: horizontal 16–24, top 24 (or under header), bottom 32.
- **Between sections**: 24.
- **Between cards/items**: 12–16.
- **Inside cards**: padding 24.

## Implementation order

1. **Use `theme.ts`** in all screens (replace hardcoded #2563eb, #64748b, #e2e8f0 with theme.colors).
2. **Style stack/tab headers** to use primary #030213 and white text.
3. **Redesign Dashboard** with welcome copy and two icon cards (Practice teal, Exam amber) + progress/history links.
4. **Align Practice start** selected state and buttons to theme.
5. **Align Setup** and **Exam result** buttons/cards to theme.
6. **Optionally** add a shared **Card** and **PrimaryButton** / **SecondaryButton** components that use theme so all screens stay consistent.

---

## 11. Responsive layout (screen-size alignment)

Content should adjust to different screen sizes (small phones, large phones, tablets) and safe areas (notch, home indicator).

### `useLayout` hook (`src/hooks/useLayout.ts`)

- **`width` / `height`** – Window dimensions (updates on rotate/resize).
- **`insets`** – Safe area insets (top, bottom, left, right) for notches and home indicator.
- **`pagePaddingHorizontal`** – Horizontal padding that scales with width (e.g. 16–24px).
- **`pagePaddingVertical`** – Vertical padding that scales with height.
- **`maxContentWidth`** – On tablets (width ≥ 600), set to 560 so content doesn’t stretch too wide; `undefined` on phones.
- **`scrollContentBottomPadding`** – Bottom padding for ScrollView (safe area + tab bar) so content isn’t hidden.

### How to use on a screen

1. **Scroll screens**: Use `contentContainerStyle={[baseStyles, { paddingHorizontal: layout.pagePaddingHorizontal, paddingTop: layout.insets.top + layout.pagePaddingVertical, paddingBottom: layout.scrollContentBottomPadding, maxWidth: layout.maxContentWidth, alignSelf: layout.maxContentWidth ? 'center' : undefined, width: layout.maxContentWidth ? '100%' : undefined }]}` and `flexGrow: 1` on the content container.
2. **Non-scroll screens**: Use `layout.pagePaddingHorizontal` for container padding and `layout.maxContentWidth ?? 400` for inner max width.
3. **Text**: Use `flex: 1`, `minWidth: 0` on text wrappers and `numberOfLines={1}` where needed so long text truncates.

Screens already using this: **Dashboard**, **PracticeStart**, **Setup**, **ExamResult**. Apply the same to **PracticeSession**, **ExamSession**, **ExamReview**, **HistoryList**, **Progress** for consistency.

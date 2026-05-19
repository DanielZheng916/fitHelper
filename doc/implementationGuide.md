# FitHelper Implementation Guide

> This document is a sequential instruction set for Cursor AI.
> Read `@doc/systemDesign.md` alongside this file — it contains all specs, schemas, formulas, and wireframes referenced below.
>
> **How to use**: Open a Cursor chat and enter:
> ```
> Read @doc/implementationGuide.md and @doc/systemDesign.md — implement all 6 phases sequentially. Do not ask questions. After each phase, run the exit check, fix any failures, then commit and proceed to the next phase.
> ```

---

## Ground Rules

1. Follow `AGENTS.md`: write tests before code, run all tests, lint before committing, never commit secrets.
2. Do NOT skip phases or reorder them — each phase depends on the previous one.
3. After each phase, run the **Exit Check** commands listed. Fix any failures before moving on.
4. Commit after each phase with the message format: `feat(phaseN): <description>`.
5. If an `npm install` fails, check for typos and retry. Do not invent package versions — use latest.
6. All file paths are relative to the project root (`fitHelper/`).

---

## Phase 1: Project Scaffold

### 1.1 Initialize the project

```bash
npm init -y
```

Edit `package.json` — set these fields:
- `"name": "fithelper"`
- `"version": "0.1.0"`
- `"description": "A lightweight, intuitive health utility for macOS"`
- `"main": "dist/main/index.js"`
- `"scripts"`: see section 1.4

### 1.2 Install dependencies

Production dependencies:

```bash
npm install react react-dom react-i18next i18next better-sqlite3 openai @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities electron-window-state
```

Dev dependencies:

```bash
npm install -D electron electron-builder typescript vite @vitejs/plugin-react vitest @testing-library/react @testing-library/jest-dom jsdom eslint prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser @types/react @types/react-dom @types/better-sqlite3 @types/node
```

### 1.3 Create directory structure

Create every directory and empty placeholder file matching the structure in `systemDesign.md` Section 2.3. Specifically create these directories:

```
src/main/
src/main/ipc/
src/main/db/
src/main/services/
src/renderer/
src/renderer/components/
src/renderer/components/PaceConverter/
src/renderer/components/CalorieLibrary/
src/renderer/components/DailyTracker/
src/renderer/components/TrainingLog/
src/renderer/hooks/
src/renderer/styles/
src/renderer/i18n/
src/shared/
tests/
```

### 1.4 Configuration files

**`tsconfig.json`** — strict mode, target ES2020, module NodeNext for main, JSX react-jsx for renderer. Create two tsconfig files if needed (`tsconfig.node.json` for main, `tsconfig.json` for renderer), or a single one with project references.

**`vite.config.ts`** — configure `@vitejs/plugin-react`. Set `root` to `src/renderer`, `build.outDir` to `../../dist/renderer`. Configure `resolve.alias` if needed for `@shared` imports.

**`.eslintrc.cjs`** — extend `eslint:recommended`, `plugin:react/recommended`, `plugin:react-hooks/recommended`, `plugin:@typescript-eslint/recommended`, `prettier`. Set `parserOptions.project` to `tsconfig.json`.

**`prettier.config.cjs`** — `singleQuote: true`, `semi: true`, `trailingComma: 'es5'`, `printWidth: 100`.

**`electron-builder.yml`**:
```yaml
appId: com.fithelper.app
productName: FitHelper
mac:
  category: public.app-category.healthcare-fitness
  target:
    - target: dmg
      arch:
        - arm64
        - x64
directories:
  output: release
  buildResources: build
files:
  - dist/**/*
  - keys/**/*
  - "!node_modules/**/*"
```

**`.gitignore`**:
```
node_modules/
dist/
release/
keys/
.fithelper/
*.db
.DS_Store
.env
```

**`package.json` scripts**:
```json
{
  "dev": "vite build --mode development && electron .",
  "build": "tsc && vite build && electron-builder",
  "lint": "eslint src/ --ext .ts,.tsx",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Note: The `dev` script above is a simplified placeholder. You will likely need a more sophisticated setup using `concurrently` or a custom script to run Vite in watch mode and Electron simultaneously. A common pattern for Electron + Vite:

```bash
npm install -D concurrently wait-on
```

Then update scripts:
```json
{
  "dev:renderer": "vite --config vite.config.ts",
  "dev:main": "tsc -p tsconfig.node.json --watch",
  "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\" \"wait-on http://localhost:5173 && electron .\"",
  "build": "tsc && vite build && electron-builder",
  "lint": "eslint src/ --ext .ts,.tsx",
  "test": "vitest run"
}
```

### 1.5 Git init

```bash
git init
git add -A
git commit -m "feat(phase1): project scaffold with deps, config, and directory structure"
```

### 1.6 Exit Check

```bash
npx tsc --noEmit        # should compile (may have empty-file warnings, that's ok)
npm run lint             # should pass (no source files with errors)
```

---

## Phase 2: Electron Shell + Database

### 2.1 Shared types — `src/shared/types.ts`

Define all TypeScript interfaces used across main and renderer. Refer to `systemDesign.md` Section 2.4 for the column definitions and Section 2.6 for IPC payloads. At minimum:

```typescript
export interface ConversionRecord {
  id: number;
  inputValue: string;
  inputUnit: 'mph' | 'min_km';
  outputValue: string;
  outputUnit: 'mph' | 'min_km';
  createdAt: string;
}

export interface CalorieItem {
  id: number;
  name: string;
  calories: string;
  category: '主食' | '小食' | '酒';
  sortOrder: number;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTarget {
  id: number;
  date: string;
  targetCalories: number;
}

export interface DailyItem {
  id: number;
  date: string;
  name: string;
  calories: number;
  isEaten: boolean;
  sortOrder: number;
  calorieItemId: number | null;
  createdAt: string;
}

export interface ElectronAPI {
  converter: {
    convert: (value: string, fromUnit: 'mph' | 'min_km') => Promise<{ result: string; toUnit: string }>;
    getHistory: () => Promise<ConversionRecord[]>;
  };
  calorie: {
    getAll: () => Promise<CalorieItem[]>;
    create: (item: Omit<CalorieItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CalorieItem>;
    update: (item: CalorieItem) => Promise<CalorieItem>;
    delete: (id: number) => Promise<void>;
  };
  daily: {
    getTarget: (date: string) => Promise<DailyTarget | null>;
    setTarget: (date: string, targetCalories: number) => Promise<void>;
    getItems: (date: string) => Promise<DailyItem[]>;
    addItem: (item: Omit<DailyItem, 'id' | 'createdAt'>) => Promise<DailyItem>;
    updateItem: (item: DailyItem) => Promise<void>;
    deleteItem: (id: number) => Promise<void>;
    reorder: (ids: number[]) => Promise<void>;
    suggest: (date: string) => Promise<CalorieItem | null>;
  };
  training: {
    getGoal: () => Promise<string>;
    saveGoal: (content: string) => Promise<void>;
    getRecords: () => Promise<string>;
    saveRecords: (content: string) => Promise<void>;
    getPlan: () => Promise<string>;
    savePlan: (content: string) => Promise<void>;
    getCoachSuggestion: (force: boolean) => Promise<CoachSuggestion | string>;
  };
}
```

Add a global type declaration so the renderer can access `window.electronAPI`:

```typescript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

### 2.2 Database connection — `src/main/db/connection.ts`

- Use `better-sqlite3`.
- Database path: `path.join(os.homedir(), '.fithelper', 'fithelper.db')`.
- Create the `~/.fithelper/` directory if it doesn't exist (`fs.mkdirSync` with `recursive: true`).
- Export a singleton `getDb()` function that opens the database once and returns it.
- Enable WAL mode for better concurrent read performance: `db.pragma('journal_mode = WAL')`.

### 2.3 Migrations — `src/main/db/migrations.ts`

Create all 8 tables exactly as specified in `systemDesign.md` Section 2.4. Use `CREATE TABLE IF NOT EXISTS` for idempotency. The tables are:

1. `conversion_history`
2. `calorie_items`
3. `daily_targets`
4. `daily_items`
5. `training_records`
6. `training_plan`
7. `training_goal`
8. `ai_coach_history`

Export a `runMigrations(db)` function.

### 2.4 Seed data — `src/main/db/seed.ts`

Insert the preset calorie items from `systemDesign.md` Section 1.4.1 into the `calorie_items` table. Use `INSERT OR IGNORE` to avoid duplicates on re-run. Set `is_preset = 1` for all preset items. Assign `sort_order` sequentially within each category.

Also insert an empty row into `training_records`, `training_plan`, and `training_goal` (all with `content = ''`) so the single-row tables are initialized.

Export a `seedData(db)` function.

### 2.5 Preload script — `src/preload.ts`

Use `contextBridge.exposeInMainWorld` to expose `electronAPI` matching the `ElectronAPI` interface from `src/shared/types.ts`. Each method calls `ipcRenderer.invoke(channel, ...args)` using the channel names from `systemDesign.md` Section 2.6.

### 2.6 Main process entry — `src/main/index.ts`

- Create the `BrowserWindow` with:
  - `width: 1200, height: 800, minWidth: 900, minHeight: 600`
  - `webPreferences: { preload: path.join(__dirname, '../preload.js'), contextIsolation: true, nodeIntegration: false }`
- Use `electron-window-state` to remember window position and size.
- On `app.whenReady()`: call `runMigrations(db)`, call `seedData(db)`, create window, register all IPC handlers.
- For development, load `http://localhost:5173`. For production, load the built `index.html` from `dist/renderer/index.html`.
- Register stub IPC handlers for all channels (they can return empty/mock data for now — they'll be implemented in later phases).

### 2.7 Tests

Write unit tests in `tests/db.test.ts`:
- Test that `runMigrations` creates all 8 tables (use an in-memory SQLite database: `new Database(':memory:')`).
- Test that `seedData` inserts the correct number of preset calorie items (24 items total: 14 主食 + 6 小食 + 4 酒).
- Test that `seedData` is idempotent (running it twice doesn't duplicate).

### 2.8 Exit Check

```bash
npm test                 # db tests pass
npm run dev              # Electron window opens (may show blank page — that's expected)
```

Verify `~/.fithelper/fithelper.db` exists after running dev.

### 2.9 Commit

```bash
git add -A
git commit -m "feat(phase2): electron shell, SQLite database, migrations, seed data, preload bridge"
```

---

## Phase 3: Frontend Shell + Tool 1 (Pace Converter)

### 3.1 Renderer entry

**`src/renderer/index.html`** — standard HTML5 boilerplate with `<div id="root"></div>` and a `<script type="module" src="./main.tsx"></script>`.

**`src/renderer/main.tsx`** — render `<App />` into `#root`.

### 3.2 Global styles — `src/renderer/styles/global.css`

Apply the dark-mode color palette from `systemDesign.md` Section 3.1:
- `body` background: `#1A1A2E`, color: `#E8E8E8`.
- Font family: `-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif`.
- Base font size: `14px`.
- Monospace font for numbers: `"SF Mono", "Menlo", monospace`.
- CSS custom properties (variables) for all palette colors so components can reference them (e.g., `--color-bg-primary: #1A1A2E`, `--color-accent: #53C9B1`, etc.).
- Reset default margins, paddings, box-sizing: border-box.

### 3.3 App layout — `src/renderer/App.tsx`

- Use React state to track the active tool (1-4), defaulting to 1.
- Render a flexbox layout: `<Sidebar>` on the left (220px fixed) + content area on the right (flex: 1).
- Content area renders the appropriate tool component based on active tool state.

### 3.4 Sidebar — `src/renderer/components/Sidebar.tsx`

- Displays "FitHelper" title/logo at the top.
- 4 navigation items corresponding to the 4 tools (use tool names from `systemDesign.md` Section 1.1).
- Active item: highlighted with `--color-accent` left border + background tint.
- Sidebar background: `#16213E`.
- Accepts `activeTool` and `onToolChange` props.

### 3.5 Tool 1: Pace Converter — `src/renderer/components/PaceConverter/`

Create these files:

**`PaceConverter.tsx`** — main component:
- State: `inputValue`, `fromUnit` ('mph' or 'min_km'), `result`, `history`.
- On mount, call `window.electronAPI.converter.getHistory()` to load history.
- On input change (debounced 600ms) or Enter key press, call `window.electronAPI.converter.convert(value, fromUnit)` and display the result.
- Swap button toggles `fromUnit` between 'mph' and 'min_km'.
- Below the converter, render the history list (max 10, most recent first).
- Follow the wireframe layout from `systemDesign.md` Section 3.3.1.

**`index.ts`** — re-export.

### 3.6 IPC handlers for Tool 1 — `src/main/ipc/converter.ts`

Implement these handlers (register them with `ipcMain.handle`):

**`converter:convert`**:
- Receives `{ value: string, fromUnit: 'mph' | 'min_km' }`.
- Implements the conversion formulas from `systemDesign.md` Section 2.7 exactly.
- Validates input: mph must be a positive number, min_km must match `M:SS` format.
- On valid conversion, saves to `conversion_history` table. If count > 10, delete the oldest row.
- Returns `{ result: string, toUnit: string }`.

**`converter:getHistory`**:
- Returns the most recent 10 rows from `conversion_history`, ordered by `created_at DESC`.

### 3.7 Tests

Write tests in `tests/converter.test.ts`:
- `mphToMinKm(5.2)` should return `"7:24 min/km"` (verify: 5.2 * 1.60934 = 8.36857, 60/8.36857 = 7.1698, floor=7, (0.1698*60)=round(10.19)=10 ... actually let me recalculate: 5.2 mph = 8.368 km/h, 60/8.368 = 7.170 min/km, 7 min 10 sec => "7:10 min/km"). Test with known values.
- `minKmToMph("6:46")` should return a valid mph decimal.
- Round-trip: converting a value and converting back should approximate the original.
- Invalid input returns an error or null.

### 3.8 Exit Check

```bash
npm test                 # all tests pass (db + converter)
npm run dev              # app opens, Tool 1 is visible with converter UI
```

Manually verify: type `5.2` in mph field, confirm a result appears. Click swap, confirm direction changes.

### 3.9 Commit

```bash
git add -A
git commit -m "feat(phase3): frontend shell, sidebar navigation, pace converter (Tool 1)"
```

---

## Phase 4: Tool 2 (Calorie Library) + Tool 3 (Daily Tracker)

### 4.1 Tool 2: Calorie Library — `src/renderer/components/CalorieLibrary/`

**`CalorieLibrary.tsx`** — main component:
- On mount, call `window.electronAPI.calorie.getAll()` and store in state.
- Display items grouped by category (主食, 小食, 酒) under section headers.
- Search bar at top filters items by name (client-side filter on the loaded array).
- Each item row shows: name, calories, edit button, delete button.
- "Add Item" button at top-right opens an inline form (or a small modal) with fields: name (text), calories (text), category (dropdown of 主食/小食/酒).
- Edit: clicking the edit button puts that row into edit mode (inline inputs replace the text).
- Delete: clicking delete shows a brief confirmation, then calls `window.electronAPI.calorie.delete(id)`.
- Follow wireframe from `systemDesign.md` Section 3.3.2.

### 4.2 IPC handlers for Tool 2 — `src/main/ipc/calorieLib.ts`

Implement all `calorie:*` channel handlers as defined in `systemDesign.md` Section 2.6:
- `calorie:getAll` — `SELECT * FROM calorie_items ORDER BY category, sort_order`.
- `calorie:create` — `INSERT INTO calorie_items` with provided fields, return the new row.
- `calorie:update` — `UPDATE calorie_items SET ... WHERE id = ?`, also update `updated_at`.
- `calorie:delete` — `DELETE FROM calorie_items WHERE id = ?`.

### 4.3 Tool 3: Daily Calorie Tracker — `src/renderer/components/DailyTracker/`

**`DailyTracker.tsx`** — main component:
- State: `date` (today's ISO string), `target`, `items`, `suggestion`.
- On mount, load target and items for today via IPC.
- **Target display**: Shows `current / target kcal` with a progress bar. Use color logic from `systemDesign.md` Section 3.3.3 (green < 80%, yellow 80-100%, red > 100%).
- **Item list**: Each row has:
  - Drag handle (via @dnd-kit/sortable)
  - Checkbox toggle for eaten/planned status
  - Name + calorie display
  - Delete button
  - Eaten items show normally; planned items show with `+` prefix and dimmed style.
- **Drag-to-reorder**: Use `@dnd-kit/core` + `@dnd-kit/sortable`. On drag end, call `window.electronAPI.daily.reorder(newIdOrder)`.
- **Add from Library**: Opens a dropdown/popover listing all items from `calorie:getAll`, grouped by category. Clicking an item calls `daily:addItem`.
- **Manual add**: Inline form with name + calories fields.
- **Suggestion card**: Call `window.electronAPI.daily.suggest(date)` after each change. Display the suggested item with an "Add to list" button.

### 4.4 IPC handlers for Tool 3 — `src/main/ipc/dailyTracker.ts`

Implement all `daily:*` channel handlers:
- `daily:getTarget` — delegates to `getOrCreateTarget(db, date)`. If a row exists for the date, returns it. Otherwise inherits `target_calories` from the most recent previous day (falls back to `DEFAULT_TARGET_KCAL = 1800` on first-ever use), auto-creates the row, and returns it.
- `daily:setTarget` — `INSERT OR REPLACE INTO daily_targets (date, target_calories) VALUES (?, ?)`.
- `daily:getItems` — `SELECT * FROM daily_items WHERE date = ? ORDER BY sort_order`.
- `daily:addItem` — `INSERT INTO daily_items ...`, assign `sort_order` as max+1 for the date.
- `daily:updateItem` — `UPDATE daily_items SET ... WHERE id = ?`.
- `daily:deleteItem` — `DELETE FROM daily_items WHERE id = ?`.
- `daily:reorder` — receives an array of ids in new order, updates `sort_order` for each.
- `daily:suggest` — implements the food suggestion algorithm from `systemDesign.md` Section 2.8:
  1. Calculate `remaining = target - sum(eaten items)`.
  2. If remaining <= 0, return null.
  3. Get all calorie items from the library.
  4. Filter: item's max calories <= remaining AND item name not already in today's list.
  5. Score each candidate: favor under-represented categories + items that fit the remaining budget.
  6. Return the highest-scoring item, or null if no candidates.

### 4.5 Tests

Write tests in `tests/calorieLib.test.ts`:
- CRUD operations on calorie_items work correctly.
- Preset data is retrievable.

Write tests in `tests/dailyTracker.test.ts`:
- Setting and getting a daily target.
- Adding items, toggling eaten status, verifying sum calculation.

Write tests in `tests/suggestion.test.ts`:
- When remaining budget is 0, returns null.
- When all library items exceed budget, returns null.
- Returns an item that fits the budget.
- Category balancing: if all eaten items are 主食, the suggestion should prefer 小食 or 酒.

### 4.6 Exit Check

```bash
npm test                 # all tests pass
npm run dev              # Tool 2 shows categorized calorie list; Tool 3 shows tracker with drag-reorder
```

### 4.7 Commit

```bash
git add -A
git commit -m "feat(phase4): calorie library (Tool 2) with CRUD, daily tracker (Tool 3) with drag-reorder and food suggestions"
```

---

## Phase 5: Tool 4 (Training Log + AI Coach)

### 5.1 Tool 4: Training Log — `src/renderer/components/TrainingLog/`

**`TrainingLog.tsx`** — main component:
- **Goal field**: A text input above the tabs where the user enters their training objective (e.g. "Get a good score in June 21th's Boston 10K race"). On mount, load from `training:getGoal`. Auto-save on blur via `training:saveGoal`.
- **Tab toggle**: Two tabs — "Records" and "Plan". State tracks which is active.
- **Text area**: Large, full-width `<textarea>` for freeform text input. Monospace font for readability.
- On mount, load content from IPC (`training:getRecords` or `training:getPlan` depending on active tab).
- Auto-save on blur or Cmd+S: call `training:saveRecords` or `training:savePlan`.
- **AI Coach panel** below the text area:
  - Renders the structured `CoachSuggestion` JSON as two cards: "Next Training Day" and "Next Training Week". Each card shows the plan suggestion text and a 2-sentence reason below it.
  - If the response is a plain string (error/fallback), render it as pre-wrapped text.
  - "Refresh" button to manually trigger `training:getCoachSuggestion(force: true)`.
  - Loading spinner while waiting for API response.
  - On save of training records **or training plan**, automatically call `training:getCoachSuggestion(force: false)`.
- Follow wireframe from `systemDesign.md` Section 3.3.4.

### 5.2 IPC handlers for Tool 4 — `src/main/ipc/training.ts`

Implement all `training:*` channels:
- `training:getGoal` — return `content` from the single row in `training_goal`.
- `training:saveGoal` — update the single row in `training_goal`, set `updated_at`.
- `training:getRecords` — return `content` from the single row in `training_records`.
- `training:saveRecords` — update the single row in `training_records`, set `updated_at`.
- `training:getPlan` — return `content` from the single row in `training_plan`.
- `training:savePlan` — update the single row, set `updated_at`.
- `training:getCoachSuggestion` — see section 5.3.

### 5.3 OpenAI service — `src/main/services/openai.ts`

- Read API key from encrypted storage (Electron `safeStorage`) or dev fallback (`keys/open-ai-api-key.txt`). Trim whitespace. Cache in a module-level variable.
- If the key is not configured, return a fallback message ("API key not configured").
- Create an OpenAI client instance using the `openai` npm package.
- Export an `async function getCoachSuggestion(db, goal: string, plan: string, records: string, force: boolean): Promise<CoachSuggestion | string>` that:
  1. Computes SHA-256 hash of `goal + plan + records`.
  2. If `force === false`, check `ai_coach_history` table for a row with matching `prompt_hash`. If found, parse and return the cached `response`.
  3. Otherwise, call the OpenAI API:
     - Model: `gpt-5.4`
     - System message: the structured JSON prompt from `systemDesign.md` Section 2.5.
     - User message: `"Training Goal:\n{goal}\n\nTraining Plan:\n{plan}\n\nTraining Records:\n{records}"`
     - `response_format: { type: 'json_object' }` to enforce valid JSON output.
     - Temperature: 0.7
     - **No** `max_completion_tokens` parameter — let the model produce a complete response.
  4. Parse the response JSON into a `CoachSuggestion` object. If parsing fails, return the raw text as a string fallback.
  5. Save the raw JSON string to `ai_coach_history` with the `prompt_hash` and `model` (`gpt-5.4`).
  6. Return the parsed `CoachSuggestion` object.
- Wrap the API call in a try/catch. On failure, return an error message string (don't throw — the UI should display it gracefully).

### 5.4 Wire up `training:getCoachSuggestion` IPC handler

In `src/main/ipc/training.ts`, the handler for `training:getCoachSuggestion`:
1. Receives `{ force: boolean }`.
2. Reads current goal, records, and plan from the database.
3. Calls `getCoachSuggestion(db, goal, plan, records, force)` from the openai service.
4. Returns the `CoachSuggestion` object or error string.

### 5.5 Tests

Write tests in `tests/training.test.ts`:
- Save and retrieve training records.
- Save and retrieve training plan.
- Save and retrieve training goal.
- Hash computation: same input produces same hash; different input produces different hash.
- Hash includes goal: changing only the goal produces a different hash.

Write tests in `tests/openai.test.ts`:
- Test prompt assembly: verify the system message contains JSON schema instructions, and the user message includes "Training Goal:", "Training Plan:", and "Training Records:" sections.
- Test hash-based caching: mock the DB, verify that a cached response is returned when the hash matches.
- Test `CoachSuggestion` type: verify the expected JSON structure with `next_training_day` and `next_training_week` fields.
- Verify model string is `gpt-5.4`.
- Do NOT call the real OpenAI API in tests — mock the `openai` client.

### 5.6 Exit Check

```bash
npm test                 # all tests pass
npm run dev              # Tool 4 shows goal field, records/plan tabs, AI Coach panel with structured cards
```

If the API key is configured, clicking "Refresh" should return a structured AI suggestion rendered as two cards. If not, the panel should show the fallback message gracefully.

### 5.7 Commit

```bash
git add -A
git commit -m "feat(phase5): training log (Tool 4) with goal, records, plan, and structured AI coach via OpenAI gpt-5.4"
```

---

## Phase 6: Polish, i18n, and Packaging

### 6.1 Internationalization (i18n)

**`src/renderer/i18n/zh.json`** — Chinese translations for all UI strings:
- Sidebar labels, tool titles, button text ("添加", "编辑", "删除", "搜索", "保存"), placeholders, error messages, AI coach labels, goal placeholder, "Next Training Day"/"Next Training Week" section headers.

**`src/renderer/i18n/en.json`** — English translations for the same keys.

**`src/renderer/i18n/index.ts`** — configure `i18next` with `react-i18next`:
- Default language: `zh`.
- Fallback: `en`.
- Detection: check `navigator.language` — if it starts with `zh`, use `zh`; otherwise `en`.
- Persist choice in `localStorage` under key `fithelper-lang`.

**Sidebar footer**: Add a language toggle button (e.g., "中/EN") that switches between Chinese and English.

**Update all components**: Replace hardcoded strings with `t('key')` calls from `useTranslation()`.

### 6.2 Keyboard shortcuts

In `src/renderer/App.tsx`, add a global `useEffect` that listens for keyboard events:
- `Cmd+1` through `Cmd+4`: switch to the corresponding tool.
- `Cmd+S`: if Tool 4 is active, save the current text area content.
- `Escape`: cancel any active inline edit in Tool 2.

### 6.3 Error handling

- Create a simple toast notification component (`src/renderer/components/Toast.tsx`) that displays temporary messages (3s auto-dismiss) at the bottom-right of the screen.
- Use it for: DB errors, API failures, validation errors.
- Style: dark surface card (`#0F3460`) with accent border. Error toasts use `--color-danger`, success toasts use `--color-success`.

### 6.4 Final styling polish

Review all components against the wireframes in `systemDesign.md` Section 3.3. Ensure:
- Consistent use of CSS variables for colors.
- Proper spacing (8px grid).
- Progress bar color transitions (green/yellow/red).
- Drag placeholder styling in Tool 3.
- Textarea in Tool 4 uses monospace font and has comfortable line-height.
- All interactive elements have hover/focus states using the accent color.

### 6.5 README.md

Create `README.md` at project root:
- Project name and one-line description.
- Prerequisites: Node.js 18+, macOS.
- Setup: `npm install`, place OpenAI API key in `keys/open-ai-api-key.txt`.
- Development: `npm run dev`.
- Testing: `npm test`.
- Build: `npm run build` (produces `.dmg` in `release/`).
- Brief description of the 4 tools.

### 6.6 Final checks

```bash
npm run lint             # zero errors
npm test                 # all tests pass
npm run build            # produces a .dmg in release/
```

### 6.7 Commit

```bash
git add -A
git commit -m "feat(phase6): i18n (zh/en), keyboard shortcuts, error toasts, README, packaging"
```

---

## Summary

After completing all 6 phases, the project should have:
- 6 git commits (one per phase).
- A fully functional Electron + React + TypeScript app.
- 4 working tools: Pace Converter, Calorie Library, Daily Tracker, Training Log + AI Coach (with goal input and structured JSON responses).
- SQLite persistence for all data.
- OpenAI integration for AI coaching via `gpt-5.4` with structured JSON output.
- Chinese/English i18n.
- Dark-mode UI matching the design spec.
- macOS `.dmg` build output.
- Unit tests covering core logic.
- Clean lint.

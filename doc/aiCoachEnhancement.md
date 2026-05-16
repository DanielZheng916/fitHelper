# AI Coach Enhancement — Development Plan

> **Target version**: 0.4.0
>
> **Prerequisite**: Read `@doc/systemDesign.md` and `@doc/implementationGuide.md` for full context.
>
> **How to use**: Open a Cursor chat and enter:
> ```
> Read @doc/aiCoachEnhancement.md, @doc/systemDesign.md, and @doc/implementationGuide.md.
> Implement all steps sequentially. Follow @AGENTS.md rules: write tests first,
> run all tests after each step, lint before committing. Do not ask questions.
> ```

---

## Overview

Six changes to the AI Coach feature in Tool 4 (Training Log):

| # | Change | Summary |
|---|--------|---------|
| 1 | Plan-change trigger | Auto-trigger AI Coach when the training plan is saved (not just records) |
| 2 | Remove token limit | Remove `max_completion_tokens` so responses are never truncated |
| 3 | Add goal input | New "Goal" text field stored in `training_goal` table, sent as context to AI |
| 4 | Structured JSON response | Require the AI to return JSON with `next_training_day` and `next_training_week` |
| 5 | Formatted UI display | Parse JSON and render as two readable cards instead of raw text |
| 6 | Model upgrade | Change from `gpt-5.2` to `gpt-5.4` (model id: `gpt-5.4`) |

---

## Files to Modify

| File | What changes |
|------|-------------|
| `src/main/db/migrations.ts` | Add `training_goal` table |
| `src/main/db/seed.ts` | Initialize `training_goal` with empty row |
| `src/shared/types.ts` | Add `CoachSuggestion` interface, add goal IPC methods, update return type |
| `src/preload.ts` | Wire `training:getGoal` and `training:saveGoal` |
| `src/main/ipc/training.ts` | Add goal handlers, include goal in coach suggestion handler |
| `src/main/services/openai.ts` | New prompt, new signature, JSON parsing, model upgrade, remove token cap |
| `src/renderer/components/TrainingLog/TrainingLog.tsx` | Goal field, plan-save trigger, structured card rendering |
| `tests/openai.test.ts` | Update for new signature, prompt, and types |
| `tests/training.test.ts` | Add goal save/retrieve and hash tests |

---

## Step 1: Database — Add `training_goal` Table

**File**: `src/main/db/migrations.ts`

Add this table creation inside the existing `db.exec()` block, before the `ai_coach_history` table:

```sql
CREATE TABLE IF NOT EXISTS training_goal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**File**: `src/main/db/seed.ts`

Add an `INSERT OR IGNORE` for the `training_goal` table, same pattern as `training_records` and `training_plan`:

```sql
INSERT OR IGNORE INTO training_goal (id, content) VALUES (1, '');
```

**Verify**: `npm test` — existing DB tests should still pass. The `runMigrations` test should now find 8 tables.

---

## Step 2: Types — Add `CoachSuggestion` and Update IPC Interface

**File**: `src/shared/types.ts`

Add the `CoachSuggestion` interface:

```typescript
export interface CoachSuggestion {
  next_training_day: {
    plan: string;
    reason: string;
  };
  next_training_week: {
    plan: string;
    reason: string;
  };
}
```

Update the `training` section of `ElectronAPI`:

```typescript
training: {
  getGoal: () => Promise<string>;
  saveGoal: (content: string) => Promise<void>;
  getRecords: () => Promise<string>;
  saveRecords: (content: string) => Promise<void>;
  getPlan: () => Promise<string>;
  savePlan: (content: string) => Promise<void>;
  getCoachSuggestion: (force: boolean) => Promise<CoachSuggestion | string>;
};
```

---

## Step 3: Preload — Wire New IPC Channels

**File**: `src/preload.ts`

Add two new methods inside the `training` object:

```typescript
getGoal: () => ipcRenderer.invoke('training:getGoal'),
saveGoal: (content: string) => ipcRenderer.invoke('training:saveGoal', { content }),
```

---

## Step 4: IPC Handlers — Goal CRUD + Updated Coach Handler

**File**: `src/main/ipc/training.ts`

Add two new handlers:

```typescript
ipcMain.handle('training:getGoal', async () => {
  const row = db.prepare('SELECT content FROM training_goal LIMIT 1').get() as
    | { content: string }
    | undefined;
  return row?.content ?? '';
});

ipcMain.handle('training:saveGoal', async (_event, args: { content: string }) => {
  db.prepare('UPDATE training_goal SET content = ?, updated_at = CURRENT_TIMESTAMP').run(
    args.content
  );
});
```

Update the `training:getCoachSuggestion` handler to also read the goal:

```typescript
ipcMain.handle('training:getCoachSuggestion', async (_event, args: { force: boolean }) => {
  const goal = (
    db.prepare('SELECT content FROM training_goal LIMIT 1').get() as { content: string } | undefined
  )?.content ?? '';
  const records = (
    db.prepare('SELECT content FROM training_records LIMIT 1').get() as { content: string } | undefined
  )?.content ?? '';
  const plan = (
    db.prepare('SELECT content FROM training_plan LIMIT 1').get() as { content: string } | undefined
  )?.content ?? '';
  return getCoachSuggestion(db, goal, plan, records, args.force);
});
```

---

## Step 5: OpenAI Service — New Prompt, JSON Response, Model Upgrade

**File**: `src/main/services/openai.ts`

### 5a. Update `SYSTEM_PROMPT`

Replace the existing prompt with:

```typescript
const SYSTEM_PROMPT = `You are a concise running and fitness coach. The user will provide their training goal, training plan, and training log. Analyze their current progress against the plan and goal.

You MUST reply with valid JSON only, no markdown, no extra text. Use this exact schema:

{
  "next_training_day": {
    "plan": "<specific workout suggestion for the next training day>",
    "reason": "<2-sentence explanation>"
  },
  "next_training_week": {
    "plan": "<training plan suggestion for the coming week>",
    "reason": "<2-sentence explanation>"
  }
}

Reply in the same language as the user's data.`;
```

### 5b. Update `computeHash`

Change the signature to include goal:

```typescript
export function computeHash(goal: string, plan: string, records: string): string {
  return crypto.createHash('sha256').update(goal + plan + records).digest('hex');
}
```

### 5c. Update `buildMessages`

Change to include goal:

```typescript
export function buildMessages(goal: string, plan: string, records: string) {
  return {
    system: SYSTEM_PROMPT,
    user: `Training Goal:\n${goal}\n\nTraining Plan:\n${plan}\n\nTraining Records:\n${records}`,
  };
}
```

### 5d. Update `getCoachSuggestion`

Change the full function signature and implementation:

```typescript
export async function getCoachSuggestion(
  db: Database.Database,
  goal: string,
  plan: string,
  records: string,
  force: boolean
): Promise<CoachSuggestion | string> {
  const key = loadApiKey();
  if (!key) {
    return 'API key not configured. Open Settings to add your OpenAI key.';
  }

  const hash = computeHash(goal, plan, records);

  if (!force) {
    const cached = db
      .prepare('SELECT response FROM ai_coach_history WHERE prompt_hash = ? ORDER BY created_at DESC LIMIT 1')
      .get(hash) as { response: string } | undefined;
    if (cached) {
      try {
        return JSON.parse(cached.response) as CoachSuggestion;
      } catch {
        return cached.response;
      }
    }
  }

  try {
    const client = new OpenAI({ apiKey: key });
    const messages = buildMessages(goal, plan, records);
    const completion = await client.chat.completions.create({
      model: 'gpt-5.4',
      messages: [
        { role: 'system', content: messages.system },
        { role: 'user', content: messages.user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const rawText = completion.choices[0]?.message?.content ?? '{}';

    db.prepare(
      'INSERT INTO ai_coach_history (prompt_hash, response, model) VALUES (?, ?, ?)'
    ).run(hash, rawText, 'gpt-5.4');

    try {
      return JSON.parse(rawText) as CoachSuggestion;
    } catch {
      return rawText;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return `AI Coach error: ${msg}`;
  }
}
```

Key differences from the current implementation:
- **No `max_completion_tokens`** parameter at all.
- **`response_format: { type: 'json_object' }`** for native JSON mode.
- **Model**: `gpt-5.4` (was `gpt-5.2`).
- **Goal** added to hash computation, message building, and function signature.
- **Return type**: `CoachSuggestion | string` — parsed JSON object on success, raw string on error.
- **Remove** the `finish_reason === 'length'` truncation detection (no longer needed without token cap).

---

## Step 6: UI — Goal Field, Plan Trigger, Structured Cards

**File**: `src/renderer/components/TrainingLog/TrainingLog.tsx`

### 6a. Add goal state and loading

Add state for goal:
```typescript
const [goal, setGoal] = useState('');
```

Add a `useEffect` to load goal on mount:
```typescript
useEffect(() => {
  (async () => {
    const data = await window.electronAPI.training.getGoal();
    setGoal(data);
  })();
}, []);
```

### 6b. Add goal save handler

```typescript
const handleGoalSave = useCallback(async () => {
  await window.electronAPI.training.saveGoal(goal);
}, [goal]);
```

### 6c. Fix plan-save trigger

In `handleSave`, remove the `if (activeTab === 'records')` guard around the coach suggestion call. The coach should fire on **both** records and plan saves:

```typescript
const handleSave = useCallback(async () => {
  if (activeTab === 'records') {
    await window.electronAPI.training.saveRecords(content);
  } else {
    await window.electronAPI.training.savePlan(content);
  }
  // Always trigger coach suggestion on save (both records and plan)
  const data = await window.electronAPI.training.getCoachSuggestion(false);
  setSuggestion(data);
}, [activeTab, content]);
```

### 6d. Update suggestion state type

Change from `string` to `CoachSuggestion | string`:
```typescript
const [suggestion, setSuggestion] = useState<CoachSuggestion | string>('');
```

Import the `CoachSuggestion` type from `../../shared/types` (or wherever the shared types are accessible in the renderer).

### 6e. Render goal input

Add a goal text input above the tabs:

```tsx
<div style={{ marginBottom: 16 }}>
  <label style={{ fontWeight: 600, color: 'var(--color-accent)', marginRight: 8 }}>
    🎯 {t('training.goal')}
  </label>
  <input
    type="text"
    value={goal}
    onChange={(e) => setGoal(e.target.value)}
    onBlur={handleGoalSave}
    placeholder={t('training.goalPlaceholder')}
    style={{
      width: '100%',
      padding: '8px 12px',
      marginTop: 4,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 6,
      color: 'var(--color-text-primary)',
      fontSize: 'var(--font-size-base)',
    }}
  />
</div>
```

### 6f. Render structured AI Coach cards

Replace the current raw-text display in the AI Coach panel with structured rendering:

```tsx
{loading ? (
  t('training.loading')
) : typeof suggestion === 'string' ? (
  <div style={{ whiteSpace: 'pre-wrap' }}>
    {suggestion || t('training.noSuggestion')}
  </div>
) : (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {/* Next Training Day */}
    <div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        📅 {t('training.nextDay')}
      </div>
      <div style={{
        padding: 12,
        background: 'var(--color-bg-primary)',
        borderRadius: 6,
        border: '1px solid var(--color-border)',
      }}>
        <div style={{ marginBottom: 8 }}>{suggestion.next_training_day.plan}</div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          {suggestion.next_training_day.reason}
        </div>
      </div>
    </div>

    {/* Next Training Week */}
    <div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        📋 {t('training.nextWeek')}
      </div>
      <div style={{
        padding: 12,
        background: 'var(--color-bg-primary)',
        borderRadius: 6,
        border: '1px solid var(--color-border)',
      }}>
        <div style={{ marginBottom: 8 }}>{suggestion.next_training_week.plan}</div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          {suggestion.next_training_week.reason}
        </div>
      </div>
    </div>
  </div>
)}
```

---

## Step 7: Tests

### 7a. Update `tests/openai.test.ts`

Update `buildMessages` calls to include `goal` as first argument:

```typescript
it('should build correct system and user messages', () => {
  const goal = 'Boston 10K on June 21';
  const plan = 'Phase 1: A: 5.2 mph × 35 min';
  const records = 'Week 83\n4.6\n平板卷腹*5';
  const messages = buildMessages(goal, plan, records);

  expect(messages.system).toContain('valid JSON only');
  expect(messages.system).toContain('next_training_day');
  expect(messages.system).toContain('next_training_week');
  expect(messages.user).toContain('Training Goal:');
  expect(messages.user).toContain(goal);
  expect(messages.user).toContain('Training Plan:');
  expect(messages.user).toContain(plan);
  expect(messages.user).toContain('Training Records:');
  expect(messages.user).toContain(records);
});

it('should include JSON schema in system prompt', () => {
  const { system } = buildMessages('', '', '');
  expect(system).toContain('next_training_day');
  expect(system).toContain('next_training_week');
  expect(system).toContain('reason');
  expect(system).not.toContain('3-5 sentences max');
});
```

Update `computeHash` calls to include `goal`:

```typescript
it('should produce consistent hashes with goal', () => {
  const h1 = computeHash('goal', 'plan', 'records');
  const h2 = computeHash('goal', 'plan', 'records');
  expect(h1).toBe(h2);
});

it('should produce different hash when goal changes', () => {
  const h1 = computeHash('goal1', 'plan', 'records');
  const h2 = computeHash('goal2', 'plan', 'records');
  expect(h1).not.toBe(h2);
});
```

Update cached response tests to use `gpt-5.4` as the model string.

### 7b. Update `tests/training.test.ts`

Add tests for training goal save/retrieve (same pattern as records/plan tests).

---

## Step 8: i18n — Add New Translation Keys

**File**: `src/renderer/i18n/zh.json` — add:
```json
{
  "training.goal": "目标",
  "training.goalPlaceholder": "输入你的训练目标（如：6月21日波士顿10K取得好成绩）",
  "training.nextDay": "下次训练建议",
  "training.nextWeek": "下周训练计划"
}
```

**File**: `src/renderer/i18n/en.json` — add:
```json
{
  "training.goal": "Goal",
  "training.goalPlaceholder": "Enter your training goal (e.g., Get a good score in June 21th's Boston 10K)",
  "training.nextDay": "Next Training Day",
  "training.nextWeek": "Next Training Week"
}
```

---

## Step 9: Exit Check

```bash
npm test                 # all tests pass
npm run lint             # zero errors
npm run dev              # verify:
                         #   - Goal field appears above tabs
                         #   - Saving records OR plan triggers AI Coach
                         #   - AI Coach panel shows two structured cards
                         #   - Refresh button works
                         #   - Error fallback shows plain text
```

---

## Step 10: Commit

```bash
git add -A
git commit -m "feat: enhance AI coach — goal input, structured JSON response, plan trigger, gpt-5.4 upgrade"
```

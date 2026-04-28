# FitHelper

A lightweight, intuitive health utility for macOS — quick, easy-to-understand tools that help you save time and live healthier.

## Features

- **Pace Converter** — Bidirectional conversion between mph and min/km for runners.
- **Calorie Library** — Editable, categorized food calorie reference with preset data.
- **Daily Calorie Tracker** — Track daily intake with drag-reorder, eaten/planned toggle, progress bar, and smart food suggestions.
- **Training Log + AI Coach** — Freeform training records and plan with LLM-powered coaching analysis via OpenAI.
- **Bilingual UI** — Switch between English and Chinese with one click.

## Getting Started

### Prerequisites

- **macOS** (arm64 or x64)
- **Node.js 22+** (a `.nvmrc` is included — run `nvm use` if you use nvm)

### Install

```bash
git clone https://github.com/<your-username>/fitHelper.git
cd fitHelper
npm install
```

### Set Up Your OpenAI API Key

The AI Coach feature requires an OpenAI API key.

1. Launch the app with `npm run dev`.
2. Click **Settings** in the sidebar.
3. Paste your OpenAI API key and click **Save**.

The key is encrypted using the macOS Keychain (via Electron `safeStorage`) and stored locally. It is **never** sent anywhere except to the OpenAI API. You only need to do this once — the key persists across app restarts and updates.

> **Dev shortcut**: You can also place a key in `keys/open-ai-api-key.txt` (this file is gitignored). The app checks this path as a fallback during development.

### Run

```bash
npm run dev
```

## Testing

```bash
# Unit tests
npm test

# E2E tests (builds the app, then runs Playwright)
npm run test:e2e
```

## Build

```bash
npm run build
```

Produces a `.dmg` installer in the `release/` directory (arm64 + x64).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron |
| Frontend | React + TypeScript |
| Build tool | Vite |
| Database | better-sqlite3 (SQLite) |
| AI | OpenAI SDK (`gpt-5.2`) |
| Drag-and-drop | @dnd-kit |
| i18n | react-i18next |
| Packaging | electron-builder |
| Testing | Vitest + Playwright |

## License

[MIT](LICENSE)

## Version

0.2.0

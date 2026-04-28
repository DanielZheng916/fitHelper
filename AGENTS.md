# Agent Instructions

## Requirements
- For unclear requirements, ask questions instead of making assumptions.

## Environment
- Node.js >= 22 (managed via nvm; `.nvmrc` pinned to 22).
- Electron 41 (bundles its own internal Node — different ABI from system Node).
- `better-sqlite3` is a native C++ addon compiled to a platform-specific `.node` binary. It must match the active Node ABI **and** CPU architecture (arm64 / x64).
- After switching Node versions, run `npm rebuild better-sqlite3` before running tests.
- `npm run dev` automatically runs `electron-rebuild -f -w better-sqlite3` to recompile for Electron's ABI.

## Testing
- Before adding or modifying code, always write unit tests covering at least the happy path.
- After completing the code, run all unit tests to verify correctness.
- Always run `nvm use` (or verify `node -v` is >= 22) before testing.
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`
- If tests fail with an architecture mismatch on `better-sqlite3`, run `npm rebuild better-sqlite3`.
- After `npm rebuild`, the next `npm run dev` will re-run `electron-rebuild` automatically.

## Version Control
- Initialize a Git repository for every project.
- Include a `.gitignore` file; ensure sensitive information (keys, credentials, `.env`) is excluded before committing.
- After completing a feature and passing all tests, commit the change.
- Before committing significant functional changes, update the documentation and specify the version number.

## Code Quality
- Configure a linter for every project.
- Resolve all lint issues before committing.

## Update & Reinstall Safety
- Store all persistent state in `~/.fithelper/`, never inside the app directory.
- Use versioned, idempotent migrations for any schema or config format change.
- Never discard existing user data — migrate it to the new format.

# Project Concept

A lightweight, intuitive health utility — providing quick, easy-to-understand functions that help people save time and live healthier.

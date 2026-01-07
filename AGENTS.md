# AGENTS.md

## Commands
- **Run all tests**: `bun test` or `just test`
- **Run single test**: `bun test --grep "test name"`
- **Watch mode**: `bun test --watch` or `just test-watch`
- **Install deps**: `bun install` or `just install`

## Architecture
Chrome extension (Manifest V3) for Unicode text styling. No build step required.
- `shared/unicode/` - Core Unicode library (graphemes, normalization, combining marks, char maps)
- `shared/unicode/index.js` - Main API: `applyStyle()`, `removeStyle()`, `toPlainText()`, `toggleStyle()`
- `content/content.js` - Content script injected into pages
- `popup/` - Extension popup UI (HTML/CSS/JS)
- `background.js` - Service worker for keyboard shortcuts
- `tests/` - Bun test files (TypeScript)

## Code Style
- Plain JavaScript (ES6+), no TypeScript except tests
- Browser globals via `window.*` namespace (e.g., `window.Unicode`, `window.UnicodeGraphemes`)
- JSDoc comments for public APIs with `@param`, `@returns`, `@example`
- NFC normalization for consistent Unicode handling
- Tests use `bun:test` with `describe`/`it`/`expect` pattern

# AGENTS.md

## Commands
- **Run all tests**: `bun test` or `just test`
- **Run single test**: `bun test --grep "test name"`
- **Watch mode**: `bun test --watch` or `just test-watch`
- **Install deps**: `bun install` or `just install`

## Architecture
Chrome extension (Manifest V3) for AI-powered writing assistance using Chrome's built-in AI APIs.
- `shared/ai.js` - AI service singleton using Chrome's Prompt API (LanguageModel)
- `shared/dom-utils.js` - DOM utilities for editable element handling
- `content/content.js` - Content script with floating AI polish toolbar
- `popup/` - Extension popup UI (HTML/CSS/JS)
- `background.js` - Service worker (minimal)
- `tests/` - Bun test files (TypeScript)

## Code Style
- Plain JavaScript (ES6+), no TypeScript except tests
- Browser globals via `window.*` namespace (e.g., `window.AIService`)
- JSDoc comments for public APIs with `@param`, `@returns`, `@example`
- Tests use `bun:test` with `describe`/`it`/`expect` pattern

## Chrome AI API Requirements
- Requires Chrome with `chrome://flags/#prompt-api-for-gemini-nano` enabled
- Uses `LanguageModel.create()` and `LanguageModel.prompt()` APIs

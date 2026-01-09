# mojibake

AI-powered writing assistant Chrome extension using Chrome's built-in AI APIs.

## Features

- **AI Polish**: Improve grammar, clarity, and style using Chrome's Gemini Nano model
- **Floating toolbar**: Appears on any editable text field (long-press to toggle)
- **Popup editor**: Quick access via extension icon for composing polished text

## Requirements

Chrome with the Prompt API enabled:
1. Open `chrome://flags/#prompt-api-for-gemini-nano`
2. Set to "Enabled"
3. Restart Chrome

## Development

```bash
bun install
bun test
```

Load as unpacked extension from the project directory.

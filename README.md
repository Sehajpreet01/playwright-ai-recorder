<div align="center">

# 🎬 Playwright Test Recorder

**A Chrome extension that records your browser interactions and instantly generates production-ready [Playwright](https://playwright.dev/) test code — supercharged with Google Gemini AI.**

![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest](https://img.shields.io/badge/Manifest-V3-brightgreen)
![Playwright](https://img.shields.io/badge/Playwright-JS-2EAD33?logo=playwright&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-8E75B2?logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [AI Enhancement](#ai-enhancement)
- [Configuration](#configuration)
- [Selector Strategy](#selector-strategy)
- [Project Structure](#project-structure)
- [Example Output](#example-output)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Stop writing boilerplate Playwright tests by hand. **Playwright Test Recorder** watches what you do in the browser and writes the test code for you. Hit record, click through your flow, stop — you get a working `test()` block. Optionally pass it through Gemini AI to get assertions, wait conditions, and step-by-step comments added automatically.

---

## Features

| Feature | Description |
|---|---|
| 🔴 **One-click recording** | Start/stop capturing interactions on any website |
| ⚡ **Instant code gen** | Converts your actions to valid Playwright JS immediately |
| ✨ **AI enhancement** | Gemini 1.5 Flash adds assertions, waits, and structure |
| 💾 **Persistent state** | Recording and code survive popup close and page navigations |
| 📋 **Copy to clipboard** | One button to grab the finished code |
| 🌐 **Works everywhere** | Injects into all URLs via content script |

---

## How It Works

```
Browser interaction
       │
       ▼
  content.js (injected)
  ┌─────────────────────┐
  │ click / fill /       │
  │ select / check       │  ──► chrome.storage.local (events[])
  └─────────────────────┘
       │
       ▼
  popup.js (on Stop)
  ┌─────────────────────┐
  │ generatePlaywright   │  ──► raw test code
  │ Code(events)         │
  └─────────────────────┘
       │
       ▼  (optional)
  Gemini 1.5 Flash API
  ┌─────────────────────┐
  │ Adds assertions,     │  ──► enhanced, production-ready test
  │ waits, step comments │
  └─────────────────────┘
```

---

## Installation

> **Prerequisites:** Google Chrome (v88+)

1. **Clone this repo**
   ```bash
   git clone https://github.com/your-username/playwright-test-recorder.git
   cd playwright-test-recorder
   ```

2. **Load the extension in Chrome**
   - Navigate to `chrome://extensions`
   - Toggle **Developer mode** on (top-right)
   - Click **Load unpacked**
   - Select the cloned folder

3. **Pin it** — click the puzzle icon in your toolbar and pin "Playwright Recorder" for easy access.

---

## Usage

1. Navigate to the page you want to test in Chrome.
2. Click the 🎬 **Playwright Recorder** extension icon.
3. Press **▶ Start Recording**.
4. Interact with the page normally — every click, form fill, dropdown change, and checkbox toggle is captured.
5. Press **■ Stop** when your flow is complete.
6. The generated Playwright code appears in the output panel.
7. Press **📋 Copy Code** and paste it into your test file.

---

## AI Enhancement

Press **✨ Enhance with AI** after stopping a recording to send your raw code to Gemini 1.5 Flash. The AI will:

- Add `await page.waitForLoadState('networkidle')` after every navigation
- Add `expect(page).toHaveURL(...)` assertions to verify page transitions
- Add `expect(page.locator(...)).toHaveValue(...)` after every `fill()`
- Add visibility assertions after button clicks that trigger UI changes
- Rename the test with a meaningful description
- Add a comment block summarizing what the test covers
- Group actions with step comments (e.g., `// Step 1: Navigate to login`)

> **Note:** All existing selectors are preserved exactly — the AI only adds structure around them.

---

## Configuration

The Gemini API key is hardcoded in [`popup.js`](popup.js). Before sharing or deploying:

1. Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Replace the value of `GEMINI_API_KEY` at the top of `popup.js`:

```js
// popup.js
const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
```

> **Security tip:** Never commit a real API key to a public repository. Consider loading it from `chrome.storage` or prompting the user on first launch.

---

## Selector Strategy

The recorder resolves the best CSS selector for each element using this priority order:

| Priority | Attribute | Example |
|---|---|---|
| 1 | `data-testid` | `[data-testid="submit-btn"]` |
| 2 | `id` | `#username` |
| 3 | `aria-label` | `[aria-label="Close dialog"]` |
| 4 | `name` | `[name="email"]` |
| 5 | `placeholder` | `[placeholder="Search..."]` |
| 6 | Text content *(buttons/links)* | `text="Sign in"` |
| 7 | Tag + first class *(fallback)* | `button.btn-primary` |

For the most reliable tests, annotate your HTML with `data-testid` attributes.

---

## Project Structure

```
extension/
├── manifest.json   # Chrome Extension Manifest V3 config
├── content.js      # Content script — listens for DOM events and stores them
├── popup.html      # Extension popup UI (dark theme)
└── popup.js        # Popup logic: recording state, code gen, Gemini API call
```

---

## Example Output

**Raw generated code (after Stop):**
```js
const { test, expect } = require('@playwright/test');

test('recorded test', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'secret');
  await page.click('text="Sign in"');
  await page.goto('https://example.com/dashboard');
});
```

**Enhanced code (after Enhance with AI):**
```js
// Test: User login flow
// Covers: navigating to the login page, entering valid credentials, and verifying dashboard redirect

const { test, expect } = require('@playwright/test');

test('user can log in with valid credentials and reach dashboard', async ({ page }) => {
  // Step 1: Navigate to login page
  await page.goto('https://example.com/login');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL('https://example.com/login');

  // Step 2: Enter credentials
  await page.fill('[name="email"]', 'user@example.com');
  await expect(page.locator('[name="email"]')).toHaveValue('user@example.com');

  await page.fill('[name="password"]', 'secret');
  await expect(page.locator('[name="password"]')).toHaveValue('secret');

  // Step 3: Submit and verify redirect
  await page.click('text="Sign in"');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL('https://example.com/dashboard');
});
```

---

## Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please keep PRs focused — one feature or fix per PR.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
Made with ❤️ for QA engineers and developers who'd rather be testing than writing tests.
</div>

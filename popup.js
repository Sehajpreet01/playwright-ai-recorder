let GEMINI_API_KEY = '';

let isRecording = false;
let generatedCode = '';
let pollInterval = null;

const startBtn    = document.getElementById('startBtn');
const stopBtn     = document.getElementById('stopBtn');
const enhanceBtn  = document.getElementById('enhanceBtn');
const copyBtn     = document.getElementById('copyBtn');
const resetBtn    = document.getElementById('resetBtn');
const codeOutput  = document.getElementById('codeOutput');
const statusEl    = document.getElementById('status');
const eventCount  = document.getElementById('eventCount');
const apiKeyInput = document.getElementById('apiKeyInput');
const loader      = document.getElementById('loader');

// ── Restore full state when popup reopens ────────────────────────
chrome.storage.local.get(['isRecording', 'generatedCode', 'recordedEvents', 'geminiApiKey'], (result) => {
  if (result.geminiApiKey) {
    GEMINI_API_KEY = result.geminiApiKey;
    apiKeyInput.value = result.geminiApiKey;
  }
});

chrome.storage.local.get(['isRecording', 'generatedCode', 'recordedEvents'], (result) => {
  if (result.isRecording) {
    isRecording = true;
    startBtn.disabled   = true;
    stopBtn.disabled    = false;
    enhanceBtn.disabled = true;
    copyBtn.disabled    = true;
    setStatus('<span class="dot"></span> Recording...', 'recording');

    const count = result.recordedEvents?.length || 0;
    if (count > 0) eventCount.textContent = `${count} interaction${count > 1 ? 's' : ''} captured`;

    startPolling();
  } else if (result.generatedCode) {
    generatedCode    = result.generatedCode;
    codeOutput.value = generatedCode;
    copyBtn.disabled    = false;
    enhanceBtn.disabled = false;
    setStatus('Done — code generated below.', 'done');

    const count = result.recordedEvents?.length || 0;
    if (count > 0) eventCount.textContent = `${count} interaction${count > 1 ? 's' : ''} recorded`;
  }
});

// ── Start Recording ──────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: 'start' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      setStatus('Error: Refresh the page and try again.', '');
      return;
    }
    isRecording   = true;
    generatedCode = '';
    startBtn.disabled   = true;
    stopBtn.disabled    = false;
    enhanceBtn.disabled = true;
    copyBtn.disabled    = true;
    codeOutput.value    = '';
    eventCount.textContent = '';

    setStatus('<span class="dot"></span> Recording...', 'recording');

    // Persist recording state so popup reopens correctly
    chrome.storage.local.set({ isRecording: true, generatedCode: '', recordedEvents: [] });

    startPolling();
  });
});

// ── Stop Recording ───────────────────────────────────────────────
stopBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  stopPolling();

  chrome.tabs.sendMessage(tab.id, { action: 'stop' }, (response) => {
    isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled  = true;

    chrome.storage.local.set({ isRecording: false });

    if (response?.events?.length > 0) {
      generatedCode    = generatePlaywrightCode(response.events);
      codeOutput.value = generatedCode;
      copyBtn.disabled    = false;
      enhanceBtn.disabled = false;
      setStatus('Done — code generated below.', 'done');
      eventCount.textContent = `${response.events.length} interaction${response.events.length > 1 ? 's' : ''} recorded`;

      // Persist generated code so it survives popup close
      chrome.storage.local.set({ generatedCode: generatedCode });
    } else {
      setStatus('No interactions recorded. Try again.', '');
      eventCount.textContent = '';
    }
  });
});

// ── Generate Playwright Code ─────────────────────────────────────
function generatePlaywrightCode(events) {
  const lines = [
    `const { test, expect } = require('@playwright/test');`,
    ``,
    `test('recorded test', async ({ page }) => {`,
  ];

  for (const e of events) {
    switch (e.type) {
      case 'goto':
        lines.push(`  await page.goto('${e.url}');`);
        break;
      case 'click':
        lines.push(`  await page.click('${e.selector}');${e.text ? ` // ${e.text}` : ''}`);
        break;
      case 'fill':
        lines.push(`  await page.fill('${e.selector}', '${e.value}');`);
        break;
      case 'selectOption':
        lines.push(`  await page.selectOption('${e.selector}', '${e.value}');`);
        break;
      case 'check':
        lines.push(`  await page.check('${e.selector}');`);
        break;
      case 'uncheck':
        lines.push(`  await page.uncheck('${e.selector}');`);
        break;
    }
  }

  lines.push(`});`);
  return lines.join('\n');
}

// ── Enhance with Gemini AI ───────────────────────────────────────
enhanceBtn.addEventListener('click', async () => {
  const apiKey = GEMINI_API_KEY;
  if (!apiKey) { alert('Please enter your Gemini API key first.'); apiKeyInput.focus(); return; }
  if (!generatedCode) { alert('No code to enhance. Record first.'); return; }

  loader.style.display = 'block';
  enhanceBtn.disabled  = true;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a senior QA engineer writing production Playwright tests in JavaScript.

Take this raw recorded Playwright code and enhance it properly:

Rules:
1. After every page.goto() add:
   - await page.waitForLoadState('networkidle');
   - await expect(page).toHaveURL('exact url here');
2. After every page.fill() add:
   - await expect(page.locator('selector')).toHaveValue('value');
3. After every page.click() on a submit/button, check what happens next:
   - If it navigates, verify the new URL with expect(page).toHaveURL(...)
   - If it shows a message or element, verify with expect(page.locator(...)).toBeVisible()
4. Give the test a meaningful descriptive name based on what is being tested
5. Add a comment block at the top describing what the test covers
6. Group related actions with a comment like // Step 1: Navigate to login
7. Keep ALL existing selectors exactly as they are - do not change them

Raw recorded code:
${generatedCode}

Return ONLY valid JavaScript code. No markdown, no explanation, no code fences.`
            }]
          }]
        })
      }
    );

    const data = await res.json();
    const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (enhanced) {
      const clean = enhanced.replace(/```javascript\n?/g, '').replace(/```\n?/g, '').trim();
      codeOutput.value = clean;
      generatedCode    = clean;
      chrome.storage.local.set({ generatedCode: clean });
      setStatus('AI enhancement complete!', 'done');
    } else {
      const reason = data.error?.message
        || data.promptFeedback?.blockReason
        || JSON.stringify(data);
      alert('Gemini error: ' + reason);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    loader.style.display = 'none';
    enhanceBtn.disabled  = false;
  }
});

// ── Reset ────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  isRecording   = false;
  generatedCode = '';
  stopPolling();
  codeOutput.value       = '';
  eventCount.textContent = '';
  startBtn.disabled   = false;
  stopBtn.disabled    = true;
  enhanceBtn.disabled = true;
  copyBtn.disabled    = true;
  setStatus('Ready to record', '');
  chrome.storage.local.set({ isRecording: false, generatedCode: '', recordedEvents: [] });
});

// ── Copy Code ────────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(codeOutput.value).then(() => {
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => { copyBtn.textContent = '📋 Copy Code'; }, 2000);
  });
});

// ── Polling helpers ──────────────────────────────────────────────
function startPolling() {
  stopPolling();
  pollInterval = setInterval(() => {
    chrome.storage.local.get(['recordedEvents'], (result) => {
      const count = result.recordedEvents?.length || 0;
      eventCount.textContent = count > 0 ? `${count} interaction${count > 1 ? 's' : ''} captured` : '';
    });
  }, 800);
}

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

// ── Persist API key on input ─────────────────────────────────────
apiKeyInput.addEventListener('input', () => {
  GEMINI_API_KEY = apiKeyInput.value.trim();
  chrome.storage.local.set({ geminiApiKey: GEMINI_API_KEY });
});

// ── Status helper ────────────────────────────────────────────────
function setStatus(html, cls) {
  statusEl.innerHTML = html;
  statusEl.className = `status ${cls}`;
}

let isRecording = false;
let events = [];
const inputValues = new WeakMap();

// On every page load, check if recording was active and resume it
chrome.storage.local.get(['isRecording', 'recordedEvents'], (result) => {
  if (result.isRecording) {
    isRecording = true;
    events = result.recordedEvents || [];
    // Add a goto event for this new page if it changed
    const lastEvent = events[events.length - 1];
    if (!lastEvent || lastEvent.url !== window.location.href) {
      events.push({ type: 'goto', url: window.location.href });
      saveEvents();
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start') {
    isRecording = true;
    events = [];
    events.push({ type: 'goto', url: window.location.href });
    saveEvents();
    sendResponse({ status: 'started' });
  } else if (message.action === 'stop') {
    isRecording = false;
    sendResponse({ status: 'stopped', events: events });
  }
  return true;
});

function getSelector(el) {
  if (el.getAttribute('data-testid'))
    return `[data-testid="${el.getAttribute('data-testid')}"]`;
  if (el.id)
    return `#${el.id}`;
  if (el.getAttribute('aria-label'))
    return `[aria-label="${el.getAttribute('aria-label')}"]`;
  if (el.name)
    return `[name="${el.name}"]`;
  if (el.placeholder)
    return `[placeholder="${el.placeholder}"]`;
  if ((el.tagName === 'BUTTON' || el.tagName === 'A') && el.textContent.trim())
    return `text="${el.textContent.trim().substring(0, 50)}"`;
  const tag = el.tagName.toLowerCase();
  const cls = el.className ? '.' + el.className.trim().split(/\s+/)[0] : '';
  return `${tag}${cls}`;
}

function saveEvents() {
  chrome.storage.local.set({ recordedEvents: events });
}

// Capture clicks
document.addEventListener('click', (e) => {
  if (!isRecording) return;
  const el = e.target;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  events.push({
    type: 'click',
    selector: getSelector(el),
    text: el.textContent?.trim().substring(0, 50) || ''
  });
  saveEvents();
}, true);

// Capture select dropdowns and checkboxes
document.addEventListener('change', (e) => {
  if (!isRecording) return;
  const el = e.target;
  const tag = el.tagName.toLowerCase();
  if (tag === 'select') {
    events.push({ type: 'selectOption', selector: getSelector(el), value: el.value });
  } else if (tag === 'input' && (el.type === 'checkbox' || el.type === 'radio')) {
    events.push({ type: el.checked ? 'check' : 'uncheck', selector: getSelector(el) });
  }
  saveEvents();
}, true);

// Capture text input on blur
document.addEventListener('blur', (e) => {
  if (!isRecording) return;
  const el = e.target;
  const tag = el.tagName.toLowerCase();
  if ((tag === 'input' || tag === 'textarea') && el.type !== 'checkbox' && el.type !== 'radio') {
    const value = el.value;
    if (value && value !== inputValues.get(el)) {
      inputValues.set(el, value);
      events.push({ type: 'fill', selector: getSelector(el), value: value });
      saveEvents();
    }
  }
}, true);

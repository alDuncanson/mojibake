/**
 * @fileoverview Mojibake Content Script - AI Writing Assistant
 * 
 * This content script is injected into all web pages and provides:
 * - A floating toolbar with an AI polish button
 * - Uses Chrome's built-in AI APIs for grammar and clarity improvements
 * 
 * @module content
 */

const SPARKLE_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z"/>
  <path d="M5 19L5.54 16.26L8 16L5.54 15.74L5 13L4.46 15.74L2 16L4.46 16.26L5 19Z"/>
  <path d="M19 21L19.36 19.1L21 19L19.36 18.9L19 17L18.64 18.9L17 19L18.64 19.1L19 21Z"/>
</svg>`;

/** @type {boolean} Whether polish is currently in progress */
let isPolishing = false;

/** @type {HTMLElement|null} The toolbar DOM element */
let toolbar = null;

/** @type {HTMLElement|null} The currently focused editable element */
let currentElement = null;

/** @type {boolean} Whether the toolbar is globally disabled */
let toolbarDisabled = true;

/** @type {number|null} Long-press timer ID */
let longPressTimer = null;

/** @type {HTMLElement|null} Element being long-pressed */
let longPressTarget = null;

/** @type {boolean} Whether a long-press is in progress */
let isLongPressing = false;

/** @type {number} Duration in ms to trigger long-press */
const LONG_PRESS_DURATION = 400;

/**
 * Gets all text content from the current editable element.
 * @returns {string} The text content
 */
function getElementText() {
  if (!currentElement) return '';
  if (currentElement.tagName === 'INPUT' || currentElement.tagName === 'TEXTAREA') {
    return currentElement.value;
  }
  return currentElement.textContent || '';
}

/**
 * Sets all text content in the current editable element.
 * @param {string} text - The new text content
 */
function setElementText(text) {
  if (!currentElement) return;
  if (currentElement.tagName === 'INPUT' || currentElement.tagName === 'TEXTAREA') {
    currentElement.value = text;
    currentElement.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    currentElement.textContent = text;
    currentElement.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * Polishes the text in the current element using Chrome's built-in AI.
 */
async function polishWithAI() {
  if (isPolishing || !currentElement) return;
  
  const text = getElementText().trim();
  if (!text) return;

  const polishBtn = toolbar?.querySelector('.mojibake-polish-btn');
  isPolishing = true;
  polishBtn?.classList.add('loading');

  try {
    const result = await window.AIService.polish(text);
    setElementText(result);
  } catch (err) {
    console.warn('Mojibake:', err.message);
  } finally {
    isPolishing = false;
    polishBtn?.classList.remove('loading');
  }
}

/**
 * Creates the floating toolbar element if it doesn't exist.
 * @returns {HTMLElement} The toolbar element
 */
function createToolbar() {
  if (toolbar) return toolbar;

  toolbar = document.createElement('div');
  toolbar.id = 'mojibake-toolbar';
  toolbar.innerHTML = `
    <div class="mojibake-toolbar-inner">
      <button data-action="polish" title="Polish with AI" class="mojibake-polish-btn">${SPARKLE_ICON}</button>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #mojibake-toolbar {
      position: absolute;
      z-index: 2147483647;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.15s, visibility 0.15s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      pointer-events: none;
      width: fit-content;
    }
    #mojibake-toolbar.visible {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
    .mojibake-toolbar-inner {
      display: inline-flex;
      gap: 4px;
      padding: 6px 8px;
      background: #faf8f5;
      border: 1px solid #d4d0c8;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    #mojibake-toolbar button {
      width: 30px;
      height: 30px;
      min-width: 30px;
      min-height: 30px;
      flex-shrink: 0;
      border: 1px solid #d4d0c8;
      border-radius: 6px;
      background: #fff;
      color: #444;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.12s ease;
    }
    #mojibake-toolbar button:hover {
      background: #f5f0e8;
      border-color: #b8b4ac;
    }
    #mojibake-toolbar button:active {
      transform: scale(0.96);
    }
    .mojibake-polish-btn svg {
      transition: transform 0.3s ease;
    }
    .mojibake-polish-btn:hover svg {
      transform: scale(1.1);
    }
    .mojibake-polish-btn.loading svg {
      animation: mojibake-sparkle 0.8s ease-in-out infinite;
    }
    @keyframes mojibake-sparkle {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
      50% { transform: scale(1.2) rotate(15deg); opacity: 0.7; }
    }
    @media (prefers-color-scheme: dark) {
      .mojibake-toolbar-inner {
        background: #2a2a2a;
        border-color: #444;
      }
      #mojibake-toolbar button {
        background: #2a2a2a;
        border-color: #444;
        color: #ddd;
      }
      #mojibake-toolbar button:hover {
        background: #3a3a3a;
        border-color: #555;
      }
    }
  `;
  document.head.appendChild(style);

  toolbar.querySelector('.mojibake-polish-btn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    polishWithAI();
  });

  document.body.appendChild(toolbar);
  return toolbar;
}

/**
 * Positions the toolbar above the target element.
 * @param {HTMLElement} element - The element to position the toolbar relative to
 */
function positionToolbar(element) {
  if (!toolbar) return;

  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  toolbar.style.left = `${rect.left + scrollX}px`;
  toolbar.style.top = `${rect.top + scrollY - 44}px`;

  if (rect.top < 50) {
    toolbar.style.top = `${rect.bottom + scrollY + 4}px`;
  }
}

/**
 * Shows the toolbar for the specified editable element.
 * @param {HTMLElement} element - The editable element to attach the toolbar to
 */
function showToolbar(element) {
  if (toolbarDisabled) return;
  createToolbar();
  currentElement = element;
  positionToolbar(element);
  toolbar.classList.add('visible');
}

/**
 * Toggles the toolbar's global enabled/disabled state.
 * @param {HTMLElement} [element] - Optional element to show toolbar on when enabling
 */
function toggleToolbar(element) {
  toolbarDisabled = !toolbarDisabled;
  if (toolbarDisabled) {
    hideToolbar();
  } else if (element && isEditableElement(element)) {
    showToolbar(element);
  } else if (document.activeElement && isEditableElement(getEditableRoot(document.activeElement))) {
    showToolbar(getEditableRoot(document.activeElement));
  }
}

/**
 * Cancels any in-progress long-press detection.
 */
function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressTarget = null;
  isLongPressing = false;
}

/**
 * Starts long-press detection on an editable element.
 * @param {HTMLElement} element - The editable element
 */
function startLongPress(element) {
  cancelLongPress();
  longPressTarget = element;
  isLongPressing = true;
  
  longPressTimer = setTimeout(() => {
    if (longPressTarget === element) {
      toggleToolbar(element);
      cancelLongPress();
    }
  }, LONG_PRESS_DURATION);
}

/**
 * Hides the toolbar.
 */
function hideToolbar() {
  if (toolbar) {
    toolbar.classList.remove('visible');
  }
  currentElement = null;
}

// Pre-process text for AI as user types (debounced)
document.addEventListener('input', (e) => {
  const element = getEditableRoot(e.target);
  if (!element || !isEditableElement(element)) return;
  
  currentElement = element;
  const text = getElementText();
  if (text && window.AIService) {
    window.AIService.appendText(text);
  }
}, true);

// Show toolbar when an editable element receives focus
document.addEventListener('focusin', (e) => {
  const element = getEditableRoot(e.target);
  if (element && isEditableElement(element)) {
    showToolbar(element);
  }
});

// Hide toolbar when focus leaves editable elements
document.addEventListener('focusout', (e) => {
  setTimeout(() => {
    const active = document.activeElement;
    const editableRoot = getEditableRoot(active);
    
    if (toolbar?.contains(active)) return;
    if (editableRoot && isEditableElement(editableRoot)) return;
    
    hideToolbar();
  }, 150);
});

// Reposition toolbar on scroll
document.addEventListener('scroll', () => {
  if (currentElement && toolbar?.classList.contains('visible')) {
    positionToolbar(currentElement);
  }
}, true);

// Reposition toolbar on window resize
window.addEventListener('resize', () => {
  if (currentElement && toolbar?.classList.contains('visible')) {
    positionToolbar(currentElement);
  }
});

// Long-press detection for toggling toolbar
document.addEventListener('mousedown', (e) => {
  const element = getEditableRoot(e.target);
  if (element && isEditableElement(element)) {
    startLongPress(element);
  }
});

document.addEventListener('mouseup', () => {
  cancelLongPress();
});

document.addEventListener('mouseleave', () => {
  cancelLongPress();
});

document.addEventListener('mousemove', (e) => {
  if (isLongPressing && longPressTarget) {
    const rect = longPressTarget.getBoundingClientRect();
    const isOutside = e.clientX < rect.left || e.clientX > rect.right ||
                      e.clientY < rect.top || e.clientY > rect.bottom;
    if (isOutside) {
      cancelLongPress();
    }
  }
});

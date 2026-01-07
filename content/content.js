/**
 * @fileoverview Mojibake Content Script - Floating Toolbar for Text Styling
 * 
 * This content script is injected into all web pages and provides:
 * - A floating toolbar that appears above editable text fields
 * - Real-time Unicode text styling as the user types
 * - Keyboard shortcuts for common formatting operations
 * - Support for both standard inputs/textareas and contentEditable elements
 * 
 * ## Architecture
 * 
 * The toolbar attaches to focused editable elements and provides two modes:
 * 1. **Selection mode**: Select text, click a style button to transform it
 * 2. **Active mode**: Click a style button, then type to apply styling in real-time
 * 
 * ## Keyboard Shortcuts
 * 
 * | Shortcut         | Action        |
 * |------------------|---------------|
 * | Ctrl/Cmd+B       | Toggle bold   |
 * | Ctrl/Cmd+I       | Toggle italic |
 * | Ctrl/Cmd+U       | Toggle underline |
 * | Ctrl/Cmd+Shift+S | Toggle strikethrough |
 * 
 * @module content
 */

// Initialize Unicode reverse maps for style detection and removal
if (window.UnicodeReverseMaps) {
  window.UnicodeReverseMaps.initializeReverseMaps();
}

/**
 * Available text styles for the floating toolbar.
 * Each style defines its button appearance and optional keyboard shortcut.
 * 
 * @type {Array<{id: string, label: string, title: string, style: string, shortcut?: string}>}
 */
const TOOLBAR_STYLES = [
  { id: 'bold', label: 'B', title: 'Bold (Ctrl+B)', style: 'font-weight: bold', shortcut: 'b' },
  { id: 'italic', label: 'I', title: 'Italic (Ctrl+I)', style: 'font-style: italic', shortcut: 'i' },
  { id: 'boldItalic', label: 'BI', title: 'Bold Italic', style: 'font-weight: bold; font-style: italic' },
  { id: 'strikethrough', label: 'S', title: 'Strikethrough (Ctrl+Shift+S)', style: 'text-decoration: line-through', shortcut: 's' },
  { id: 'underline', label: 'U', title: 'Underline (Ctrl+U)', style: 'text-decoration: underline', shortcut: 'u' },
  { id: 'monospace', label: '&lt;/&gt;', title: 'Monospace', style: 'font-family: monospace' },
  { id: 'script', label: '𝓢', title: 'Script', style: '' },
  { id: 'fraktur', label: '𝔉', title: 'Fraktur', style: '' },
  { id: 'smallCaps', label: 'ꜱᴄ', title: 'Small Caps', style: '' },
  { id: 'circled', label: 'Ⓒ', title: 'Circled', style: '' },
  { id: 'fullwidth', label: 'Ｆ', title: 'Fullwidth', style: '' },
];

const SPARKLE_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z"/>
  <path d="M5 19L5.54 16.26L8 16L5.54 15.74L5 13L4.46 15.74L2 16L4.46 16.26L5 19Z"/>
  <path d="M19 21L19.36 19.1L21 19L19.36 18.9L19 17L18.64 18.9L17 19L18.64 19.1L19 21Z"/>
</svg>`;

/** @type {boolean} Whether polish is currently in progress */
let isPolishing = false;

/**
 * Mapping of keyboard shortcut keys to style IDs.
 * Used for quick lookup when processing keyboard events.
 * 
 * @type {Object<string, {style: string, requiresShift: boolean}>}
 */
const SHORTCUT_MAP = {
  'b': { style: 'bold', requiresShift: false },
  'i': { style: 'italic', requiresShift: false },
  'u': { style: 'underline', requiresShift: false },
  's': { style: 'strikethrough', requiresShift: true },
};

/** @type {HTMLElement|null} The toolbar DOM element */
let toolbar = null;

/** @type {HTMLElement|null} The currently focused editable element */
let currentElement = null;

/** @type {string|null} The currently active style for real-time application */
let activeStyle = null;

/** @type {boolean} Flag to prevent recursive input processing */
let isProcessingInput = false;

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
 * 
 * The toolbar is created as a detached DOM element with:
 * - A container with all style buttons
 * - CSS styles injected into the document head
 * - Event listeners for button clicks
 * 
 * @returns {HTMLElement} The toolbar element
 */
function createToolbar() {
  if (toolbar) return toolbar;

  toolbar = document.createElement('div');
  toolbar.id = 'mojibake-toolbar';
  toolbar.innerHTML = `
    <div class="mojibake-toolbar-inner">
      ${TOOLBAR_STYLES.map(s => `
        <button 
          data-style="${s.id}" 
          title="${s.title}"
          style="${s.style}"
        >${s.label}</button>
      `).join('')}
      <span class="mojibake-divider"></span>
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
    .mojibake-divider {
      width: 1px;
      background: #d4d0c8;
      margin: 4px 2px;
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
    #mojibake-toolbar button.active {
      background: #e8e4dc;
      border-color: #999;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    }
    #mojibake-toolbar button:active {
      transform: scale(0.96);
    }
    .mojibake-polish-btn {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mojibake-polish-btn svg {
      transition: transform 0.3s ease;
    }
    .mojibake-polish-btn:hover svg {
      transform: rotate(15deg) scale(1.1);
    }
    .mojibake-polish-btn.loading {
      cursor: wait;
      opacity: 0.7;
    }
    .mojibake-polish-btn.loading svg {
      animation: mojibake-sparkle-spin 1s linear infinite;
    }
    @keyframes mojibake-sparkle-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (prefers-color-scheme: dark) {
      .mojibake-toolbar-inner {
        background: #1a1a1a;
        border-color: #444;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      }
      .mojibake-divider {
        background: #444;
      }
      #mojibake-toolbar button {
        background: #333;
        border-color: #444;
        color: #ddd;
      }
      #mojibake-toolbar button:hover {
        background: #3a3a3a;
        border-color: #555;
      }
      #mojibake-toolbar button.active {
        background: #444;
        border-color: #666;
      }
    }

    .mojibake-long-press {
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4) !important;
      transition: box-shadow 0.1s ease-out !important;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(toolbar);

  // Handle toolbar button clicks
  toolbar.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const button = e.target.closest('button');
    if (!button) return;
    
    if (button.dataset.action === 'polish') {
      polishWithAI();
    } else if (button.dataset.style) {
      handleStyleButtonClick(button.dataset.style);
    }
  });

  return toolbar;
}

/**
 * Handles clicking a style button or triggering a style via keyboard shortcut.
 * 
 * If text is selected, toggles the style on the selection.
 * If no text is selected, activates the style for real-time typing.
 * 
 * @param {string} styleId - The style identifier (e.g., 'bold', 'italic')
 */
function handleStyleButtonClick(styleId) {
  const selectedText = getSelectedText();
  
  if (selectedText) {
    const styled = window.Unicode.toggleStyle(selectedText, styleId);
    replaceSelectedText(styled);
  } else {
    if (activeStyle === styleId) {
      activeStyle = null;
      toolbar?.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    } else {
      toolbar?.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      activeStyle = styleId;
      const button = toolbar?.querySelector(`button[data-style="${styleId}"]`);
      if (button) button.classList.add('active');
    }
  }
  
  if (currentElement) {
    currentElement.focus();
  }
}

/**
 * Positions the toolbar above the target element.
 * If there isn't enough space above, positions it below instead.
 * 
 * @param {HTMLElement} element - The element to position the toolbar relative to
 */
function positionToolbar(element) {
  if (!toolbar) return;

  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  toolbar.style.left = `${rect.left + scrollX}px`;
  toolbar.style.top = `${rect.top + scrollY - 44}px`;

  // If not enough space above, position below
  if (rect.top < 50) {
    toolbar.style.top = `${rect.bottom + scrollY + 4}px`;
  }
}

/**
 * Shows the toolbar for the specified editable element.
 * 
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
 * When disabled, the toolbar will not appear on focus.
 * 
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
  if (longPressTarget) {
    longPressTarget.classList.remove('mojibake-long-press');
  }
  longPressTarget = null;
  isLongPressing = false;
}

/**
 * Starts long-press detection on an editable element.
 * 
 * @param {HTMLElement} element - The editable element
 */
function startLongPress(element) {
  cancelLongPress();
  longPressTarget = element;
  isLongPressing = true;
  
  element.classList.add('mojibake-long-press');
  
  longPressTimer = setTimeout(() => {
    if (longPressTarget === element) {
      toggleToolbar(element);
      cancelLongPress();
    }
  }, LONG_PRESS_DURATION);
}

/**
 * Hides the toolbar and clears the active style state.
 */
function hideToolbar() {
  if (toolbar) {
    toolbar.classList.remove('visible');
    activeStyle = null;
    toolbar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  }
  currentElement = null;
}

/**
 * Gets the currently selected text in the active editable element.
 * 
 * @returns {string} The selected text, or empty string if no selection
 */
function getSelectedText() {
  return getSelectedTextFromElement(currentElement);
}

/**
 * Replaces the current text selection with new text.
 * 
 * @param {string} newText - The text to replace the selection with
 */
function replaceSelectedText(newText) {
  replaceSelectedTextInElement(currentElement, newText);
}

/**
 * Handles keyboard shortcuts for style application.
 * 
 * Listens for Ctrl/Cmd+key combinations and applies the corresponding style.
 * Shift modifier is required for strikethrough to avoid conflict with save.
 * 
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleKeyboardShortcut(e) {
  // Only handle Ctrl (Windows/Linux) or Cmd (Mac) combinations
  const isMod = e.ctrlKey || e.metaKey;
  if (!isMod) return;
  
  const key = e.key.toLowerCase();
  const shortcut = SHORTCUT_MAP[key];
  
  if (!shortcut) return;
  
  // Check if shift is required but not pressed, or not required but pressed
  if (shortcut.requiresShift !== e.shiftKey) return;
  
  // Only apply to editable elements
  const element = getEditableRoot(e.target);
  if (!element || !isEditableElement(element)) return;
  
  e.preventDefault();
  
  // Ensure we're working with the right element
  if (currentElement !== element) {
    currentElement = element;
  }
  
  handleStyleButtonClick(shortcut.style);
}

// Handle real-time text input when a style is active
document.addEventListener('beforeinput', (e) => {
  if (!activeStyle) return;
  if (isProcessingInput) return;
  if (e.inputType !== 'insertText' && e.inputType !== 'insertCompositionText') return;
  
  const element = getEditableRoot(e.target);
  if (!element || !isEditableElement(element)) return;
  
  const data = e.data;
  if (!data) return;
  
  const styled = window.Unicode.applyStyle(data, activeStyle);
  
  if (styled !== data) {
    e.preventDefault();
    isProcessingInput = true;
    
    try {
      insertStyledTextInElement(element, styled);
    } finally {
      isProcessingInput = false;
    }
  }
}, true);

// Pre-process text for AI as user types (debounced)
document.addEventListener('input', (e) => {
  const element = getEditableRoot(e.target);
  if (!element || !isEditableElement(element)) return;
  
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
    
    // Don't hide if focus moved to the toolbar itself
    if (toolbar?.contains(active)) return;
    // Don't hide if focus is still in an editable element
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

// Handle keyboard shortcuts for styling
document.addEventListener('keydown', handleKeyboardShortcut, true);

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

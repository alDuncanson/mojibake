/**
 * @fileoverview Mojibake Extension Popup UI Controller
 * 
 * This module manages the extension popup interface, which provides:
 * 
 * - A text editor for composing styled text
 * - A toolbar with all available text styles
 * - Copy to clipboard functionality
 * - Clear text functionality
 * 
 * ## Usage Flow
 * 
 * 1. User opens the popup by clicking the extension icon
 * 2. User can either:
 *    a. Type text, click a style button to activate it, continue typing (styled)
 *    b. Type text, select a portion, click a style button to transform it
 * 3. User clicks "Copy to Clipboard" to copy the styled text
 * 4. User pastes the styled text into Twitter/X, LinkedIn, etc.
 * 
 * ## Dependencies
 * 
 * - Unicode processing library (shared/unicode/*)
 * - Toolbar handler (shared/toolbar.js)
 * 
 * @module popup
 */

// Initialize Unicode reverse maps for style detection and removal
if (window.UnicodeReverseMaps) {
  window.UnicodeReverseMaps.initializeReverseMaps();
}

/**
 * The main text editor element.
 * @type {HTMLTextAreaElement}
 */
const editor = document.getElementById('editor');

/**
 * The "Copy to Clipboard" button.
 * @type {HTMLButtonElement}
 */
const copyBtn = document.getElementById('copy-btn');

/**
 * The "Clear" button.
 * @type {HTMLButtonElement}
 */
const clearBtn = document.getElementById('clear-btn');

/**
 * The "Polish with AI" button.
 * @type {HTMLButtonElement}
 */
const polishBtn = document.getElementById('polish-btn');

/**
 * The toast notification element for feedback messages.
 * @type {HTMLElement}
 */
const toast = document.getElementById('toast');

/**
 * All toolbar style buttons.
 * @type {NodeListOf<HTMLButtonElement>}
 */
const toolbarButtons = document.querySelectorAll('.toolbar button');

/**
 * The toolbar handler instance, configured for the popup's textarea.
 * Manages active style state and button interactions.
 */
const toolbarHandler = createToolbarHandler({
  /**
   * Gets the currently selected text in the editor.
   * @returns {string} Selected text
   */
  getSelectedText: () => editor.value.substring(editor.selectionStart, editor.selectionEnd),
  
  /**
   * Replaces the current selection with new text.
   * @param {string} newText - Text to insert
   */
  replaceSelectedText: (newText) => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + newText + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + newText.length;
    updateCopyButton();
  },
  
  /**
   * Refocuses the editor after button interaction.
   */
  onFocus: () => editor.focus(),
});

// Register buttons with the handler
toolbarHandler.setButtons(toolbarButtons);

// Attach click listeners to all style buttons
toolbarButtons.forEach(button => {
  button.addEventListener('click', () => toolbarHandler.handleButtonClick(button));
});

// Handle real-time styled text input
editor.addEventListener('beforeinput', (e) => {
  const styled = toolbarHandler.handleBeforeInput(e, editor);
  if (styled) {
    e.preventDefault();
    const start = editor.selectionStart;
    editor.value = editor.value.substring(0, start) + styled + editor.value.substring(editor.selectionEnd);
    editor.selectionStart = editor.selectionEnd = start + styled.length;
    updateCopyButton();
  }
});

// Update copy button state when editor content changes
// Also pre-process text for AI (debounced) to speed up polish
editor.addEventListener('input', () => {
  updateCopyButton();
  if (window.AIService && editor.value.trim()) {
    window.AIService.appendText(editor.value);
  }
});

/**
 * Updates the copy button's and polish button's disabled state based on editor content.
 * The buttons are disabled when the editor is empty.
 */
function updateCopyButton() {
  const hasContent = !!editor.value.trim();
  copyBtn.disabled = !hasContent;
  polishBtn.disabled = !hasContent;
}

/**
 * Copies the editor content to the system clipboard.
 * Shows a toast notification on success or failure.
 */
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(editor.value);
    showToast('Copied!');
  } catch (err) {
    showToast('Failed to copy');
  }
}

/**
 * Clears the editor content and resets UI state.
 */
function clear() {
  editor.value = '';
  toolbarHandler.clearActiveStyle();
  updateCopyButton();
  editor.focus();
}

/**
 * Shows a temporary toast notification.
 * 
 * @param {string} message - The message to display
 */
function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 1500);
}

/**
 * Polishes the editor text using Chrome's built-in AI for grammar, clarity, and polish.
 * Uses the shared AIService singleton.
 */
async function polishWithAI() {
  const text = editor.value.trim();
  if (!text) return;

  polishBtn.disabled = true;
  polishBtn.classList.add('loading');
  const btnText = polishBtn.querySelector('.btn-text');
  const originalText = btnText.textContent;
  btnText.textContent = 'Polishing...';

  try {
    const result = await window.AIService.polish(text);
    editor.value = result;
    updateCopyButton();
    showToast('Text polished!');
  } catch (err) {
    console.error('AI polish error:', err);
    showToast(err.message || 'AI polish failed');
  } finally {
    polishBtn.disabled = false;
    polishBtn.classList.remove('loading');
    btnText.textContent = originalText;
    updateCopyButton();
  }
}

// Attach event listeners to action buttons
copyBtn.addEventListener('click', copyToClipboard);
clearBtn.addEventListener('click', clear);
polishBtn.addEventListener('click', polishWithAI);

// Focus the editor when popup opens
editor.focus();

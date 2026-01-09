/**
 * @fileoverview Mojibake Extension Popup UI Controller
 * 
 * This module manages the extension popup interface, which provides:
 * - A text editor for composing text
 * - AI polish functionality for grammar, clarity, and style
 * - Copy to clipboard functionality
 * 
 * @module popup
 */

/** @type {HTMLTextAreaElement} */
const editor = document.getElementById('editor');

/** @type {HTMLButtonElement} */
const copyBtn = document.getElementById('copy-btn');

/** @type {HTMLButtonElement} */
const clearBtn = document.getElementById('clear-btn');

/** @type {HTMLButtonElement} */
const polishBtn = document.getElementById('polish-btn');

/** @type {HTMLElement} */
const toast = document.getElementById('toast');

/**
 * Updates the copy button's and polish button's disabled state based on editor content.
 */
function updateButtons() {
  const hasContent = !!editor.value.trim();
  copyBtn.disabled = !hasContent;
  polishBtn.disabled = !hasContent;
}

/**
 * Copies the editor content to the system clipboard.
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
  updateButtons();
  editor.focus();
}

/**
 * Shows a temporary toast notification.
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
 * Polishes the editor text using Chrome's built-in AI.
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
    updateButtons();
    showToast('Text polished!');
  } catch (err) {
    console.error('AI polish error:', err);
    showToast(err.message || 'AI polish failed');
  } finally {
    polishBtn.disabled = false;
    polishBtn.classList.remove('loading');
    btnText.textContent = originalText;
    updateButtons();
  }
}

// Pre-process text for AI as user types (debounced)
editor.addEventListener('input', () => {
  updateButtons();
  if (window.AIService && editor.value.trim()) {
    window.AIService.appendText(editor.value);
  }
});

// Attach event listeners
copyBtn.addEventListener('click', copyToClipboard);
clearBtn.addEventListener('click', clear);
polishBtn.addEventListener('click', polishWithAI);

// Focus the editor when popup opens
editor.focus();

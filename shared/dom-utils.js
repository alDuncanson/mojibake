/**
 * @fileoverview DOM Utilities for Editable Element Handling
 * 
 * This module provides utilities for working with editable elements in the DOM,
 * including text selection, replacement, and element detection.
 * 
 * ## Supported Element Types
 * 
 * - Standard `<input>` elements (text, search, url, email)
 * - `<textarea>` elements
 * - ContentEditable elements (`contenteditable="true"`)
 * - Twitter/X composer (Draft.js-based editor)
 * 
 * ## Architecture
 * 
 * The module handles two fundamentally different APIs:
 * 
 * 1. **Form elements** (input/textarea): Use `value`, `selectionStart`, `selectionEnd`
 * 2. **ContentEditable**: Use `Selection` and `Range` APIs
 * 
 * Each function detects the element type and uses the appropriate API.
 * 
 * @module dom-utils
 */

/**
 * Checks if an element is an editable text field.
 * 
 * Detects standard form elements, contentEditable containers, and
 * platform-specific editors (Twitter/X, Draft.js).
 * 
 * @param {HTMLElement|null} element - The element to check
 * @returns {boolean} True if the element can accept text input
 * 
 * @example
 * isEditableElement(document.querySelector('textarea'))  // true
 * isEditableElement(document.querySelector('div[contenteditable]'))  // true
 * isEditableElement(document.querySelector('p'))  // false
 */
function isEditableElement(element) {
  if (!element) return false;
  
  const tagName = element.tagName;
  
  // Standard textarea
  if (tagName === 'TEXTAREA') return true;
  
  // Text-like input types
  if (tagName === 'INPUT') {
    const type = element.type?.toLowerCase();
    return ['text', 'search', 'url', 'email', ''].includes(type);
  }
  
  // ContentEditable elements
  if (element.isContentEditable) return true;
  if (element.closest('[contenteditable="true"]')) return true;
  
  // Platform-specific editors
  if (element.closest('[data-testid="tweetTextarea_0"]')) return true;  // Twitter/X
  if (element.closest('.DraftEditor-root')) return true;  // Draft.js
  
  return false;
}

/**
 * Finds the root editable element from a potentially nested element.
 * 
 * When focus is on a child of a contentEditable container, this function
 * walks up the DOM to find the actual editable root.
 * 
 * @param {HTMLElement|null} element - An element that may be inside an editable region
 * @returns {HTMLElement|null} The root editable element, or the input element itself
 * 
 * @example
 * // For: <div contenteditable><p><span>text|</span></p></div>
 * getEditableRoot(spanElement)  // returns the div
 */
function getEditableRoot(element) {
  if (!element) return null;
  
  // Form elements are their own root
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return element;
  }
  
  // Walk up to find contentEditable ancestor
  let el = element;
  while (el) {
    if (el.getAttribute?.('contenteditable') === 'true') return el;
    if (el.getAttribute?.('data-testid') === 'tweetTextarea_0') return el;
    el = el.parentElement;
  }
  
  // Fallback to the element itself
  return element;
}

/**
 * Gets the currently selected text within an editable element.
 * 
 * For form elements, uses selectionStart/selectionEnd.
 * For contentEditable, uses the Selection API.
 * 
 * @param {HTMLElement|null} element - The editable element
 * @returns {string} The selected text, or empty string if no selection
 * 
 * @example
 * // User has selected "world" in a textarea containing "hello world"
 * getSelectedTextFromElement(textarea)  // 'world'
 */
function getSelectedTextFromElement(element) {
  if (!element) return '';
  
  // Form elements (textarea, input)
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return element.value.substring(element.selectionStart, element.selectionEnd);
  }
  
  // ContentEditable elements - use window Selection API
  const selection = window.getSelection();
  return selection.toString();
}

/**
 * Replaces the currently selected text with new text.
 * 
 * For form elements, manipulates the value string directly.
 * For contentEditable, uses Range API to replace content.
 * 
 * After replacement, the cursor is positioned at the end of the new text.
 * An input event is dispatched to notify frameworks (React, etc.) of the change.
 * 
 * @param {HTMLElement|null} element - The editable element
 * @param {string} newText - The text to insert in place of the selection
 * 
 * @example
 * // Replace selected "world" with styled version
 * replaceSelectedTextInElement(textarea, '𝘄𝗼𝗿𝗹𝗱')
 */
function replaceSelectedTextInElement(element, newText) {
  if (!element) return;
  
  // Form elements (textarea, input)
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    element.value = element.value.substring(0, start) + newText + element.value.substring(end);
    element.selectionStart = element.selectionEnd = start + newText.length;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  
  // ContentEditable elements
  if (element.isContentEditable || element.closest('[contenteditable="true"]')) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const textNode = document.createTextNode(newText);
      range.insertNode(textNode);
      
      // Move cursor to end of inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Dispatch input event for framework compatibility
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: newText
      }));
    }
  }
}

/**
 * Inserts styled text at the current cursor position.
 * 
 * Unlike replaceSelectedTextInElement, this is optimized for real-time
 * typing where text is inserted character by character.
 * 
 * For contentEditable, uses execCommand for better integration with
 * the browser's undo stack.
 * 
 * @param {HTMLElement} element - The editable element
 * @param {string} styledText - The styled text to insert
 * 
 * @example
 * // User types 'a', we insert '𝗮' (bold a) instead
 * insertStyledTextInElement(element, '𝗮')
 */
function insertStyledTextInElement(element, styledText) {
  // Form elements (textarea, input)
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    const start = element.selectionStart;
    element.value = element.value.substring(0, start) + styledText + element.value.substring(element.selectionEnd);
    element.selectionStart = element.selectionEnd = start + styledText.length;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  
  // ContentEditable - use execCommand for undo support
  document.execCommand('insertText', false, styledText);
}

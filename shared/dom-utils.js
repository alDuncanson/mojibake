/**
 * @fileoverview DOM Utilities for Editable Element Handling
 * 
 * Provides utilities for detecting and working with editable elements in the DOM.
 * 
 * @module dom-utils
 */

/**
 * Checks if an element is an editable text field.
 * 
 * @param {HTMLElement|null} element - The element to check
 * @returns {boolean} True if the element can accept text input
 */
function isEditableElement(element) {
  if (!element) return false;
  
  const tagName = element.tagName;
  
  if (tagName === 'TEXTAREA') return true;
  
  if (tagName === 'INPUT') {
    const type = element.type?.toLowerCase();
    return ['text', 'search', 'url', 'email', ''].includes(type);
  }
  
  if (element.isContentEditable) return true;
  if (element.closest('[contenteditable="true"]')) return true;
  
  if (element.closest('[data-testid="tweetTextarea_0"]')) return true;
  if (element.closest('.DraftEditor-root')) return true;
  
  return false;
}

/**
 * Finds the root editable element from a potentially nested element.
 * 
 * @param {HTMLElement|null} element - An element that may be inside an editable region
 * @returns {HTMLElement|null} The root editable element, or the input element itself
 */
function getEditableRoot(element) {
  if (!element) return null;
  
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return element;
  }
  
  let el = element;
  while (el) {
    if (el.getAttribute?.('contenteditable') === 'true') return el;
    if (el.getAttribute?.('data-testid') === 'tweetTextarea_0') return el;
    el = el.parentElement;
  }
  
  return element;
}

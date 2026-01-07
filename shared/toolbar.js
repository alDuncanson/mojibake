/**
 * @fileoverview Shared Toolbar Handler for Text Styling
 * 
 * This module provides a reusable toolbar handler that manages:
 * - Active style state (which style button is currently selected)
 * - Button click handling (toggle styles on text or activate for typing)
 * - Real-time input interception (style text as the user types)
 * 
 * ## Usage
 * 
 * The toolbar handler is created with callbacks for element-specific operations:
 * 
 * ```javascript
 * const handler = createToolbarHandler({
 *   getSelectedText: () => editor.value.substring(start, end),
 *   replaceSelectedText: (text) => { ... },
 *   onFocus: () => editor.focus()
 * });
 * 
 * handler.setButtons(document.querySelectorAll('.toolbar button'));
 * ```
 * 
 * ## Two Modes of Operation
 * 
 * 1. **Selection mode**: User selects text, clicks a button → text is styled
 * 2. **Active mode**: User clicks a button, then types → text is styled in real-time
 * 
 * @module toolbar
 */

/**
 * Creates a toolbar handler with the specified callbacks.
 * 
 * The handler manages style state and coordinates between buttons
 * and the text editing element.
 * 
 * @param {Object} options - Configuration options
 * @param {function(): string} options.getSelectedText - Returns currently selected text
 * @param {function(string): void} options.replaceSelectedText - Replaces selection with new text
 * @param {function(): void} [options.onFocus] - Called to refocus the editor after button click
 * @returns {Object} Handler object with methods for managing the toolbar
 * 
 * @example
 * const handler = createToolbarHandler({
 *   getSelectedText: () => textarea.value.substring(
 *     textarea.selectionStart,
 *     textarea.selectionEnd
 *   ),
 *   replaceSelectedText: (text) => {
 *     const start = textarea.selectionStart;
 *     textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(textarea.selectionEnd);
 *   },
 *   onFocus: () => textarea.focus()
 * });
 */
function createToolbarHandler(options) {
  const { getSelectedText, replaceSelectedText, onFocus } = options;
  
  /**
   * Currently active style for real-time typing, or null if none.
   * @type {string|null}
   */
  let activeStyle = null;
  
  /**
   * Array of button elements in the toolbar.
   * @type {HTMLButtonElement[]}
   */
  let buttons = [];

  /**
   * Registers the toolbar buttons with this handler.
   * 
   * @param {NodeList|HTMLButtonElement[]} buttonElements - The style buttons
   */
  function setButtons(buttonElements) {
    buttons = Array.from(buttonElements);
  }

  /**
   * Gets the currently active style for real-time typing.
   * 
   * @returns {string|null} Style ID (e.g., 'bold') or null
   */
  function getActiveStyle() {
    return activeStyle;
  }

  /**
   * Sets the active style (for programmatic control).
   * 
   * @param {string} styleId - The style to activate
   */
  function setActiveStyle(styleId) {
    activeStyle = styleId;
  }

  /**
   * Clears the active style and removes visual active state from buttons.
   */
  function clearActiveStyle() {
    activeStyle = null;
    buttons.forEach(b => b.classList.remove('active'));
  }

  /**
   * Handles a style button click.
   * 
   * If text is selected, toggles the style on that text.
   * If no text is selected, activates/deactivates the style for typing.
   * 
   * @param {HTMLButtonElement} button - The clicked button element
   */
  function handleButtonClick(button) {
    const styleId = button.dataset.style;
    const selectedText = getSelectedText();
    
    if (selectedText) {
      // Selection mode: toggle style on selected text
      const styled = window.Unicode.toggleStyle(selectedText, styleId);
      replaceSelectedText(styled);
    } else {
      // Active mode: toggle style for subsequent typing
      if (activeStyle === styleId) {
        activeStyle = null;
        button.classList.remove('active');
      } else {
        buttons.forEach(b => b.classList.remove('active'));
        activeStyle = styleId;
        button.classList.add('active');
      }
    }
    
    // Refocus the editor if callback provided
    if (onFocus) onFocus();
  }

  /**
   * Handles the beforeinput event for real-time styling.
   * 
   * When a style is active, intercepts text insertion and returns
   * the styled version. The caller should preventDefault() and
   * insert the styled text manually.
   * 
   * @param {InputEvent} e - The beforeinput event
   * @param {HTMLElement} element - The editable element (unused, for future extension)
   * @returns {string|false} Styled text if transformation occurred, false otherwise
   * 
   * @example
   * editor.addEventListener('beforeinput', (e) => {
   *   const styled = handler.handleBeforeInput(e, editor);
   *   if (styled) {
   *     e.preventDefault();
   *     insertText(styled);
   *   }
   * });
   */
  function handleBeforeInput(e, element) {
    if (!activeStyle) return false;
    if (e.inputType !== 'insertText' && e.inputType !== 'insertCompositionText') return false;
    
    const data = e.data;
    if (!data) return false;
    
    const styled = window.Unicode.applyStyle(data, activeStyle);
    return styled !== data ? styled : false;
  }

  return {
    setButtons,
    getActiveStyle,
    setActiveStyle,
    clearActiveStyle,
    handleButtonClick,
    handleBeforeInput,
  };
}

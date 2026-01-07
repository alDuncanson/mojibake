/**
 * @fileoverview Reverse Character Maps for Style Removal
 * 
 * This module builds and provides reverse lookup maps that convert styled
 * Unicode characters back to their plain ASCII equivalents.
 * 
 * ## How It Works
 * 
 * The forward character maps (char-maps.js) map plain → styled:
 * ```
 * 'A' → '𝗔' (bold A)
 * ```
 * 
 * This module creates the reverse mapping:
 * ```
 * '𝗔' → 'A'
 * ```
 * 
 * ## Initialization
 * 
 * Reverse maps are built lazily when the module loads, using the forward
 * maps from `window.UnicodeCharMaps`. They must be initialized before use:
 * 
 * ```javascript
 * window.UnicodeReverseMaps.initializeReverseMaps();
 * ```
 * 
 * ## Performance
 * 
 * - Maps are built once at initialization (O(n) where n = total styled chars)
 * - Lookups are O(1) hash table operations
 * - Memory overhead: ~1-2KB for all reverse maps combined
 * 
 * @module unicode/maps/reverse-maps
 */

/**
 * Builds reverse maps from forward character maps.
 * 
 * Iterates through all style maps and creates inverse mappings where
 * each styled character maps back to its original plain character.
 * 
 * @param {Object} charMaps - The forward character maps object from char-maps.js
 * @returns {Object<string, Object<string, string>>} Reverse maps keyed by style name
 * 
 * @example
 * const forward = {
 *   bold: {
 *     upper: { 'A': '𝗔', 'B': '𝗕' },
 *     lower: { 'a': '𝗮', 'b': '𝗯' }
 *   }
 * };
 * const reverse = buildReverseMaps(forward);
 * // { bold: { '𝗔': 'A', '𝗕': 'B', '𝗮': 'a', '𝗯': 'b' } }
 */
function buildReverseMaps(charMaps) {
  const reverse = {};
  
  for (const [styleName, styleMap] of Object.entries(charMaps)) {
    reverse[styleName] = {};
    
    // Process each category (upper, lower, digits, greekUpper, greekLower)
    for (const category of ['upper', 'lower', 'digits', 'greekUpper', 'greekLower']) {
      if (styleMap[category]) {
        for (const [original, styled] of Object.entries(styleMap[category])) {
          reverse[styleName][styled] = original;
        }
      }
    }
  }
  
  return reverse;
}

/**
 * The reverse character maps, populated by initializeReverseMaps().
 * 
 * Structure: { styleName: { styledChar: plainChar, ... }, ... }
 * 
 * @type {Object<string, Object<string, string>>}
 */
let REVERSE_CHAR_MAPS = {};

/**
 * Initializes the reverse character maps from the forward maps.
 * 
 * This must be called after char-maps.js has loaded and before
 * any style detection or removal operations are performed.
 * 
 * Safe to call multiple times (rebuilds maps each time).
 * 
 * @example
 * // In content script or popup:
 * if (window.UnicodeReverseMaps) {
 *   window.UnicodeReverseMaps.initializeReverseMaps();
 * }
 */
function initializeReverseMaps() {
  if (typeof window !== 'undefined' && window.UnicodeCharMaps) {
    REVERSE_CHAR_MAPS = buildReverseMaps(window.UnicodeCharMaps.CHAR_MAPS);
  }
}

// Auto-initialize if char-maps is already loaded
if (typeof window !== 'undefined') {
  if (window.UnicodeCharMaps) {
    initializeReverseMaps();
  } else {
    // Fallback: initialize on window load if char-maps loads later
    window.addEventListener('load', initializeReverseMaps);
  }
}

// Export for browser environment
if (typeof window !== 'undefined') {
  /**
   * Reverse character map utilities.
   * 
   * @namespace UnicodeReverseMaps
   * @property {function} initializeReverseMaps - Build reverse maps from forward maps
   * @property {Object} REVERSE_CHAR_MAPS - The reverse lookup maps (getter)
   */
  window.UnicodeReverseMaps = {
    initializeReverseMaps,
    get REVERSE_CHAR_MAPS() { return REVERSE_CHAR_MAPS; },
  };
}

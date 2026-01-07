/**
 * @fileoverview Combining Mark Utilities for Text Styling
 * 
 * This module handles Unicode combining characters used for visual styling
 * effects that work across platforms without rich text support.
 * 
 * ## How Combining Marks Work
 * 
 * Combining marks are Unicode characters that visually modify the preceding
 * base character. They don't stand alone but combine with the previous
 * character to form a single visual unit.
 * 
 * For example:
 * - 'a' + U+0336 = 'a̶' (a with strikethrough)
 * - 'a' + U+0332 = 'a̲' (a with underline)
 * - 'a' + U+0336 + U+0332 = 'a̶̲' (both effects combined)
 * 
 * ## Supported Style Marks
 * 
 * | Style         | Code Point | Character | Visual |
 * |---------------|------------|-----------|--------|
 * | Strikethrough | U+0336     | COMBINING LONG STROKE OVERLAY | ̶ |
 * | Underline     | U+0332     | COMBINING LOW LINE | ̲ |
 * 
 * ## Usage Notes
 * 
 * - Marks are applied per grapheme cluster, not per code point
 * - Whitespace is typically skipped (no visible effect)
 * - Operations are idempotent (adding twice has same effect as once)
 * - This module only manages style marks, not linguistic marks (accents, etc.)
 * 
 * @module unicode/combining-marks
 */

/**
 * Unicode combining characters used for text styling.
 * 
 * @constant {Object<string, string>}
 * @property {string} STRIKETHROUGH - U+0336 COMBINING LONG STROKE OVERLAY
 * @property {string} UNDERLINE - U+0332 COMBINING LOW LINE
 */
const CombiningMarks = Object.freeze({
  STRIKETHROUGH: '\u0336',
  UNDERLINE: '\u0332',
});

/**
 * Set of style-related combining marks managed by this module.
 * Used to distinguish style marks from linguistic combining characters
 * (accents, umlauts, etc.) which should be preserved.
 * 
 * @constant {Set<string>}
 */
const STYLE_MARKS = new Set([
  CombiningMarks.STRIKETHROUGH,
  CombiningMarks.UNDERLINE,
]);

/**
 * Checks if a grapheme cluster contains a specific style mark.
 * 
 * @param {string} cluster - A grapheme cluster (one user-perceived character)
 * @param {string} mark - The combining mark to check for
 * @returns {boolean} True if the cluster contains the mark
 * 
 * @example
 * hasStyleMark('a\u0336', CombiningMarks.STRIKETHROUGH)  // true
 * hasStyleMark('a', CombiningMarks.STRIKETHROUGH)        // false
 * hasStyleMark('é\u0336', CombiningMarks.STRIKETHROUGH)  // true
 */
function hasStyleMark(cluster, mark) {
  return cluster.includes(mark);
}

/**
 * Removes all style marks from a grapheme cluster.
 * 
 * This only removes marks managed by this module (strikethrough, underline).
 * Linguistic combining characters (accents, umlauts, etc.) are preserved.
 * 
 * @param {string} cluster - A grapheme cluster
 * @returns {string} The cluster with all style marks removed
 * 
 * @example
 * stripStyleMarks('a\u0336\u0332')  // 'a' (removes both)
 * stripStyleMarks('é\u0336')        // 'é' (accent preserved)
 * stripStyleMarks('e\u0301\u0336')  // 'e\u0301' (combining accent preserved)
 */
function stripStyleMarks(cluster) {
  return [...cluster].filter(cp => !STYLE_MARKS.has(cp)).join('');
}

/**
 * Removes a specific style mark from a grapheme cluster.
 * 
 * @param {string} cluster - A grapheme cluster
 * @param {string} mark - The mark to remove
 * @returns {string} The cluster with the specified mark removed
 * 
 * @example
 * stripMark('a\u0336\u0332', CombiningMarks.STRIKETHROUGH)
 * // 'a\u0332' (only strikethrough removed, underline remains)
 */
function stripMark(cluster, mark) {
  return [...cluster].filter(cp => cp !== mark).join('');
}

/**
 * Adds a style mark to a grapheme cluster.
 * 
 * This operation is idempotent - adding a mark that already exists has no effect.
 * The mark is appended at the end of the cluster for consistent ordering.
 * 
 * @param {string} cluster - A grapheme cluster
 * @param {string} mark - The combining mark to add
 * @returns {string} The cluster with the mark added
 * 
 * @example
 * addStyleMark('a', CombiningMarks.STRIKETHROUGH)
 * // 'a\u0336'
 * 
 * addStyleMark('a\u0336', CombiningMarks.STRIKETHROUGH)
 * // 'a\u0336' (already present, no change)
 * 
 * addStyleMark('a\u0336', CombiningMarks.UNDERLINE)
 * // 'a\u0336\u0332' (both marks)
 */
function addStyleMark(cluster, mark) {
  if (!cluster || cluster.length === 0) return cluster;
  
  // Idempotent: don't add if already present
  if (hasStyleMark(cluster, mark)) {
    return cluster;
  }
  
  // Append mark at the end
  return cluster + mark;
}

/**
 * Removes a style mark from a grapheme cluster.
 * 
 * Alias for stripMark() for semantic clarity in removal operations.
 * 
 * @param {string} cluster - A grapheme cluster
 * @param {string} mark - The mark to remove
 * @returns {string} The cluster with the mark removed
 * 
 * @example
 * removeStyleMark('a\u0336', CombiningMarks.STRIKETHROUGH)
 * // 'a'
 */
function removeStyleMark(cluster, mark) {
  return stripMark(cluster, mark);
}

// Export for browser environment
if (typeof window !== 'undefined') {
  /**
   * Combining mark utilities for text styling.
   * 
   * @namespace UnicodeCombiningMarks
   * @property {Object} CombiningMarks - Constants for style marks
   * @property {function} hasStyleMark - Check if cluster has a mark
   * @property {function} stripStyleMarks - Remove all style marks
   * @property {function} stripMark - Remove a specific mark
   * @property {function} addStyleMark - Add a style mark
   * @property {function} removeStyleMark - Remove a style mark
   */
  window.UnicodeCombiningMarks = {
    CombiningMarks,
    hasStyleMark,
    stripStyleMarks,
    stripMark,
    addStyleMark,
    removeStyleMark,
  };
}

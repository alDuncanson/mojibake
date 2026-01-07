/**
 * @fileoverview Unicode Grapheme Cluster Segmentation
 * 
 * This module provides Unicode-compliant grapheme segmentation using the
 * `Intl.Segmenter` API. Grapheme clusters are the user-perceived "characters"
 * that may consist of multiple Unicode code points.
 * 
 * ## Why Grapheme Segmentation Matters
 * 
 * JavaScript strings are sequences of UTF-16 code units, but users think in
 * terms of visual characters. Consider these examples:
 * 
 * | Text | Code Points | String Length | Graphemes |
 * |------|-------------|---------------|-----------|
 * | é    | 1 or 2*     | 1 or 2        | 1         |
 * | 👍   | 2 (surrogate pair) | 2      | 1         |
 * | 👍🏽  | 4           | 4             | 1         |
 * | 👨‍👩‍👧‍👦 | 11          | 11            | 1         |
 * 
 * * é can be NFC-composed (U+00E9) or decomposed (U+0065 U+0301)
 * 
 * ## Browser Compatibility
 * 
 * `Intl.Segmenter` is supported in all modern browsers (Chrome 87+, Safari 14.1+,
 * Firefox 125+). For older browsers, the module falls back to basic string
 * iteration (which may incorrectly split some characters).
 * 
 * @module unicode/graphemes
 */

/**
 * Shared Intl.Segmenter instance for grapheme segmentation.
 * Lazily initialized on first use, or null if the API is unavailable.
 * 
 * @type {Intl.Segmenter|null}
 */
const segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter)
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

/**
 * Segments text into an array of grapheme clusters.
 * 
 * Each element in the returned array represents one user-perceived character,
 * which may consist of multiple Unicode code points (emoji with modifiers,
 * composed characters, etc.).
 * 
 * @param {string} text - The text to segment
 * @returns {string[]} Array of grapheme clusters
 * 
 * @example
 * segmentGraphemes('Hello')
 * // ['H', 'e', 'l', 'l', 'o']
 * 
 * segmentGraphemes('👨‍👩‍👧')
 * // ['👨‍👩‍👧']  (family emoji as single grapheme)
 * 
 * segmentGraphemes('café')
 * // ['c', 'a', 'f', 'é']  (even if é is decomposed)
 */
function segmentGraphemes(text) {
  if (!text) return [];
  
  if (segmenter) {
    return Array.from(segmenter.segment(text), segment => segment.segment);
  }
  
  // Fallback for environments without Intl.Segmenter
  // Note: This may incorrectly split some complex characters
  return [...text];
}

/**
 * Maps each grapheme cluster through a transformation function.
 * 
 * This is the primary function for transforming text while preserving
 * grapheme cluster integrity. Use this instead of splitting strings
 * directly when dealing with Unicode text.
 * 
 * @param {string} text - The text to transform
 * @param {function(string, number, string[]): string} fn - Transform function
 *   called with (grapheme, index, allGraphemes)
 * @returns {string} Transformed text with all mapped graphemes joined
 * 
 * @example
 * // Add strikethrough to each grapheme
 * mapGraphemes('Test', cluster => cluster + '\u0336')
 * // 'T̶e̶s̶t̶'
 * 
 * // Uppercase each grapheme
 * mapGraphemes('hello', cluster => cluster.toUpperCase())
 * // 'HELLO'
 */
function mapGraphemes(text, fn) {
  const graphemes = segmentGraphemes(text);
  return graphemes.map(fn).join('');
}

/**
 * Filters grapheme clusters based on a predicate function.
 * 
 * Returns a new string containing only the graphemes for which
 * the predicate returns true.
 * 
 * @param {string} text - The text to filter
 * @param {function(string, number, string[]): boolean} predicate - Filter function
 *   called with (grapheme, index, allGraphemes)
 * @returns {string} Filtered text containing only matching graphemes
 * 
 * @example
 * // Remove all digits
 * filterGraphemes('a1b2c3', c => !/\d/.test(c))
 * // 'abc'
 * 
 * // Keep only emoji
 * filterGraphemes('Hi 👋 there', c => /\p{Emoji}/u.test(c))
 * // '👋'
 */
function filterGraphemes(text, predicate) {
  const graphemes = segmentGraphemes(text);
  return graphemes.filter(predicate).join('');
}

// Export for browser environment
if (typeof window !== 'undefined') {
  /**
   * Grapheme segmentation utilities.
   * 
   * @namespace UnicodeGraphemes
   * @property {function} segmentGraphemes - Split text into grapheme clusters
   * @property {function} mapGraphemes - Transform each grapheme cluster
   * @property {function} filterGraphemes - Filter grapheme clusters
   */
  window.UnicodeGraphemes = {
    segmentGraphemes,
    mapGraphemes,
    filterGraphemes,
  };
}

/**
 * @fileoverview Unicode Normalization Utilities
 * 
 * This module provides Unicode normalization functions to ensure consistent
 * character representation across different input methods and systems.
 * 
 * ## Why Normalization Matters
 * 
 * Unicode allows multiple ways to represent the same character:
 * 
 * - **Composed (NFC)**: é = U+00E9 (single code point)
 * - **Decomposed (NFD)**: é = U+0065 U+0301 (e + combining acute accent)
 * 
 * These look identical but are different byte sequences, which can cause:
 * - String comparison failures (`"café" !== "café"` if normalized differently)
 * - Incorrect string length calculations
 * - Styling issues when processing character by character
 * 
 * ## NFC (Canonical Composition)
 * 
 * This module uses NFC normalization because:
 * - It's the most common form on the web
 * - It produces the shortest representation for most text
 * - It's required by HTML5 and many web standards
 * - Most user input is already in NFC form
 * 
 * ## Performance
 * 
 * The `String.prototype.normalize()` method is highly optimized in modern
 * JavaScript engines. For already-normalized text, it's essentially a no-op.
 * 
 * @module unicode/normalization
 */

/**
 * Normalizes text to NFC (Canonical Composition) form.
 * 
 * NFC is the preferred normalization form for text processing:
 * - Precomposes characters when possible (é instead of e + ́)
 * - Ensures consistent representation across input methods
 * - Required for proper string comparison and length calculations
 * 
 * @param {string} text - The text to normalize
 * @returns {string} NFC-normalized text, or the original text if
 *                   normalization is unavailable
 * 
 * @example
 * // Decomposed to composed
 * normalizeNFC('e\u0301')  // 'é' (U+00E9)
 * 
 * // Already composed - unchanged
 * normalizeNFC('café')     // 'café'
 * 
 * // Mixed input
 * normalizeNFC('cafe\u0301')  // 'café'
 */
function normalizeNFC(text) {
  if (!text) return text;
  
  // Use native normalization if available (supported in all modern browsers)
  if (typeof text.normalize === 'function') {
    return text.normalize('NFC');
  }
  
  // Fallback for very old environments - return as-is
  return text;
}

/**
 * Normalizes text to NFD (Canonical Decomposition) form.
 * 
 * NFD decomposes characters into base + combining marks:
 * - é (U+00E9) → e (U+0065) + ́ (U+0301)
 * 
 * This is useful for styling accented characters by styling the base
 * character and preserving the combining marks.
 * 
 * @param {string} text - The text to normalize
 * @returns {string} NFD-normalized text, or the original text if
 *                   normalization is unavailable
 * 
 * @example
 * normalizeNFD('é')        // 'e\u0301' (e + combining acute)
 * normalizeNFD('café')     // 'cafe\u0301'
 * normalizeNFD('naïve')    // 'nai\u0308ve'
 */
function normalizeNFD(text) {
  if (!text) return text;
  
  if (typeof text.normalize === 'function') {
    return text.normalize('NFD');
  }
  
  return text;
}

// Export for browser environment
if (typeof window !== 'undefined') {
  /**
   * Unicode normalization utilities.
   * 
   * @namespace UnicodeNormalization
   * @property {function} normalizeNFC - Normalize text to NFC form
   * @property {function} normalizeNFD - Normalize text to NFD form
   */
  window.UnicodeNormalization = {
    normalizeNFC,
    normalizeNFD,
  };
}

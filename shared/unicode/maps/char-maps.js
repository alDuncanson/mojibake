/**
 * @fileoverview Unicode Character Maps for Text Styling
 * 
 * This module provides mappings from plain ASCII characters to their
 * corresponding styled Unicode mathematical/decorative variants.
 * 
 * ## Architecture
 * 
 * Each style is represented as an object with optional `upper`, `lower`,
 * and `digits` sub-maps. Characters not in a map are passed through unchanged.
 * 
 * ## Unicode Blocks Used
 * 
 * | Style       | Block                              | Range              |
 * |-------------|------------------------------------|--------------------|
 * | bold        | Mathematical Sans-Serif Bold       | U+1D5D4–U+1D5FF    |
 * | italic      | Mathematical Sans-Serif Italic     | U+1D608–U+1D63B    |
 * | boldItalic  | Mathematical Sans-Serif Bold Italic| U+1D63C–U+1D66F    |
 * | monospace   | Mathematical Monospace             | U+1D670–U+1D6A3    |
 * | script      | Mathematical Script Bold           | U+1D4D0–U+1D503    |
 * | fraktur     | Mathematical Fraktur Bold          | U+1D56C–U+1D59F    |
 * | circled     | Enclosed Alphanumerics             | U+2460–U+24FF      |
 * | fullwidth   | Fullwidth Latin                    | U+FF00–U+FFEF      |
 * | smallCaps   | Various phonetic blocks            | Mixed              |
 * 
 * ## Performance
 * 
 * Maps are built once at module load time using `buildMapFromRange()`.
 * Lookups are O(1) hash table operations.
 * 
 * @module unicode/maps/char-maps
 */

/**
 * Uppercase ASCII letters A-Z.
 * Used as the source for building uppercase character maps.
 * @constant {string}
 */
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Lowercase ASCII letters a-z.
 * Used as the source for building lowercase character maps.
 * @constant {string}
 */
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';

/**
 * ASCII digits 0-9.
 * Used as the source for building digit character maps.
 * @constant {string}
 */
const DIGITS = '0123456789';

/**
 * Greek uppercase letters Α-Ω (24 letters).
 * Used for building Greek character maps.
 * Note: Includes Θ (theta) at position 8, excludes final sigma.
 * @constant {string}
 */
const GREEK_UPPER = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';

/**
 * Greek lowercase letters α-ω (25 letters, includes final sigma ς).
 * Used for building Greek character maps.
 * Note: Position 17 is final sigma (ς), position 18 is regular sigma (σ).
 * @constant {string}
 */
const GREEK_LOWER = 'αβγδεζηθικλμνξοπρςστυφχψω';

/**
 * Builds a character mapping from a string of source characters
 * to Unicode code points starting at a specified offset.
 * 
 * This function creates an object where each key is a source character
 * and each value is the corresponding styled Unicode character.
 * 
 * @param {string} chars - Source characters to map (e.g., 'ABC...')
 * @param {number} startCodePoint - Starting Unicode code point for the target range
 * @returns {Object<string, string>} Map from source char to styled char
 * 
 * @example
 * // Build uppercase bold map starting at U+1D5D4
 * const boldUpper = buildMapFromRange('ABC', 0x1D5D4);
 * // Result: { 'A': '𝗔', 'B': '𝗕', 'C': '𝗖' }
 */
function buildMapFromRange(chars, startCodePoint) {
  return chars.split('').reduce((acc, char, index) => {
    acc[char] = String.fromCodePoint(startCodePoint + index);
    return acc;
  }, {});
}

/**
 * Main character maps for all supported substitution-based styles.
 * 
 * Each style object contains:
 * - `upper`: Map for uppercase letters (optional)
 * - `lower`: Map for lowercase letters (optional)  
 * - `digits`: Map for numeric digits (optional)
 * 
 * Characters without a mapping are preserved unchanged.
 * 
 * @type {Object<string, {upper?: Object, lower?: Object, digits?: Object}>}
 */
const CHAR_MAPS = {
  /**
   * Mathematical Sans-Serif Bold (U+1D5D4–U+1D5FF, U+1D7EC–U+1D7F5)
   * Greek Bold: U+1D6A8–U+1D6E1
   * 
   * Produces heavy sans-serif characters: 𝗔𝗕𝗖 𝗮𝗯𝗰 𝟬𝟭𝟮
   */
  bold: {
    upper: buildMapFromRange(UPPERCASE, 0x1D5D4),
    lower: buildMapFromRange(LOWERCASE, 0x1D5EE),
    digits: buildMapFromRange(DIGITS, 0x1D7EC),
    greekUpper: buildMapFromRange(GREEK_UPPER, 0x1D6A8),
    greekLower: buildMapFromRange(GREEK_LOWER, 0x1D6C2),
  },

  /**
   * Mathematical Sans-Serif Italic (U+1D608–U+1D63B)
   * Greek Italic: U+1D6E2–U+1D71B
   * 
   * Produces slanted sans-serif characters: 𝘈𝘉𝘊 𝘢𝘣𝘤
   * Note: No italic digits exist in Unicode.
   */
  italic: {
    upper: buildMapFromRange(UPPERCASE, 0x1D608),
    lower: buildMapFromRange(LOWERCASE, 0x1D622),
    greekUpper: buildMapFromRange(GREEK_UPPER, 0x1D6E2),
    greekLower: buildMapFromRange(GREEK_LOWER, 0x1D6FC),
  },

  /**
   * Mathematical Sans-Serif Bold Italic (U+1D63C–U+1D66F)
   * Greek Bold Italic: U+1D71C–U+1D755
   * 
   * Produces heavy slanted sans-serif characters: 𝘼𝘽𝘾 𝙖𝙗𝙘
   * Note: No bold italic digits exist in Unicode.
   */
  boldItalic: {
    upper: buildMapFromRange(UPPERCASE, 0x1D63C),
    lower: buildMapFromRange(LOWERCASE, 0x1D656),
    greekUpper: buildMapFromRange(GREEK_UPPER, 0x1D71C),
    greekLower: buildMapFromRange(GREEK_LOWER, 0x1D736),
  },

  /**
   * Mathematical Monospace (U+1D670–U+1D6A3, U+1D7F6–U+1D7FF)
   * 
   * Produces fixed-width characters: 𝙰𝙱𝙲 𝚊𝚋𝚌 𝟶𝟷𝟸
   * Commonly used for code snippets.
   */
  monospace: {
    upper: buildMapFromRange(UPPERCASE, 0x1D670),
    lower: buildMapFromRange(LOWERCASE, 0x1D68A),
    digits: buildMapFromRange(DIGITS, 0x1D7F6),
  },

  /**
   * Mathematical Script Bold (U+1D4D0–U+1D503)
   * 
   * Produces decorative cursive characters: 𝓐𝓑𝓒 𝓪𝓫𝓬
   * Often used for stylistic flourishes.
   */
  script: {
    upper: buildMapFromRange(UPPERCASE, 0x1D4D0),
    lower: buildMapFromRange(LOWERCASE, 0x1D4EA),
  },

  /**
   * Mathematical Fraktur Bold (U+1D56C–U+1D59F)
   * 
   * Produces Gothic/blackletter characters: 𝖆𝖇𝖈 𝖆𝖇𝖈
   * Historical German typography style.
   */
  fraktur: {
    upper: buildMapFromRange(UPPERCASE, 0x1D56C),
    lower: buildMapFromRange(LOWERCASE, 0x1D586),
  },

  /**
   * Enclosed/Circled Alphanumerics (U+24B6–U+24E9, U+2460–U+2473)
   * 
   * Produces circled characters: Ⓐ Ⓑ Ⓒ ⓐ ⓑ ⓒ ① ② ③
   * Note: Circled zero (⓪) is at a separate code point.
   */
  circled: {
    upper: buildMapFromRange(UPPERCASE, 0x24B6),
    lower: buildMapFromRange(LOWERCASE, 0x24D0),
    digits: {
      '0': '⓪',
      ...DIGITS.slice(1).split('').reduce((acc, char, index) => {
        acc[char] = String.fromCodePoint(0x2460 + index);
        return acc;
      }, {}),
    },
  },

  /**
   * Fullwidth Latin (U+FF21–U+FF3A, U+FF41–U+FF5A, U+FF10–U+FF19)
   * 
   * Produces wide characters used in CJK contexts: Ａ Ｂ Ｃ ａ ｂ ｃ ０ １ ２
   * Each character occupies the width of a CJK ideograph.
   */
  fullwidth: {
    upper: buildMapFromRange(UPPERCASE, 0xFF21),
    lower: buildMapFromRange(LOWERCASE, 0xFF41),
    digits: buildMapFromRange(DIGITS, 0xFF10),
  },

  /**
   * Small Capitals
   * 
   * Produces small capital letters from various Unicode blocks.
   * Note: These do NOT follow a contiguous code point range and must
   * be explicitly mapped. Uppercase letters pass through unchanged.
   * 
   * Example output: ᴀ ʙ ᴄ ᴅ ᴇ
   */
  smallCaps: {
    lower: {
      'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ',
      'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ',
      'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 'ꜱ', 't': 'ᴛ', 'u': 'ᴜ',
      'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
    },
    upper: UPPERCASE.split('').reduce((acc, char) => {
      acc[char] = char;
      return acc;
    }, {}),
  },
};

// Export for browser environment
if (typeof window !== 'undefined') {
  window.UnicodeCharMaps = {
    CHAR_MAPS,
    UPPERCASE,
    LOWERCASE,
    DIGITS,
    GREEK_UPPER,
    GREEK_LOWER,
  };
}

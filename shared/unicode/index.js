/**
 * @fileoverview Mojibake Unicode Processing Library - Main API
 * 
 * This is the primary entry point for Unicode-compliant text styling operations.
 * It orchestrates all submodules to provide high-level functions for:
 * 
 * - **Applying styles**: Convert plain text to styled Unicode variants
 * - **Removing styles**: Revert styled text back to plain ASCII
 * - **Toggling styles**: Smart on/off switching with combo support (bold+italic)
 * - **Detecting styles**: Analyze text to determine which styles are applied
 * 
 * ## Unicode Safety
 * 
 * All operations properly handle:
 * - Grapheme clusters (emoji, ZWJ sequences, composed characters)
 * - Surrogate pairs (astral plane characters like 𝗔)
 * - NFC normalization for consistent character representation
 * - Combining marks for strikethrough/underline effects
 * 
 * ## Style Types
 * 
 * Styles fall into two categories:
 * 
 * 1. **Substitution styles**: Replace characters with Unicode variants
 *    - bold, italic, boldItalic, monospace, script, fraktur, circled, fullwidth, smallCaps
 * 
 * 2. **Combining mark styles**: Add Unicode combining characters
 *    - strikethrough (U+0336), underline (U+0332)
 * 
 * ## Usage Examples
 * 
 * ```javascript
 * // Apply bold styling
 * const bold = Unicode.applyStyle('Hello', 'bold'); // '𝗛𝗲𝗹𝗹𝗼'
 * 
 * // Handle emoji safely
 * const styled = Unicode.applyStyle('Hi 👨‍👩‍👧', 'strikethrough');
 * 
 * // Convert back to plain text
 * const plain = Unicode.toPlainText(bold); // 'Hello'
 * 
 * // Toggle styles intelligently
 * const boldText = Unicode.applyStyle('Test', 'bold');
 * const boldItalic = Unicode.toggleStyle(boldText, 'italic'); // Adds italic
 * ```
 * 
 * @module unicode
 */

/**
 * Applies a text style to the given text.
 * 
 * For substitution styles (bold, italic, etc.), each ASCII letter/digit is
 * replaced with its styled Unicode equivalent. Characters without mappings
 * (punctuation, emoji, etc.) pass through unchanged.
 * 
 * For combining mark styles (strikethrough, underline), the appropriate
 * combining character is appended to each grapheme cluster.
 * 
 * @param {string} text - The plain text to style
 * @param {string} style - Style identifier. One of:
 *   - 'bold' - Mathematical Sans-Serif Bold
 *   - 'italic' - Mathematical Sans-Serif Italic
 *   - 'boldItalic' - Mathematical Sans-Serif Bold Italic
 *   - 'strikethrough' - Combining Long Stroke Overlay
 *   - 'underline' - Combining Low Line
 *   - 'monospace' - Mathematical Monospace
 *   - 'script' - Mathematical Script Bold
 *   - 'fraktur' - Mathematical Fraktur Bold
 *   - 'circled' - Enclosed Alphanumerics
 *   - 'fullwidth' - Fullwidth Latin Letters
 *   - 'smallCaps' - Small Capital Letters
 * @returns {string} The styled text
 * 
 * @example
 * applyStyle('Hello', 'bold')        // '𝗛𝗲𝗹𝗹𝗼'
 * applyStyle('Test', 'strikethrough') // 'T̶e̶s̶t̶'
 * applyStyle('Hi 👋', 'bold')         // '𝗛𝗶 👋' (emoji preserved)
 */
function applyStyle(text, style) {
  if (!text) return text;
  
  const { normalizeNFC, normalizeNFD } = window.UnicodeNormalization;
  const { mapGraphemes } = window.UnicodeGraphemes;
  const { CombiningMarks, addStyleMark } = window.UnicodeCombiningMarks;
  const { CHAR_MAPS } = window.UnicodeCharMaps;
  
  // Normalize input to NFC for consistent processing
  const input = normalizeNFC(text);
  
  // Handle combining mark styles (strikethrough, underline)
  if (style === 'strikethrough') {
    const output = mapGraphemes(input, cluster => {
      // Skip whitespace - don't add marks to spaces
      if (/^\s+$/.test(cluster)) return cluster;
      return addStyleMark(cluster, CombiningMarks.STRIKETHROUGH);
    });
    return normalizeNFC(output);
  }
  
  if (style === 'underline') {
    const output = mapGraphemes(input, cluster => {
      if (/^\s+$/.test(cluster)) return cluster;
      return addStyleMark(cluster, CombiningMarks.UNDERLINE);
    });
    return normalizeNFC(output);
  }
  
  // Handle character substitution styles
  const map = CHAR_MAPS[style];
  if (!map) return input;
  
  const output = mapGraphemes(input, cluster => {
    // Decompose to NFD to handle accented characters
    // This separates é into e + combining acute, allowing us to style the base
    const decomposed = normalizeNFD(cluster);
    const codePoints = [...decomposed];
    
    const mapped = codePoints.map(cp => {
      // Try Latin mappings first
      if (map.upper && map.upper[cp]) return map.upper[cp];
      if (map.lower && map.lower[cp]) return map.lower[cp];
      if (map.digits && map.digits[cp]) return map.digits[cp];
      // Try Greek mappings
      if (map.greekUpper && map.greekUpper[cp]) return map.greekUpper[cp];
      if (map.greekLower && map.greekLower[cp]) return map.greekLower[cp];
      return cp;
    }).join('');
    
    // Recompose to NFC to merge combining marks back
    return normalizeNFC(mapped);
  });
  
  return normalizeNFC(output);
}

/**
 * Removes a specific style from styled text.
 * 
 * For substitution styles, converts styled characters back to plain ASCII.
 * For combining mark styles, removes the combining character from each cluster.
 * 
 * @param {string} text - The styled text
 * @param {string} style - The style to remove (same values as applyStyle)
 * @returns {string} Text with the specified style removed
 * 
 * @example
 * removeStyle('𝗛𝗲𝗹𝗹𝗼', 'bold')       // 'Hello'
 * removeStyle('T̶e̶s̶t̶', 'strikethrough') // 'Test'
 */
function removeStyle(text, style) {
  if (!text) return text;
  
  const { normalizeNFC } = window.UnicodeNormalization;
  const { mapGraphemes } = window.UnicodeGraphemes;
  const { CombiningMarks, removeStyleMark } = window.UnicodeCombiningMarks;
  const { REVERSE_CHAR_MAPS } = window.UnicodeReverseMaps;
  
  const input = normalizeNFC(text);
  
  // Handle combining mark styles
  if (style === 'strikethrough') {
    const output = mapGraphemes(input, cluster => 
      removeStyleMark(cluster, CombiningMarks.STRIKETHROUGH)
    );
    return normalizeNFC(output);
  }
  
  if (style === 'underline') {
    const output = mapGraphemes(input, cluster => 
      removeStyleMark(cluster, CombiningMarks.UNDERLINE)
    );
    return normalizeNFC(output);
  }
  
  // Handle character substitution styles
  const reverseMap = REVERSE_CHAR_MAPS[style];
  if (!reverseMap) return input;
  
  const output = mapGraphemes(input, cluster => {
    const codePoints = [...cluster];
    return codePoints.map(cp => reverseMap[cp] || cp).join('');
  });
  
  return normalizeNFC(output);
}

/**
 * Converts styled text back to plain ASCII text.
 * 
 * Removes ALL applied styles, including:
 * - All substitution-based styles (bold, italic, etc.)
 * - All combining marks (strikethrough, underline)
 * 
 * This is useful for extracting the original content from styled text.
 * 
 * @param {string} text - Text with any combination of styles applied
 * @returns {string} Plain ASCII text
 * 
 * @example
 * toPlainText('𝗛𝗲𝗹𝗹𝗼')           // 'Hello'
 * toPlainText('T̶e̶s̶t̶')             // 'Test'
 * toPlainText('𝗧̶𝗲̶𝘀̶𝘁̶')           // 'Test' (removes bold AND strikethrough)
 */
function toPlainText(text) {
  if (!text) return text;
  
  const { normalizeNFC } = window.UnicodeNormalization;
  const { mapGraphemes } = window.UnicodeGraphemes;
  const { stripStyleMarks } = window.UnicodeCombiningMarks;
  const { REVERSE_CHAR_MAPS } = window.UnicodeReverseMaps;
  
  let result = normalizeNFC(text);
  
  // First, remove combining style marks (strikethrough, underline)
  result = mapGraphemes(result, cluster => stripStyleMarks(cluster));
  
  // Then, convert all styled characters back to plain ASCII
  for (const reverseMap of Object.values(REVERSE_CHAR_MAPS)) {
    result = mapGraphemes(result, cluster => {
      const codePoints = [...cluster];
      return codePoints.map(cp => reverseMap[cp] || cp).join('');
    });
  }
  
  return normalizeNFC(result);
}

/**
 * Detects which styles are currently applied to text.
 * 
 * Returns an object with boolean flags for each style. Detection is based
 * on finding styled characters; a style is considered "applied" if at least
 * 50% of testable characters are in that style.
 * 
 * @param {string} text - Text to analyze
 * @returns {Object} Object with style names as keys and boolean values
 * 
 * @example
 * detectStyles('𝗛𝗲𝗹𝗹𝗼')
 * // { bold: true, italic: false, boldItalic: false, strikethrough: false, ... }
 * 
 * detectStyles('T̶e̶s̶t̶')
 * // { bold: false, italic: false, strikethrough: true, ... }
 */
function detectStyles(text) {
  const detected = {
    bold: false,
    italic: false,
    boldItalic: false,
    strikethrough: false,
    underline: false,
    monospace: false,
    script: false,
    fraktur: false,
    circled: false,
    fullwidth: false,
    smallCaps: false,
  };
  
  if (!text || text.length === 0) return detected;
  
  const { CombiningMarks } = window.UnicodeCombiningMarks;
  const { segmentGraphemes, filterGraphemes } = window.UnicodeGraphemes;
  const { REVERSE_CHAR_MAPS } = window.UnicodeReverseMaps;
  
  // Check for combining marks (simple string inclusion)
  if (text.includes(CombiningMarks.STRIKETHROUGH)) detected.strikethrough = true;
  if (text.includes(CombiningMarks.UNDERLINE)) detected.underline = true;
  
  // Filter out whitespace and combining marks for substitution style detection
  const testChars = filterGraphemes(text, c => 
    c !== CombiningMarks.STRIKETHROUGH && 
    c !== CombiningMarks.UNDERLINE && 
    /\S/.test(c)
  );
  
  const graphemes = segmentGraphemes(testChars);
  if (graphemes.length === 0) return detected;
  
  // Check each substitution style
  for (const [styleName, reverseMap] of Object.entries(REVERSE_CHAR_MAPS)) {
    const styledCount = graphemes.filter(g => {
      const codePoints = [...g];
      return codePoints.some(cp => reverseMap[cp]);
    }).length;
    
    // Consider style "applied" if 50%+ of characters are styled
    if (styledCount > 0 && styledCount >= graphemes.length * 0.5) {
      detected[styleName] = true;
    }
  }
  
  return detected;
}

/**
 * Checks if text is styled with a specific style.
 * 
 * Uses the same 50% threshold as detectStyles() for substitution styles.
 * For combining mark styles, checks for presence of the mark.
 * 
 * @param {string} text - Text to check
 * @param {string} style - Style identifier to check for
 * @returns {boolean} True if the text is styled with the given style
 * 
 * @example
 * isStyledWith('𝗛𝗲𝗹𝗹𝗼', 'bold')           // true
 * isStyledWith('𝗛𝗲𝗹𝗹𝗼', 'italic')         // false
 * isStyledWith('T̶e̶s̶t̶', 'strikethrough')   // true
 */
function isStyledWith(text, style) {
  if (!text || text.length === 0) return false;
  
  const { CombiningMarks } = window.UnicodeCombiningMarks;
  const { segmentGraphemes } = window.UnicodeGraphemes;
  const { REVERSE_CHAR_MAPS } = window.UnicodeReverseMaps;
  
  // Quick check for combining mark styles
  if (style === 'strikethrough') {
    return text.includes(CombiningMarks.STRIKETHROUGH);
  }
  if (style === 'underline') {
    return text.includes(CombiningMarks.UNDERLINE);
  }
  
  // Check substitution styles
  const reverseMap = REVERSE_CHAR_MAPS[style];
  if (!reverseMap) return false;
  
  const graphemes = segmentGraphemes(text);
  const testable = graphemes.filter(g => 
    /[a-zA-Z0-9]/i.test(g) || [...g].some(cp => reverseMap[cp])
  );
  
  if (testable.length === 0) return false;
  
  const styledCount = testable.filter(g => [...g].some(cp => reverseMap[cp])).length;
  return styledCount >= testable.length * 0.5;
}

/**
 * Toggles a style on/off for the given text.
 * 
 * Smart toggle behavior:
 * - If the style is currently applied, removes it
 * - If not applied, applies it (after converting to plain text for exclusive styles)
 * 
 * Special handling for bold/italic combinations:
 * - Toggling italic on bold text produces boldItalic
 * - Toggling bold off boldItalic leaves italic
 * - Toggling italic off boldItalic leaves bold
 * 
 * @param {string} text - Text to toggle style on
 * @param {string} style - Style to toggle
 * @returns {string} Text with the style toggled
 * 
 * @example
 * // Basic toggle
 * toggleStyle('Hello', 'bold')        // '𝗛𝗲𝗹𝗹𝗼' (applies bold)
 * toggleStyle('𝗛𝗲𝗹𝗹𝗼', 'bold')        // 'Hello' (removes bold)
 * 
 * // Bold/italic combinations
 * toggleStyle('𝗛𝗲𝗹𝗹𝗼', 'italic')      // '𝙃𝙚𝙡𝙡𝙤' (bold + italic = boldItalic)
 * toggleStyle('𝙃𝙚𝙡𝙡𝙤', 'bold')        // '𝘏𝘦𝘭𝘭𝘰' (removes bold, keeps italic)
 */
function toggleStyle(text, style) {
  const detected = detectStyles(text);
  
  // Handle combining mark styles (simple toggle)
  if (style === 'strikethrough') {
    return detected.strikethrough 
      ? removeStyle(text, 'strikethrough') 
      : applyStyle(text, 'strikethrough');
  }
  if (style === 'underline') {
    return detected.underline 
      ? removeStyle(text, 'underline') 
      : applyStyle(text, 'underline');
  }
  
  // Define bold/italic component relationships
  const STYLE_COMPONENTS = {
    bold: { bold: true },
    italic: { italic: true },
    boldItalic: { bold: true, italic: true },
  };
  
  const requestedComponents = STYLE_COMPONENTS[style];
  
  // Handle bold/italic combination logic
  if (requestedComponents) {
    let currentComponents = { bold: false, italic: false };
    
    // Determine current bold/italic state
    if (detected.boldItalic) {
      currentComponents = { bold: true, italic: true };
    } else if (detected.bold) {
      currentComponents = { bold: true, italic: false };
    } else if (detected.italic) {
      currentComponents = { bold: false, italic: true };
    }
    
    const plain = toPlainText(text);
    
    // Toggle the requested component
    if (style === 'bold') {
      currentComponents.bold = !currentComponents.bold;
    } else if (style === 'italic') {
      currentComponents.italic = !currentComponents.italic;
    } else if (style === 'boldItalic') {
      if (detected.boldItalic) {
        currentComponents = { bold: false, italic: false };
      } else {
        currentComponents = { bold: true, italic: true };
      }
    }
    
    // Determine resulting style
    let newStyle = null;
    if (currentComponents.bold && currentComponents.italic) newStyle = 'boldItalic';
    else if (currentComponents.bold) newStyle = 'bold';
    else if (currentComponents.italic) newStyle = 'italic';
    
    return newStyle ? applyStyle(plain, newStyle) : plain;
  }
  
  // Handle exclusive styles (script, fraktur, etc.)
  // These replace any existing style rather than combining
  if (isStyledWith(text, style)) {
    return removeStyle(text, style);
  } else {
    const plain = toPlainText(text);
    return applyStyle(plain, style);
  }
}

// Export the public API for browser environment
if (typeof window !== 'undefined') {
  /**
   * The Unicode text styling API.
   * 
   * @namespace Unicode
   * @property {function} applyStyle - Apply a style to text
   * @property {function} removeStyle - Remove a specific style from text
   * @property {function} toggleStyle - Toggle a style on/off
   * @property {function} toPlainText - Convert styled text to plain ASCII
   * @property {function} detectStyles - Detect which styles are applied
   * @property {function} isStyledWith - Check if text has a specific style
   */
  window.Unicode = {
    applyStyle,
    removeStyle,
    toggleStyle,
    toPlainText,
    detectStyles,
    isStyledWith,
  };
}

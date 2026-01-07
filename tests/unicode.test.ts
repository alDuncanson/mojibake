import { describe, it, expect, beforeAll } from "bun:test";

const window: Record<string, any> = globalThis as any;
(globalThis as any).window = window;

beforeAll(async () => {
  await import("../shared/unicode/maps/char-maps.js");
  await import("../shared/unicode/maps/reverse-maps.js");
  await import("../shared/unicode/graphemes.js");
  await import("../shared/unicode/normalization.js");
  await import("../shared/unicode/combining-marks.js");
  await import("../shared/unicode/index.js");
  
  window.UnicodeReverseMaps.initializeReverseMaps();
});

describe("Grapheme Segmentation", () => {
  it("segments ASCII text correctly", () => {
    const result = window.UnicodeGraphemes.segmentGraphemes("Hello");
    expect(result).toHaveLength(5);
    expect(result).toEqual(["H", "e", "l", "l", "o"]);
  });

  it("treats emoji as single grapheme", () => {
    const result = window.UnicodeGraphemes.segmentGraphemes("👍");
    expect(result).toHaveLength(1);
  });

  it("treats emoji with skin tone as single grapheme", () => {
    const result = window.UnicodeGraphemes.segmentGraphemes("👍🏽");
    expect(result).toHaveLength(1);
  });

  it("treats ZWJ family emoji as single grapheme", () => {
    const result = window.UnicodeGraphemes.segmentGraphemes("👨‍👩‍👧‍👦");
    expect(result).toHaveLength(1);
  });

  it("handles mixed text and emoji", () => {
    const result = window.UnicodeGraphemes.segmentGraphemes("Hi 👋 World");
    expect(result).toHaveLength(10);
  });

  it("handles astral plane characters", () => {
    const result = window.UnicodeGraphemes.segmentGraphemes("𝔄𝔅");
    expect(result).toHaveLength(2);
  });

  it("treats composed character as single grapheme", () => {
    const decomposed = "e\u0301";
    const result = window.UnicodeGraphemes.segmentGraphemes(decomposed);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for empty string", () => {
    expect(window.UnicodeGraphemes.segmentGraphemes("")).toEqual([]);
  });

  it("filterGraphemes filters out characters", () => {
    const result = window.UnicodeGraphemes.filterGraphemes("a1b2c3", (c: string) => /[a-z]/.test(c));
    expect(result).toBe("abc");
  });
});

describe("NFC Normalization", () => {
  it("normalizes decomposed to composed", () => {
    const decomposed = "e\u0301";
    const normalized = window.UnicodeNormalization.normalizeNFC(decomposed);
    expect(normalized).toBe("é");
  });

  it("leaves already-composed text unchanged", () => {
    const composed = "café";
    const normalized = window.UnicodeNormalization.normalizeNFC(composed);
    expect(normalized).toBe("café");
  });
});

describe("Combining Marks", () => {
  it("adds strikethrough mark to cluster", () => {
    const result = window.UnicodeCombiningMarks.addStyleMark(
      "a",
      window.UnicodeCombiningMarks.CombiningMarks.STRIKETHROUGH
    );
    expect(result).toBe("a\u0336");
  });

  it("adds underline mark to cluster", () => {
    const result = window.UnicodeCombiningMarks.addStyleMark(
      "a",
      window.UnicodeCombiningMarks.CombiningMarks.UNDERLINE
    );
    expect(result).toBe("a\u0332");
  });

  it("is idempotent - does not double-add marks", () => {
    const once = window.UnicodeCombiningMarks.addStyleMark(
      "a",
      window.UnicodeCombiningMarks.CombiningMarks.STRIKETHROUGH
    );
    const twice = window.UnicodeCombiningMarks.addStyleMark(
      once,
      window.UnicodeCombiningMarks.CombiningMarks.STRIKETHROUGH
    );
    expect(once).toBe(twice);
  });

  it("removes strikethrough mark", () => {
    const marked = "a\u0336";
    const result = window.UnicodeCombiningMarks.removeStyleMark(
      marked,
      window.UnicodeCombiningMarks.CombiningMarks.STRIKETHROUGH
    );
    expect(result).toBe("a");
  });

  it("preserves non-style combining marks", () => {
    const input = "e\u0301\u0336";
    const result = window.UnicodeCombiningMarks.stripStyleMarks(input);
    expect(result).toBe("e\u0301");
  });
});

describe("Style Application", () => {
  it("applies bold style", () => {
    const result = window.Unicode.applyStyle("Hello", "bold");
    expect(result).toBe("𝗛𝗲𝗹𝗹𝗼");
  });

  it("applies italic style", () => {
    const result = window.Unicode.applyStyle("Test", "italic");
    expect(result).not.toBe("Test");
  });

  it("applies strikethrough style", () => {
    const result = window.Unicode.applyStyle("Test", "strikethrough");
    expect(result).toContain("\u0336");
  });

  it("applies underline style", () => {
    const result = window.Unicode.applyStyle("Test", "underline");
    expect(result).toContain("\u0332");
  });

  it("preserves emoji when styling", () => {
    const result = window.Unicode.applyStyle("Hi 👨‍👩‍👧", "bold");
    expect(result).toContain("👨‍👩‍👧");
  });

  it("skips whitespace for strikethrough", () => {
    const result = window.Unicode.applyStyle("a b", "strikethrough");
    const graphemes = window.UnicodeGraphemes.segmentGraphemes(result);
    expect(graphemes[1]).toBe(" ");
  });

  it("returns empty for empty input", () => {
    expect(window.Unicode.applyStyle("", "bold")).toBe("");
  });

  it("returns input unchanged for unknown style", () => {
    const result = window.Unicode.applyStyle("Test", "unknownStyle");
    expect(result).toBe("Test");
  });
});

describe("Style Removal", () => {
  it("removes bold style", () => {
    const bold = window.Unicode.applyStyle("Hello", "bold");
    const plain = window.Unicode.removeStyle(bold, "bold");
    expect(plain).toBe("Hello");
  });

  it("removes strikethrough style", () => {
    const struck = "T\u0336e\u0336s\u0336t\u0336";
    const plain = window.Unicode.removeStyle(struck, "strikethrough");
    expect(plain).toBe("Test");
  });

  it("removes underline style", () => {
    const underlined = window.Unicode.applyStyle("Test", "underline");
    const plain = window.Unicode.removeStyle(underlined, "underline");
    expect(plain).toBe("Test");
  });

  it("preserves accent when removing strikethrough", () => {
    const accented = "é\u0336";
    const plain = window.Unicode.removeStyle(accented, "strikethrough");
    expect(plain.normalize("NFC")).toBe("é");
  });

  it("returns input unchanged for unknown style", () => {
    const result = window.Unicode.removeStyle("Test", "unknownStyle");
    expect(result).toBe("Test");
  });

  it("returns empty for empty input", () => {
    expect(window.Unicode.removeStyle("", "bold")).toBe("");
  });
});

describe("Plain Text Conversion", () => {
  it("converts bold to plain", () => {
    const bold = window.Unicode.applyStyle("Hello", "bold");
    const plain = window.Unicode.toPlainText(bold);
    expect(plain).toBe("Hello");
  });

  it("converts multiple styles to plain", () => {
    let text = window.Unicode.applyStyle("Test", "bold");
    text = window.Unicode.applyStyle(text, "strikethrough");
    const plain = window.Unicode.toPlainText(text);
    expect(plain).toBe("Test");
  });

  it("round-trips plain -> styled -> plain", () => {
    const source = "Hello World!";
    const styled = window.Unicode.applyStyle(source, "boldItalic");
    const plain = window.Unicode.toPlainText(styled);
    expect(plain).toBe(source);
  });

  it("round-trips with emoji and accents", () => {
    const source = "Hello 👨‍👩‍👧 café";
    const styled = window.Unicode.applyStyle(source, "bold");
    const plain = window.Unicode.toPlainText(styled);
    expect(plain.normalize("NFC")).toBe(source.normalize("NFC"));
  });

  it("returns empty for empty input", () => {
    expect(window.Unicode.toPlainText("")).toBe("");
  });
});

describe("Style Detection", () => {
  it("detects bold style", () => {
    const bold = window.Unicode.applyStyle("Test", "bold");
    const detected = window.Unicode.detectStyles(bold);
    expect(detected.bold).toBe(true);
    expect(detected.italic).toBe(false);
  });

  it("detects strikethrough style", () => {
    const struck = window.Unicode.applyStyle("Test", "strikethrough");
    const detected = window.Unicode.detectStyles(struck);
    expect(detected.strikethrough).toBe(true);
  });

  it("detects multiple styles", () => {
    let text = window.Unicode.applyStyle("Test", "bold");
    text = window.Unicode.applyStyle(text, "underline");
    const detected = window.Unicode.detectStyles(text);
    expect(detected.bold).toBe(true);
    expect(detected.underline).toBe(true);
  });

  it("returns all false for empty input", () => {
    const detected = window.Unicode.detectStyles("");
    expect(detected.bold).toBe(false);
    expect(detected.strikethrough).toBe(false);
  });
});

describe("Style Toggle", () => {
  it("toggles bold on", () => {
    const result = window.Unicode.toggleStyle("Test", "bold");
    expect(window.Unicode.isStyledWith(result, "bold")).toBe(true);
  });

  it("toggles bold off", () => {
    const bold = window.Unicode.applyStyle("Test", "bold");
    const result = window.Unicode.toggleStyle(bold, "bold");
    expect(window.Unicode.isStyledWith(result, "bold")).toBe(false);
  });

  it("toggles italic on bold text creates boldItalic", () => {
    const bold = window.Unicode.applyStyle("Test", "bold");
    const result = window.Unicode.toggleStyle(bold, "italic");
    expect(window.Unicode.isStyledWith(result, "boldItalic")).toBe(true);
  });

  it("toggles bold off boldItalic leaves italic", () => {
    const boldItalic = window.Unicode.applyStyle("Test", "boldItalic");
    const result = window.Unicode.toggleStyle(boldItalic, "bold");
    expect(window.Unicode.isStyledWith(result, "italic")).toBe(true);
    expect(window.Unicode.isStyledWith(result, "bold")).toBe(false);
  });

  it("toggles italic off boldItalic leaves bold", () => {
    const boldItalic = window.Unicode.applyStyle("Test", "boldItalic");
    const result = window.Unicode.toggleStyle(boldItalic, "italic");
    expect(window.Unicode.isStyledWith(result, "bold")).toBe(true);
    expect(window.Unicode.isStyledWith(result, "italic")).toBe(false);
  });

  it("toggles boldItalic on plain text", () => {
    const result = window.Unicode.toggleStyle("Test", "boldItalic");
    expect(window.Unicode.isStyledWith(result, "boldItalic")).toBe(true);
  });

  it("toggles boldItalic off boldItalic text", () => {
    const boldItalic = window.Unicode.applyStyle("Test", "boldItalic");
    const result = window.Unicode.toggleStyle(boldItalic, "boldItalic");
    expect(window.Unicode.toPlainText(result)).toBe("Test");
    expect(window.Unicode.isStyledWith(result, "boldItalic")).toBe(false);
  });

  it("toggles underline on and off", () => {
    const underlined = window.Unicode.toggleStyle("Test", "underline");
    expect(window.Unicode.isStyledWith(underlined, "underline")).toBe(true);
    const plain = window.Unicode.toggleStyle(underlined, "underline");
    expect(window.Unicode.isStyledWith(plain, "underline")).toBe(false);
  });

  it("is idempotent for strikethrough", () => {
    const original = "test";
    const once = window.Unicode.toggleStyle(original, "strikethrough");
    const twice = window.Unicode.toggleStyle(once, "strikethrough");
    expect(twice).toBe(original);
  });

  it("toggles exclusive styles like script", () => {
    const scripted = window.Unicode.toggleStyle("Test", "script");
    expect(window.Unicode.isStyledWith(scripted, "script")).toBe(true);
    const plain = window.Unicode.toggleStyle(scripted, "script");
    expect(window.Unicode.isStyledWith(plain, "script")).toBe(false);
  });

  it("toggles italic on plain text", () => {
    const result = window.Unicode.toggleStyle("Test", "italic");
    expect(window.Unicode.isStyledWith(result, "italic")).toBe(true);
  });
});

describe("isStyledWith", () => {
  it("returns false for empty text", () => {
    expect(window.Unicode.isStyledWith("", "bold")).toBe(false);
  });

  it("detects underline style", () => {
    const underlined = window.Unicode.applyStyle("Test", "underline");
    expect(window.Unicode.isStyledWith(underlined, "underline")).toBe(true);
  });

  it("returns false for unknown style", () => {
    expect(window.Unicode.isStyledWith("Test", "unknownStyle")).toBe(false);
  });
});

// =============================================================================
// 🎉 FUN TESTS - Easter eggs and real-world scenarios
// =============================================================================

describe("Mojibake! - Core Styling", () => {
  it("makes Mojibake look 𝗯𝗼𝗹𝗱", () => {
    const result = window.Unicode.applyStyle("Mojibake!", "bold");
    expect(result).toBe("𝗠𝗼𝗷𝗶𝗯𝗮𝗸𝗲!");
  });

  it("makes Mojibake look 𝘪𝘵𝘢𝘭𝘪𝘤", () => {
    const result = window.Unicode.applyStyle("Mojibake!", "italic");
    expect(result).toBe("𝘔𝘰𝘫𝘪𝘣𝘢𝘬𝘦!");
  });

  it("makes Mojibake look 𝙗𝙤𝙡𝙙 𝙖𝙣𝙙 𝙞𝙩𝙖𝙡𝙞𝙘", () => {
    const result = window.Unicode.applyStyle("Mojibake!", "boldItalic");
    expect(result).toBe("𝙈𝙤𝙟𝙞𝙗𝙖𝙠𝙚!");
  });

  it("makes Mojibake look 𝚖𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎", () => {
    const result = window.Unicode.applyStyle("Mojibake!", "monospace");
    expect(result).toBe("𝙼𝚘𝚓𝚒𝚋𝚊𝚔𝚎!");
  });

  it("makes Mojibake look 𝓯𝓪𝓷𝓬𝔂", () => {
    const result = window.Unicode.applyStyle("Mojibake!", "script");
    expect(result).toBe("𝓜𝓸𝓳𝓲𝓫𝓪𝓴𝓮!");
  });

  it("makes Mojibake look ᴍᴏᴊɪʙᴀᴋᴇ (small caps)", () => {
    const result = window.Unicode.applyStyle("mojibake!", "smallCaps");
    expect(result).toBe("ᴍᴏᴊɪʙᴀᴋᴇ!");
  });

  it("survives the round trip: Mojibake → styled → plain", () => {
    const styles = ["bold", "italic", "boldItalic", "monospace", "script", "fraktur", "circled", "fullwidth"];
    for (const style of styles) {
      const styled = window.Unicode.applyStyle("Mojibake!", style);
      const plain = window.Unicode.toPlainText(styled);
      expect(plain).toBe("Mojibake!");
    }
  });
});

describe("Accented Latin Support - Café Culture ☕", () => {
  it("styles café with bold (NFD decomposition magic)", () => {
    const result = window.Unicode.applyStyle("café", "bold");
    // The é should become bold e + combining acute
    expect(result.normalize("NFC")).toContain("𝗰");
    expect(result.normalize("NFC")).toContain("𝗮");
    expect(result.normalize("NFC")).toContain("𝗳");
    // The accent should be preserved
    const plain = window.Unicode.toPlainText(result);
    expect(plain.normalize("NFC")).toBe("café");
  });

  it("handles naïve with diaeresis", () => {
    const result = window.Unicode.applyStyle("naïve", "bold");
    const plain = window.Unicode.toPlainText(result);
    expect(plain.normalize("NFC")).toBe("naïve");
  });

  it("handles jalapeño with tilde", () => {
    const result = window.Unicode.applyStyle("jalapeño", "italic");
    const plain = window.Unicode.toPlainText(result);
    expect(plain.normalize("NFC")).toBe("jalapeño");
  });

  it("handles crème brûlée with multiple accents", () => {
    const result = window.Unicode.applyStyle("crème brûlée", "bold");
    const plain = window.Unicode.toPlainText(result);
    expect(plain.normalize("NFC")).toBe("crème brûlée");
  });

  it("handles Zürich with umlaut", () => {
    const result = window.Unicode.applyStyle("Zürich", "boldItalic");
    const plain = window.Unicode.toPlainText(result);
    expect(plain.normalize("NFC")).toBe("Zürich");
  });

  it("handles São Paulo with tilde", () => {
    const result = window.Unicode.applyStyle("São Paulo", "script");
    const plain = window.Unicode.toPlainText(result);
    expect(plain.normalize("NFC")).toBe("São Paulo");
  });

  it("handles Ångström with ring above", () => {
    const result = window.Unicode.applyStyle("Ångström", "bold");
    const plain = window.Unicode.toPlainText(result);
    expect(plain.normalize("NFC")).toBe("Ångström");
  });
});

describe("Greek Letter Support - Ελληνικά 🏛️", () => {
  it("styles Greek alphabet in bold", () => {
    const result = window.Unicode.applyStyle("αβγδ", "bold");
    expect(result).not.toBe("αβγδ");
    const plain = window.Unicode.toPlainText(result);
    expect(plain).toBe("αβγδ");
  });

  it("styles Greek uppercase in bold", () => {
    const result = window.Unicode.applyStyle("ΑΒΓΔ", "bold");
    expect(result).not.toBe("ΑΒΓΔ");
    const plain = window.Unicode.toPlainText(result);
    expect(plain).toBe("ΑΒΓΔ");
  });

  it("styles Greek in italic", () => {
    const result = window.Unicode.applyStyle("αβγδ", "italic");
    expect(result).not.toBe("αβγδ");
    const plain = window.Unicode.toPlainText(result);
    expect(plain).toBe("αβγδ");
  });

  it("styles Greek in boldItalic", () => {
    const result = window.Unicode.applyStyle("αβγδ", "boldItalic");
    expect(result).not.toBe("αβγδ");
    const plain = window.Unicode.toPlainText(result);
    expect(plain).toBe("αβγδ");
  });

  it("styles 'Ελληνικά' (Greek word for Greek)", () => {
    const result = window.Unicode.applyStyle("Ελληνικά", "bold");
    expect(result).not.toBe("Ελληνικά");
    const plain = window.Unicode.toPlainText(result);
    expect(plain).toBe("Ελληνικά");
  });

  it("handles mixed Latin and Greek: 'The Greek letter π equals pi'", () => {
    const result = window.Unicode.applyStyle("π equals pi", "bold");
    const plain = window.Unicode.toPlainText(result);
    expect(plain).toBe("π equals pi");
  });

  it("styles philosophical terms: λόγος (logos)", () => {
    const result = window.Unicode.applyStyle("λόγος", "italic");
    const plain = window.Unicode.toPlainText(result);
    expect(plain.normalize("NFC")).toBe("λόγος");
  });

  it("styles mathematical terms: Δ (Delta) and Σ (Sigma)", () => {
    const result = window.Unicode.applyStyle("ΔΣ", "bold");
    const plain = window.Unicode.toPlainText(result);
    expect(plain).toBe("ΔΣ");
  });
});

describe("Real World Tweets 🐦", () => {
  it("styles a spicy take", () => {
    const tweet = "Hot take: tabs > spaces";
    const result = window.Unicode.applyStyle(tweet, "bold");
    expect(result).toBe("𝗛𝗼𝘁 𝘁𝗮𝗸𝗲: 𝘁𝗮𝗯𝘀 > 𝘀𝗽𝗮𝗰𝗲𝘀");
  });

  it("preserves emoji in styled text", () => {
    const tweet = "Ship it! 🚀";
    const result = window.Unicode.applyStyle(tweet, "bold");
    expect(result).toContain("🚀");
    expect(result).toContain("𝗦𝗵𝗶𝗽");
  });

  it("handles hashtags", () => {
    const tweet = "#Mojibake";
    const result = window.Unicode.applyStyle(tweet, "bold");
    expect(result).toBe("#𝗠𝗼𝗷𝗶𝗯𝗮𝗸𝗲");
  });

  it("handles mentions", () => {
    const tweet = "@username rocks";
    const result = window.Unicode.applyStyle(tweet, "italic");
    expect(result).toBe("@𝘶𝘴𝘦𝘳𝘯𝘢𝘮𝘦 𝘳𝘰𝘤𝘬𝘴");
  });

  it("styles numbers in tweets", () => {
    const tweet = "2024 is the year";
    const result = window.Unicode.applyStyle(tweet, "bold");
    expect(result).toBe("𝟮𝟬𝟮𝟰 𝗶𝘀 𝘁𝗵𝗲 𝘆𝗲𝗮𝗿");
  });
});

describe("Edge Cases & Stress Tests 🔥", () => {
  it("handles empty strings gracefully", () => {
    expect(window.Unicode.applyStyle("", "bold")).toBe("");
    expect(window.Unicode.toPlainText("")).toBe("");
  });

  it("handles whitespace-only strings", () => {
    const result = window.Unicode.applyStyle("   ", "bold");
    expect(result).toBe("   ");
  });

  it("handles very long strings", () => {
    const long = "Mojibake".repeat(100);
    const result = window.Unicode.applyStyle(long, "bold");
    const plain = window.Unicode.toPlainText(result);
    expect(plain).toBe(long);
  });

  it("handles special characters", () => {
    const special = "Hello! @#$%^&*()_+-=[]{}|;':\",./<>?";
    const result = window.Unicode.applyStyle(special, "bold");
    const plain = window.Unicode.toPlainText(result);
    expect(plain).toBe(special);
  });

  it("handles newlines", () => {
    const multiline = "Line 1\nLine 2\nLine 3";
    const result = window.Unicode.applyStyle(multiline, "bold");
    expect(result).toContain("\n");
    const plain = window.Unicode.toPlainText(result);
    expect(plain).toBe(multiline);
  });

  it("handles tabs", () => {
    const tabbed = "Col1\tCol2\tCol3";
    const result = window.Unicode.applyStyle(tabbed, "bold");
    expect(result).toContain("\t");
  });
});

describe("Combining Styles 🎨", () => {
  it("applies strikethrough to bold text", () => {
    let text = window.Unicode.applyStyle("Deprecated", "bold");
    text = window.Unicode.applyStyle(text, "strikethrough");
    expect(window.Unicode.isStyledWith(text, "bold")).toBe(true);
    expect(window.Unicode.isStyledWith(text, "strikethrough")).toBe(true);
  });

  it("applies underline to italic text", () => {
    let text = window.Unicode.applyStyle("Important", "italic");
    text = window.Unicode.applyStyle(text, "underline");
    expect(window.Unicode.isStyledWith(text, "italic")).toBe(true);
    expect(window.Unicode.isStyledWith(text, "underline")).toBe(true);
  });

  it("applies both strikethrough and underline", () => {
    let text = window.Unicode.applyStyle("Confused", "strikethrough");
    text = window.Unicode.applyStyle(text, "underline");
    expect(window.Unicode.isStyledWith(text, "strikethrough")).toBe(true);
    expect(window.Unicode.isStyledWith(text, "underline")).toBe(true);
    // Can remove all styles
    const plain = window.Unicode.toPlainText(text);
    expect(plain).toBe("Confused");
  });
});

describe("The Mojibake Origin Story 📖", () => {
  it("explains what mojibake means (文字化け = character transformation)", () => {
    // Mojibake is Japanese for garbled text - fitting for a Unicode styling tool!
    // The kanji pass through unchanged since we don't have styled variants
    const result = window.Unicode.applyStyle("文字化け", "bold");
    expect(result).toBe("文字化け"); // CJK characters pass through
  });

  it("styles the English transliteration", () => {
    const result = window.Unicode.applyStyle("mojibake", "script");
    expect(result).toBe("𝓶𝓸𝓳𝓲𝓫𝓪𝓴𝓮");
  });

  it("handles the irony: styling can cause mojibake on unsupported systems", () => {
    const styled = window.Unicode.applyStyle("irony", "fraktur");
    const plain = window.Unicode.toPlainText(styled);
    expect(plain).toBe("irony");
  });
});

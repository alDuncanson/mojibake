/**
 * Singleton AI Service for Chrome's built-in Prompt API.
 * Provides session management, reuse, and optimized inference via append().
 * @namespace AIService
 */
(function() {
  'use strict';

  /** @type {LanguageModel|null} */
  let session = null;

  /** @type {Promise<LanguageModel>|null} */
  let sessionPromise = null;

  /** @type {boolean} */
  let isProcessing = false;

  /** @type {string|null} */
  let pendingText = null;

  /** @type {number|null} */
  let debounceTimer = null;

  const DEBOUNCE_MS = 300;

  const POLISH_SYSTEM_PROMPT = {
    role: 'system',
    content: 'You are a writing assistant. When given text, polish it for grammar, clarity, and style. Keep the same meaning and tone. Output ONLY the polished text with no explanations, preambles, or quotation marks.'
  };

  /**
   * Checks if Chrome's built-in AI Prompt API is available.
   * @returns {Promise<boolean>} True if the API is available and ready
   */
  async function isAvailable() {
    if (!('LanguageModel' in self)) {
      return false;
    }
    try {
      const availability = await LanguageModel.availability();
      return availability === 'available' || availability === 'downloadable' || availability === 'downloading';
    } catch {
      return false;
    }
  }

  /**
   * Gets or creates a reusable session.
   * @returns {Promise<LanguageModel>}
   * @throws {Error} If AI is not available
   */
  async function getSession() {
    if (session) {
      return session;
    }

    if (sessionPromise) {
      return sessionPromise;
    }

    sessionPromise = (async () => {
      const available = await isAvailable();
      if (!available) {
        sessionPromise = null;
        throw new Error('AI not available. Enable chrome://flags/#prompt-api-for-gemini-nano');
      }

      session = await LanguageModel.create({
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        initialPrompts: [POLISH_SYSTEM_PROMPT]
      });

      return session;
    })();

    return sessionPromise;
  }

  /**
   * Destroys the current session and resets state.
   */
  function destroySession() {
    if (session) {
      session.destroy();
      session = null;
    }
    sessionPromise = null;
    pendingText = null;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  /**
   * Appends text to the session for pre-processing (debounced).
   * Call this as the user types to warm up inference.
   * @param {string} text - The text to pre-process
   */
  function appendText(text) {
    pendingText = text;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      if (!pendingText || isProcessing) return;

      try {
        const s = await getSession();
        await s.append([{ role: 'user', content: `Text to polish:\n${pendingText}` }]);
      } catch (err) {
        console.debug('Mojibake: append pre-processing skipped:', err.message);
      }
    }, DEBOUNCE_MS);
  }

  /**
   * Polishes text for grammar, clarity, and style.
   * @param {string} text - The text to polish
   * @returns {Promise<string>} The polished text
   * @throws {Error} If AI is not available or processing fails
   */
  async function polish(text) {
    if (!text?.trim()) {
      throw new Error('No text provided');
    }

    if (isProcessing) {
      throw new Error('Already processing a request');
    }

    isProcessing = true;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    try {
      const s = await getSession();

      const prompt = `Text to polish:\n${text.trim()}`;
      const result = await s.prompt(prompt);

      if (!result?.trim()) {
        throw new Error('Empty response from AI');
      }

      return result.trim();
    } catch (err) {
      destroySession();
      throw err;
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Returns current processing state.
   * @returns {boolean}
   */
  function isBusy() {
    return isProcessing;
  }

  window.AIService = {
    isAvailable,
    polish,
    appendText,
    destroySession,
    isBusy
  };
})();

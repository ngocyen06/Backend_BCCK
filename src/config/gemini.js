// OWNER: Hiếu
const { withTimeout, DEFAULT_TIMEOUT_MS: FALLBACK_TIMEOUT_MS } = require('../utils/withTimeout');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || FALLBACK_TIMEOUT_MS;

// Cache giải thích theo QuestionId (CONTRACT.md:62). Giữ trong RAM, đủ cho một instance.
const explanationCache = new Map();
const MAX_CACHE_ENTRIES = 500;

function getApiKey() {
  return process.env.GEMINI_API_KEY || '';
}

function isEnabled() {
  return Boolean(getApiKey());
}

function getModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

/**
 * Gọi Gemini và trả về text thuần.
 * @param {string} prompt
 * @param {{ timeoutMs?: number, temperature?: number }} [options]
 * @returns {Promise<string|null>} null khi lỗi/timeout/không cấu hình key
 */
async function generateText(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string') return null;
  if (!isEnabled()) {
    console.warn('[gemini] Thiếu GEMINI_API_KEY, bỏ qua lời gọi');
    return null;
  }

  const timeoutMs = options.timeoutMs || TIMEOUT_MS;
  const url = `${API_BASE}/${getModel()}:generateContent?key=${getApiKey()}`;

  const request = fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: 1024,
      },
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();
    return text || null;
  });

  try {
    return await withTimeout(request, timeoutMs, 'Gemini không phản hồi kịp');
  } catch (error) {
    console.warn(`[gemini] ${error.code || 'ERROR'}: ${error.message}`);
    return null;
  }
}

/**
 * Sinh giải thích cho một câu hỏi, có cache theo QuestionId.
 * @param {{ questionId: number|string, content: string, options?: string[], correctAnswer?: string }} input
 * @returns {Promise<string|null>}
 */
async function explainQuestion({ questionId, content, options = [], correctAnswer } = {}) {
  if (questionId === undefined || questionId === null) return null;

  const cacheKey = String(questionId);
  if (explanationCache.has(cacheKey)) return explanationCache.get(cacheKey);

  const lines = [`Câu hỏi: ${content || ''}`];
  if (options.length) lines.push(`Lựa chọn: ${options.join(' | ')}`);
  if (correctAnswer) lines.push(`Đáp án đúng: ${correctAnswer}`);
  lines.push('Hãy giải thích ngắn gọn (tối đa 120 từ) vì sao đáp án đó đúng.');

  const text = await generateText(lines.join('\n'), {});
  if (!text) return null;

  if (explanationCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = explanationCache.keys().next().value;
    explanationCache.delete(oldestKey);
  }
  explanationCache.set(cacheKey, text);
  return text;
}

function clearExplanationCache() {
  explanationCache.clear();
}

module.exports = {
  generateText,
  explainQuestion,
  clearExplanationCache,
  isEnabled,
  getModel,
  DEFAULT_MODEL,
  TIMEOUT_MS,
};

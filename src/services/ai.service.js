// OWNER: Hiếu
// Service giải thích các câu làm sai bằng Gemini (CONTRACT.md mục 9.7).
// Thứ tự tra: cache AiExplanation trong DB -> cache RAM của config/gemini.js -> gọi Gemini.
// KHÔNG BAO GIỜ ném lỗi: Gemini/DB chết chỉ làm thiếu phần giải thích, kết quả
// chấm điểm vẫn phải trả về đủ (CONTRACT.md:62).

const gemini = require('../config/gemini');
const aiExplanationRepository = require('../repositories/aiExplanation.repository');
const { withTimeout } = require('../utils/withTimeout');

// Đọc/ghi cache không được phép kéo dài thời gian chấm bài.
const CACHE_TIMEOUT_MS = Number(process.env.AI_CACHE_TIMEOUT_MS) || 3000;
// Số lời gọi Gemini chạy song song tối đa (free tier dễ bị 429 nếu bắn ào ạt).
const MAX_CONCURRENCY = Number(process.env.AI_MAX_CONCURRENCY) || 3;

function warn(message) {
  console.warn(`[ai.service] ${message}`);
}

/**
 * Chuẩn hoá danh sách lựa chọn về mảng string để đưa vào prompt.
 * Chấp nhận cả mảng string lẫn mảng object { content } / { Content }.
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeOptions(raw) {
  if (!Array.isArray(raw)) return [];

  const result = [];
  for (const item of raw) {
    if (item === null || item === undefined) continue;
    if (typeof item === 'string') {
      if (item.trim()) result.push(item.trim());
      continue;
    }
    if (typeof item === 'object') {
      const text = item.content ?? item.Content ?? item.text ?? item.Text ?? item.label ?? item.Label;
      if (typeof text === 'string' && text.trim()) result.push(text.trim());
      continue;
    }
    result.push(String(item));
  }
  return result;
}

/**
 * Chuẩn hoá input: bỏ phần tử rỗng, bỏ câu trùng QuestionId, nhận cả camelCase
 * lẫn PascalCase (repository có thể trả thẳng cột DB).
 * @param {unknown} wrongQuestions
 * @returns {{ questionId: number|string, content: string, options: string[], correctAnswer: string|null }[]}
 */
function normalizeQuestions(wrongQuestions) {
  if (!Array.isArray(wrongQuestions)) return [];

  const seen = new Set();
  const result = [];
  for (const item of wrongQuestions) {
    if (!item || typeof item !== 'object') continue;

    const questionId = item.questionId ?? item.QuestionId ?? item.id ?? item.Id;
    if (questionId === undefined || questionId === null) continue;

    const key = String(questionId);
    if (seen.has(key)) continue;
    seen.add(key);

    const content = item.content ?? item.Content ?? '';
    const correctAnswer = item.correctAnswer ?? item.CorrectAnswer ?? null;

    result.push({
      questionId,
      content: typeof content === 'string' ? content : String(content),
      options: normalizeOptions(item.options ?? item.Options),
      correctAnswer:
        correctAnswer === null || correctAnswer === undefined ? null : String(correctAnswer),
    });
  }
  return result;
}

/**
 * Đọc cache AiExplanation theo lô. Lỗi/timeout -> coi như không có cache.
 * @param {{ questionId: number|string }[]} questions
 * @returns {Promise<Map<string, string>>} key = String(questionId)
 */
async function readFromDatabase(questions) {
  const cached = new Map();
  if (questions.length === 0) return cached;

  try {
    const ids = questions.map((question) => question.questionId);
    const rows = await withTimeout(
      aiExplanationRepository.findByQuestionIds(ids),
      CACHE_TIMEOUT_MS,
      'Đọc cache AiExplanation quá lâu',
    );
    if (!Array.isArray(rows)) return cached;

    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const id = row.questionId ?? row.QuestionId;
      const content = row.content ?? row.Content;
      if (id === undefined || id === null) continue;
      if (typeof content !== 'string' || !content.trim()) continue;
      cached.set(String(id), content.trim());
    }
  } catch (error) {
    warn(`đọc cache thất bại: ${error.code || 'ERROR'} ${error.message}`);
  }
  return cached;
}

/**
 * Ghi cache. Lỗi/timeout -> bỏ qua, không ảnh hưởng kết quả trả về.
 * @param {{ questionId: number|string, content: string }[]} entries
 */
async function writeToDatabase(entries) {
  if (entries.length === 0) return;

  try {
    await withTimeout(
      aiExplanationRepository.upsertMany(entries),
      CACHE_TIMEOUT_MS,
      'Ghi cache AiExplanation quá lâu',
    );
  } catch (error) {
    warn(`ghi cache thất bại: ${error.code || 'ERROR'} ${error.message}`);
  }
}

/**
 * Sinh giải thích cho một câu. Gemini đã tự bọc timeout và trả null khi lỗi,
 * ở đây vẫn bọc thêm một lớp để chắc chắn không có lỗi nào lọt ra ngoài.
 * @param {{ questionId: number|string, content: string, options: string[], correctAnswer: string|null }} question
 * @returns {Promise<string|null>}
 */
async function explainOne(question) {
  try {
    const text = await gemini.explainQuestion({
      questionId: question.questionId,
      content: question.content,
      options: question.options,
      correctAnswer: question.correctAnswer,
    });
    if (typeof text !== 'string') return null;
    const trimmed = text.trim();
    return trimmed || null;
  } catch (error) {
    warn(`Gemini lỗi ở câu ${question.questionId}: ${error.message}`);
    return null;
  }
}

/**
 * Chạy theo lô nhỏ để không dồn hết request Gemini cùng lúc.
 * @param {{ questionId: number|string }[]} questions
 * @returns {Promise<Map<string, string>>} key = String(questionId)
 */
async function explainAll(questions) {
  const results = new Map();

  for (let index = 0; index < questions.length; index += MAX_CONCURRENCY) {
    const chunk = questions.slice(index, index + MAX_CONCURRENCY);
    const texts = await Promise.all(chunk.map((question) => explainOne(question)));

    chunk.forEach((question, position) => {
      const text = texts[position];
      if (text) results.set(String(question.questionId), text);
    });
  }
  return results;
}

/**
 * Giải thích các câu sinh viên làm sai. Không bao giờ ném lỗi.
 * @param {{ questionId?: number|string, QuestionId?: number|string, content?: string,
 *           Content?: string, options?: unknown, Options?: unknown,
 *           correctAnswer?: string, CorrectAnswer?: string }[]} wrongQuestions
 * @returns {Promise<Map<number|string, string>>} key = QuestionId gốc, value = lời giải
 */
async function explainWrongQuestions(wrongQuestions) {
  const result = new Map();

  try {
    const questions = normalizeQuestions(wrongQuestions);
    if (questions.length === 0) return result;

    const cached = await readFromDatabase(questions);

    const missing = [];
    for (const question of questions) {
      const hit = cached.get(String(question.questionId));
      if (hit) result.set(question.questionId, hit);
      else missing.push(question);
    }
    if (missing.length === 0) return result;

    const generated = await explainAll(missing);
    const toPersist = [];
    for (const question of missing) {
      const text = generated.get(String(question.questionId));
      if (!text) continue;
      result.set(question.questionId, text);
      toPersist.push({ questionId: question.questionId, content: text });
    }

    await writeToDatabase(toPersist);
    return result;
  } catch (error) {
    warn(`bỏ qua phần giải thích AI: ${error.code || 'ERROR'} ${error.message}`);
    return result;
  }
}

module.exports = { explainWrongQuestions };

// OWNER: Hiếu
// Repository cache lời giải AI: chỉ SQL, không quyết định nghiệp vụ (CONTRACT.md:19).
// Mọi tham số dùng .input(), cấm nối chuỗi SQL (CONTRACT.md:10).

const { getPool } = require('../config/db');

/**
 * Lấy các lời giải đã cache theo danh sách QuestionId.
 * @param {(number|string)[]} questionIds
 * @returns {Promise<{ questionId: number|string, content: string }[]>}
 */
async function findByQuestionIds(questionIds) {
  if (!Array.isArray(questionIds) || questionIds.length === 0) return [];

  const pool = await getPool();
  const request = pool.request();

  // Chỉ ghép tên tham số, giá trị vẫn đi qua .input().
  const placeholders = questionIds.map((id, index) => {
    const name = `questionId${index}`;
    request.input(name, id);
    return `@${name}`;
  });

  const result = await request.query(`
    SELECT QuestionId, Content
    FROM AiExplanation
    WHERE QuestionId IN (${placeholders.join(', ')})
  `);

  return (result.recordset || [])
    .filter((row) => row && row.QuestionId !== null && row.QuestionId !== undefined)
    .map((row) => ({
      questionId: row.QuestionId,
      content: row.Content === null || row.Content === undefined ? '' : String(row.Content),
    }));
}

/**
 * Ghi/ghi đè lời giải vào cache. Bỏ qua phần tử không hợp lệ.
 * @param {{ questionId: number|string, content: string }[]} entries
 * @returns {Promise<number>} số dòng bị ảnh hưởng
 */
async function upsertMany(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return 0;

  const pool = await getPool();
  let affected = 0;

  for (const entry of entries) {
    if (!entry || entry.questionId === undefined || entry.questionId === null) continue;
    const content = typeof entry.content === 'string' ? entry.content.trim() : '';
    if (!content) continue;

    const result = await pool
      .request()
      .input('QuestionId', entry.questionId)
      .input('Content', content)
      .query(`
        MERGE AiExplanation AS target
        USING (SELECT @QuestionId AS QuestionId) AS source
          ON target.QuestionId = source.QuestionId
        WHEN MATCHED THEN
          UPDATE SET Content = @Content
        WHEN NOT MATCHED THEN
          INSERT (QuestionId, Content, CreatedAt)
          VALUES (@QuestionId, @Content, SYSUTCDATETIME());
      `);

    if (Array.isArray(result.rowsAffected)) {
      affected += result.rowsAffected.reduce((sum, value) => sum + value, 0);
    }
  }

  return affected;
}

module.exports = { findByQuestionIds, upsertMany };


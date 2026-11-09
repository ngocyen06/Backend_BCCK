// OWNER: Hiếu
// Repository bảng Subject: chỉ SQL, không quyết định nghiệp vụ (CONTRACT.md:19).
// Mọi tham số dùng .input(), cấm nối chuỗi SQL (CONTRACT.md:10).
// Chuyển PascalCase của DB sang camelCase trước khi trả lên service (CONTRACT.md:8).

const { getPool } = require('../config/db');

function mapSubject(row) {
  if (!row) return null;
  return {
    id: row.Id,
    code: row.Code,
    name: row.Name,
    description: row.Description === undefined ? null : row.Description,
  };
}

/**
 * @param {{ page: number, pageSize: number, keyword?: string }} query
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function findAll(query) {
  const pool = await getPool();
  const offset = (query.page - 1) * query.pageSize;

  const request = pool.request();
  request.input('offset', offset);
  request.input('pageSize', query.pageSize);
  request.input('keyword', query.keyword || null);

  const result = await request.query(`
    SELECT Id, Code, Name, Description,
           COUNT(*) OVER() AS Total
    FROM Subject
    WHERE (@keyword IS NULL OR Code LIKE '%' + @keyword + '%' OR Name LIKE '%' + @keyword + '%')
    ORDER BY Id
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  const rows = result.recordset || [];
  return {
    items: rows.map(mapSubject),
    total: rows.length ? rows[0].Total : 0,
  };
}

async function findById(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', id)
    .query('SELECT Id, Code, Name, Description FROM Subject WHERE Id = @id');
  return mapSubject(result.recordset && result.recordset[0]);
}

/**
 * Tìm các môn trùng Code hoặc Name, bỏ qua chính bản ghi đang cập nhật.
 * @param {{ code?: string, name?: string, excludeId?: number }} params
 * @returns {Promise<object[]>}
 */
async function findDuplicates({ code, name, excludeId }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('code', code || null)
    .input('name', name || null)
    .input('excludeId', excludeId || null)
    .query(`
      SELECT Id, Code, Name
      FROM Subject
      WHERE (@excludeId IS NULL OR Id <> @excludeId)
        AND ((@code IS NOT NULL AND Code = @code) OR (@name IS NOT NULL AND Name = @name))
    `);
  return result.recordset || [];
}

async function create({ code, name, description }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('code', code)
    .input('name', name)
    .input('description', description ?? null)
    .query(`
      INSERT INTO Subject (Code, Name, Description)
      OUTPUT INSERTED.Id, INSERTED.Code, INSERTED.Name, INSERTED.Description
      VALUES (@code, @name, @description)
    `);
  return mapSubject(result.recordset && result.recordset[0]);
}

async function update(id, { code, name, description }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', id)
    .input('code', code ?? null)
    .input('name', name ?? null)
    .input('description', description === undefined ? null : description)
    .query(`
      UPDATE Subject
      SET Code = COALESCE(@code, Code),
          Name = COALESCE(@name, Name),
          Description = CASE WHEN @description IS NULL THEN Description ELSE @description END
      OUTPUT INSERTED.Id, INSERTED.Code, INSERTED.Name, INSERTED.Description
      WHERE Id = @id
    `);
  return mapSubject(result.recordset && result.recordset[0]);
}

/**
 * Đếm số câu hỏi và bộ đề đang dùng môn này để chặn xoá.
 * @param {number} id
 * @returns {Promise<{ questionCount: number, examSetCount: number }>}
 */
async function countUsages(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', id)
    .query(`
      SELECT
        (SELECT COUNT(*) FROM Question WHERE SubjectId = @id) AS QuestionCount,
        (SELECT COUNT(*) FROM ExamSet WHERE SubjectId = @id) AS ExamSetCount
    `);
  const row = result.recordset && result.recordset[0];
  return {
    questionCount: row ? row.QuestionCount : 0,
    examSetCount: row ? row.ExamSetCount : 0,
  };
}

async function remove(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', id)
    .query('DELETE FROM Subject WHERE Id = @id');
  return result.rowsAffected && result.rowsAffected[0] > 0;
}

module.exports = {
  findAll,
  findById,
  findDuplicates,
  create,
  update,
  countUsages,
  remove,
};

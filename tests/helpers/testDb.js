// OWNER: Hiếu
// Helper DB dùng chung cho các file test (tests/**/*.test.js).
// Không tự mở pool riêng: tái dùng getPool()/closePool() của src/config/db.js
// để toàn bộ test dùng chung một pool, tránh mở nhiều kết nối tới SQL Server.
// Mọi tham số dùng .input(), cấm nối chuỗi SQL (CONTRACT.md:10).

const { sql, getPool, closePool } = require('../../src/config/db');

// Danh sách bảng có thể reset giữa các test, xếp theo thứ tự con -> cha để
// xoá không vướng khoá ngoại. Chỉ dùng cho môi trường test.
const RESET_ORDER = [
  'AiExplanation',
  'Attempts',
  'Question',
  'ExamSet',
  'Subject',
  'Users',
];

/**
 * Lấy pool đã kết nối (dùng lại pool của ứng dụng).
 * @returns {Promise<import('mssql').ConnectionPool>}
 */
function pool() {
  return getPool();
}

/**
 * Chạy một câu SQL thô với tham số an toàn qua .input().
 *
 * @param {string} text Câu SQL, dùng @tenThamSo cho giá trị
 * @param {Record<string, { type?: any, value: any } | any>} [params]
 *        Map tên tham số -> giá trị, hoặc { value, type } nếu cần ép kiểu
 * @returns {Promise<import('mssql').IResult<any>>}
 *
 * @example
 *   await exec('SELECT * FROM Users WHERE Id = @id', { id: 1 });
 *   await exec('SELECT @x AS X', { x: { value: '1', type: sql.Int } });
 */
async function exec(text, params = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TypeError('exec: câu SQL không được rỗng');
  }
  const p = await pool();
  const request = p.request();
  for (const [name, raw] of Object.entries(params || {})) {
    if (raw && typeof raw === 'object' && 'value' in raw) {
      request.input(name, raw.type || undefined, raw.value);
    } else {
      request.input(name, raw);
    }
  }
  return request.query(text);
}

/**
 * Chạy stored procedure. Tên tham số phải khớp tham số SP.
 *
 * @param {string} name Tên SP (không kèm dbo.)
 * @param {Record<string, any>} [params]
 * @returns {Promise<import('mssql').IResult<any>>}
 */
async function execSP(name, params = {}) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError('execSP: tên stored procedure không được rỗng');
  }
  const p = await pool();
  const request = p.request();
  for (const [key, value] of Object.entries(params || {})) {
    request.input(key, value);
  }
  return request.execute(name);
}

/**
 * Xoá toàn bộ dữ liệu trong các bảng test (giữ schema).
 * Mặc định xoá theo RESET_ORDER; có thể truyền danh sách riêng.
 *
 * @param {string[]} [tables]
 * @returns {Promise<void>}
 */
async function resetTables(tables = RESET_ORDER) {
  const p = await pool();
  for (const table of tables) {
    // Tên bảng là hằng nội bộ, không đến từ input người dùng.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
      throw new Error(`resetTables: tên bảng không hợp lệ: ${table}`);
    }
    await p.request().query(`DELETE FROM [${table}]`);
  }
}

/**
 * Chèn nhanh nhiều dòng vào một bảng, mỗi dòng là một object cột -> giá trị.
 *
 * @param {string} table
 * @param {Record<string, any>[]} rows
 * @returns {Promise<number>} số dòng đã chèn
 */
async function insertRows(table, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    throw new Error(`insertRows: tên bảng không hợp lệ: ${table}`);
  }
  const p = await pool();
  let count = 0;
  for (const row of rows) {
    const cols = Object.keys(row);
    if (cols.length === 0) continue;
    const request = p.request();
    const placeholders = cols.map((col, index) => {
      const name = `c${index}`;
      request.input(name, row[col]);
      return `@${name}`;
    });
    const columnList = cols.map((col) => `[${col}]`).join(', ');
    await request.query(
      `INSERT INTO [${table}] (${columnList}) VALUES (${placeholders.join(', ')})`
    );
    count += 1;
  }
  return count;
}

/**
 * Kiểm tra kết nối DB còn sống — dùng ở beforeAll của test.
 * @returns {Promise<boolean>}
 */
async function healthCheck() {
  const p = await pool();
  const result = await p.request().query('SELECT 1 AS ok');
  const row = result.recordset && result.recordset[0];
  return Boolean(row && row.ok === 1);
}

module.exports = {
  sql,
  pool,
  exec,
  execSP,
  resetTables,
  insertRows,
  healthCheck,
  closePool,
  RESET_ORDER,
};

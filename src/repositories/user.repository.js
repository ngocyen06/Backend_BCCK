// OWNER: Yến
// Repository Users: chỉ SQL, không quyết định nghiệp vụ (CONTRACT.md:19).
// Mọi tham số dùng .input(), cấm nối chuỗi SQL (CONTRACT.md:10).

const { sql, getPool } = require('../config/db');

/**
 * Chuyển một dòng Users sang camelCase (CONTRACT.md:8).
 * @param {any} row
 */
function mapUser(row) {
  if (!row) return null;
  return {
    id: row.Id,
    username: row.Username,
    passwordHash: row.PasswordHash,
    fullName: row.FullName,
    email: row.Email,
    role: row.Role,
    isActive: Boolean(row.IsActive),
    createdAt: row.CreatedAt,
  };
}

/**
 * Tìm người dùng theo Id.
 * @param {number} id
 * @returns {Promise<ReturnType<typeof mapUser> | null>}
 */
async function findById(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, id)
    .query('SELECT Id, Username, PasswordHash, FullName, Email, Role, IsActive, CreatedAt FROM dbo.Users WHERE Id = @Id');
  const row = (result.recordset || [])[0];
  return mapUser(row);
}

/**
 * Tìm người dùng theo Username (collation CI nên không phân biệt hoa/thường).
 * @param {string} username
 */
async function findByUsername(username) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Username', sql.NVarChar(50), username)
    .query('SELECT Id, Username, PasswordHash, FullName, Email, Role, IsActive, CreatedAt FROM dbo.Users WHERE Username = @Username');
  const row = (result.recordset || [])[0];
  return mapUser(row);
}

/**
 * Tìm người dùng theo Email.
 * @param {string} email
 */
async function findByEmail(email) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Email', sql.NVarChar(150), email)
    .query('SELECT Id, Username, PasswordHash, FullName, Email, Role, IsActive, CreatedAt FROM dbo.Users WHERE Email = @Email');
  const row = (result.recordset || [])[0];
  return mapUser(row);
}

/**
 * Tạo người dùng mới, trả về bản ghi vừa tạo.
 * @param {{ username: string, passwordHash: string, fullName: string, email: string, role: string }} data
 */
async function createUser(data) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Username', sql.NVarChar(50), data.username)
    .input('PasswordHash', sql.NVarChar(255), data.passwordHash)
    .input('FullName', sql.NVarChar(100), data.fullName)
    .input('Email', sql.NVarChar(150), data.email)
    .input('Role', sql.NVarChar(20), data.role)
    .query(`
      INSERT INTO dbo.Users (Username, PasswordHash, FullName, Email, Role)
      OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.PasswordHash, INSERTED.FullName,
             INSERTED.Email, INSERTED.Role, INSERTED.IsActive, INSERTED.CreatedAt
      VALUES (@Username, @PasswordHash, @FullName, @Email, @Role);
    `);
  const row = (result.recordset || [])[0];
  return mapUser(row);
}

module.exports = { findById, findByUsername, findByEmail, createUser };

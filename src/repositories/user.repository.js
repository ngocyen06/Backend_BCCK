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

/**
 * Tìm các user trùng Username hoặc Email (dùng khi Admin tạo user).
 * @param {string} username
 * @param {string} email
 * @returns {Promise<object[]>}
 */
async function findByUsernameOrEmail(username, email) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Username', sql.NVarChar(50), username || null)
    .input('Email', sql.NVarChar(150), email || null)
    .query(`
      SELECT Id, Username, Email
      FROM dbo.Users
      WHERE (@Username IS NOT NULL AND Username = @Username)
         OR (@Email IS NOT NULL AND Email = @Email)
    `);
  return result.recordset || [];
}

/**
 * Danh sách user có lọc + phân trang.
 * @param {{ page: number, pageSize: number, role?: string, isActive?: boolean, keyword?: string }} query
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function findAll(query) {
  const pool = await getPool();
  const offset = (query.page - 1) * query.pageSize;

  const request = pool.request();
  request.input('offset', sql.Int, offset);
  request.input('pageSize', sql.Int, query.pageSize);
  request.input('role', sql.NVarChar(20), query.role || null);
  request.input(
    'isActive',
    sql.Bit,
    typeof query.isActive === 'boolean' ? query.isActive : null,
  );
  request.input('keyword', sql.NVarChar(150), query.keyword || null);

  const result = await request.query(`
    SELECT Id, Username, PasswordHash, FullName, Email, Role, IsActive, CreatedAt,
           COUNT(*) OVER() AS Total
    FROM dbo.Users
    WHERE (@role IS NULL OR Role = @role)
      AND (@isActive IS NULL OR IsActive = @isActive)
      AND (@keyword IS NULL
           OR Username LIKE '%' + @keyword + '%'
           OR FullName LIKE '%' + @keyword + '%'
           OR Email LIKE '%' + @keyword + '%')
    ORDER BY Id
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  const rows = result.recordset || [];
  return {
    items: rows.map(mapUser),
    total: rows.length ? rows[0].Total : 0,
  };
}

/**
 * Cập nhật thông tin cơ bản của user (không đổi Role/IsActive ở đây).
 * @param {number} id
 * @param {{ username?: string, passwordHash?: string, fullName?: string, email?: string }} data
 */
async function update(id, data) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, id)
    .input('Username', sql.NVarChar(50), data.username ?? null)
    .input('PasswordHash', sql.NVarChar(255), data.passwordHash ?? null)
    .input('FullName', sql.NVarChar(100), data.fullName ?? null)
    .input('Email', sql.NVarChar(150), data.email ?? null)
    .query(`
      UPDATE dbo.Users
      SET Username = COALESCE(@Username, Username),
          PasswordHash = COALESCE(@PasswordHash, PasswordHash),
          FullName = COALESCE(@FullName, FullName),
          Email = COALESCE(@Email, Email)
      OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.PasswordHash, INSERTED.FullName,
             INSERTED.Email, INSERTED.Role, INSERTED.IsActive, INSERTED.CreatedAt
      WHERE Id = @Id
    `);
  const row = (result.recordset || [])[0];
  return mapUser(row);
}

/**
 * Đổi role của user.
 * @param {number} id
 * @param {string} role
 */
async function updateRole(id, role) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, id)
    .input('Role', sql.NVarChar(20), role)
    .query(`
      UPDATE dbo.Users
      SET Role = @Role
      OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.PasswordHash, INSERTED.FullName,
             INSERTED.Email, INSERTED.Role, INSERTED.IsActive, INSERTED.CreatedAt
      WHERE Id = @Id
    `);
  const row = (result.recordset || [])[0];
  return mapUser(row);
}

/**
 * Khoá / mở khoá tài khoản.
 * @param {number} id
 * @param {boolean} isActive
 */
async function updateStatus(id, isActive) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, id)
    .input('IsActive', sql.Bit, Boolean(isActive))
    .query(`
      UPDATE dbo.Users
      SET IsActive = @IsActive
      OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.PasswordHash, INSERTED.FullName,
             INSERTED.Email, INSERTED.Role, INSERTED.IsActive, INSERTED.CreatedAt
      WHERE Id = @Id
    `);
  const row = (result.recordset || [])[0];
  return mapUser(row);
}

/**
 * Xoá user.
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function remove(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, id)
    .query('DELETE FROM dbo.Users WHERE Id = @Id');
  return Boolean(result.rowsAffected && result.rowsAffected[0] > 0);
}

module.exports = {
  findById,
  findByUsername,
  findByEmail,
  findByUsernameOrEmail,
  findAll,
  createUser,
  update,
  updateRole,
  updateStatus,
  remove,
};

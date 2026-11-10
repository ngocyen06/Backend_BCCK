// OWNER: Yến
// Băm và kiểm tra mật khẩu bằng bcryptjs. KHÔNG lưu mật khẩu gốc (01_create_tables.sql:49).

const bcrypt = require('bcryptjs');
const env = require('../config/env');

/**
 * Băm mật khẩu.
 * @param {string} plain
 * @returns {Promise<string>}
 */
async function hashPassword(plain) {
  if (typeof plain !== 'string' || !plain) {
    throw new Error('hashPassword: mật khẩu không hợp lệ');
  }
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

/**
 * So khớp mật khẩu với hash. Sai định dạng thì trả false, không ném lỗi.
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(plain, hash) {
  if (typeof plain !== 'string' || !plain) return false;
  if (typeof hash !== 'string' || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch (error) {
    return false;
  }
}

module.exports = { hashPassword, comparePassword };

// OWNER: Hiếu
// Service quản lý user: quy tắc nghiệp vụ, ném lỗi có statusCode + code.
// KHÔNG dùng req/res, KHÔNG viết SQL (CONTRACT.md:18).

const bcrypt = require('bcryptjs');

const userRepository = require('../repositories/user.repository');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

function appError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function notFound() {
  return appError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
}

async function ensureExists(id) {
  const user = await userRepository.findById(id);
  if (!user) throw notFound();
  return user;
}

/**
 * @param {{ page: number, pageSize: number, role?: string, isActive?: boolean, keyword?: string }} query
 */
async function listUsers(query) {
  const { items, total } = await userRepository.findAll(query);
  return { items, page: query.page, pageSize: query.pageSize, total };
}

async function getUserById(id) {
  return ensureExists(id);
}

async function createUser({ username, password, fullName, email, role }) {
  const existing = await userRepository.findByUsernameOrEmail(username, email);
  if (existing.some((row) => row.Username === username)) {
    throw appError(409, 'USERNAME_EXISTS', 'Username đã tồn tại');
  }
  if (existing.some((row) => row.Email === email)) {
    throw appError(409, 'EMAIL_EXISTS', 'Email đã tồn tại');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  return userRepository.create({ username, passwordHash, fullName, email, role });
}

async function updateUser(id, data) {
  await ensureExists(id);
  return userRepository.update(id, data);
}

async function updateUserRole(id, role) {
  await ensureExists(id);
  return userRepository.updateRole(id, role);
}

async function updateUserStatus(id, isActive) {
  await ensureExists(id);
  return userRepository.updateStatus(id, isActive);
}

async function deleteUser(id) {
  const removed = await userRepository.remove(id);
  if (!removed) throw notFound();
  return null;
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};

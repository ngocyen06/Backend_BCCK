// OWNER: Hiếu
// Service quản lý user: quy tắc nghiệp vụ, ném AppError (CONTRACT.md:18).
// KHÔNG dùng req/res, KHÔNG viết SQL.

const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const { hashPassword } = require('../utils/password');

function notFound() {
  return new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
}

// Không bao giờ trả passwordHash ra ngoài.
function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
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
  return {
    items: items.map(toPublicUser),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

async function getUserById(id) {
  return toPublicUser(await ensureExists(id));
}

async function createUser({ username, password, fullName, email, role }) {
  const existing = await userRepository.findByUsernameOrEmail(username, email);
  if (existing.some((row) => row.Username === username)) {
    throw new AppError(409, 'USERNAME_EXISTS', 'Username đã tồn tại');
  }
  if (existing.some((row) => row.Email === email)) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Email đã tồn tại');
  }

  const passwordHash = await hashPassword(password);
  const created = await userRepository.createUser({
    username,
    passwordHash,
    fullName,
    email,
    role,
  });
  return toPublicUser(created);
}

async function updateUser(id, data) {
  await ensureExists(id);

  const { password, ...rest } = data;
  const patch = { ...rest };
  if (password) patch.passwordHash = await hashPassword(password);

  return toPublicUser(await userRepository.update(id, patch));
}

async function updateUserRole(id, role) {
  await ensureExists(id);
  return toPublicUser(await userRepository.updateRole(id, role));
}

async function updateUserStatus(id, isActive) {
  await ensureExists(id);
  return toPublicUser(await userRepository.updateStatus(id, isActive));
}

async function deleteUser(id) {
  await ensureExists(id);
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

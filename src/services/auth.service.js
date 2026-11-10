// OWNER: Yến
// Nghiệp vụ xác thực: đăng ký (luôn Student) và đăng nhập (CONTRACT.md:43).
// Không dùng req/res, lỗi ném AppError (CONTRACT.md:18).

const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { ROLES } = require('../constants/roles');
const { ERROR_CODES } = require('../constants/errorCodes');

/**
 * Tạo người dùng mới. KHÔNG nhận role từ client (CONTRACT.md:43).
 * @param {{ username: string, email: string, password: string, fullName: string }} data
 */
async function register(data) {
  const username = String(data.username).trim();
  const email = String(data.email).trim();

  const existingUsername = await userRepository.findByUsername(username);
  if (existingUsername) {
    throw AppError.conflict('Username đã tồn tại', ERROR_CODES.USERNAME_TAKEN);
  }
  const existingEmail = await userRepository.findByEmail(email);
  if (existingEmail) {
    throw AppError.conflict('Email đã tồn tại', ERROR_CODES.EMAIL_TAKEN);
  }

  const passwordHash = await hashPassword(data.password);
  const user = await userRepository.createUser({
    username,
    passwordHash,
    fullName: String(data.fullName).trim(),
    email,
    role: ROLES.STUDENT,
  });

  return toPublicUser(user);
}

/**
 * Đăng nhập bằng username + password, trả token và thông tin công khai.
 * @param {{ username: string, password: string }} data
 */
async function login(data) {
  const user = await userRepository.findByUsername(String(data.username).trim());
  if (!user) {
    throw AppError.unauthorized('Sai tên đăng nhập hoặc mật khẩu', ERROR_CODES.INVALID_CREDENTIALS);
  }

  const ok = await comparePassword(data.password, user.passwordHash);
  if (!ok) {
    throw AppError.unauthorized('Sai tên đăng nhập hoặc mật khẩu', ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!user.isActive) {
    throw AppError.forbidden('Tài khoản đã bị khoá', ERROR_CODES.ACCOUNT_INACTIVE);
  }

  const token = signToken({ id: user.id, role: user.role });
  return { token, user: toPublicUser(user) };
}

/**
 * Lấy thông tin người dùng đang đăng nhập.
 * @param {number} id
 */
async function getProfile(id) {
  const user = await userRepository.findById(id);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng');
  return toPublicUser(user);
}

/**
 * Bỏ passwordHash trước khi trả ra ngoài.
 * @param {any} user
 */
function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

module.exports = { register, login, getProfile };

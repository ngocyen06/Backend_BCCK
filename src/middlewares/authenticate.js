// OWNER: Yến
// Xác thực: kiểm tra Bearer token, đọc lại IsActive từ DB, gán req.user (CONTRACT.md:39).

const jwtUtil = require('../utils/jwt');
const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../constants/errorCodes');
const userRepository = require('../repositories/user.repository');

async function authenticate(req, res, next) {
  try {
    const token = jwtUtil.extractBearerToken(req.headers.authorization);
    if (!token) {
      throw AppError.unauthorized('Thiếu hoặc sai header Authorization', ERROR_CODES.UNAUTHORIZED);
    }

    const payload = jwtUtil.verifyToken(token);
    if (!payload) {
      throw AppError.unauthorized('Token không hợp lệ hoặc đã hết hạn', ERROR_CODES.UNAUTHORIZED);
    }

    const user = await userRepository.findById(payload.id);
    if (!user) {
      throw AppError.unauthorized('Tài khoản không tồn tại', ERROR_CODES.UNAUTHORIZED);
    }
    if (!user.isActive) {
      throw AppError.forbidden('Tài khoản đã bị khoá', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}

exports.authenticate = authenticate;
module.exports = authenticate;
module.exports.authenticate = authenticate;

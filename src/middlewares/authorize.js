// OWNER: Yến
// Phân quyền theo role. Dùng sau authenticate; sai role -> 403 FORBIDDEN (CONTRACT.md:40).

const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../constants/errorCodes');

/**
 * @param {...string} roles danh sách role được phép
 * @returns {(req: any, res: any, next: any) => void}
 */
function authorize(...roles) {
  const allowed = new Set(roles.flat().filter(Boolean));
  return function authorizeMiddleware(req, res, next) {
    if (!req.user || !req.user.role) {
      return next(AppError.unauthorized());
    }
    if (allowed.size > 0 && !allowed.has(req.user.role)) {
      return next(
        AppError.forbidden('Bạn không có quyền thực hiện thao tác này', ERROR_CODES.FORBIDDEN),
      );
    }
    return next();
  };
}

exports.authorize = authorize;
module.exports = authorize;
module.exports.authorize = authorize;

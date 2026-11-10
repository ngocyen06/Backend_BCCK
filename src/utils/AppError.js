// OWNER: Yến
// Lỗi nghiệp vụ có status + code, ném ở service và được errorHandler dịch
// thành body { code, message } (CONTRACT.md:18, 26).

class AppError extends Error {
  /**
   * @param {number} statusCode HTTP status
   * @param {string} code mã lỗi trong body
   * @param {string} message thông điệp cho người dùng
   * @param {{ path: (string|number)[], message: string }[]} [details] chi tiết (thường là lỗi zod)
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = Number(statusCode) || 500;
    this.code = code || 'INTERNAL';
    if (Array.isArray(details) && details.length > 0) this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  /**
   * Lỗi 400 VALIDATION_ERROR kèm details.
   * @param {{ path: (string|number)[], message: string }[]} details
   * @param {string} [message]
   * @returns {AppError}
   */
  static validation(...args) {
    const details = args[0];
    const message = args.length > 1 && args[1] ? args[1] : 'Dữ liệu không hợp lệ';
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  /**
   * Lỗi 401.
   * @param {string} message
   * @param {string} [code]
   * @returns {AppError}
   */
  static unauthorized(...args) {
    const message = args.length > 0 && args[0] ? args[0] : 'Chưa xác thực';
    const code = args.length > 1 && args[1] ? args[1] : 'UNAUTHORIZED';
    return new AppError(401, code, message);
  }

  /**
   * Lỗi 403.
   * @param {string} message
   * @param {string} [code]
   * @returns {AppError}
   */
  static forbidden(...args) {
    const message = args.length > 0 && args[0] ? args[0] : 'Không có quyền';
    const code = args.length > 1 && args[1] ? args[1] : 'FORBIDDEN';
    return new AppError(403, code, message);
  }

  /**
   * Lỗi 404.
   * @param {string} message
   * @param {string} [code]
   * @returns {AppError}
   */
  static notFound(...args) {
    const message = args.length > 0 && args[0] ? args[0] : 'Không tìm thấy';
    const code = args.length > 1 && args[1] ? args[1] : 'NOT_FOUND';
    return new AppError(404, code, message);
  }

  /**
   * Lỗi 409.
   * @param {string} message
   * @param {string} [code]
   * @returns {AppError}
   */
  static conflict(...args) {
    const message = args.length > 0 && args[0] ? args[0] : 'Xung đột dữ liệu';
    const code = args.length > 1 && args[1] ? args[1] : 'CONFLICT';
    return new AppError(409, code, message);
  }
}

module.exports = AppError;

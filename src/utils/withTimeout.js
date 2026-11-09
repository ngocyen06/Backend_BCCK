// OWNER: Hiếu
// Bọc một Promise với giới hạn thời gian — dùng cho lời gọi Gemini để một API
// chậm/treo không kéo sập việc chấm điểm (CONTRACT.md, quy tắc nghiệp vụ 8).

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Tạo lỗi quá hạn.
 * Khi Yến đã có src/utils/AppError.js, đổi hàm này thành:
 *   return new AppError(504, 'TIMEOUT', message);
 * để errorHandler xử lý thống nhất với phần còn lại (CONTRACT.md:27).
 */
function createTimeoutError(message) {
  const error = new Error(message);
  error.statusCode = 504;
  error.code = 'TIMEOUT';
  return error;
}

/**
 * Chạy `promise` nhưng huỷ chờ sau `timeoutMs` mili giây.
 *
 * @param {Promise<unknown>} promise Promise cần giới hạn thời gian
 * @param {number} [timeoutMs] Số mili giây tối đa, mặc định 15000
 * @param {string} [message] Thông báo khi quá hạn
 * @returns {Promise<unknown>} Kết quả của promise, hoặc ném lỗi 504 TIMEOUT
 */
function withTimeout(promise, timeoutMs = DEFAULT_TIMEOUT_MS, message = 'Dịch vụ ngoài không phản hồi kịp') {
  if (!promise || typeof promise.then !== 'function') {
    throw new TypeError('withTimeout: tham số thứ nhất phải là Promise');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('withTimeout: timeoutMs phải là số nguyên dương');
  }

  let timer;
  const timeoutPromise = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(createTimeoutError(message));
    }, timeoutMs);
  });

  // Promise.race đã gắn handler cho cả hai nhánh nên không sinh unhandled rejection
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

module.exports = { withTimeout, createTimeoutError, DEFAULT_TIMEOUT_MS };

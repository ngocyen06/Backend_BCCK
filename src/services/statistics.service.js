// OWNER: Hiếu
// Service thống kê: quy tắc nghiệp vụ, ném lỗi có statusCode + code.
// KHÔNG dùng req/res, KHÔNG viết SQL (CONTRACT.md:18).

const statisticsRepository = require('../repositories/statistics.repository');

function appError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * @param {number} subjectId
 * @returns {Promise<{ subjectId: number, items: object[] }>}
 */
async function getSubjectStatistics(subjectId) {
  const items = await statisticsRepository.getSubjectStatistics(subjectId);
  return { subjectId, items };
}

/**
 * @param {number} examSetId
 * @returns {Promise<object>}
 */
async function getExamSetStatistics(examSetId) {
  const data = await statisticsRepository.getExamSetStatistics(examSetId);
  if (!data) {
    throw appError(404, 'EXAM_SET_NOT_FOUND', 'Không tìm thấy bộ đề');
  }
  return { examSetId, ...data };
}

module.exports = { getSubjectStatistics, getExamSetStatistics };

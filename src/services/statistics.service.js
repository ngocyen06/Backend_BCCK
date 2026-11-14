// OWNER: Hiếu
// Service thống kê: quy tắc nghiệp vụ, ném AppError (CONTRACT.md:18).
// KHÔNG dùng req/res, KHÔNG viết SQL.

const statisticsRepository = require('../repositories/statistics.repository');
const AppError = require('../utils/AppError');

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
    throw new AppError(404, 'EXAM_SET_NOT_FOUND', 'Không tìm thấy bộ đề');
  }
  return { examSetId, ...data };
}

module.exports = { getSubjectStatistics, getExamSetStatistics };

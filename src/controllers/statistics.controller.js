// OWNER: Hiếu
// Controller thống kê: chỉ đọc req, gọi service, trả res (CONTRACT.md:17).
// Không SQL, không if nghiệp vụ.

const statisticsService = require('../services/statistics.service');

async function getSubjectStatistics(req, res, next) {
  try {
    const data = await statisticsService.getSubjectStatistics(req.params.subjectId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

async function getExamSetStatistics(req, res, next) {
  try {
    const data = await statisticsService.getExamSetStatistics(req.params.id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = { getSubjectStatistics, getExamSetStatistics };

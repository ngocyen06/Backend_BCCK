// OWNER: Hiếu
// Route thống kê. Mount ở '/': router.get('/statistics/subjects/:subjectId', ...),
// router.get('/exam-sets/:id/statistics', ...).
// Mặc định từ chối: authenticate cho cả router, mỗi route tự khai báo authorize (CONTRACT.md:41).

const express = require('express');

const statisticsController = require('../controllers/statistics.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { ROLES } = require('../constants/roles');
const {
  subjectIdParamSchema,
  examSetIdParamSchema,
  statisticsQuerySchema,
} = require('../schemas/statistics.schema');

const router = express.Router();

router.use(authenticate);

// Thống kê theo môn học — Admin và Teacher (CONTRACT.md:44)
router.get(
  '/statistics/subjects/:subjectId',
  authorize(ROLES.Admin, ROLES.Teacher),
  validate({ params: subjectIdParamSchema, query: statisticsQuerySchema }),
  statisticsController.getSubjectStatistics,
);

// Thống kê theo bộ đề — Admin và Teacher
router.get(
  '/exam-sets/:id/statistics',
  authorize(ROLES.Admin, ROLES.Teacher),
  validate({ params: examSetIdParamSchema, query: statisticsQuerySchema }),
  statisticsController.getExamSetStatistics,
);

module.exports = router;

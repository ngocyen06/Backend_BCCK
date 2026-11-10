// OWNER: Yến
// Mount ở '/': khai báo path đầy đủ. Mọi route cần đăng nhập (CONTRACT.md:41).

const router = require('express').Router();
const attemptController = require('../controllers/attempt.controller');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { ROLES } = require('../constants/roles');
const {
  attemptIdParamSchema,
  examSetIdParamSchema,
  submitAttemptSchema,
  listMyAttemptsQuerySchema,
} = require('../schemas/attempt.schema');

router.use(authenticate);

// Bắt đầu làm bài trên một bộ đề đã công bố.
router.post(
  '/exam-sets/:id/start',
  authorize(ROLES.STUDENT),
  validate(examSetIdParamSchema, 'params'),
  attemptController.start,
);

// Lịch sử làm bài của chính mình (đặt trước /attempts/:id để không bị khớp nhầm).
router.get(
  '/attempts/my',
  authorize(ROLES.STUDENT, ROLES.ADMIN),
  validate(listMyAttemptsQuerySchema, 'query'),
  attemptController.listMine,
);

// Đề đang làm (resume) - KHÔNG trả isCorrect.
router.get(
  '/attempts/:id',
  authorize(ROLES.STUDENT, ROLES.ADMIN),
  validate(attemptIdParamSchema, 'params'),
  attemptController.getForTaking,
);

// Nộp bài.
router.post(
  '/attempts/:id/submit',
  authorize(ROLES.STUDENT),
  validate(attemptIdParamSchema, 'params'),
  validate(submitAttemptSchema),
  attemptController.submit,
);

// (đã khai báo /attempts/my ở trên)

// Kết quả chi tiết sau khi nộp.
router.get(
  '/attempts/:id/result',
  authorize(ROLES.STUDENT, ROLES.ADMIN),
  validate(attemptIdParamSchema, 'params'),
  attemptController.result,
);

module.exports = router;

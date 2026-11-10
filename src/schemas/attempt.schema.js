// OWNER: Yến
// Schema cho luồng làm bài. Khi làm bài không trả isCorrect; khi nộp bài client
// chỉ gửi selectedOptionId, KHÔNG gửi điểm hay studentId (CONTRACT.md:59-60).

const { z } = require('zod');

const attemptIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const examSetIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Một câu trả lời: questionId bắt buộc, selectedOptionId có thể null (bỏ trống).
const answerItemSchema = z
  .object({
    questionId: z.coerce.number().int().positive(),
    selectedOptionId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  })
  .strict();

const submitAttemptSchema = z
  .object({
    answers: z.array(answerItemSchema).max(500, 'Tối đa 500 câu trả lời trong một lượt'),
  })
  .strict();

const listMyAttemptsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

module.exports = {
  attemptIdParamSchema,
  examSetIdParamSchema,
  answerItemSchema,
  submitAttemptSchema,
  listMyAttemptsQuerySchema,
};

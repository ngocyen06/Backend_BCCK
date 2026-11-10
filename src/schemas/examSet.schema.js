// OWNER: Khôi
'use strict';

const { z } = require('zod');

const EXAM_STATUS_VALUES = ['Draft', 'Published'];

const examSetQuestionSchema = z.object({
  questionId: z.coerce
    .number({ required_error: 'questionId là bắt buộc' })
    .int('questionId phải là số nguyên')
    .positive('questionId phải là số nguyên dương'),
  orderNo: z.coerce.number().int().min(1, 'orderNo phải >= 1').optional(),
  score: z.coerce.number().min(0, 'score phải >= 0').max(100, 'score tối đa 100').optional(),
});

const questionsArraySchema = z
  .array(examSetQuestionSchema)
  .min(1, 'Cần ít nhất 1 câu hỏi')
  .max(200, 'Tối đa 200 câu hỏi');

function checkDuplicateQuestions(questions, ctx) {
  const seen = new Set();
  questions.forEach((question, index) => {
    if (seen.has(question.questionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['questions', index, 'questionId'],
        message: 'Câu hỏi bị trùng trong bộ đề',
      });
    }
    seen.add(question.questionId);
  });
}

const createExamSetSchema = z
  .object({
    subjectId: z.coerce
      .number({ required_error: 'subjectId là bắt buộc' })
      .int('subjectId phải là số nguyên')
      .positive('subjectId phải là số nguyên dương'),
    title: z
      .string({ required_error: 'Tiêu đề là bắt buộc' })
      .trim()
      .min(1, 'Tiêu đề không được để trống')
      .max(255, 'Tiêu đề tối đa 255 ký tự'),
    durationMinutes: z.coerce
      .number({ required_error: 'durationMinutes là bắt buộc' })
      .int('durationMinutes phải là số nguyên')
      .min(1, 'Thời gian làm bài phải >= 1 phút')
      .max(600, 'Thời gian làm bài tối đa 600 phút'),
    questions: questionsArraySchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.questions) checkDuplicateQuestions(data.questions, ctx);
  });

const updateExamSetSchema = z
  .object({
    subjectId: z.coerce.number().int().positive().optional(),
    title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(255).optional(),
    durationMinutes: z.coerce.number().int().min(1).max(600).optional(),
    questions: questionsArraySchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.questions) checkDuplicateQuestions(data.questions, ctx);
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Cần ít nhất một trường để cập nhật',
      });
    }
  });

const addExamSetQuestionsSchema = z
  .object({
    questions: questionsArraySchema,
  })
  .superRefine((data, ctx) => {
    checkDuplicateQuestions(data.questions, ctx);
  });

const listExamSetQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'page phải >= 1').default(1),
  pageSize: z.coerce.number().int().min(1, 'pageSize phải >= 1').max(100, 'pageSize tối đa 100').default(10),
  subjectId: z.coerce.number().int().positive().optional(),
  status: z.enum(EXAM_STATUS_VALUES, { message: 'status chỉ nhận Draft hoặc Published' }).optional(),
  keyword: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1, 'keyword không được rỗng').max(200).optional()
  ),
});

const examSetIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id không hợp lệ'),
});

const examSetQuestionParamSchema = z.object({
  id: z.coerce.number().int().positive('id không hợp lệ'),
  questionId: z.coerce.number().int().positive('questionId không hợp lệ'),
});

module.exports = {
  EXAM_STATUS_VALUES,
  examSetQuestionSchema,
  createExamSetSchema,
  updateExamSetSchema,
  addExamSetQuestionsSchema,
  listExamSetQuerySchema,
  examSetIdParamSchema,
  examSetQuestionParamSchema,
};

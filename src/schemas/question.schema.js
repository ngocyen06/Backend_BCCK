// OWNER: Khôi
'use strict';

const { z } = require('zod');

const DIFFICULTY = { EASY: 1, MEDIUM: 2, HARD: 3 };
const DIFFICULTY_VALUES = [DIFFICULTY.EASY, DIFFICULTY.MEDIUM, DIFFICULTY.HARD];

const optionSchema = z.object({
  content: z
    .string({ required_error: 'Nội dung đáp án là bắt buộc' })
    .trim()
    .min(1, 'Nội dung đáp án không được để trống')
    .max(1000, 'Nội dung đáp án tối đa 1000 ký tự'),
  isCorrect: z.boolean({ required_error: 'isCorrect là bắt buộc' }),
});

const optionsArraySchema = z
  .array(optionSchema)
  .min(2, 'Cần ít nhất 2 đáp án')
  .max(10, 'Tối đa 10 đáp án');

const difficultySchema = z.coerce
  .number()
  .int('difficulty phải là số nguyên')
  .refine((value) => DIFFICULTY_VALUES.includes(value), {
    message: 'difficulty chỉ nhận 1 (EASY), 2 (MEDIUM), 3 (HARD)',
  });

function checkSingleCorrect(options, ctx, basePath) {
  const correctCount = options.filter((option) => option.isCorrect).length;
  if (correctCount !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: basePath,
      message: 'Mỗi câu hỏi phải có đúng 1 đáp án đúng',
    });
  }
}

const createQuestionSchema = z
  .object({
    subjectId: z.coerce
      .number({ required_error: 'subjectId là bắt buộc' })
      .int('subjectId phải là số nguyên')
      .positive('subjectId phải là số nguyên dương'),
    content: z
      .string({ required_error: 'Nội dung câu hỏi là bắt buộc' })
      .trim()
      .min(1, 'Nội dung câu hỏi không được để trống')
      .max(4000, 'Nội dung câu hỏi tối đa 4000 ký tự'),
    difficulty: difficultySchema,
    explanation: z.string().trim().max(4000, 'Giải thích tối đa 4000 ký tự').nullable().optional(),
    options: optionsArraySchema,
  })
  .superRefine((data, ctx) => {
    checkSingleCorrect(data.options, ctx, ['options']);
  });

const updateQuestionSchema = z
  .object({
    subjectId: z.coerce.number().int('subjectId phải là số nguyên').positive('subjectId phải là số nguyên dương').optional(),
    content: z.string().trim().min(1, 'Nội dung câu hỏi không được để trống').max(4000).optional(),
    difficulty: difficultySchema.optional(),
    explanation: z.string().trim().max(4000).nullable().optional(),
    options: optionsArraySchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.options) {
      checkSingleCorrect(data.options, ctx, ['options']);
    }
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Cần ít nhất một trường để cập nhật',
      });
    }
  });

const listQuestionQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'page phải >= 1').default(1),
  pageSize: z.coerce.number().int().min(1, 'pageSize phải >= 1').max(100, 'pageSize tối đa 100').default(10),
  subjectId: z.coerce.number().int().positive().optional(),
  difficulty: z.coerce.number().int().min(1).max(3).optional(),
  keyword: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1, 'keyword không được rỗng').max(200).optional()
  ),
});

const questionIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id không hợp lệ'),
});

module.exports = {
  DIFFICULTY,
  optionSchema,
  createQuestionSchema,
  updateQuestionSchema,
  listQuestionQuerySchema,
  questionIdParamSchema,
};

// OWNER: Hiếu
// Schema zod cho Subject (CONTRACT.md:25): create / update / list query.
// Đây là schema duy nhất mà routes/subject.routes.js:13-17 đang cần.
'use strict';

const { z } = require('zod');

// Code môn học: ngắn, viết hoa/thường đều được, dùng làm khoá nghiệp vụ.
const codeSchema = z
  .string({ required_error: 'Mã môn học là bắt buộc' })
  .trim()
  .min(1, 'Mã môn học không được để trống')
  .max(20, 'Mã môn học tối đa 20 ký tự');

const nameSchema = z
  .string({ required_error: 'Tên môn học là bắt buộc' })
  .trim()
  .min(1, 'Tên môn học không được để trống')
  .max(200, 'Tên môn học tối đa 200 ký tự');

const descriptionSchema = z
  .string()
  .trim()
  .max(1000, 'Mô tả tối đa 1000 ký tự')
  .nullable()
  .optional();

// keyword rỗng từ query (?keyword=) phải được coi là "không lọc".
const keywordSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1, 'keyword không được rỗng').max(200, 'keyword tối đa 200 ký tự').optional(),
);

const createSubjectSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
});

const updateSubjectSchema = z
  .object({
    code: codeSchema.optional(),
    name: nameSchema.optional(),
    description: descriptionSchema,
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Cần ít nhất một trường để cập nhật',
      });
    }
  });

const listSubjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'page phải >= 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'pageSize phải >= 1')
    .max(100, 'pageSize tối đa 100')
    .default(10),
  keyword: keywordSchema,
});

const subjectIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id không hợp lệ'),
});

module.exports = {
  codeSchema,
  nameSchema,
  descriptionSchema,
  createSubjectSchema,
  updateSubjectSchema,
  listSubjectsQuerySchema,
  subjectIdParamSchema,
};


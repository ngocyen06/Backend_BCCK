// OWNER: Hiếu
// Schema zod cho route thống kê (statistics.routes.js cần 3 export dưới đây).
'use strict';

const { z } = require('zod');

const subjectIdParamSchema = z.object({
  subjectId: z.coerce.number().int().positive('subjectId không hợp lệ'),
});

const examSetIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id không hợp lệ'),
});

// Hiện chưa route thống kê nào dùng query; giữ schema rỗng để đồng bộ chữ ký validate.
const statisticsQuerySchema = z.object({});

module.exports = {
  subjectIdParamSchema,
  examSetIdParamSchema,
  statisticsQuerySchema,
};

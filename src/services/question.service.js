// OWNER: Khôi
'use strict';

const DB_MODULE_PATH = '../config/db';
const APP_ERROR_PATH = '../utils/AppError';
const { sql, getPool } = require(DB_MODULE_PATH);
const AppError = require(APP_ERROR_PATH);
const questionRepository = require('../repositories/question.repository');

const ADMIN_ROLE = 'Admin';

function assertCanModify(question, actor) {
  if (!actor || actor.role === ADMIN_ROLE) return;
  if (question.createdBy !== actor.id) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền sửa câu hỏi của người khác');
  }
}

async function runInTransaction(work) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const result = await work(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // bỏ qua: transaction có thể đã bị huỷ
    }
    throw error;
  }
}

async function create(data, actor) {
  const questionId = await runInTransaction((transaction) =>
    questionRepository.create(
      {
        subjectId: data.subjectId,
        content: data.content,
        difficulty: data.difficulty,
        explanation: data.explanation,
        createdBy: actor.id,
      },
      data.options,
      transaction
    )
  );

  return questionRepository.findByIdWithOptions(questionId, null);
}

async function list(filters) {
  const result = await questionRepository.findAll(filters, null);
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;

  return {
    items: result.items,
    page: page,
    pageSize: pageSize,
    total: result.total,
  };
}

async function getById(id) {
  const question = await questionRepository.findByIdWithOptions(id, null);
  if (!question) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi');
  }
  return question;
}

async function update(id, data, actor) {
  const existing = await questionRepository.findById(id, null);
  if (!existing) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi');
  }
  assertCanModify(existing, actor);

  await runInTransaction((transaction) => questionRepository.update(id, data, transaction));

  return questionRepository.findByIdWithOptions(id, null);
}

async function remove(id, actor) {
  const existing = await questionRepository.findById(id, null);
  if (!existing) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi');
  }
  assertCanModify(existing, actor);

  const deleted = await questionRepository.softDelete(id, null);
  if (!deleted) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi');
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
};

// OWNER: Khôi
'use strict';

const DB_MODULE_PATH = '../config/db';
const APP_ERROR_PATH = '../utils/AppError';
const { sql, getPool } = require(DB_MODULE_PATH);
const AppError = require(APP_ERROR_PATH);
const examSetRepository = require('../repositories/examSet.repository');
const questionRepository = require('../repositories/question.repository');

const ADMIN_ROLE = 'Admin';
const STUDENT_ROLE = 'Student';
const STATUS_DRAFT = 'Draft';
const STATUS_PUBLISHED = 'Published';

function assertCanModify(examSet, actor) {
  if (!actor) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Bạn cần đăng nhập để thực hiện thao tác này');
  }
  if (actor.role === ADMIN_ROLE) return;
  if (examSet.createdBy !== actor.id) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền sửa bộ đề của người khác');
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

async function ensureQuestionsExist(questions) {
  if (!questions || questions.length === 0) return;

  const ids = questions.map((question) => question.questionId);
  const existingIds = await questionRepository.existsByIds(ids, null);
  const missing = ids.filter((id) => !existingIds.includes(id));

  if (missing.length > 0) {
    throw new AppError(
      400,
      'QUESTION_NOT_FOUND',
      'Không tìm thấy câu hỏi: ' + missing.join(', ')
    );
  }
}

async function create(data, actor) {
  await ensureQuestionsExist(data.questions);

  const examSetId = await runInTransaction((transaction) =>
    examSetRepository.create(
      {
        subjectId: data.subjectId,
        title: data.title,
        durationMinutes: data.durationMinutes,
        status: 'Draft',
        createdBy: actor.id,
      },
      data.questions,
      transaction
    )
  );

  return examSetRepository.findByIdWithQuestions(examSetId, null);
}

async function list(filters, actor) {
  const query = Object.assign({}, filters);
  if (actor && actor.role === STUDENT_ROLE) {
    query.status = STATUS_PUBLISHED;
  }

  const result = await examSetRepository.findAll(query, null);
  const page = query.page || 1;
  const pageSize = query.pageSize || 10;

  return {
    items: result.items,
    page: page,
    pageSize: pageSize,
    total: result.total,
  };
}

async function getById(id, actor) {
  const examSet = await examSetRepository.findByIdWithQuestions(id, null);
  if (!examSet) {
    throw new AppError(404, 'EXAM_SET_NOT_FOUND', 'Không tìm thấy bộ đề');
  }
  if (actor && actor.role === STUDENT_ROLE && examSet.status !== STATUS_PUBLISHED) {
    throw new AppError(404, 'EXAM_SET_NOT_FOUND', 'Không tìm thấy bộ đề');
  }
  return examSet;
}

async function update(id, data, actor) {
  const existing = await examSetRepository.findById(id, null);
  if (!existing) {
    throw new AppError(404, 'EXAM_SET_NOT_FOUND', 'Không tìm thấy bộ đề');
  }
  assertCanModify(existing, actor);

  const hasAttempts = await examSetRepository.hasAttempts(id, null);
  if (hasAttempts) {
    throw new AppError(409, 'EXAM_HAS_ATTEMPTS', 'Bộ đề đã có người làm, không thể sửa');
  }

  await ensureQuestionsExist(data.questions);
  await runInTransaction((transaction) => examSetRepository.update(id, data, transaction));

  return examSetRepository.findByIdWithQuestions(id, null);
}

async function addQuestions(id, data, actor) {
  const existing = await examSetRepository.findById(id, null);
  if (!existing) {
    throw new AppError(404, 'EXAM_SET_NOT_FOUND', 'Không tìm thấy bộ đề');
  }
  assertCanModify(existing, actor);

  const hasAttempts = await examSetRepository.hasAttempts(id, null);
  if (hasAttempts) {
    throw new AppError(409, 'EXAM_HAS_ATTEMPTS', 'Bộ đề đã có người làm, không thể sửa');
  }

  await ensureQuestionsExist(data.questions);

  const questionIds = data.questions.map((question) => question.questionId);
  const duplicated = await examSetRepository.findExistingQuestionIds(id, questionIds, null);
  if (duplicated.length > 0) {
    throw new AppError(
      409,
      'QUESTION_ALREADY_IN_EXAM',
      'Câu hỏi đã có trong bộ đề: ' + duplicated.join(', ')
    );
  }

  await runInTransaction((transaction) =>
    examSetRepository.addQuestions(id, data.questions, transaction)
  );

  return examSetRepository.findByIdWithQuestions(id, null);
}

async function removeQuestion(id, questionId, actor) {
  const existing = await examSetRepository.findById(id, null);
  if (!existing) {
    throw new AppError(404, 'EXAM_SET_NOT_FOUND', 'Không tìm thấy bộ đề');
  }
  assertCanModify(existing, actor);

  const hasAttempts = await examSetRepository.hasAttempts(id, null);
  if (hasAttempts) {
    throw new AppError(409, 'EXAM_HAS_ATTEMPTS', 'Bộ đề đã có người làm, không thể sửa');
  }

  const removed = await examSetRepository.removeQuestion(id, questionId, null);
  if (!removed) {
    throw new AppError(404, 'QUESTION_NOT_IN_EXAM', 'Câu hỏi không có trong bộ đề');
  }

  return examSetRepository.findByIdWithQuestions(id, null);
}

async function publish(id, actor) {
  const existing = await examSetRepository.findById(id, null);
  if (!existing) {
    throw new AppError(404, 'EXAM_SET_NOT_FOUND', 'Không tìm thấy bộ đề');
  }
  assertCanModify(existing, actor);

  // PATCH /:id/publish là công tắc: Published -> Draft (thu hồi), còn lại -> Published.
  const nextStatus = existing.status === STATUS_PUBLISHED ? STATUS_DRAFT : STATUS_PUBLISHED;

  if (nextStatus === STATUS_PUBLISHED) {
    const totalQuestions = await examSetRepository.countQuestions(id, null);
    if (totalQuestions === 0) {
      throw new AppError(400, 'EXAM_SET_EMPTY', 'Bộ đề chưa có câu hỏi, không thể xuất bản');
    }
  }

  await examSetRepository.updateStatus(id, nextStatus, null);

  return examSetRepository.findByIdWithQuestions(id, null);
}

module.exports = {
  create,
  list,
  getById,
  update,
  addQuestions,
  removeQuestion,
  publish,
};

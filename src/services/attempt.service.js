// OWNER: Yến
// Nghiệp vụ làm bài: bắt đầu, xem đề (không isCorrect), nộp bài (điểm do SP tính),
// lịch sử và kết quả. Không dùng req/res, lỗi ném AppError (CONTRACT.md:18,53-61).

const attemptRepository = require('../repositories/attempt.repository');
const AppError = require('../utils/AppError');
const { ATTEMPT_STATUS, EXAM_STATUS } = require('../constants/status');
const { ERROR_CODES } = require('../constants/errorCodes');
const { normalizePagination } = require('../utils/pagination');

const MINUTE_MS = 60 * 1000;

/**
 * Bắt đầu (hoặc tiếp tục) một lượt làm bài trên đề Published.
 * @param {number} examSetId
 * @param {number} studentId
 */
async function startAttempt(examSetId, studentId) {
  const examSet = await attemptRepository.findExamSetById(examSetId);
  if (!examSet) {
    throw AppError.notFound('Không tìm thấy bộ đề', ERROR_CODES.EXAM_NOT_FOUND);
  }
  if (examSet.status !== EXAM_STATUS.PUBLISHED) {
    throw AppError.forbidden('Bộ đề chưa được công bố', ERROR_CODES.EXAM_NOT_PUBLISHED);
  }

  let attempt = await attemptRepository.findInProgressAttempt(examSetId, studentId);

  if (attempt && isExpired(attempt, examSet.durationMinutes)) {
    throw AppError.conflict(
      'Lượt làm trước đã hết hạn, hãy nộp hoặc bắt đầu lượt mới sau khi hệ thống đóng lượt cũ',
      ERROR_CODES.ATTEMPT_EXPIRED,
    );
  }

  if (!attempt) {
    attempt = await attemptRepository.createAttempt(examSetId, studentId);
  }

  const questions = await attemptRepository.findExamQuestions(examSetId, false);
  const answers = await attemptRepository.findAnswersByAttempt(attempt.id);

  return {
    attempt: toPublicAttempt(attempt, examSet.durationMinutes),
    examSet: { id: examSet.id, subjectId: examSet.subjectId, title: examSet.title },
    questions,
    answers: answers.map((answer) => ({
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
    })),
  };
}

/**
 * Xem lại đề đang làm (resume). Chặn nếu không phải chủ lượt hoặc đã nộp.
 * @param {number} attemptId
 * @param {{ id: number, role: string }} user
 */
async function getAttemptForTaking(attemptId, user) {
  const attempt = await loadOwnedAttempt(attemptId, user);
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    throw AppError.conflict('Lượt làm đã kết thúc', ERROR_CODES.ATTEMPT_NOT_IN_PROGRESS);
  }
  if (isExpired(attempt, attempt.durationMinutes)) {
    throw AppError.conflict('Lượt làm đã quá hạn', ERROR_CODES.ATTEMPT_EXPIRED);
  }

  const questions = await attemptRepository.findExamQuestions(attempt.examSetId, false);
  const answers = await attemptRepository.findAnswersByAttempt(attempt.id);

  return {
    attempt: toPublicAttempt(attempt, attempt.durationMinutes),
    questions,
    answers: answers.map((answer) => ({
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
    })),
  };
}

/**
 * Nộp bài: lưu đáp án chọn, gọi SP chấm điểm, trả kết quả tóm tắt.
 * @param {number} attemptId
 * @param {{ answers: { questionId: number, selectedOptionId?: number|null }[] }} payload
 * @param {{ id: number, role: string }} user
 */
async function submitAttempt(attemptId, payload, user) {
  const attempt = await loadOwnedAttempt(attemptId, user);
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    throw AppError.conflict('Lượt làm đã kết thúc', ERROR_CODES.ATTEMPT_NOT_IN_PROGRESS);
  }
  if (isExpired(attempt, attempt.durationMinutes)) {
    throw AppError.conflict('Lượt làm đã quá hạn', ERROR_CODES.ATTEMPT_EXPIRED);
  }

  const questions = await attemptRepository.findExamQuestions(attempt.examSetId, true);
  const validQuestionIds = new Set(questions.map((question) => question.id));
  const optionToQuestion = new Map();
  for (const question of questions) {
    for (const option of question.options) optionToQuestion.set(option.id, question.id);
  }

  const answers = Array.isArray(payload.answers) ? payload.answers : [];
  const seen = new Set();
  for (const answer of answers) {
    if (!validQuestionIds.has(answer.questionId)) {
      throw AppError.validation([
        { path: ['answers'], message: `Câu hỏi ${answer.questionId} không thuộc bộ đề` },
      ]);
    }
    if (seen.has(answer.questionId)) {
      throw AppError.validation([
        { path: ['answers'], message: `Câu hỏi ${answer.questionId} bị gửi trùng` },
      ]);
    }
    seen.add(answer.questionId);

    const optionId = answer.selectedOptionId;
    if (optionId !== null && optionId !== undefined) {
      if (optionToQuestion.get(optionId) !== answer.questionId) {
        throw AppError.validation([
          { path: ['answers'], message: `Lựa chọn ${optionId} không thuộc câu ${answer.questionId}` },
        ]);
      }
    }
  }

  await attemptRepository.saveAnswers(
    attemptId,
    answers.map((answer) => ({
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId ?? null,
    })),
  );

  const graded = await attemptRepository.submitAndGrade(attemptId, user.id);
  return toPublicAttempt(graded, graded.durationMinutes);
}

/**
 * Lịch sử làm bài của chính SV.
 * @param {number} studentId
 * @param {{ page?: any, pageSize?: any }} query
 */
async function listMyAttempts(studentId, query) {
  const paging = normalizePagination(query && query.page, query && query.pageSize);
  const { items, total } = await attemptRepository.findByStudent(studentId, paging);
  return {
    items: items.map((attempt) => toPublicAttempt(attempt, undefined, attempt.examSetTitle)),
    page: paging.page,
    pageSize: paging.pageSize,
    total,
  };
}

/**
 * Kết quả chi tiết một lượt (chỉ chủ lượt hoặc Admin).
 * @param {number} attemptId
 * @param {{ id: number, role: string }} user
 */
async function getResult(attemptId, user) {
  const attempt = await loadOwnedAttempt(attemptId, user);
  if (attempt.status === ATTEMPT_STATUS.IN_PROGRESS) {
    throw AppError.conflict('Lượt làm chưa nộp bài', ERROR_CODES.ATTEMPT_NOT_IN_PROGRESS);
  }
  const details = await attemptRepository.findResultDetail(attemptId);
  return { attempt: toPublicAttempt(attempt, attempt.durationMinutes), answers: details };
}

/**
 * Đọc lượt làm và kiểm tra quyền sở hữu.
 * @param {number} attemptId
 * @param {{ id: number, role: string }} user
 */
async function loadOwnedAttempt(attemptId, user) {
  const attempt = await attemptRepository.findAttemptById(attemptId);
  if (!attempt) {
    throw AppError.notFound('Không tìm thấy lượt làm', ERROR_CODES.ATTEMPT_NOT_FOUND);
  }
  const isOwner = attempt.studentId === user.id;
  const isAdmin = user.role === 'Admin';
  if (!isOwner && !isAdmin) {
    throw AppError.forbidden('Bạn không phải chủ lượt làm này', ERROR_CODES.ATTEMPT_FORBIDDEN);
  }
  return attempt;
}

function isExpired(attempt, durationMinutes) {
  if (!attempt || !attempt.startedAt || !durationMinutes) return false;
  const startedAt = new Date(attempt.startedAt).getTime();
  if (Number.isNaN(startedAt)) return false;
  return Date.now() > startedAt + durationMinutes * MINUTE_MS;
}

function toPublicAttempt(attempt, ...rest) {
  const durationMinutes = rest[0];
  const examSetTitle = rest[1];
  return {
    id: attempt.id,
    examSetId: attempt.examSetId,
    studentId: attempt.studentId,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    totalScore: attempt.totalScore,
    correctCount: attempt.correctCount,
    status: attempt.status,
    durationMinutes: durationMinutes ?? attempt.durationMinutes ?? undefined,
    examSetTitle: examSetTitle ?? attempt.examSetTitle ?? undefined,
    deadlineAt: attempt.deadlineAt ?? undefined,
  };
}

module.exports = {
  startAttempt,
  getAttemptForTaking,
  submitAttempt,
  listMyAttempts,
  getResult,
};

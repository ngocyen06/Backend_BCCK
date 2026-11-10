// OWNER: Yến
// Trạng thái và độ khó (CONTRACT.md:32-34), khớp CHECK constraint ở file 02.

const EXAM_STATUS = Object.freeze({
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
});

const EXAM_STATUS_VALUES = Object.freeze(Object.values(EXAM_STATUS));

const ATTEMPT_STATUS = Object.freeze({
  IN_PROGRESS: 'InProgress',
  SUBMITTED: 'Submitted',
  EXPIRED: 'Expired',
});

const ATTEMPT_STATUS_VALUES = Object.freeze(Object.values(ATTEMPT_STATUS));

const DIFFICULTY = Object.freeze({
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
});

const DIFFICULTY_VALUES = Object.freeze(Object.values(DIFFICULTY));

module.exports = {
  EXAM_STATUS,
  EXAM_STATUS_VALUES,
  ATTEMPT_STATUS,
  ATTEMPT_STATUS_VALUES,
  DIFFICULTY,
  DIFFICULTY_VALUES,
};

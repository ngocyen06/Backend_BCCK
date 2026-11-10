// OWNER: Yến
// Repository lượt làm bài: chỉ SQL (CONTRACT.md:19). Bảng ExamAttempt / AttemptAnswer
// / ExamSet / ExamSetQuestion / Question / QuestionOption (01_create_tables.sql).

const { sql, getPool } = require('../config/db');

function mapAttempt(row) {
  if (!row) return null;
  return {
    id: row.Id,
    examSetId: row.ExamSetId,
    studentId: row.StudentId,
    startedAt: row.StartedAt,
    submittedAt: row.SubmittedAt,
    totalScore: row.TotalScore === null || row.TotalScore === undefined ? null : Number(row.TotalScore),
    correctCount: row.CorrectCount,
    status: row.Status,
  };
}

/**
 * Tìm bộ đề kèm môn (dùng để kiểm tra Published và lấy DurationMinutes).
 * @param {number} examSetId
 */
async function findExamSetById(examSetId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, examSetId)
    .query(`
      SELECT Id, SubjectId, Title, DurationMinutes, Status, CreatedBy, CreatedAt, PublishedAt
      FROM dbo.ExamSet
      WHERE Id = @Id
    `);
  const row = (result.recordset || [])[0];
  if (!row) return null;
  return {
    id: row.Id,
    subjectId: row.SubjectId,
    title: row.Title,
    durationMinutes: row.DurationMinutes,
    status: row.Status,
    createdBy: row.CreatedBy,
    createdAt: row.CreatedAt,
    publishedAt: row.PublishedAt,
  };
}

/**
 * Tìm lượt làm đang InProgress của SV trên một đề (unique index UX_Attempt_OneInProgress).
 * @param {number} examSetId
 * @param {number} studentId
 */
async function findInProgressAttempt(examSetId, studentId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ExamSetId', sql.Int, examSetId)
    .input('StudentId', sql.Int, studentId)
    .query(`
      SELECT Id, ExamSetId, StudentId, StartedAt, SubmittedAt, TotalScore, CorrectCount, Status
      FROM dbo.ExamAttempt
      WHERE ExamSetId = @ExamSetId AND StudentId = @StudentId AND Status = N'InProgress'
    `);
  return mapAttempt((result.recordset || [])[0]);
}

/**
 * Tạo lượt làm mới (Status mặc định InProgress, StartedAt = UTC).
 * @param {number} examSetId
 * @param {number} studentId
 */
async function createAttempt(examSetId, studentId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ExamSetId', sql.Int, examSetId)
    .input('StudentId', sql.Int, studentId)
    .query(`
      INSERT INTO dbo.ExamAttempt (ExamSetId, StudentId, Status)
      OUTPUT INSERTED.Id, INSERTED.ExamSetId, INSERTED.StudentId, INSERTED.StartedAt,
             INSERTED.SubmittedAt, INSERTED.TotalScore, INSERTED.CorrectCount, INSERTED.Status
      VALUES (@ExamSetId, @StudentId, N'InProgress');
    `);
  return mapAttempt((result.recordset || [])[0]);
}

/**
 * Lấy lượt làm theo Id.
 * @param {number} attemptId
 */
async function findAttemptById(attemptId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, attemptId)
    .query(`
      SELECT a.Id, a.ExamSetId, a.StudentId, a.StartedAt, a.SubmittedAt,
             a.TotalScore, a.CorrectCount, a.Status,
             es.Title AS ExamSetTitle, es.DurationMinutes AS DurationMinutes,
             DATEADD(MINUTE, es.DurationMinutes, a.StartedAt) AS DeadlineAt
      FROM dbo.ExamAttempt AS a
      JOIN dbo.ExamSet AS es ON es.Id = a.ExamSetId
      WHERE a.Id = @Id
    `);
  const row = (result.recordset || [])[0];
  if (!row) return null;
  const mapped = mapAttempt(row);
  mapped.examSetTitle = row.ExamSetTitle;
  mapped.durationMinutes = row.DurationMinutes;
  mapped.deadlineAt = row.DeadlineAt;
  return mapped;
}

/**
 * Lấy danh sách câu hỏi của đề (kèm options KHÔNG có isCorrect khi làm bài).
 * @param {number} examSetId
 * @param {boolean} includeCorrect khi true (dùng nội bộ) mới trả isCorrect
 */
async function findExamQuestions(examSetId, includeCorrect) {
  const pool = await getPool();
  const questionsResult = await pool
    .request()
    .input('ExamSetId', sql.Int, examSetId)
    .query(`
      SELECT q.Id, q.Content, q.Difficulty, esq.OrderNo, esq.Score
      FROM dbo.ExamSetQuestion AS esq
      JOIN dbo.Question AS q ON q.Id = esq.QuestionId AND q.IsDeleted = 0
      WHERE esq.ExamSetId = @ExamSetId
      ORDER BY esq.OrderNo
    `);

  const questions = (questionsResult.recordset || []).map((row) => ({
    id: row.Id,
    content: row.Content,
    difficulty: row.Difficulty,
    orderNo: row.OrderNo,
    score: Number(row.Score),
    options: [],
  }));
  if (questions.length === 0) return questions;

  const ids = questions.map((question) => question.id);
  const optionsResult = await pool
    .request()
    .input('Ids', sql.NVarChar(sql.MAX), ids.join(','))
    .query(`
      SELECT o.Id, o.QuestionId, o.Content, o.IsCorrect
      FROM dbo.QuestionOption AS o
      JOIN STRING_SPLIT(@Ids, ',') AS s ON s.value = CAST(o.QuestionId AS NVARCHAR(20))
      ORDER BY o.Id
    `);

  const byQuestion = new Map();
  for (const row of optionsResult.recordset || []) {
    if (!byQuestion.has(row.QuestionId)) byQuestion.set(row.QuestionId, []);
    const option = { id: row.Id, content: row.Content };
    if (includeCorrect) option.isCorrect = Boolean(row.IsCorrect);
    byQuestion.get(row.QuestionId).push(option);
  }
  for (const question of questions) {
    question.options = byQuestion.get(question.id) || [];
  }
  return questions;
}

/**
 * Lấy các câu trả lời đã lưu của một lượt (khi resume làm bài).
 * @param {number} attemptId
 */
async function findAnswersByAttempt(attemptId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('AttemptId', sql.Int, attemptId)
    .query(`
      SELECT AttemptId, QuestionId, SelectedOptionId, IsCorrect, ScoreAwarded
      FROM dbo.AttemptAnswer
      WHERE AttemptId = @AttemptId
    `);
  return (result.recordset || []).map((row) => ({
    attemptId: row.AttemptId,
    questionId: row.QuestionId,
    selectedOptionId: row.SelectedOptionId,
    isCorrect: Boolean(row.IsCorrect),
    scoreAwarded: Number(row.ScoreAwarded),
  }));
}

/**
 * Lưu/ghi đè đáp án đang chọn cho từng câu - CHỈ ghi SelectedOptionId, KHÔNG ghi IsCorrect
 * hay ScoreAwarded (điểm do SP tính, CONTRACT.md:60).
 * @param {number} attemptId
 * @param {{ questionId: number, selectedOptionId: number|null }[]} answers
 */
async function saveAnswers(attemptId, answers) {
  if (!Array.isArray(answers) || answers.length === 0) return;

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    for (const answer of answers) {
      const request = new sql.Request(transaction);
      request.input('AttemptId', sql.Int, attemptId);
      request.input('QuestionId', sql.Int, answer.questionId);
      request.input('SelectedOptionId', sql.Int, answer.selectedOptionId ?? null);
      await request.query(`
        MERGE dbo.AttemptAnswer AS target
        USING (SELECT @AttemptId AS AttemptId, @QuestionId AS QuestionId) AS source
          ON target.AttemptId = source.AttemptId AND target.QuestionId = source.QuestionId
        WHEN MATCHED THEN
          UPDATE SET SelectedOptionId = @SelectedOptionId,
                     IsCorrect = 0,
                     ScoreAwarded = 0
        WHEN NOT MATCHED THEN
          INSERT (AttemptId, QuestionId, SelectedOptionId)
          VALUES (@AttemptId, @QuestionId, @SelectedOptionId);
      `);
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback().catch(() => {});
    throw error;
  }
}

/**
 * Gọi SP chấm điểm và trả về bản ghi lượt làm đã cập nhật.
 * @param {number} attemptId
 * @param {number} studentId
 */
async function submitAndGrade(attemptId, studentId) {
  const pool = await getPool();
  await pool
    .request()
    .input('AttemptId', sql.Int, attemptId)
    .input('StudentId', sql.Int, studentId)
    .execute('sp_SubmitAndGradeAttempt');
  return findAttemptById(attemptId);
}

/**
 * Lịch sử làm bài của một SV (mới nhất trước), có phân trang.
 * @param {number} studentId
 * @param {{ page: number, pageSize: number, offset: number }} paging
 */
async function findByStudent(studentId, paging) {
  const pool = await getPool();
  const listResult = await pool
    .request()
    .input('StudentId', sql.Int, studentId)
    .input('Offset', sql.Int, paging.offset)
    .input('PageSize', sql.Int, paging.pageSize)
    .query(`
      SELECT a.Id, a.ExamSetId, a.StudentId, a.StartedAt, a.SubmittedAt,
             a.TotalScore, a.CorrectCount, a.Status, es.Title AS ExamSetTitle
      FROM dbo.ExamAttempt AS a
      JOIN dbo.ExamSet AS es ON es.Id = a.ExamSetId
      WHERE a.StudentId = @StudentId
      ORDER BY a.StartedAt DESC, a.Id DESC
      OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
    `);

  const countResult = await pool
    .request()
    .input('StudentId', sql.Int, studentId)
    .query('SELECT COUNT(*) AS Total FROM dbo.ExamAttempt WHERE StudentId = @StudentId');

  const items = (listResult.recordset || []).map((row) => {
    const mapped = mapAttempt(row);
    mapped.examSetTitle = row.ExamSetTitle;
    return mapped;
  });
  const total = (countResult.recordset || [{}])[0].Total || 0;
  return { items, total };
}

/**
 * Chi tiết kết quả một lượt (đã nộp): câu hỏi, lựa chọn, đáp án đúng.
 * Dùng cho result - có isCorrect vì đây là sau khi nộp (CONTRACT.md:59).
 * @param {number} attemptId
 */
async function findResultDetail(attemptId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('AttemptId', sql.Int, attemptId)
    .query(`
      SELECT aa.QuestionId, q.Content AS QuestionContent, q.Explanation,
             aa.SelectedOptionId, so.Content AS SelectedContent,
             aa.IsCorrect, aa.ScoreAwarded, esq.Score AS MaxScore,
             ao.Id AS CorrectOptionId, ao.Content AS CorrectOptionContent
      FROM dbo.AttemptAnswer AS aa
      JOIN dbo.Question AS q ON q.Id = aa.QuestionId
      JOIN dbo.ExamSetQuestion AS esq ON esq.ExamSetId = (SELECT ExamSetId FROM dbo.ExamAttempt WHERE Id = aa.AttemptId)
                                      AND esq.QuestionId = aa.QuestionId
      LEFT JOIN dbo.QuestionOption AS so ON so.Id = aa.SelectedOptionId
      LEFT JOIN dbo.QuestionOption AS ao ON ao.QuestionId = aa.QuestionId AND ao.IsCorrect = 1
      WHERE aa.AttemptId = @AttemptId
      ORDER BY esq.OrderNo
    `);
  return (result.recordset || []).map((row) => ({
    questionId: row.QuestionId,
    content: row.QuestionContent,
    explanation: row.Explanation,
    selectedOptionId: row.SelectedOptionId,
    selectedContent: row.SelectedContent,
    correctOptionId: row.CorrectOptionId,
    correctOptionContent: row.CorrectOptionContent,
    isCorrect: Boolean(row.IsCorrect),
    scoreAwarded: Number(row.ScoreAwarded),
    maxScore: Number(row.MaxScore),
  }));
}

module.exports = {
  findExamSetById,
  findInProgressAttempt,
  createAttempt,
  findAttemptById,
  findExamQuestions,
  findAnswersByAttempt,
  saveAnswers,
  submitAndGrade,
  findByStudent,
  findResultDetail,
};

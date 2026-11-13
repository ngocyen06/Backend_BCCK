// OWNER: Khôi
'use strict';

const DB_MODULE_PATH = '../config/db';
const { sql, getPool } = require(DB_MODULE_PATH);

const EXAM_SET_COLUMNS = 'e.Id, e.SubjectId, e.Title, e.DurationMinutes, e.Status, e.CreatedBy';
const EXAM_SET_QUESTION_COLUMNS = 'eq.ExamSetId, eq.QuestionId, eq.OrderNo, eq.Score';

function toExamSet(row) {
  return {
    id: row.Id,
    subjectId: row.SubjectId,
    title: row.Title,
    durationMinutes: row.DurationMinutes,
    status: row.Status,
    createdBy: row.CreatedBy,
  };
}

function toExamSetQuestion(row) {
  return {
    examSetId: row.ExamSetId,
    questionId: row.QuestionId,
    orderNo: row.OrderNo,
    score: row.Score,
  };
}

async function getRequest(tx) {
  if (tx) return new sql.Request(tx);
  const pool = await getPool();
  return pool.request();
}

function buildWhere(request, filters) {
  const conditions = ['1 = 1'];

  if (filters.subjectId) {
    request.input('SubjectId', sql.Int, filters.subjectId);
    conditions.push('e.SubjectId = @SubjectId');
  }
  if (filters.status) {
    request.input('Status', sql.VarChar(20), filters.status);
    conditions.push('e.Status = @Status');
  }
  if (filters.keyword) {
    request.input('Keyword', sql.NVarChar(200), '%' + filters.keyword + '%');
    conditions.push('e.Title LIKE @Keyword');
  }

  return conditions.join(' AND ');
}

async function insertExamSetQuestions(examSetId, questions, tx) {
  if (!questions || questions.length === 0) return;

  const request = await getRequest(tx);
  request.input('ExamSetId', sql.Int, examSetId);

  const values = questions.map((question, index) => {
    request.input('QuestionId' + index, sql.Int, question.questionId);
    request.input('OrderNo' + index, sql.Int, question.orderNo || index + 1);
    request.input('Score' + index, sql.Decimal(5, 2), question.score === undefined ? 1 : question.score);
    return '(@ExamSetId, @QuestionId' + index + ', @OrderNo' + index + ', @Score' + index + ')';
  });

  await request.query(
    'INSERT INTO ExamSetQuestions (ExamSetId, QuestionId, OrderNo, Score) VALUES ' + values.join(', ')
  );
}

async function create(examSet, questions, tx) {
  const request = await getRequest(tx);
  const result = await request
    .input('SubjectId', sql.Int, examSet.subjectId)
    .input('Title', sql.NVarChar(255), examSet.title)
    .input('DurationMinutes', sql.Int, examSet.durationMinutes)
    .input('Status', sql.VarChar(20), examSet.status || 'Draft')
    .input('CreatedBy', sql.Int, examSet.createdBy)
    .query(
      'INSERT INTO ExamSets (SubjectId, Title, DurationMinutes, Status, CreatedBy) ' +
      'OUTPUT INSERTED.Id ' +
      'VALUES (@SubjectId, @Title, @DurationMinutes, @Status, @CreatedBy)'
    );

  const examSetId = result.recordset[0].Id;
  await insertExamSetQuestions(examSetId, questions, tx);
  return examSetId;
}

async function findById(id, tx) {
  const request = await getRequest(tx);
  const result = await request.input('Id', sql.Int, id).query(
    'SELECT ' + EXAM_SET_COLUMNS + ' FROM ExamSets e WHERE e.Id = @Id'
  );

  return result.recordset[0] ? toExamSet(result.recordset[0]) : null;
}

async function findQuestions(examSetId, tx) {
  const request = await getRequest(tx);
  const result = await request.input('ExamSetId', sql.Int, examSetId).query(
    'SELECT ' + EXAM_SET_QUESTION_COLUMNS + ', q.Content, q.Difficulty ' +
    'FROM ExamSetQuestions eq ' +
    'INNER JOIN Questions q ON q.Id = eq.QuestionId ' +
    'WHERE eq.ExamSetId = @ExamSetId AND q.IsDeleted = 0 ' +
    'ORDER BY eq.OrderNo'
  );

  return result.recordset.map((row) => {
    const item = toExamSetQuestion(row);
    item.content = row.Content;
    item.difficulty = row.Difficulty;
    return item;
  });
}

async function findByIdWithQuestions(id, tx) {
  const examSet = await findById(id, tx);
  if (!examSet) return null;

  const questions = await findQuestions(id, tx);
  return Object.assign({}, examSet, { questions: questions });
}

async function findAll(filters, tx) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;
  const offset = (page - 1) * pageSize;

  // Đếm riêng: COUNT(*) OVER() biến mất khi page vượt quá số trang (recordset rỗng).
  const countRequest = await getRequest(tx);
  const countWhere = buildWhere(countRequest, filters);
  const countResult = await countRequest.query(
    'SELECT COUNT(*) AS TotalCount FROM ExamSets e WHERE ' + countWhere
  );
  const total = countResult.recordset[0] ? countResult.recordset[0].TotalCount : 0;

  const request = await getRequest(tx);
  const where = buildWhere(request, filters);
  request.input('Offset', sql.Int, offset);
  request.input('PageSize', sql.Int, pageSize);

  const result = await request.query(
    'SELECT ' + EXAM_SET_COLUMNS + ' ' +
    'FROM ExamSets e WHERE ' + where + ' ' +
    'ORDER BY e.Id DESC ' +
    'OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY'
  );

  return {
    items: result.recordset.map(toExamSet),
    total: total,
  };
}

async function replaceQuestions(examSetId, questions, tx) {
  const request = await getRequest(tx);
  await request.input('ExamSetId', sql.Int, examSetId).query(
    'DELETE FROM ExamSetQuestions WHERE ExamSetId = @ExamSetId'
  );

  await insertExamSetQuestions(examSetId, questions, tx);
}

async function update(id, data, tx) {
  const request = await getRequest(tx);
  const sets = [];

  request.input('Id', sql.Int, id);

  if (data.subjectId !== undefined) {
    request.input('SubjectId', sql.Int, data.subjectId);
    sets.push('SubjectId = @SubjectId');
  }
  if (data.title !== undefined) {
    request.input('Title', sql.NVarChar(255), data.title);
    sets.push('Title = @Title');
  }
  if (data.durationMinutes !== undefined) {
    request.input('DurationMinutes', sql.Int, data.durationMinutes);
    sets.push('DurationMinutes = @DurationMinutes');
  }

  if (sets.length > 0) {
    await request.query('UPDATE ExamSets SET ' + sets.join(', ') + ' WHERE Id = @Id');
  }

  if (data.questions !== undefined) {
    await replaceQuestions(id, data.questions, tx);
  }
}

async function addQuestions(examSetId, questions, tx) {
  await insertExamSetQuestions(examSetId, questions, tx);
}

async function removeQuestion(examSetId, questionId, tx) {
  const request = await getRequest(tx);
  const result = await request
    .input('ExamSetId', sql.Int, examSetId)
    .input('QuestionId', sql.Int, questionId)
    .query('DELETE FROM ExamSetQuestions WHERE ExamSetId = @ExamSetId AND QuestionId = @QuestionId');

  return result.rowsAffected[0] > 0;
}

async function updateStatus(id, status, tx) {
  const request = await getRequest(tx);
  await request
    .input('Id', sql.Int, id)
    .input('Status', sql.VarChar(20), status)
    .query('UPDATE ExamSets SET Status = @Status WHERE Id = @Id');
}

async function countQuestions(examSetId, tx) {
  const request = await getRequest(tx);
  const result = await request.input('ExamSetId', sql.Int, examSetId).query(
    'SELECT COUNT(*) AS Total ' +
    'FROM ExamSetQuestions eq ' +
    'INNER JOIN Questions q ON q.Id = eq.QuestionId ' +
    'WHERE eq.ExamSetId = @ExamSetId AND q.IsDeleted = 0'
  );

  return result.recordset[0].Total;
}

async function hasAttempts(examSetId, tx) {
  const request = await getRequest(tx);
  const result = await request.input('ExamSetId', sql.Int, examSetId).query(
    'SELECT TOP 1 Id FROM ExamAttempts WHERE ExamSetId = @ExamSetId'
  );

  return result.recordset.length > 0;
}

async function findExistingQuestionIds(examSetId, questionIds, tx) {
  if (!questionIds || questionIds.length === 0) return [];

  const request = await getRequest(tx);
  request.input('ExamSetId', sql.Int, examSetId);
  const placeholders = questionIds.map((id, index) => {
    request.input('QuestionId' + index, sql.Int, id);
    return '@QuestionId' + index;
  });

  const result = await request.query(
    'SELECT eq.QuestionId FROM ExamSetQuestions eq ' +
    'WHERE eq.ExamSetId = @ExamSetId AND eq.QuestionId IN (' + placeholders.join(', ') + ')'
  );

  return result.recordset.map((row) => row.QuestionId);
}

module.exports = {
  toExamSet,
  toExamSetQuestion,
  create,
  insertExamSetQuestions,
  findById,
  findQuestions,
  findByIdWithQuestions,
  findAll,
  update,
  replaceQuestions,
  addQuestions,
  removeQuestion,
  updateStatus,
  countQuestions,
  hasAttempts,
  findExistingQuestionIds,
};

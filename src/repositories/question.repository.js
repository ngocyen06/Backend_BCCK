// OWNER: Khôi
'use strict';

const DB_MODULE_PATH = '../config/db';
const { sql, getPool } = require(DB_MODULE_PATH);

const QUESTION_COLUMNS = 'q.Id, q.SubjectId, q.Content, q.Difficulty, q.Explanation, q.CreatedBy, q.IsDeleted';
const OPTION_COLUMNS = 'o.Id, o.QuestionId, o.Content, o.IsCorrect';

function toQuestion(row) {
  return {
    id: row.Id,
    subjectId: row.SubjectId,
    content: row.Content,
    difficulty: row.Difficulty,
    explanation: row.Explanation,
    createdBy: row.CreatedBy,
    isDeleted: Boolean(row.IsDeleted),
  };
}

function toOption(row) {
  return {
    id: row.Id,
    questionId: row.QuestionId,
    content: row.Content,
    isCorrect: Boolean(row.IsCorrect),
  };
}

async function getRequest(tx) {
  if (tx) return new sql.Request(tx);
  const pool = await getPool();
  return pool.request();
}

function buildWhere(request, filters) {
  const conditions = ['q.IsDeleted = 0'];

  if (filters.subjectId) {
    request.input('SubjectId', sql.Int, filters.subjectId);
    conditions.push('q.SubjectId = @SubjectId');
  }
  if (filters.difficulty) {
    request.input('Difficulty', sql.TinyInt, filters.difficulty);
    conditions.push('q.Difficulty = @Difficulty');
  }
  if (filters.keyword) {
    request.input('Keyword', sql.NVarChar(200), '%' + filters.keyword + '%');
    conditions.push('q.Content LIKE @Keyword');
  }

  return conditions.join(' AND ');
}

async function insertOptions(questionId, options, tx) {
  if (!options || options.length === 0) return;

  const request = await getRequest(tx);
  request.input('QuestionId', sql.Int, questionId);

  const values = options.map((option, index) => {
    request.input('Content' + index, sql.NVarChar(1000), option.content);
    request.input('IsCorrect' + index, sql.Bit, option.isCorrect ? 1 : 0);
    return '(@QuestionId, @Content' + index + ', @IsCorrect' + index + ')';
  });

  await request.query(
    'INSERT INTO QuestionOptions (QuestionId, Content, IsCorrect) VALUES ' + values.join(', ')
  );
}

async function create(question, options, tx) {
  const request = await getRequest(tx);
  const result = await request
    .input('SubjectId', sql.Int, question.subjectId)
    .input('Content', sql.NVarChar(4000), question.content)
    .input('Difficulty', sql.TinyInt, question.difficulty)
    .input('Explanation', sql.NVarChar(4000), question.explanation || null)
    .input('CreatedBy', sql.Int, question.createdBy)
    .query(
      'INSERT INTO Questions (SubjectId, Content, Difficulty, Explanation, CreatedBy, IsDeleted) ' +
      'OUTPUT INSERTED.Id ' +
      'VALUES (@SubjectId, @Content, @Difficulty, @Explanation, @CreatedBy, 0)'
    );

  const questionId = result.recordset[0].Id;
  await insertOptions(questionId, options, tx);
  return questionId;
}

async function findById(id, tx) {
  const request = await getRequest(tx);
  const result = await request.input('Id', sql.Int, id).query(
    'SELECT ' + QUESTION_COLUMNS + ' FROM Questions q WHERE q.Id = @Id AND q.IsDeleted = 0'
  );

  return result.recordset[0] ? toQuestion(result.recordset[0]) : null;
}

async function findOptionsByQuestionId(questionId, tx) {
  const request = await getRequest(tx);
  const result = await request.input('QuestionId', sql.Int, questionId).query(
    'SELECT ' + OPTION_COLUMNS + ' FROM QuestionOptions o WHERE o.QuestionId = @QuestionId ORDER BY o.Id'
  );

  return result.recordset.map(toOption);
}

async function findByIdWithOptions(id, tx) {
  const question = await findById(id, tx);
  if (!question) return null;

  const options = await findOptionsByQuestionId(id, tx);
  return Object.assign({}, question, { options: options });
}

async function findAll(filters, tx) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;
  const offset = (page - 1) * pageSize;

  // Đếm riêng: COUNT(*) OVER() biến mất khi page vượt quá số trang (recordset rỗng).
  const countRequest = await getRequest(tx);
  const countWhere = buildWhere(countRequest, filters);
  const countResult = await countRequest.query(
    'SELECT COUNT(*) AS TotalCount FROM Questions q WHERE ' + countWhere
  );
  const total = countResult.recordset[0] ? countResult.recordset[0].TotalCount : 0;

  const request = await getRequest(tx);
  const where = buildWhere(request, filters);
  request.input('Offset', sql.Int, offset);
  request.input('PageSize', sql.Int, pageSize);

  const result = await request.query(
    'SELECT ' + QUESTION_COLUMNS + ' ' +
    'FROM Questions q WHERE ' + where + ' ' +
    'ORDER BY q.Id DESC ' +
    'OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY'
  );

  return {
    items: result.recordset.map(toQuestion),
    total: total,
  };
}

async function deleteOptions(questionId, tx) {
  const request = await getRequest(tx);
  await request.input('QuestionId', sql.Int, questionId).query(
    'DELETE FROM QuestionOptions WHERE QuestionId = @QuestionId'
  );
}

async function update(id, data, tx) {
  const request = await getRequest(tx);
  const sets = [];

  request.input('Id', sql.Int, id);

  if (data.subjectId !== undefined) {
    request.input('SubjectId', sql.Int, data.subjectId);
    sets.push('SubjectId = @SubjectId');
  }
  if (data.content !== undefined) {
    request.input('Content', sql.NVarChar(4000), data.content);
    sets.push('Content = @Content');
  }
  if (data.difficulty !== undefined) {
    request.input('Difficulty', sql.TinyInt, data.difficulty);
    sets.push('Difficulty = @Difficulty');
  }
  if (data.explanation !== undefined) {
    request.input('Explanation', sql.NVarChar(4000), data.explanation || null);
    sets.push('Explanation = @Explanation');
  }

  if (sets.length > 0) {
    await request.query(
      'UPDATE Questions SET ' + sets.join(', ') + ' WHERE Id = @Id AND IsDeleted = 0'
    );
  }

  if (data.options !== undefined) {
    await deleteOptions(id, tx);
    await insertOptions(id, data.options, tx);
  }
}

async function softDelete(id, tx) {
  const request = await getRequest(tx);
  const result = await request.input('Id', sql.Int, id).query(
    'UPDATE Questions SET IsDeleted = 1 WHERE Id = @Id AND IsDeleted = 0'
  );

  return result.rowsAffected[0] > 0;
}

async function existsByIds(ids, tx) {
  if (!ids || ids.length === 0) return [];

  const request = await getRequest(tx);
  const placeholders = ids.map((id, index) => {
    request.input('Id' + index, sql.Int, id);
    return '@Id' + index;
  });

  const result = await request.query(
    'SELECT q.Id FROM Questions q WHERE q.IsDeleted = 0 AND q.Id IN (' + placeholders.join(', ') + ')'
  );

  return result.recordset.map((row) => row.Id);
}

async function countBySubject(subjectId, tx) {
  const request = await getRequest(tx);
  const result = await request.input('SubjectId', sql.Int, subjectId).query(
    'SELECT COUNT(*) AS Total FROM Questions WHERE SubjectId = @SubjectId AND IsDeleted = 0'
  );

  return result.recordset[0].Total;
}

module.exports = {
  toQuestion,
  toOption,
  create,
  insertOptions,
  findById,
  findOptionsByQuestionId,
  findByIdWithOptions,
  findAll,
  update,
  deleteOptions,
  softDelete,
  existsByIds,
  countBySubject,
};

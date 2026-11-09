// OWNER: Hiếu
// Service quản lý môn học: quy tắc nghiệp vụ, ném lỗi có statusCode + code.
// KHÔNG dùng req/res, KHÔNG viết SQL (CONTRACT.md:18).

const subjectRepository = require('../repositories/subject.repository');

function appError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function notFound() {
  return appError(404, 'SUBJECT_NOT_FOUND', 'Không tìm thấy môn học');
}

async function ensureExists(id) {
  const subject = await subjectRepository.findById(id);
  if (!subject) throw notFound();
  return subject;
}

async function ensureUnique({ code, name, excludeId }) {
  const duplicates = await subjectRepository.findDuplicates({ code, name, excludeId });
  if (code && duplicates.some((row) => row.Code === code)) {
    throw appError(409, 'SUBJECT_CODE_EXISTS', 'Mã môn đã tồn tại');
  }
  if (name && duplicates.some((row) => row.Name === name)) {
    throw appError(409, 'SUBJECT_NAME_EXISTS', 'Tên môn đã tồn tại');
  }
}

/**
 * @param {{ page: number, pageSize: number, keyword?: string }} query
 */
async function listSubjects(query) {
  const { items, total } = await subjectRepository.findAll(query);
  return { items, page: query.page, pageSize: query.pageSize, total };
}

async function getSubjectById(id) {
  return ensureExists(id);
}

async function createSubject({ code, name, description }) {
  await ensureUnique({ code, name });
  return subjectRepository.create({ code, name, description });
}

async function updateSubject(id, data) {
  await ensureExists(id);
  await ensureUnique({ code: data.code, name: data.name, excludeId: id });
  return subjectRepository.update(id, data);
}

async function deleteSubject(id) {
  await ensureExists(id);

  const { questionCount, examSetCount } = await subjectRepository.countUsages(id);
  if (questionCount > 0 || examSetCount > 0) {
    throw appError(
      409,
      'SUBJECT_IN_USE',
      'Môn học đang được câu hỏi hoặc bộ đề sử dụng, không thể xoá',
    );
  }

  const removed = await subjectRepository.remove(id);
  if (!removed) throw notFound();
  return null;
}

module.exports = {
  listSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};

// OWNER: Hiếu
// Controller quản lý môn học: chỉ đọc req, gọi service, trả res (CONTRACT.md:17).
// Không SQL, không if nghiệp vụ; id lấy từ req.params, KHÔNG lấy từ body.

const subjectService = require('../services/subject.service');
const AppError = require('../utils/AppError');

const listFromService = subjectService.listSubjects;
const getFromService = subjectService.getSubjectById;
const createFromService = subjectService.createSubject;
const updateFromService = subjectService.updateSubject;
const deleteFromService = subjectService.deleteSubject;

function parseId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw AppError.validation([
      { path: ['params', 'id'], message: 'Id phải là số nguyên dương' },
    ]);
  }
  return id;
}

async function listSubjects(req, res, next) {
  try {
    const data = await listFromService(req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

async function getSubjectById(req, res, next) {
  try {
    const subject = await getFromService(parseId(req));
    res.status(200).json(subject);
  } catch (error) {
    next(error);
  }
}

async function createSubject(req, res, next) {
  try {
    const created = await createFromService(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

async function updateSubject(req, res, next) {
  try {
    const updated = await updateFromService(parseId(req), req.body);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

async function deleteSubject(req, res, next) {
  try {
    await deleteFromService(parseId(req));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};

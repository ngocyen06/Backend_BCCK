// OWNER: Hiếu
// Controller quản lý user: chỉ đọc req, gọi service, trả res (CONTRACT.md:17).
// Không SQL, không if nghiệp vụ; id lấy từ req.params, KHÔNG lấy từ body.

const userService = require('../services/user.service');

function parseId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('Id không hợp lệ');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = [{ path: 'params.id', message: 'Id phải là số nguyên dương' }];
    throw error;
  }
  return id;
}

async function listUsers(req, res, next) {
  try {
    const data = await userService.listUsers(req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(parseId(req));
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const created = await userService.createUser(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const updated = await userService.updateUser(parseId(req), req.body);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const updated = await userService.updateUserRole(parseId(req), req.body.role);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const updated = await userService.updateUserStatus(parseId(req), req.body.isActive);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(parseId(req));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};

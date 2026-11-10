// OWNER: Khôi
'use strict';

const questionService = require('../services/question.service');

async function create(req, res, next) {
  try {
    const question = await questionService.create(req.body, req.user);
    res.status(201).json(question);
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await questionService.list(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const question = await questionService.getById(Number(req.params.id));
    res.status(200).json(question);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const question = await questionService.update(Number(req.params.id), req.body, req.user);
    res.status(200).json(question);
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await questionService.remove(Number(req.params.id), req.user);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
};

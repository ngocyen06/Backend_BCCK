// OWNER: Khôi
'use strict';

const examSetService = require('../services/examSet.service');

async function create(req, res, next) {
  try {
    const examSet = await examSetService.create(req.body, req.user);
    res.status(201).json(examSet);
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await examSetService.list(req.query, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const examSet = await examSetService.getById(Number(req.params.id), req.user);
    res.status(200).json(examSet);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const examSet = await examSetService.update(Number(req.params.id), req.body, req.user);
    res.status(200).json(examSet);
  } catch (error) {
    next(error);
  }
}

async function addQuestions(req, res, next) {
  try {
    const examSet = await examSetService.addQuestions(Number(req.params.id), req.body, req.user);
    res.status(200).json(examSet);
  } catch (error) {
    next(error);
  }
}

async function removeQuestion(req, res, next) {
  try {
    const examSet = await examSetService.removeQuestion(
      Number(req.params.id),
      Number(req.params.questionId),
      req.user
    );
    res.status(200).json(examSet);
  } catch (error) {
    next(error);
  }
}

async function publish(req, res, next) {
  try {
    const examSet = await examSetService.publish(Number(req.params.id), req.user);
    res.status(200).json(examSet);
  } catch (error) {
    next(error);
  }
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

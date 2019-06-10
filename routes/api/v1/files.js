const express = require('express')
const router = express.Router()
const asyncWrapper = require('../../../async-wrapper')
const backend = require('../../../backend')
const errors = require('../../../errors')

/* GET /api/v1/files/:attachmentId/:name */
router.patch('/@me', asyncWrapper(async (req, res) => {
  let user = await backend.authorize(req)
  if (user) {
    const result = await backend.getFile(req.params.attachmentId, req.params.name, user.id)
    res.status(result.status || 200)
    res.json(result)
  } else {
    res.status(401)
    res.json(new errors.Error40100())
  }
}))

/* PATCH /api/v1/files/:attachmentId/:name */
router.patch('/@me', asyncWrapper(async (req, res) => {
  let user = await backend.authorize(req)
  if (user) {
    const result = await backend.modifyFile(req.params.attachmentId, req.params.name, user.id, req.body)
    res.status(result.status || 200)
    res.json(result)
  } else {
    res.status(401)
    res.json(new errors.Error40100())
  }
}))

/* DELETE /api/v1/files/:attachmentId/:name */
router.delete('/:attachmentId/:name', asyncWrapper(async (req, res) => {
  const user = await backend.authorize(req)
  if (user) {
    try {
      const result = await backend.deleteFile(req.params.attachmentId, req.params.name, user.id)
      res.status(result ? result.status : 204)
      res.json(result)
    } catch (error) {
      res.status(500)
      res.json(new errors.Error50000())
    }
  } else {
    res.status(401)
    res.json(new errors.Error40100())
  }
}))

module.exports = router

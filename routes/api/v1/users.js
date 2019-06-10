const express = require('express')
const router = express.Router()
const multer = require('multer')
const asyncWrapper = require('../../../async-wrapper')
const backend = require('../../../backend')
const errors = require('../../../errors')

const upload = multer({ storage: multer.memoryStorage() })

/* GET /api/v1/users/@me */
router.get('/@me', asyncWrapper(async (req, res) => {
  const user = await backend.authorize(req)
  if (user) {
    res.status(200)
    res.json(user)
  } else {
    res.status(401)
    res.json(new errors.Error40100())
  }
}))

/* PATCH /api/v1/users/@me */
router.patch('/@me', asyncWrapper(async (req, res) => {
  let user = await backend.authorize(req)
  if (user) {
    user = await backend.modifyUser(user, req.body)
    res.status(200)
    res.json(user)
  } else {
    res.status(401)
    res.json(new errors.Error40100())
  }
}))

/* GET /api/v1/users/@me/files */
router.get('/@me/files', asyncWrapper(async (req, res) => {
  const user = await backend.authorize(req)
  if (user) {
    const resObject = {}
    try {
      resObject.totalFileCount = await backend.getUserFileCount(user.id)
      if (parseInt(req.query.limit) > 0) {
        resObject.files = await backend.getUserFiles(
          user.id, parseInt(req.query.limit) || undefined, req.query.before ? new Date(req.query.before) : undefined
        )
      } else {
        resObject.files = []
      }
      resObject.earlierFilesLeft = resObject.files.length
        ? await backend.getUserFileCount(
          user.id, resObject.files[resObject.files.length - 1].uploadTimestamp
        ) : 0
      res.status(200)
      res.json(resObject)
    } catch (error) {
      res.status(500)
      res.json(new errors.Error50000())
    }
  } else {
    res.status(401)
    res.json(new errors.Error40100())
  }
}))

/* POST /api/v1/users/@me/files */
router.post('/@me/files', upload.single('file'), asyncWrapper(async (req, res) => {
  const user = await backend.authorize(req)
  if (user) {
    if (!req.file) {
      res.status(400)
      res.json(new errors.Error40000('file'))
    } else if (req.file.originalname.length > 63) {
      res.status(400)
      res.json(new errors.Error40001('file.originalname', 'maximum length: 63 characters'))
    } else if (req.file.size > 8000000) {
      res.status(413)
      res.json(new errors.Error41300(8000000))
    } else {
      try {
        const file = await backend.saveFile(user.id, req.file.originalname, req.file.buffer)
        res.status(201)
        res.json(file)
      } catch (error) {
        res.status(500)
        res.json(new errors.Error50000())
      }
    }
  } else {
    res.status(401)
    res.json(new errors.Error40100())
  }
}))

module.exports = router

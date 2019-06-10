const express = require('express')
const router = express.Router()
const asyncWrapper = require('../async-wrapper')
const backend = require('../backend')

/* GET / */
router.get('/', asyncWrapper(async (req, res) => {
  const user = await backend.authorize(req)
  res.render('index', { user: user })
}))

module.exports = router

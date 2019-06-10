const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const btoa = require('btoa')
const asyncWrapper = require('../async-wrapper')

/* GET /logout */
router.get('/', asyncWrapper(async (req, res) => {
  if (req.cookies.accessToken) {
    await fetch(`https://discordapp.com/api/oauth2/token/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${process.env.DEBRIS_CLIENT_ID}:${process.env.DEBRIS_CLIENT_SECRET}`)}`
      },
      body: `token=${req.cookies.accessToken}`
    })
    res.clearCookie('accessToken')
  }
  res.redirect('/')
}))

module.exports = router

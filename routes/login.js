const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const btoa = require('btoa')
const asyncWrapper = require('../async-wrapper')
const backend = require('../backend')

/* GET /login */
router.get('/', asyncWrapper(async (req, res) => {
  if (req.query.code) {
    const response = await fetch(`https://discordapp.com/api/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${process.env.DEBRIS_CLIENT_ID}:${process.env.DEBRIS_CLIENT_SECRET}`)}`
      },
      body: (
        `grant_type=authorization_code&code=${req.query.code}` +
        `&redirect_uri=${process.env.DEBRIS_PROTOCOL ? process.env.DEBRIS_PROTOCOL.toLowerCase() : 'http'}://` +
        `${process.env.DEBRIS_FQDN}/login`
      )
    })
    const responseJSON = await response.json()
    if (responseJSON.access_token) {
      res.cookie('accessToken', responseJSON.access_token, {
        maxAge: responseJSON.expires_in * 1000, // 4 weeks in ms
        secure: process.env.DEBRIS_PROTOCOL && process.env.DEBRIS_PROTOCOL.toLowerCase() === 'https'
      })
      return res.redirect('/')
    }
  } else {
    if (req.query.error === 'access_denied') return res.redirect('/')
    const user = await backend.authorize(req)
    if (user) return res.redirect('/')
  }
  return res.redirect(
    `https://discordapp.com/api/oauth2/authorize?client_id=${process.env.DEBRIS_CLIENT_ID}` +
    `&redirect_uri=${process.env.DEBRIS_PROTOCOL ? process.env.DEBRIS_PROTOCOL.toLowerCase() : 'http'}://` +
    `${process.env.DEBRIS_FQDN}/login&response_type=code&scope=identify`
  )
}))

module.exports = router

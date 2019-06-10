const express = require('express')
const router = express.Router()
const request = require('request-promise-native')
const createError = require('http-errors')
const sharp = require('sharp')
const asyncWrapper = require('../async-wrapper')
const backend = require('../backend')

const processingSupportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff']
const processingSupportedFits = ['cover', 'contain', 'fill', 'inside', 'outside']

/* GET /files/:attachmentId/:name */
router.get('/:attachmentId/:name', asyncWrapper(async (req, res, next) => {
  const file = await backend.getFile(req.params.attachmentId)
  if (file && file.name === req.params.name) {
    const fileRequest = await request.get({
      url: `https://cdn.discordapp.com/attachments/${file.channelId}/${file.attachmentId}/${file.safeName}`,
      encoding: null,
      resolveWithFullResponse: true
    })
    res.status(200)
    res.set('content-type', fileRequest.headers['content-type'])
    res.set('content-length', fileRequest.headers['content-length'])
    res.set('cache-control', fileRequest.headers['cache-control'])
    res.set('connection', 'close')
    res.set('expires', fileRequest.headers['expires'])
    res.set('last-modified', fileRequest.headers['last-modified'])
    res.set('etag', fileRequest.headers['etag'])
    res.set('accept-ranges', 'bytes')
    res.set('x-robots-tag', fileRequest.headers['x-robots-tag'])
    let fileData = fileRequest.body
    // process parameters
    const width = parseInt(req.query.width) || null
    const height = parseInt(req.query.height) || null
    const fit = req.query.fit && processingSupportedFits.includes(req.query.fit) ? req.query.fit : 'inside'
    const format = req.query.format && processingSupportedTypes.includes(`image/${req.query.format}`)
      ? req.query.format
      : null
    let quality = parseInt(req.query.quality) || null
    // process image
    if (
      processingSupportedTypes.includes(fileRequest.headers['content-type']) && (
        width > 0 || height > 0 || quality > 0 ||
        (processingSupportedTypes.includes(format) && format !== fileRequest.headers['content-type'])
      )
    ) {
      let fileSharp = sharp(fileData)
      // resize
      if (width > 0 || height > 0) fileSharp.resize(width, height, { fit: fit, withoutEnlargement: true })
      // convert to format and adjust quality
      if (!quality) quality = 80
      else if (quality < 5) quality = 5
      else if (quality > 100) quality = 100
      if (
        (fileRequest.headers['content-type'] !== 'image/jpeg' && format === 'jpeg') ||
        (fileRequest.headers['content-type'] === 'image/jpeg' && !format && quality)
      ) {
        fileSharp.jpeg({
          quality: quality, trellisQuantisation: true, overshootDeringing: true, optimizeScans: true, force: true
        })
        res.set('content-type', 'image/jpeg')
      } else if (
        (fileRequest.headers['content-type'] !== 'image/png' && format === 'png') ||
        (fileRequest.headers['content-type'] === 'image/png' && !format && quality)
      ) {
        fileSharp.png({ force: true })
        res.set('content-type', 'image/png')
      } else if (
        (fileRequest.headers['content-type'] !== 'image/webp' && format === 'webp') ||
        (fileRequest.headers['content-type'] === 'image/webp' && !format && quality)
      ) {
        fileSharp.webp({ quality: quality, force: true })
        res.set('content-type', 'image/webp')
      } else if (
        (fileRequest.headers['content-type'] !== 'image/tiff' && format === 'tiff') ||
        (fileRequest.headers['content-type'] === 'image/tiff' && !format && quality)
      ) {
        fileSharp.tiff({ quality: quality, force: true })
        res.set('content-type', 'image/tiff')
      }
      // output
      fileData = await fileSharp.withMetadata().toBuffer()
    }
    return res.send(fileData)
  }
  next(createError(404))
}))

module.exports = router

'use strict'
const express = require('express')
const request = require('request')
const sharp = require('sharp')

const PORT = process.env.PORT
const DEFAULT_QUALITY = 40
const USER_AGENT =
  'Bandwidth-Hero Compressor (https://github.com/ayastreb/bandwidth-hero-proxy)'

process.on('uncaughtException', err => console.log(`process error: ${err}`))

const app = express()
if (PORT > 0) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`))
}

app.get('/', (req, res) => {
  const imageUrl = req.query.url
  const jpegOnly = !!req.query.jpeg
  const isGrayscale = req.query.bw != 0
  const quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY
  if (!imageUrl.match(/^https?:/i)) return res.status(400).end()

  let originalSize = 0
  const transformer = sharp()
    .grayscale(isGrayscale)
    .toFormat(jpegOnly ? 'jpeg' : 'webp', { quality })
  transformer.on('error', err => console.log(`Error in ${imageUrl}: ${err}`))
  transformer.on('info', info => {
    let headers = {
      'Content-Type': jpegOnly ? 'image/jpeg' : 'image/webp',
      'Content-Length': info.size
    }
    if (originalSize > 0) {
      headers['X-Original-Size'] = originalSize
      headers['X-Bytes-Saved'] = originalSize - info.size
    }
    res.writeHead(200, headers)
  })

  request
    .get({
      url: imageUrl,
      headers: {
        'User-Agent': USER_AGENT,
        Cookie: req.headers.cookie,
        'X-Forwarded-For': req.ip
      }
    })
    .on('response', res => (originalSize = res.headers['content-length']))
    .pipe(transformer)
    .pipe(res)
})

module.exports = app

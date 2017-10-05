'use strict'
const express = require('express')
const request = require('request')
const sharp = require('sharp')

const PORT = process.env.PORT
const QUALITY = 40

process.on('uncaughtException', err => console.log(`process error: ${err}`))

const app = express()
if (PORT > 0) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`))
}

app.get('/', (req, res) => {
  const imageUrl = req.query.url
  const jpegOnly = !!req.query.jpeg
  if (!imageUrl.match(/^https?:/i)) return res.status(400).end()

  let originalSize = 0
  const transformer = sharp()
    .grayscale()
    .toFormat(jpegOnly ? 'jpeg' : 'webp', { quality: QUALITY })
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
    .get(imageUrl)
    .on('response', res => (originalSize = res.headers['content-length']))
    .pipe(transformer)
    .pipe(res)
})

module.exports = app

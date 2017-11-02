'use strict'
require('newrelic')
const express = require('express')
const Raven = require('raven')
const request = require('request')
const sharp = require('sharp')

const PORT = process.env.PORT
const DEFAULT_QUALITY = 40
const USER_AGENT = 'Bandwidth-Hero Compressor'

Raven.config(process.env.SENTRY_DSN).install()

const app = express()
app.use(Raven.requestHandler())
app.get('/', (req, res) => {
  const imageUrl = req.query.url
  if (!imageUrl) {
    res.write('https://github.com/ayastreb/bandwidth-hero-proxy')
    return res.end()
  }
  const jpegOnly = !!req.query.jpeg
  const isGrayscale = req.query.bw != 0
  const quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY
  if (!imageUrl.match(/^https?:/i)) return res.status(400).end()

  let originalHeaders = {}
  const transformer = sharp()
    .grayscale(isGrayscale)
    .toFormat(jpegOnly ? 'jpeg' : 'webp', { quality })
  transformer.on('error', err => Raven.captureException)
  transformer.on('info', info => {
    let headers = Object.assign({}, originalHeaders, {
      'Content-Type': jpegOnly ? 'image/jpeg' : 'image/webp',
      'Content-Length': info.size
    })

    if (originalHeaders['content-length'] > 0) {
      headers['X-Original-Size'] = originalHeaders['content-length']
      headers['X-Bytes-Saved'] = originalHeaders['content-length'] - info.size
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
    .on('error', () => res.status(400).end())
    .on('response', res => {
      originalHeaders = res.headers
    })
    .pipe(transformer)
    .pipe(res)
})

app.use(Raven.errorHandler())
app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports = app

'use strict'
require('newrelic')
const express = require('express')
const Raven = require('raven')
const request = require('request')
const sharp = require('sharp')

const PORT = process.env.PORT
const DEFAULT_QUALITY = 40
const USER_AGENT =
  'Bandwidth-Hero Compressor (https://github.com/ayastreb/bandwidth-hero-proxy)'

Raven.config(process.env.SENTRY_DSN).install()

const app = express()
app.use(Raven.requestHandler())

app.get('/', (req, res) => {
  const imageUrl = req.query.url
  if (!imageUrl) {
    res.write(
      'Bandwidth Hero - https://github.com/ayastreb/bandwidth-hero-proxy'
    )
    return res.end()
  }
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

  try {
    request
      .get({
        url: imageUrl,
        headers: {
          'User-Agent': USER_AGENT,
          Cookie: req.headers.cookie,
          'X-Forwarded-For': req.ip
        }
      })
      .on('error', err => {
        console.log(`Could not get ${imageUrl}`)
        return res.status(400).end()
      })
      .on('response', res => (originalSize = res.headers['content-length']))
      .pipe(transformer)
      .pipe(res)
  } catch (e) {
    Raven.captureException(e)
  }
})

app.use(Raven.errorHandler())

app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports = app

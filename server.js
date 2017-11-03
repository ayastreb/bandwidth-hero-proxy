'use strict'
require('newrelic')
const Axios = require('axios')
const Express = require('express')
const Raven = require('raven')
const Sharp = require('sharp')

const PORT = process.env.PORT
const DEFAULT_QUALITY = 40
const DEFAULT_TIMEOUT = 5000
const MIN_COMPRESS_LENGTH = 512
const USER_AGENT = 'Bandwidth-Hero Compressor'

Raven.config(process.env.SENTRY_DSN).install()

const app = Express()
app.use(Raven.requestHandler())
app.get('/', (req, res) => {
  let imageUrl = req.query.url
  if (Array.isArray(imageUrl)) imageUrl = imageUrl.join('&url=')
  if (!imageUrl) return res.end('https://github.com/ayastreb/bandwidth-hero-proxy')
  if (!imageUrl.match(/^https?:/i)) return res.status(400).end()

  Axios.get(imageUrl, {
    headers: {
      Cookie: req.headers.cookie || '',
      'User-Agent': USER_AGENT,
      'X-Forwarded-For': req.ip
    },
    timeout: DEFAULT_TIMEOUT,
    responseType: 'stream'
  })
    .then(proxied => {
      const originLength = proxied.headers['content-length']
      if (originLength < MIN_COMPRESS_LENGTH) {
        return proxied.data.pipe(res).on('error', () => res.status(400).end())
      }

      const jpegOnly = !!req.query.jpeg
      const isGrayscale = req.query.bw != 0
      const quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY

      const transformer = Sharp()
        .grayscale(isGrayscale)
        .toFormat(jpegOnly ? 'jpeg' : 'webp', { quality })

      transformer.on('error', err => res.status(400).end())
      transformer.on('info', info => {
        if (!info) return

        let headers = Object.assign({}, proxied.headers, {
          'Content-Type': jpegOnly ? 'image/jpeg' : 'image/webp',
          'Content-Length': info.size
        })

        if (originLength > 0) {
          headers['X-Original-Size'] = originLength
          headers['X-Bytes-Saved'] = originLength - info.size
        }
        res.writeHead(200, headers)
      })

      proxied.data
        .pipe(transformer)
        .pipe(res)
        .on('error', () => res.status(400).end())
    })
    .catch(err => {
      Raven.captureException(err)
      res.status(400).end()
    })
})

app.use(Raven.errorHandler())
if (PORT > 0) app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports = app

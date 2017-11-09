#!/usr/bin/env node
'use strict'
const auth = require('basic-auth')
const Express = require('express')
const Raven = require('raven')
const Request = require('request')
const Sharp = require('sharp')

const PORT = process.env.PORT
const LOGIN = process.env.LOGIN
const PASSWORD = process.env.PASSWORD
const DEFAULT_QUALITY = 40
const DEFAULT_TIMEOUT = 10000
const MIN_COMPRESS_LENGTH = 512
const USER_AGENT = 'Bandwidth-Hero Compressor'

Raven.config(process.env.SENTRY_DSN).install()

const app = Express()
app.use(Raven.requestHandler())
app.get('/', (req, res) => {
  if (LOGIN && PASSWORD) {
    const credentials = auth(req)
    if (!credentials || credentials.name !== LOGIN || credentials.pass !== PASSWORD) {
      res.setHeader('WWW-Authenticate', `Basic realm="${USER_AGENT}"`)

      return res.status(401).end('Access denied')
    }
  }

  let imageUrl = req.query.url
  if (Array.isArray(imageUrl)) imageUrl = imageUrl.join('&url=')
  if (!imageUrl) {
    res.setHeader('Location', 'https://bandwidth-hero.com')
    return res.status(302).end()
  }
  const headers = {
    'User-Agent': USER_AGENT
  }
  headers['X-Forwarded-For'] = req.headers['X-Forwarded-For']
    ? `${req.ip}, ${req.headers['X-Forwarded-For']}`
    : req.ip
  if (req.headers.cookie) headers['Cookie'] = req.headers.cookie
  if (req.headers.dnt) headers['DNT'] = req.headers.dnt

  Request.head(imageUrl, { headers, timeout: DEFAULT_TIMEOUT }, (err, proxied) => {
    if (err) return res.status(400).end()
    if (
      proxied.statusCode === 200 &&
      proxied.headers['content-length'] > MIN_COMPRESS_LENGTH &&
      proxied.headers['content-type'] &&
      proxied.headers['content-type'].startsWith('image')
    ) {
      const originSize = proxied.headers['content-length']
      const format = !!req.query.jpeg ? 'jpeg' : 'webp'
      const isGrayscale = req.query.bw != 0
      const quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY
      const transformer = Sharp()
        .grayscale(isGrayscale)
        .toFormat(format, { quality })

      transformer.on('error', () => res.status(400).end())
      transformer.on('info', info => {
        if (!info || res.headersSent) return

        for (const header in proxied.headers) {
          try {
            res.setHeader(header, proxied.headers[header])
          } catch (e) {
            console.log(e)
          }
        }
        res.setHeader('Content-Type', `image/${format}`)
        res.setHeader('Content-Length', info.size)

        if (originSize > 0) {
          res.setHeader('X-Original-Size', originSize)
          res.setHeader('X-Bytes-Saved', originSize - info.size)
        }
      })

      const getReq = Request.get(imageUrl, { headers, timeout: DEFAULT_TIMEOUT })
        .on('error', () => res.status(400).end())
        .pipe(transformer)
        .pipe(res)
    } else if (!res.headersSent) {
      res.setHeader('Location', encodeURI(imageUrl))
      res.status(302).end()
    }
  }).on('error', () => res.status(400).end())
})

app.use(Raven.errorHandler())
if (PORT > 0) app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports = app

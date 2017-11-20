const request = require('request')
const omit = require('lodash').omit
const shouldCompress = require('./shouldCompress')
const redirect = require('./redirect')
const compress = require('./compress')
const bypass = require('./bypass')
const copyHeaders = require('./copyHeaders')

function proxy(req, res) {
  const start = process.hrtime()
  request.get(
    req.params.url,
    {
      headers: {
        ...omit(req.headers, ['host', 'connection']),
        'user-agent': 'Bandwidth-Hero Compressor',
        'x-forwarded-for': req.headers['x-forwarded-for']
          ? `${req.ip}, ${req.headers['x-forwarded-for']}`
          : req.ip
      },
      timeout: 10000,
      maxRedirects: 5,
      encoding: null,
      forever: true,
      strictSSL: false,
      gzip: true,
      jar: true
    },
    (err, origin, buffer) => {
      const end = process.hrtime(start)
      const statusCode = (origin && origin.statusCode) || undefined
      req.log = {
        http_status: statusCode,
        http_error: (err && err.message) || (statusCode === 400 && buffer.toString()) || undefined,
        http_time: (end[0] * 1e6 + end[1]) / 1e6
      }
      if (err || statusCode >= 400) return redirect(req, res)

      copyHeaders(origin, res)
      res.setHeader('content-encoding', 'identity')
      req.params.originType = origin.headers['content-type'] || ''
      req.params.originSize = buffer.length

      if (shouldCompress(req)) {
        compress(req, res, buffer)
      } else {
        bypass(req, res, buffer)
      }
    }
  )
}

module.exports = proxy

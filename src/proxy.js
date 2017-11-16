const request = require('request')
const shouldCompress = require('./shouldCompress')
const redirect = require('./redirect')
const compress = require('./compress')
const bypass = require('./bypass')

function proxy(req, res) {
  request.get(
    req.params.url,
    {
      headers: {
        'user-agent': 'Bandwidth-Hero Compressor',
        'x-forwarded-for': req.headers['x-forwarded-for']
          ? `${req.ip}, ${req.headers['x-forwarded-for']}`
          : req.ip,
        cookie: req.headers.cookie,
        dnt: req.headers.dnt
      },
      timeout: 10000,
      maxRedirects: 5,
      encoding: null,
      jar: true
    },
    (err, origin, buffer) => {
      if (err || origin.statusCode !== 200) return redirect(req, res)

      for (const [key, value] of Object.entries(origin.headers)) {
        try {
          res.setHeader(key, value)
        } catch (e) {}
      }
      req.params.originType = origin.headers['content-type'] || ''
      req.params.originSize = origin.headers['content-length'] || 0

      if (shouldCompress(req)) {
        compress(req, res, buffer)
      } else {
        bypass(res, buffer)
      }
    }
  )
}

module.exports = proxy

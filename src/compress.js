const sharp = require('sharp')
const redirect = require('./redirect')
const logger = require('./logger')

function compress(req, res, input) {
  const format = req.params.webp ? 'webp' : 'jpeg'
  const start = process.hrtime()

  sharp(input)
    .grayscale(req.params.grayscale)
    .toFormat(format, { quality: req.params.quality })
    .toBuffer((err, output, info) => {
      const end = process.hrtime(start)
      req.log['compress_time'] = `${end[0]}s ${end[1] / 1e6}ms`
      req.log['compress_size'] = info.size
      req.log['compress_error'] = (err && err.message) || ''
      logger('compress', req)

      if (err || !info || res.headersSent) return redirect(req, res)

      res.setHeader('content-type', `image/${format}`)
      res.setHeader('content-length', info.size)
      res.setHeader('x-original-size', req.params.originSize)
      res.setHeader('x-bytes-saved', req.params.originSize - info.size)
      res.status(200)
      res.write(output)
      res.end()
    })
}

module.exports = compress

const sharp = require('sharp')
const redirect = require('./redirect')

function compress(req, res, input) {

  sharp(input)
    .grayscale(req.params.grayscale)
    .toFormat('webp', {
      quality: req.params.quality,
      nearLossless: true
    })
    .toBuffer((err, output, info) => {
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

const sharp = require('sharp')
const redirect = require('./redirect')
const cacheMgr = require('cache-manager')
const cacheStore = require('cache-manager-fs-binary')
const cache = cacheMgr.caching({
    store: cacheStore,
    options: {
        ttl: 604800, //7d
        maxsize: 1073741824, //1GB
        path: './cache',
        preventfill: true
    }
})

function compress(req, res, input) {
  const format = req.params.webp ? 'webp' : 'jpeg'
  const key = req.params.url || ''

  cache.wrap(key, (callback) => {
    sharp(input)
    .grayscale(req.params.grayscale)
    .toFormat(format, {
      quality: req.params.quality,
      progressive: true,
      optimizeScans: true
    })
    .toBuffer((err, output, info) => {
      callback(err, {binary: {output: output}, info: info})
    })
  }, (err, obj) => {
    if (err || !obj || !obj.info || res.headersSent) return redirect(req, res)
    res.setHeader('content-type', `image/${format}`)
    res.setHeader('content-length', obj.info.size)
    res.setHeader('x-original-size', req.params.originSize)
    res.setHeader('x-bytes-saved', req.params.originSize - obj.info.size)
    res.status(200)
    res.write(obj.binary.output)
    res.end()
  })
}

module.exports = compress

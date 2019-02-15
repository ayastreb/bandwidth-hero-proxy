const sharp = require('sharp')
const redirect = require('./redirect')

function compress(req, res, input) {
  const format = req.params.webp ? 'webp' : 'jpeg'

  const image = sharp(input);
  
  image
    .metadata(function(err, metadata){
        let pixelCount = metadata.width * metadata.height;
        var compressionQuality = req.params.quality;
        
        if(pixelCount > 3000000 || metadata.size > 1536000){
            compressionQuality *= 0.1
        }else if(pixelCount > 2000000 && metadata.size > 1024000){
            compressionQuality *= 0.25
        }else if(pixelCount > 1000000 && metadata.size > 512000){
            compressionQuality *= 0.5
        }else if(pixelCount > 500000 && metadata.size > 256000){
            compressionQuality *= 0.75
        }
        
        sharp(input)
            .grayscale(req.params.grayscale)
            .toFormat(format, {
            quality: compressionQuality,
            progressive: true,
            optimizeScans: true
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
    })
}

module.exports = compress

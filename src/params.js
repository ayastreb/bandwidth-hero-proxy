const DEFAULT_QUALITY = 40

function params(req, res, next) {
  if (req._parsedUrl.pathname == "/") {
    // old URL format /?url=https%3A%2F%2Fhost%2Fpath%2Ffile.jpg%3FqueryString&jpeg=0&bw=0&l=50
    let url = req.query.url
    if (Array.isArray(url)) url = url.join('&url=')
    if (!url) return res.end('bandwidth-hero-proxy')

    url = url.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, 'http://')
    req.params.url = url
    req.params.webp = !req.query.jpeg
    req.params.grayscale = req.query.bw != 0
    req.params.quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY
  }
  else {
    // new URL format /https/host/path/file.jpg.c50.webp?queryString
    const match = req.url.match(/^\/(\w+)\/(.*?).([bc])(\d{1,3})\.(\w+)(\?.*)?$/);
    if (match) {
      req.params.url = match[1] + "://" + match[2]; // protocol + host + path
      if(match[6]) {
        req.params.url += match[6]; // query string
      }
      req.params.grayscale = (match[3] == "b");
      req.params.quality = parseInt(match[4], 10) || DEFAULT_QUALITY;
      req.params.webp = (match[5] == "webp");
    }
  }
  next()
}

module.exports = params

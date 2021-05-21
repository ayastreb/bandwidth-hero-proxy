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
    // new URL format /k=v&k2=v2/https/host/path/file.jpg.c50.webp?queryString
    const match = req.url.match(/^(?:\/([^/]+?=[^/]+))?\/(\w+)\/(.*?).([bc])(\d{1,3})\.(\w+)(\?.*)?$/);
    if (match) {
      
      let queryObj = {};
      if (match[1]) {
        // parse internal query string before protocol
        let input = match[1];
        const re = /([^?&=]+)(?:=([^&]+))?/g;
        let match2;
        while (match2 = re.exec(input)) {
          queryObj[match2[1]] = decodeURIComponent(match2[2]);
        }
      }

      // reconstruct original URL
      req.params.url = match[2] + "://" + match[3]; // protocol + host + path
      if (queryObj.appendPath) {
        req.params.url += queryObj.appendPath;
      }
      if(match[7]) {
        req.params.url += match[7]; // query string
      }
      
      // set compression parameters
      req.params.grayscale = (match[4] == "b");
      req.params.quality = parseInt(match[5], 10) || DEFAULT_QUALITY;
      req.params.webp = (match[6] == "webp");
    }
  }
  next()
}

module.exports = params

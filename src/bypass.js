function bypass(req, res, buffer) {
  res.setHeader('x-proxy-bypass', 1)
  res.setHeader('content-length', buffer.length)
  let filename = (new URL(req.params.url).pathname.split('/').pop())
  if(filename){
    res.setHeader('Content-Disposition', ['inline', 'filename=' + filename ])
  }
  res.status(200)
  res.write(buffer)
  res.end()
}

module.exports = bypass

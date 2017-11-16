function bypass(res, buffer) {
  res.setHeader('X-Proxy-Bypass', 1)
  res.status(200)
  res.write(buffer)
  res.end()
}

module.exports = bypass

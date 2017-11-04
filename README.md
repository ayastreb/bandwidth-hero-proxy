# Bandwidth Hero Compression Proxy
[![NSP Status](https://nodesecurity.io/orgs/bandwidth-hero/projects/1f035cf0-00f2-43db-9bc0-8e39adb24642/badge)](https://nodesecurity.io/orgs/bandwidth-hero/projects/1f035cf0-00f2-43db-9bc0-8e39adb24642)


This proxy server is used by [Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) Chrome extension.
It compresses given image to greyscale [WebP](https://developers.google.com/speed/webp/) image.

It downloads original image and transforms it with [Sharp](https://github.com/lovell/sharp) on the fly without saving images on disk.

This is **NOT** an anonymizing proxy &mdash; it downloads images on user's behalf,
passing cookies and user's IP address through to the origin host.

## Deployment

### Heroku
You can deploy this proxy server to Heroku:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/ayastreb/bandwidth-hero-proxy)

### Webtask
You can also use [webtask.io](https://webtask.io/) to run the server:

* Clone the repository:

  ```
  git clone https://github.com/ayastreb/bandwidth-hero-proxy.git
  ```

* Install [Webtask CLI](https://webtask.io/cli):

  ```
  npm install wt-cli -g

  wt init __your_email__
  ```

* Create new webtask:

  ```
  wt create server.js --meta wt-compiler=webtask-tools/express
  ```

# Bandwidth Hero Compression Proxy

This proxy server is used by [Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) Chrome extension.
It compresses given image to greyscale [WebP](https://developers.google.com/speed/webp/) image.

It uses [Request](https://github.com/request/request) to pipe original image
through [Sharp](https://github.com/lovell/sharp).

## Deployment

# Heroku
You can deploy this proxy server to Heroku:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

# Webtask
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

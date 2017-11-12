# Bandwidth Hero Data Compression Service

[![NSP Status](https://nodesecurity.io/orgs/bandwidth-hero/projects/1f035cf0-00f2-43db-9bc0-8e39adb24642/badge)](https://nodesecurity.io/orgs/bandwidth-hero/projects/1f035cf0-00f2-43db-9bc0-8e39adb24642)


This data compression service is used by [Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) browser extension.
It compresses given image to low-res [WebP](https://developers.google.com/speed/webp/) or JPEG image.
Optionally it also converts image to greyscale to save even more data.

It downloads original image and transforms it with [Sharp](https://github.com/lovell/sharp) on the fly without saving images on disk.

This is **NOT** an anonymizing proxy &mdash; it downloads images on user's behalf,
passing cookies and user's IP address through to the origin host.

## Deployment

### Heroku
You can deploy this service to Heroku:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/ayastreb/bandwidth-hero-proxy)

### Webtask
You can also use [webtask.io](https://webtask.io/) to run the service:

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

<a target='_blank' rel='nofollow' href='https://app.codesponsor.io/link/GNA5BNmoDRUjxvuDQsxXY3kW/ayastreb/bandwidth-hero-proxy'>
  <img alt='Sponsor' width='888' height='68' src='https://app.codesponsor.io/embed/GNA5BNmoDRUjxvuDQsxXY3kW/ayastreb/bandwidth-hero-proxy.svg' />
</a>

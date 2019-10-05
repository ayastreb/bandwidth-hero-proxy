# Bandwidth Hero Data Compression Service

[![NSP Status](https://nodesecurity.io/orgs/bandwidth-hero/projects/1f035cf0-00f2-43db-9bc0-8e39adb24642/badge)](https://nodesecurity.io/orgs/bandwidth-hero/projects/1f035cf0-00f2-43db-9bc0-8e39adb24642)

This data compression service is used by
[Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) browser extension. It compresses given
image to low-res [WebP](https://developers.google.com/speed/webp/) or JPEG image. Optionally it also
converts image to greyscale to save even more data.

It downloads original image and transforms it with [Sharp](https://github.com/lovell/sharp) on the
fly without saving images on disk.

This is **NOT** an anonymizing proxy &mdash; it downloads images on user's behalf, passing cookies
and user's IP address through to the origin host.

## Deployment

#### ENVIRONMENT_VARIABLES
`MIN_COMPRESS_LENGTH=2048` Default=2048 (minimum byte length for an image to be compressible; default 2048 ~2kB)<br/>
`DISABLE_ANIMATED=1` (Disable small apng passthrough and animated GIF to animated webp conversion (uses temp dir; Can also be "true")<br/>
`VIDEO_QUALITY_MULTIPLIER` Default=10 (The Integer to multiply the 20-80 Quality value (l param) by to get the target video bitrate in kbps. For example, if multiplier is set to 10. Low(20) sets a target bitrate of 200kbps)<br/>
`AUDIO_QUALITY_MULTIPLIER` Default=2 (The Integer to multiply the 20-80 Quality value (l param) by to get the target video bitrate in kbps. For example, if multiplier is set to 2. Low(20) sets a target bitrate of 40kbps)<br/>
`MEDIA_TIMEOUT` Default=7200 (Set the timeout in seconds for outputted Audio and Video streams)<br/>
`VIDEO_HEIGHT_THRES` Default=360 (Set the maximum video height threshold in Pixels. 480 becomes 480p, etc)<br/>
`VIDEO_WEBM_CPU_USED` Default=7 (sets -cpu-used flag in the libvpx-vp9 video encoder. Current valid values at time of writing are (-8 thru 8) Read more about this [here](https://trac.ffmpeg.org/wiki/Encode/VP9#CPUUtilizationSpeed))

### Heroku

You can deploy this service to Heroku:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/ayastreb/bandwidth-hero-proxy)

[![Deploy to Heroku guide](http://img.youtube.com/vi/y3tkYEXAics/0.jpg)](http://www.youtube.com/watch?v=y3tkYEXAics)

### Self-hosted

Data compression service is a Node.js app which you can run on any server that supports Node.js.
Check out
[this guide](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04)
on how to setup Node.js on Ubuntu.

DigitalOcean also provides an
[easy way](https://www.digitalocean.com/products/one-click-apps/node-js/) to setup a server ready to
host Node.js apps.

'use strict';
const _ = require('lodash');
const pusher = require('../../lib/pusher');

module.exports = results => new Promise(resolve => {
  // Bail if we do not have pusher
  if (!pusher) return resolve(results);

  // Decide which pusher channel to push over
  let channel = /\.(gif|jpg|jpeg|tiff|png)$/i.test(results.url) ? 'image' : 'url';

  // Grab a timestamp
  let timestamp = Date.now();

  // Prepare Output
  let output = {
    url: results.url,
    to: results.to,
    from: results.from,
    timestamp,
    title: results.title || '',
    threat: _.isEmpty(results.threats)
  };

  // Include an ID if we have one
  if (results.id) output.id = results.id;
  // Include a ShortUrl if we have one
  if (results.shortUrl) output.shortUrl = results.shortUrl;

  // Set output to Pusher
  pusher.trigger('public', channel, output);

  // Append results
  results.delivered.push({
    protocol: 'pusher',
    to: channel,
    on: timestamp
  });

  // Trigger a update on the youtube channel if we have a youtube link
  // Fire off youtube data
  if (
    pusher &&
    results.youTube &&
    results.youTube.video &&
    results.youTube.video.key
  ) {
    let pusherVars = {
      to: results.to,
      from: results.from,
      timestamp: results.timestamp,
      videoTitle: results.youTube.video.videoTitle,
      youtubeKey: results.youTube.video.key,
      url: results.url
    };
    pusher.trigger('public', 'youtube', pusherVars);
  }

  resolve(results);
});

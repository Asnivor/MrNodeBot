'use strict';
const scriptInfo = {
    name: 'Voice Emergency',
    file: 'voiceEmergency.js',
    desc: 'Voice the last 100 active users',
    createdBy: 'Dave Richer'
};

const _ = require('lodash');
const Models = require('bookshelf-model-loader');
const threshold = 50;

module.exports = app => {
    if (!app.Database || !Models.Logging) return scriptInfo;

    const voiceEmergency = (to, from, text, message) => {
        let [channel] = text.split(' ');
        channel = channel || to;

        if (channel && !app.isInChannel(channel)) {
            app.say(from, `I am not in the channel ${channel}`);
            return;
        }

        Models.Logging.query(qb => qb.where(clause =>
                    clause.where('to', 'like', channel)
                )
                //.distinct('from')
                .orderBy('id', 'desc')
                //.limit(threshold)
            )
            .fetchAll()
            .then(results => {
                if (!app.isInChannel(channel)) {
                    app.say(from, `I am not in ${channel}`);
                    return;
                }
                if (!app._ircClient.isOpInChannel(channel)) {
                    app.say(from, `I am not an op in ${channel}`);
                    return;
                }
                let msgCount = [];
                let count = 1;
                let jResults = _(results.toJSON());
                jResults.each(v => {
                    msgCount[v.from] = _.isUndefined(msgCount[v.from]) ? 1 : msgCount[v.from] + 1;
                });
                jResults.each(v => {
                    if (msgCount[v.from] < threshold || !app.isInChannel(channel, v.from) || app._ircClient.isOpOrVoiceInChannel(channel, v.from))
                        return;
                    msgCount[v.from] = 0;
                    setTimeout(() => {
                       app._ircClient.send('mode', channel, '+v', v.from);
                    }, 1000 * count);
                    count = count + 1;
                });
            });
    };

    // Terminate the bot and the proc watcher that keeps it up
    app.Commands.set('voice-emergency', {
        desc: '[Channel?] Voice the last 50 active people in a channel',
        access: app.Config.accessLevels.admin,
        call: voiceEmergency
    });

    // Return the script info
    return scriptInfo;
};
'use strict';
const scriptInfo = {
    name: 'Voice Regulars',
    file: 'voiceRegulars.js',
    desc: 'Voice users by participation',
    createdBy: 'Dave Richer'
};

const _ = require('lodash');
const Models = require('bookshelf-model-loader');
const threshold = 50;

module.exports = app => {
    if (!app.Database || !Models.Logging) return scriptInfo;

    const voiceRegulars = (to, from, text, message) => {
        let txtArray = text.split(' ');
        let channel = null;
        let thresh = null;

        switch (txtArray.length) {
            case 1:
                channel = _.isEmpty(txtArray[0]) ? to : txtArray[0];
                thresh = threshold;
                break;
            case 2:
                channel = txtArray[0];
                thresh = txtArray[1] % 1 === 0 ? txtArray[1] : threshold;
                break
        }

        if (!app.isInChannel(channel)) {
            app.say(from, `I am not in the channel ${channel}`);
            return;
        }

        Models.Logging
            .query(qb => qb
                .where('to', 'like', channel)
                .orderBy('id', 'desc')
            )
            .fetchAll()
            .then(results => {
                if (!app.isInChannel(channel) || !app._ircClient.isOpInChannel(channel)) {
                    app.say(from, `I am not in or an Op in ${channel}`);
                    return;
                }
                _(results.toJSON())
                    .groupBy('from')
                    .filter((v, k) => app.isInChannel(channel, k) && !app._ircClient.isOpOrVoiceInChannel(channel, k))
                    .mapKeys(v => _.first(v).from)
                    .mapValues(v => v.length)
                    .map((count, nick) => {
                        if (count >= thresh) return nick
                    })
                    .chunk(4)
                    .each((v, k) => {
                        setTimeout(() => app._ircClient.send('MODE', channel, '+' + 'v'.repeat(v.length), v[0], v[1] || '', v[2] || '', v[3] || ''), (1 + k) * 1000);
                    });
            });
    };

    // Terminate the bot and the proc watcher that keeps it up
    app.Commands.set('voice-regulars', {
        desc: '[Channel?] [Threshold?] Voice the regulars in a channel',
        access: app.Config.accessLevels.admin,
        call: voiceRegulars
    });

    // Return the script info
    return scriptInfo;
};

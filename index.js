'use strict';

// MrNodeBot
const _ = require('lodash');
const fs = require('fs');
const Bot = require('./bot');
const args = require('minimist')(process.argv.slice(2));
const conLogger = require('./lib/consoleLogger');

// Check if specified config file exists
if (_.isObject(args.config)) {
    fs.access(args.config, fs.F_OK, err => {
        if (err) {
            conLogger('The config file you specified does not exist, defaulting to config.js', 'danger');
            return;
        }
    });
}

const bot = new Bot(app => {
    // Code here will be executed after the bot is finished connecting
    if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
    }
    process.stdin.on('data', (b) => {
        if (b[0] === 3) {
            app._ircClient.disconnect('I have been terminated from the Console. Goodbye cruel world...', () => {
                if (process.stdin.setRawMode) {
                    process.stdin.setRawMode(false);
                }
                process.exit();
            });
        }
    });
}, args.config);

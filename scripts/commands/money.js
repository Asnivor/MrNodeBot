'use strict';

const scriptInfo = {
    name: 'Money',
    desc: 'Conversions and such',
    createdBy: 'IronY'
};

const _ = require('lodash');
require('lodash-addons');
const fx = require('money');
const request = require('request-promise-native');
const logger = require('../../lib/logger');
const scheduler = require('../../lib/scheduler');
const getSymbol = require('currency-symbol-map');

// Add Symbols
// TODO Extract this into a better system
_.set(getSymbol.currencySymbolMap, 'BTC', '฿');
_.set(getSymbol.currencySymbolMap, '฿', 'BTC');

const fixerApi = 'http://api.fixer.io/latest'; // API For Country exchange rates
const btcApi = 'https://bitpay.com/api/rates'; // API For BTC exchange rates

module.exports = app => {
    // Base currency
    const baseCur = _.getString(_.get(app.Config, 'features.exchangeRate.base'), 'USD').toUpperCase();

    // Set base currency in money.js
    fx.base = baseCur;

    const updateRates = scheduler.schedule('updateCurRates', {
            hour: [scheduler.Range(0,23)],
            minute: 0
        }, () =>
        // Get the initial conversion rates
        request(fixerApi, {
            json: true,
            method: 'get',
            qs: {
                base: baseCur
            }
        })
        // Set the rate sin money.js
        .then(data => {
            // No rates available
            if (!_.isObject(data.rates) || _.isEmpty(data.rates)) {
                logger.error(`Something went wrong fetching exchange rates`, {
                    data
                });
                return;
            }
            // Received Rates
            logger.info('Updating exchange rates');
            // Adjust rates in money
            fx.rates = data.rates
        })
        .then(() =>
            // Get the BTC Rate
            request(btcApi, {
                json: true,
                method: 'get'
            })
            // Set the BTC Rate
            .then(data => {
                // No Data available
                if (!_.isArray(data) || _.isEmpty(data)) {
                    logger.error('Error fetching BitCoin data for exchange seeding', {
                        data
                    });
                    return;
                }
                // Find the base currency in the btc info
                let btc = _.find(data, o => o.code === baseCur);
                if (!btc || !btc.code || isNaN(btc.rate) || btc.rate === 0) {
                    logger.error('Error fetching BitCoin data, data returned is not formated correctly', {
                        data
                    });
                    return;
                }
                // Set the BTC rate based on inverse exchange
                fx.rates.BTC = 1 / btc.rate;
            }))
        .catch(err => logger.error('Something went wrong getting currency rates', {
            err
        }))
    );

    // initial run
    if (_.isFunction(scheduler.jobs.updateCurRates.job)) scheduler.jobs.updateCurRates.job();
    // The function does not exist, log error
    else logger.error(`Something went wrong with the currency exchange rate job, no function exists`);

    // Provide exchange
    const exchange = (to, from, text, message) => {
        // No text available
        if (_.isEmpty(text)) {
            app.say(to, `I need some more information ${from}`);
            return;
        }
        // Extract variables
        let [amount, cFrom, cTo] = text.split(' ');
        // Verify amount is numeric
        if (!_.isSafeInteger(_.parseInt(amount))) {
            app.say(to, `That is not a valid amount ${from}`);
            return;
        }
        // Verify we have a target currency
        if (!cFrom) {
            app.say(to, `I need a currency to convert from`);
            return;
        }
        // Normalize
        cFrom = cFrom.toUpperCase();
        cTo = (cTo || baseCur).toUpperCase();
        // Attempt conversion
        try {
            // If no cTo is provided, assume default base
            let result = fx.convert(amount, {
                from: cFrom,
                to: cTo
            });
            app.say(to, `At the current exchange rate ${getSymbol(cFrom) || ''}${amount} ${cFrom} is ${getSymbol(cTo) || ''}${result.toFixed(2)} ${cTo}, ${from}`);
        } catch (err) {
            app.say(to, `I am unable to convert ${cFrom} to ${cTo} ${from}`);
        }
    };

    // Evaluate
    app.Commands.set('exchange', {
        desc: '[amount from to?] - Convert currency based on current exchange rates',
        access: app.Config.accessLevels.identified,
        call: exchange
    });


    return scriptInfo;
};
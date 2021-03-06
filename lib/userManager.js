const Models = require('funsociety-bookshelf-model-loader');
const config = require('../config');
const _ = require('lodash');

const scrypt = require('scrypt');

const scryptParameters = {
    N: 16,
    r: 1,
    p: 1,
};

const _salt =  Buffer.from(config.userManager.salt);
const _keyLength = config.userManager.keyLength;

class UserManager {
    constructor() {
    }

    // Properties

    // Methods

    // Create a new user
    // noinspection JSMethodCanBeStatic
    async create(nick, email, password, host) {
        const passwordHash = await scrypt.hash(Buffer.from(password), scryptParameters, _keyLength, _salt);

        return await Models.Users.create({
            nick,
            email,
            host,
            password: passwordHash.toString('base64'),
        });
    }

    // Verify the credentials of a user
    // noinspection JSMethodCanBeStatic
    async verify(nick, password) {
        if (!nick || !password) return false;

        const result = await Models.Users
            .where('nick', 'like', nick)
            .fetch();

        if (!result) throw new Error(t('libraries:userDoesNotExist'));

        const hash = await scrypt.hash(password, scryptParameters, _keyLength, _salt);

        if (!hash) throw new Error('Something went wrong verifying your account');

        return hash.toString('base64') === result.attributes.password;
    }

    // Update the users host
    // noinspection JSMethodCanBeStatic
    async updateUserDetails(nick, host, ident) {
    }

    // Get Users by Nick
    // TODO Test
    // noinspection JSMethodCanBeStatic
    async getByNick(nick, callback) {
        const callbackProvided = _.isFunction(callback);

        if (!nick || !_.isString(nick) || _.isEmpty(nick)) return callbackProvided ? callback(null) : null;

        try {
            const result = await Models.Users.where('nick', '=', nick).fetch();
            return callbackProvided ? callback(result) : result;
        } catch (err) {
            return callbackProvided ? callback(null) : null;
        }
    }
}

module.exports = UserManager;

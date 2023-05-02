const bcrypt = require('bcrypt')
const async = require('async')
var users = require('./../../data.js').users;

module.exports.getId = function(user, cb) {
    cb(null, user.id)
};

module.exports.fetchById = async function(id, cb) {
    const user = users.find(u => u.id === id)
    if (user) return cb(null, user);
    cb();
};

module.exports.fetchByUsername = async function(username, cb) {
    const user = users.find(u => u.username === username)
    if (user) return cb(null, user);
    cb();
};

module.exports.checkPassword = async function(user, password, cb) {
    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash)
    cb(null, isPasswordCorrect);
};

module.exports.fetchFromRequest = async function(req, cb) {
    let user
    await this.fetchByUsername(req.session.user, (err, foundUser) => {
        user = foundUser
    })
    cb(null, user);
};
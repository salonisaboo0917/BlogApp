const jwt = require('jsonwebtoken');

function loginToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        noTimestamp: true
    });
}

function resetToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '15m'
    });
}

module.exports = { loginToken, resetToken };

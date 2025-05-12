const bcrypt = require('bcryptjs');

function encrypt(password) {
    return bcrypt.hash(password, 10);
}

function match(unencrypted, encrypted) {
    return bcrypt.compare(unencrypted, encrypted);
}

module.exports = { encrypt, match };

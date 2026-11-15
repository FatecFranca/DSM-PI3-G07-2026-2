const bcrypt = require('bcrypt');

module.exports = {
    encryptPassword(password) {
        return bcrypt.hash(password, 10);
    },
    
    comparePassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }
};
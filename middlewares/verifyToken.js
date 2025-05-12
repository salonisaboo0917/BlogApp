const jwt = require('jsonwebtoken');
const sendRes = require('../utils/response');

function admin(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  
        if(req.user.role !== "admin")
            return sendRes(res, 403, false, "You are not an admin");
        next();  
    } catch (error) {
        return sendRes(res, 401, false, "Token expired or invalid");
    }
}

function user(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  
        next();  
    } catch (error) {
        return sendRes(res, 401, false, "Token expired or invalid");
    }
}
module.exports = {admin, user};

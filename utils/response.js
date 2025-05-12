function sendRes(res, status, success, message, token) {
    const responseObject = {
        status,
        success,
        message,
    };

    if (token) responseObject.token = token;

    return res.status(status).json(responseObject);
}

module.exports = sendRes;

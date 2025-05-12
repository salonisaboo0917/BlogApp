const joi = require('joi');
const sendRes = require('../utils/response');

const validator = function(schema) {
    return function signupValidator(req,res,next) {
        const {error} = schema.validate(req.body);
        if(error) {
            console.log(error);
            return sendRes(res,400,false,error.message);
        }
        next();
    }
}
module.exports = validator;
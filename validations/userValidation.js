const joi = require('joi');

const userSchemaSignUp = joi.object({
    first_name: joi.string().required(),
    last_name: joi.string().required(),
    email: joi.string().email().required(),
    mobile_no: joi.string().min(10).max(10).required(),
    password: joi.string().min(6).required()
});

const userSchemaLogin = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required()
});

const changePasswordSchema = joi.object({
    currPass: joi.string().min(6).required(),
    newPass: joi.string().min(6).required(),
    cnfPass: joi.string().min(6).required()
});

module.exports = { userSchemaLogin, userSchemaSignUp, changePasswordSchema };

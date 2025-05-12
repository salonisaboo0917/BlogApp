const joi = require('joi');

const blogSchema = joi.object({
    name: joi.string().required(),
    description: joi.string().required(),
    category: joi.string().required(),
    short_description: joi.string().required()
});

module.exports = blogSchema;

const Joi = require('joi');

const shopRegistrationSchema = Joi.object({
    shopName: Joi.string()
        .trim()
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.empty': 'Shop name cannot be empty',
            'string.min': 'Shop name must be at least 3 characters',
            'any.required': 'Shop name is required'
        }),

    subdomain: Joi.string()
        .trim()
        .lowercase()
        .min(3)
        .max(20)
        // Regex: Exact same rule as Mongoose to keep them synced
        .pattern(/^[a-z0-9]+$/)
        .required()
        .messages({
            'string.empty': 'Subdomain cannot be empty',
            'string.pattern.base': 'Subdomain can only contain letters and numbers (no spaces or special characters)',
            'string.min': 'Subdomain must be at least 3 characters',
            'string.max': 'Subdomain cannot exceed 20 characters',
            'any.required': 'Subdomain is required'
        }),

    // We include password and email here because they usually come in the same registration request
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().required()
});

module.exports = { shopRegistrationSchema };
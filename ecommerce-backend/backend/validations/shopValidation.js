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
        .max(40)
        // Keep this synced with the Shop model and availability service.
        .pattern(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/)
        .required()
        .messages({
            'string.empty': 'Subdomain cannot be empty',
            'string.pattern.base': 'Store URL can only contain lowercase letters, numbers, and hyphens. It must start and end with a letter or number.',
            'string.min': 'Subdomain must be at least 3 characters',
            'string.max': 'Subdomain cannot exceed 40 characters',
            'any.required': 'Subdomain is required'
        }),

    // We include password and email here because they usually come in the same registration request
    email: Joi.string().email().required(),
    phone: Joi.string().trim().min(11).max(20).required().messages({
        'any.required': 'Phone number is required',
        'string.empty': 'Phone number is required'
    }),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().required(),
    otp: Joi.string().length(6).required(),
    otpChannel: Joi.string().valid('email', 'sms').default('email'),
    selectedPlanSlug: Joi.string()
        .trim()
        .lowercase()
        .max(80)
        .allow('')
        .optional(),
    selectedPlanId: Joi.string()
        .trim()
        .allow('')
        .optional()
});

module.exports = { shopRegistrationSchema };

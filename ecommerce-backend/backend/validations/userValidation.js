const Joi = require('joi');

// Base properties shared by all users to keep the validation logic clean
const baseUserObj = {
    fullName: Joi.string()
        .trim()
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.empty': 'Name cannot be empty',
            'string.min': 'Name must be at least 3 characters',
            'any.required': 'Name is required'
        }),

    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    phone: Joi.string()
        .trim()
        .allow('')
        .optional(),

    staffTitle: Joi.string()
        .trim()
        .max(80)
        .allow('')
        .optional(),

    staffNote: Joi.string()
        .trim()
        .max(500)
        .allow('')
        .optional(),

    password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.min': 'Password must be at least 6 characters long',
            'any.required': 'Password is required'
        }),

    role: Joi.string()
        .valid('VendorAdmin', 'VendorStaff', 'Customer')
        .default('Customer'),

    permissions: Joi.object({
        products: Joi.boolean().optional(),
        orders: Joi.boolean().optional(),
        customers: Joi.boolean().optional(),
        promotions: Joi.boolean().optional(),
        analytics: Joi.boolean().optional(),
        storeBuilder: Joi.boolean().optional(),
        settings: Joi.boolean().optional(),
        staff: Joi.boolean().optional()
    }).optional(),

    orders: Joi.array().items(
        Joi.string().hex().length(24).messages({
            'string.length': 'Invalid Order ID format',
            'string.hex': 'Order ID must be a valid hex string'
        })
    ).optional()

};

// 🔥 Schema for public customer registration (Requires subdomain)
const registerCustomerSchema = Joi.object({
    ...baseUserObj,
    subdomain: Joi.string().required().messages({
        'any.required': 'Subdomain context is missing for customer registration'
    }),
    otp: Joi.string().length(6).required()
}).required();

// 🔥 Schema for an Admin creating a Staff member (Does NOT require subdomain, accepts shop_id)
const createStaffSchema = Joi.object({
    ...baseUserObj,
    shop_id: Joi.string().hex().length(24).optional().messages({
        'string.length': 'Invalid Shop ID format'
    })
}).required();

// Schema for a simple Login Request
const loginUserSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required'
    }),
    subdomain: Joi.string().trim().lowercase().optional()
}).required();

const resetAudience = Joi.string().valid('admin', 'customer').default('customer');

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
    audience: resetAudience,
    subdomain: Joi.when('audience', {
        is: 'customer',
        then: Joi.string().trim().lowercase().min(1).required().messages({
            'any.required': 'Store context is missing for customer password reset.',
            'string.empty': 'Store context is missing for customer password reset.'
        }),
        otherwise: Joi.string().trim().lowercase().allow('').optional()
    })
}).required();

const verifyResetOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().pattern(/^\d{6}$/).required().messages({
        'string.pattern.base': 'Verification code must be 6 digits'
    }),
    audience: resetAudience,
    subdomain: Joi.when('audience', {
        is: 'customer',
        then: Joi.string().trim().lowercase().min(1).required().messages({
            'any.required': 'Store context is missing for customer password reset.',
            'string.empty': 'Store context is missing for customer password reset.'
        }),
        otherwise: Joi.string().trim().lowercase().allow('').optional()
    })
}).required();

const resetPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
    resetToken: Joi.string().hex().length(64).required(),
    password: Joi.string()
        .min(8)
        .pattern(/[a-z]/, 'lowercase')
        .pattern(/[A-Z]/, 'uppercase')
        .pattern(/\d/, 'number')
        .pattern(/[^A-Za-z0-9]/, 'special character')
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters',
            'string.pattern.name': 'Password must include uppercase, lowercase, number, and special character'
        }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).optional().messages({
        'any.only': 'Passwords do not match'
    }),
    audience: resetAudience,
    subdomain: Joi.when('audience', {
        is: 'customer',
        then: Joi.string().trim().lowercase().min(1).required().messages({
            'any.required': 'Store context is missing for customer password reset.',
            'string.empty': 'Store context is missing for customer password reset.'
        }),
        otherwise: Joi.string().trim().lowercase().allow('').optional()
    })
}).required();

const updatePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'string.empty': 'Current password is required'
    }),
    newPassword: Joi.string()
        .min(8)
        .pattern(/[a-z]/, 'lowercase')
        .pattern(/[A-Z]/, 'uppercase')
        .pattern(/\d/, 'number')
        .pattern(/[^A-Za-z0-9]/, 'special character')
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters',
            'string.pattern.name': 'Password must include uppercase, lowercase, number, and special character'
        }),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).optional().messages({
        'any.only': 'Passwords do not match'
    })
}).required();

module.exports = {
    registerCustomerSchema,
    createUserSchema: createStaffSchema,
    createStaffSchema,
    loginUserSchema,
    forgotPasswordSchema,
    verifyResetOtpSchema,
    resetPasswordSchema,
    updatePasswordSchema
};

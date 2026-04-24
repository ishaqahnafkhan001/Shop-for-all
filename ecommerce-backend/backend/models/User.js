const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        // Basic regex to ensure the string looks like an email at the database level
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        // We don't set a minlength here because the password will be hashed (making it a long string anyway)
        // We rely on Joi to check the length BEFORE it gets hashed!
    },
    role: {
        type: String,
        enum: ['SuperAdmin', 'VendorAdmin', 'VendorStaff', 'Customer'],
        default: 'Customer'
    },
    // Add this inside your UserSchema definition:
    status: {
        type: String,
        enum: ['Active', 'Suspended'],
        default: 'Active'
    },
    // THE LINK: Connects the user to a specific storefront
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        // Make this required ONLY if the user is not the SuperAdmin of the platform
        required: function() {
            return this.role !== 'SuperAdmin';
        },
        index: true // Extremely important for quickly loading a shop's customer list
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
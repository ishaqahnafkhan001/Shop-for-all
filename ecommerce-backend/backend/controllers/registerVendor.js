// controllers/authController.js
const Shop = require('../models/Shop');
const { shopRegistrationSchema } = require('../validations/shopValidation');

exports.registerVendor = async (req, res) => {
    try {
        // 1. Run Joi Validation (The Bouncer)
        const { error, value } = shopRegistrationSchema.validate(req.body);

        // If Joi finds an error, send a 400 Bad Request immediately
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // 2. Destructure the safe, validated data
        const { shopName, subdomain, email, password, fullName } = value;

        // 3. Check for existing subdomain (Database rule)
        const existingShop = await Shop.findOne({ subdomain });
        if (existingShop) {
            return res.status(400).json({ error: "Subdomain already taken." });
        }

        // 4. Create the Shop (The Vault)
        const newShop = await Shop.create({
            shopName,
            subdomain
        });

        // ... continue creating user and sending JWT ...

        res.status(201).json({ message: "Shop created successfully!" });

    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};
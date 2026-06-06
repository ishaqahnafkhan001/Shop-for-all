require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Account = require('../models/Account');
const User = require('../models/User');
const ShopMembership = require('../models/ShopMembership');
const CustomerProfile = require('../models/CustomerProfile');
const StaffPermission = require('../models/StaffPermission');

const run = async () => {
    await connectDB();

    const users = await User.find().sort({ createdAt: 1 });

    for (const user of users) {
        let account = await Account.findOne({ email: user.email });

        if (!account) {
            account = await Account.create({
                email: user.email,
                passwordHash: user.password,
                fullName: user.fullName,
                phone: user.phone || '',
                status: user.status || 'Active',
                platformRole: user.role === 'SuperAdmin' ? 'SuperAdmin' : 'None'
            });
        }

        user.account_id = account._id;

        if (user.role !== 'SuperAdmin' && user.shop_id) {
            let membership = await ShopMembership.findOne({
                account_id: account._id,
                shop_id: user.shop_id
            });

            if (!membership) {
                membership = await ShopMembership.create({
                    account_id: account._id,
                    shop_id: user.shop_id,
                    role: user.role,
                    status: user.status || 'Active',
                    legacyUser_id: user._id
                });
            }

            user.membership_id = membership._id;

            if (user.role === 'Customer') {
                await CustomerProfile.findOneAndUpdate(
                    { membership_id: membership._id },
                    {
                        $setOnInsert: {
                            account_id: account._id,
                            shop_id: user.shop_id,
                            legacyUser_id: user._id,
                            fullName: user.fullName,
                            phone: user.phone || ''
                        }
                    },
                    { upsert: true }
                );
            }

            if (user.role === 'VendorStaff') {
                await StaffPermission.findOneAndUpdate(
                    { membership_id: membership._id },
                    {
                        account_id: account._id,
                        shop_id: user.shop_id,
                        legacyUser_id: user._id,
                        permissions: user.permissions || {}
                    },
                    { upsert: true }
                );
            }
        }

        await user.save();
    }

    const collection = mongoose.connection.db.collection('users');
    const indexes = await collection.indexes();
    const globalEmailIndex = indexes.find(index => index.name === 'email_1' && index.unique);

    if (globalEmailIndex) {
        await collection.dropIndex('email_1');
    }

    await collection.createIndex(
        { shop_id: 1, email: 1 },
        {
            unique: true,
            partialFilterExpression: { shop_id: { $exists: true } }
        }
    );

    console.log(`Migrated ${users.length} legacy users into account memberships.`);
    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
});

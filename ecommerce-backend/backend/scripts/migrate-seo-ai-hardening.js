require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Review = require('../models/Review');
const SlugRedirect = require('../models/SlugRedirect');
const AiGenerationRequest = require('../models/AiGenerationRequest');
const Category = require('../models/Category');

const apply = process.argv.includes('--apply');

const run = async () => {
    await connectDB();

    const missingVisible = await Review.countDocuments({ isVisible: { $exists: false } });
    const missingDeleted = await Review.countDocuments({ isDeleted: { $exists: false } });
    const report = {
        mode: apply ? 'apply' : 'dry-run',
        reviews: {
            missingIsVisible: missingVisible,
            missingIsDeleted: missingDeleted
        },
        indexes: {
            requested: apply,
            models: ['Review', 'SlugRedirect', 'AiGenerationRequest', 'Category']
        },
        notes: [
            'Existing explicit review visibility values are preserved.',
            'Slug history is not inferred from current slugs because historical values are unavailable.'
        ]
    };

    if (apply) {
        const visibleResult = await Review.updateMany(
            { isVisible: { $exists: false } },
            { $set: { isVisible: true } }
        );
        const deletedResult = await Review.updateMany(
            { isDeleted: { $exists: false } },
            { $set: { isDeleted: false } }
        );

        await Promise.all([
            Review.createIndexes(),
            SlugRedirect.createIndexes(),
            AiGenerationRequest.createIndexes(),
            Category.createIndexes()
        ]);

        report.reviews.updatedIsVisible = Number(visibleResult.modifiedCount || 0);
        report.reviews.updatedIsDeleted = Number(deletedResult.modifiedCount || 0);
    }

    console.log(JSON.stringify(report));
};

run()
    .catch(error => {
        console.error('SEO and AI hardening migration failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close().catch(() => {});
    });

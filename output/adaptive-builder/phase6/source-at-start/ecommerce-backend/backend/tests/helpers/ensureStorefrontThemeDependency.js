const fs = require('node:fs');
const path = require('node:path');

const ensureStorefrontThemeDependency = (repoRoot) => {
    const packagePath = path.join(repoRoot, 'packages/storefront-theme');
    const dependencyPath = path.join(repoRoot, 'ecommerce-storefront/node_modules/@scaleup/storefront-theme');

    if (fs.existsSync(dependencyPath)) {
        return;
    }

    fs.mkdirSync(path.dirname(dependencyPath), { recursive: true });
    const linkTarget = path.relative(path.dirname(dependencyPath), packagePath);
    try {
        fs.symlinkSync(linkTarget, dependencyPath, 'junction');
    } catch (error) {
        if (error?.code !== 'EEXIST') {
            throw error;
        }
    }
};

module.exports = {
    ensureStorefrontThemeDependency
};

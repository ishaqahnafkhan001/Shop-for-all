const { execFileSync } = require('node:child_process');

const run = (command, args) => execFileSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8'
}).trim();

try {
    const dockerVersion = run('docker', ['--version']);
    const composeVersion = run('docker', ['compose', 'version']);

    console.log(`[test-mongo] ${dockerVersion}`);
    console.log(`[test-mongo] ${composeVersion}`);
} catch (error) {
    console.error([
        '[test-mongo] Docker with Compose v2 is required to start the local test MongoDB replica set.',
        'Install and start Docker Desktop, then run:',
        '  npm run test:mongo:up',
        '',
        'Alternative: use a disposable MongoDB Atlas test database and run:',
        '  MONGO_URI_TEST="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/shop_for_all_launch_test?retryWrites=true&w=majority" npm run test:integration'
    ].join('\n'));
    process.exit(1);
}

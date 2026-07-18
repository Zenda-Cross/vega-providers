const testRunner = require('./test-runner');
async function run() {
  await testRunner.runProviderTests(['zeefliz']);
}
run();

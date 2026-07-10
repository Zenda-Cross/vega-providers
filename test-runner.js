const { quickTest, batchTest } = require("./quick-test.js");
const { testConfigs, testBatches } = require("./test-config.js");

// Get command line arguments
const args = process.argv.slice(2);

async function main() {
  console.log("🎯 Vega Providers Test Runner");
  console.log("=============================");

  if (args.length === 0) {
    console.log("\nUsage:");
    console.log("  node test-runner.js <testName>     - Run a single test");
    console.log("  node test-runner.js batch <batch>  - Run a test batch");
    console.log("  node test-runner.js list           - List available tests");
    console.log("\nExamples:");
    console.log("  node test-runner.js uhdMeta");
    console.log("  node test-runner.js batch smokeTest");
    console.log("  node test-runner.js list");
    return;
  }

  const command = args[0];

  if (command === "list") {
    console.log("\n📋 Available individual tests:");
    Object.keys(testConfigs).forEach((test) => {
      const config = testConfigs[test];
      console.log(
        `  ${test} - ${config.provider}/${config.module}/${config.function}`
      );
    });

    console.log("\n📦 Available test batches:");
    Object.keys(testBatches).forEach((batch) => {
      const tests = testBatches[batch];
      console.log(`  ${batch} - ${tests.length} tests`);
    });
    return;
  }

  if (command === "batch") {
    const batchName = args[1];
    if (!batchName || !testBatches[batchName]) {
      console.log("❌ Please specify a valid batch name.");
      console.log("Available batches:", Object.keys(testBatches).join(", "));
      return;
    }

    console.log(`\n🚀 Running test batch: ${batchName}`);
    await batchTest(testBatches[batchName]);
    return;
  }

  // Single test
  const testName = command;
  if (!testConfigs[testName]) {
    console.log(`❌ Test '${testName}' not found.`);
    console.log("Available tests:", Object.keys(testConfigs).join(", "));
    console.log("Use 'node test-runner.js list' to see all available tests.");
    return;
  }

  const config = testConfigs[testName];
  console.log(`\n🧪 Running test: ${testName}`);

  await quickTest(
    config.provider,
    config.module,
    config.function,
    config.params
  );
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

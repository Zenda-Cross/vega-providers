const ProviderTester = require("./test-providers.js");
const axios = require("axios");

function generateAsciiTable(results) {
  const rows = [];
  let maxProviderLen = 8; // "Provider"
  let maxStatusLen = 6; // "Status"
  let maxDetailsLen = 7; // "Details"

  for (const [provider, res] of Object.entries(results)) {
    const isWorking = res.summary && res.summary.failed === 0 && !res.error;
    const status = isWorking ? "OK" : "FAIL";
    let details = "-";
    if (res.error) {
      details = res.error;
    } else if (res.summary && res.summary.failed > 0) {
      const steps = ["catalog", "posts", "meta", "episodes", "stream"];
      const failedSteps = steps.filter(
        (s) => res[s] && res[s].error && !res[s].skipped,
      );
      details = failedSteps.map((s) => `${s}: ${res[s].error}`).join(", ");
    }
    if (details.length > 60) {
      details = details.substring(0, 57) + "...";
    }

    rows.push({ provider, status, details });

    if (provider.length > maxProviderLen) maxProviderLen = provider.length;
    if (status.length > maxStatusLen) maxStatusLen = status.length;
    if (details.length > maxDetailsLen) maxDetailsLen = details.length;
  }

  const header = `| ${"Provider".padEnd(maxProviderLen)} | ${"Status".padEnd(maxStatusLen)} | ${"Details".padEnd(maxDetailsLen)} |`;
  const separator = `+-${"-".repeat(maxProviderLen)}-+-${"-".repeat(maxStatusLen)}-+-${"-".repeat(maxDetailsLen)}-+`;

  const lines = [separator, header, separator];
  for (const row of rows) {
    const line = `| ${row.provider.padEnd(maxProviderLen)} | ${row.status.padEnd(maxStatusLen)} | ${row.details.padEnd(maxDetailsLen)} |`;
    lines.push(line);
  }
  lines.push(separator);
  return lines.join("\n");
}

async function sendToDiscord(content, webhookUrl) {
  if (!webhookUrl) {
    console.log("Discord Webhook URL not provided. Skipping message send.");
    return;
  }
  try {
    await axios.post(webhookUrl, { content });
    console.log("Successfully sent message chunk to Discord.");
  } catch (err) {
    console.error("Failed to send to Discord:", err.message);
    if (err.response) {
      console.error("Discord response error:", err.response.data);
    }
  }
}

async function sendReport(results, webhookUrl) {
  let passedCount = 0;
  let failedCount = 0;
  const failedList = [];

  for (const [provider, res] of Object.entries(results)) {
    const isWorking = res.summary && res.summary.failed === 0 && !res.error;
    if (isWorking) {
      passedCount++;
    } else {
      failedCount++;
      let errDetail = res.error || "Unknown error";
      if (res.summary && res.summary.failed > 0) {
        const steps = ["catalog", "posts", "meta", "episodes", "stream"];
        const failedSteps = steps.filter(
          (s) => res[s] && res[s].error && !res[s].skipped,
        );
        errDetail = failedSteps.map((s) => `${s}: ${res[s].error}`).join(", ");
      }
      failedList.push({ provider, error: errDetail });
    }
  }

  const total = passedCount + failedCount;
  const statusEmoji = failedCount === 0 ? "🟢" : "🔴";
  const title = `**${statusEmoji} Vega Providers Test Report**`;
  const summaryText = `**Total Tested**: ${total} | **Passed**: ${passedCount} | **Failed**: ${failedCount}`;

  let failedDetailsText = "";
  if (failedCount > 0) {
    failedDetailsText =
      "\n**❌ Failed Providers Details:**\n" +
      failedList
        .map((item) => `• **${item.provider}**: ${item.error}`)
        .join("\n") +
      "\n";
  }

  // Generate ASCII table of all providers
  const asciiTable = generateAsciiTable(results);

  // First send the summary and details of failures
  const mainMessage = `${title}\n${summaryText}\n${failedDetailsText}`;
  await sendToDiscord(mainMessage, webhookUrl);

  // Then send the full ASCII table, chunked by lines
  const tableLines = asciiTable.split("\n");
  let tableChunk = "```\n";
  for (const line of tableLines) {
    if (tableChunk.length + line.length + 5 > 1900) {
      tableChunk += "```";
      await sendToDiscord(tableChunk, webhookUrl);
      tableChunk = "```\n" + line + "\n";
    } else {
      tableChunk += line + "\n";
    }
  }
  if (tableChunk.length > 5) {
    if (!tableChunk.endsWith("```")) {
      tableChunk += "```";
    }
    await sendToDiscord(tableChunk, webhookUrl);
  }
}

async function main() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const tester = new ProviderTester({ postsToTest: 2, linksToTest: 2 });
  const providers = tester.getAvailableProviders();
  const results = {};
  let overallFailed = false;

  console.log(
    `Starting provider tests for ${providers.length} providers with 1 retry on failure...`,
  );

  for (const provider of providers) {
    console.log(`\n--------------------------------------------`);
    console.log(`Testing ${provider}...`);
    let result;
    try {
      result = await tester.testProvider(provider);
    } catch (error) {
      result = { error: error.message, summary: { failed: 1 } };
    }

    const isFailed =
      result.error || (result.summary && result.summary.failed > 0);
    if (isFailed) {
      console.log(
        `⚠️ ${provider} failed on first attempt. Retrying in 5 seconds...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        result = await tester.testProvider(provider);
      } catch (error) {
        result = { error: error.message, summary: { failed: 1 } };
      }
    }

    results[provider] = result;
    const finalFailed =
      result.error || (result.summary && result.summary.failed > 0);
    if (finalFailed) {
      overallFailed = true;
    }

    // Small delay between different providers
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n--------------------------------------------");
  console.log("Tests completed. Sending report to Discord...");
  await sendReport(results, webhookUrl);

  if (overallFailed) {
    console.log("Some providers failed the tests.");
    process.exit(1);
  } else {
    console.log("All providers passed the tests.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});

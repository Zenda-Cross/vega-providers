const fs = require("fs");
const axios = require("axios");

const filePath = process.env.URL_FILE_PATH || "urls.json";
const updatedProviders = [];

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

function readProviders() {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    process.exit(1);
  }
}

function getOrigin(url) {
  try {
    return new URL(url).origin;
  } catch (error) {
    console.error(`Error parsing URL ${url}:`, error);
    return url;
  }
}

function hasTrailingSlash(url) {
  return url.endsWith("/") && !url.endsWith("://");
}

function getFinalUrl(response, originalUrl) {
  return (
    response?.request?.res?.responseUrl ||
    response?.request?._redirectable?._currentUrl ||
    response?.config?.url ||
    originalUrl
  );
}

function getUpdatedUrl(originalUrl, finalUrl) {
  const originalOrigin = getOrigin(originalUrl);
  const finalOrigin = getOrigin(finalUrl);

  if (!finalOrigin || finalOrigin === originalOrigin) {
    return null;
  }

  return finalOrigin + (hasTrailingSlash(originalUrl) ? "/" : "");
}

async function requestUrl(url) {
  return axios({
    method: "get",
    url,
    maxRedirects: 5,
    timeout: 10000,
    validateStatus: () => true,
    headers: defaultHeaders,
  });
}

async function checkUrl(url) {
  try {
    const response = await requestUrl(url);
    const finalUrl = getFinalUrl(response, url);
    const updatedUrl = getUpdatedUrl(url, finalUrl);

    console.log(`${url} -> status=${response.status} final=${finalUrl}`);

    if (updatedUrl) {
      return updatedUrl;
    }

    if (response.status !== 200) {
      console.log(`${url} returned status ${response.status}`);
    }
  } catch (error) {
    const finalUrl = error.response ? getFinalUrl(error.response, url) : url;
    const updatedUrl = getUpdatedUrl(url, finalUrl);

    if (updatedUrl) {
      return updatedUrl;
    }

    if (error.code === "ECONNABORTED") {
      console.log(`${url} request timed out`);
    } else if (error.code === "ENOTFOUND") {
      console.log(`${url} domain not found`);
    } else {
      console.log(`Error checking ${url}: ${error.message}`);
    }
  }

  return null;
}

async function main() {
  const providers = readProviders();

  for (const provider of Object.values(providers)) {
    const oldUrl = provider.url;
    console.log(`Checking ${provider.name} (${oldUrl})...`);

    try {
      const newUrl = await checkUrl(oldUrl);

      if (!newUrl || newUrl === oldUrl) {
        continue;
      }

      provider.url = newUrl;
      updatedProviders.push({ name: provider.name, oldUrl, newUrl });
      console.log(`Updated ${provider.name}: ${oldUrl} -> ${newUrl}`);
    } catch (error) {
      console.log(`Error processing ${oldUrl}: ${error.message}`);
    }
  }

  if (updatedProviders.length === 0) {
    console.log(`No changes needed for ${filePath}`);
    return;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(providers, null, 2)}\n`);
  console.log(`Updated ${filePath} with new URLs`);
  console.log("### UPDATED_PROVIDERS_START ###");

  for (const provider of updatedProviders) {
    console.log(`${provider.name}|${provider.oldUrl}|${provider.newUrl}`);
  }

  console.log("### UPDATED_PROVIDERS_END ###");
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

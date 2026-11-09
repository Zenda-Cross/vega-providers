const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const urlsEndpoint =
  "https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/urls.json";
const nativeFetch = global.fetch;

global.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (url === urlsEndpoint) {
    const providerUrls = fs.readFileSync(
      path.join(rootDir, "urls.json"),
      "utf-8",
    );
    return new Response(providerUrls, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return nativeFetch(input, init);
};

// In-memory KV Store mimicking Vega app kvStore
const kvStoreMemory = new Map();
const kvStore = {
  get: async (key) => (kvStoreMemory.has(key) ? kvStoreMemory.get(key) : null),
  set: async (key, val) => {
    kvStoreMemory.set(key, val);
  },
  delete: async (key) => {
    kvStoreMemory.delete(key);
  },
};

/**
 * Emulates the Vega App's WAF / openWebView solver dialog using system Edge/Chrome.
 * Opens a real browser window, sets up window.ReactNativeWebView.postMessage,
 * injects the provider's script, and waits for a token or cookie.
 */
async function openWebView(url, options = {}) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`🌐 [WAF Solver] Opening browser for challenge`);
  console.log(`   URL: ${url}`);
  if (options.title) console.log(`   Title: ${options.title}`);
  if (options.description) console.log(`   Description: ${options.description}`);
  console.log(`   (Complete the challenge in the opened browser window...)`);
  console.log(`${"─".repeat(60)}\n`);

  let browser;
  try {
    const { chromium } = require("playwright-core");
    const launchArgs = [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--start-maximized",
    ];

    browser = await chromium
      .launch({
        channel: "msedge",
        headless: false,
        ignoreDefaultArgs: ["--enable-automation"],
        args: launchArgs,
      })
      .catch(() =>
        chromium.launch({
          channel: "chrome",
          headless: false,
          ignoreDefaultArgs: ["--enable-automation"],
          args: launchArgs,
        }),
      );
  } catch (err) {
    console.error("❌ Failed to launch browser for WAF solving:", err.message);
    throw err;
  }

  const contextOptions = { viewport: null };
  const customUa =
    options.headers?.["User-Agent"] || options.headers?.["user-agent"];
  if (customUa) {
    contextOptions.userAgent = customUa;
  }

  const context = await browser.newContext(contextOptions);

  await context.addInitScript(() => {
    try {
      delete Object.getPrototypeOf(navigator).webdriver;
    } catch {}
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();

  return new Promise(async (resolve, reject) => {
    let settled = false;
    let cookieInterval = null;
    let turnstileInterval = null;

    const cleanup = () => {
      if (cookieInterval) clearInterval(cookieInterval);
      if (turnstileInterval) clearInterval(turnstileInterval);
    };

    const finalize = async (data = "") => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        const cookies = await context.cookies();
        const cookieMap = {};
        for (const c of cookies) {
          cookieMap[c.name] = c.value;
        }
        const cookieStr = Object.entries(cookieMap)
          .map(([k, v]) => `${k}=${v}`)
          .join("; ");

        const pageUrl = page.url();
        const userAgent = await page.evaluate(() => navigator.userAgent).catch(() => "");
        await browser.close().catch(() => {});
        console.log(`\n✅ [WAF Solver] Verification completed! Window closed.\n`);
        resolve({
          data: typeof data === "string" ? data : JSON.stringify(data),
          cookies: cookieStr,
          cookie: cookieStr,
          cookieMap,
          url: pageUrl,
          userAgent,
        });
      } catch (err) {
        await browser.close().catch(() => {});
        reject(err);
      }
    };

    page.on("close", () => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error("WAF_DIALOG_CANCELLED: Browser window was closed"));
      }
    });

    if (options.timeoutMs) {
      setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          browser.close().catch(() => {});
          reject(new Error(`WAF_TIMEOUT: Solver timed out after ${options.timeoutMs}ms`));
        }
      }, options.timeoutMs);
    }

    await page.addInitScript(`
      (function() {
        if (!window.ReactNativeWebView) {
          window.ReactNativeWebView = {
            postMessage: function(message) {
              try {
                var el = document.getElementById('__vega_bridge_msg');
                if (!el) {
                  el = document.createElement('div');
                  el.id = '__vega_bridge_msg';
                  el.style.display = 'none';
                  (document.body || document.documentElement).appendChild(el);
                }
                el.setAttribute('data-payload', typeof message === 'string' ? message : JSON.stringify(message));
              } catch (e) {}
            }
          };
        }
      })();
    `);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
    } catch (e) {}

    if (options.injectedJavaScript) {
      try {
        await page.evaluate(options.injectedJavaScript);
      } catch (e) {
        console.warn("⚠️ Injected script evaluation error:", e.message);
      }
    }

    const maxWaitSeconds = options.timeoutMs ? Math.floor(options.timeoutMs / 1000) : 45;
    for (let s = 1; s <= maxWaitSeconds; s++) {
      if (settled) break;
      await page.waitForTimeout(1000);
      if (settled) break;

      // Simulate natural human mouse movement for Cloudflare entropy
      await page.mouse.move(150 + ((s * 37) % 350), 200 + ((s * 23) % 250)).catch(() => {});

      // Check if any Turnstile frame presents a clickable checkbox
      for (const frame of page.frames()) {
        try {
          const checkbox = await frame.$('#checkbox, input[type="checkbox"], .ctp-checkbox-label, .ctp-label');
          if (checkbox) {
            await checkbox.click().catch(() => {});
          }
        } catch (e) {}
      }

      // Check cookie if requested
      if (options.waitForCookie) {
        try {
          const cookies = await context.cookies();
          const target = cookies.find((c) => c.name === options.waitForCookie);
          if (target && target.value) {
            finalize();
            break;
          }
        } catch {}
      }

      // Check bridge message if posted by injected script
      try {
        const bridgeMsg = await page.evaluate(() => {
          const el = document.getElementById('__vega_bridge_msg');
          return el ? el.getAttribute('data-payload') : null;
        }).catch(() => null);

        if (bridgeMsg) {
          try {
            const parsed = JSON.parse(bridgeMsg);
            const token = parsed?.data || parsed?.token || parsed;
            if (token && typeof token === 'string' && token.length > 20) {
              console.log(`\n🎉 [WAF Solver] Challenge solved via bridge (${s}s)! Token length: ${token.length}`);
              finalize(token);
              break;
            }
          } catch {}
        }
      } catch {}

      // Check Turnstile token directly from widget and inputs
      try {
        const token = await page.evaluate(() => {
          const widget = document.getElementById("turnstile-widget");
          let t = null;
          try {
            if (widget && window.turnstile) t = window.turnstile.getResponse(widget);
          } catch (e) {}
          if (!t && window.turnstile) {
            try { t = window.turnstile.getResponse(); } catch (e) {}
          }
          if (!t) {
            const inp = document.querySelector('input[name="cf-turnstile-response"]');
            if (inp && inp.value && inp.value.length > 20) t = inp.value;
          }
          return t;
        }).catch(() => null);

        if (token) {
          console.log(`\n🎉 [WAF Solver] Challenge solved (${s}s)! Token length: ${token.length}`);
          finalize(token);
          break;
        } else if (s % 3 === 0) {
          process.stdout.write(`   [WAF Solver] Waiting for verification... (${s}s)\r`);
        }
      } catch {}
    }

    if (!settled) {
      settled = true;
      cleanup();
      await browser.close().catch(() => {});
      reject(new Error(`WAF_TIMEOUT: Solver timed out after ${maxWaitSeconds}s`));
    }
  });
}

const providerContext = {
  axios,
  cheerio,
  commonHeaders: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  openWebView,
  kvStore,
  Aes: {},
};

module.exports = { providerContext };

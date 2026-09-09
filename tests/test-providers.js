const fs = require("fs");
const path = require("path");
const { z } = require("zod");
const { providerContext } = require("./provider-test-context");
const rootDir = path.join(__dirname, "..");

// Zod schemas for response validation
const PostSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  link: z.string().min(1, "Link cannot be empty"),
  image: z.string().min(1, "Image cannot be empty"),
  tag: z.string().optional(),
  rating: z.string().optional(),
  provider: z.string().optional(),
  aspectRatio: z.number().optional(),
});

const StreamSchema = z.object({
  server: z.string().min(1, "Server name cannot be empty"),
  link: z.string().min(1, "Stream link cannot be empty"),
  type: z.string().min(1, "Type cannot be empty"),
  quality: z.string().optional(),
  subtitles: z
    .array(
      z.object({
        title: z.string().optional(),
        language: z.string().optional(),
        type: z.string().optional(),
        uri: z.string().optional(),
      }),
    )
    .optional(),
  headers: z.any().optional(),
  tags: z.array(z.string()).optional(),
  tag: z.string().optional(),
});

const DirectLinkItemSchema = z.object({
  title: z.string().min(1, "Direct link title cannot be empty"),
  link: z.string().min(1, "Direct link cannot be empty"),
  type: z.enum(["movie", "series"]).optional(),
  image: z.string().optional(),
  description: z.string().optional(),
  skip: z.array(z.any()).optional(),
});

const LinkSchema = z.object({
  title: z.string().min(1, "Link title cannot be empty"),
  quality: z.string().optional(),
  episodesLink: z.string().optional(),
  directLinks: z.array(DirectLinkItemSchema).optional(),
});

const InfoSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  image: z.string().optional(),
  synopsis: z.string().optional(),
  imdbId: z.string().optional(),
  tmdbId: z.string().optional(),
  type: z.string().min(1, "Type cannot be empty"),
  tags: z.array(z.string()).optional(),
  cast: z.array(z.string()).optional(),
  rating: z.string().optional(),
  linkList: z.array(LinkSchema),
});

const EpisodeLinkSchema = z.object({
  title: z.string().min(1, "Episode title cannot be empty"),
  link: z.string().min(1, "Episode link cannot be empty"),
  image: z.string().optional(),
  description: z.string().optional(),
  skip: z.array(z.any()).optional(),
});

function validateSchema(schema, data, label) {
  try {
    schema.parse(data);
    return { valid: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues.map((i) => {
        const p = i.path.join(".");
        return `${p ? `[${p}] ` : ""}${i.message}`;
      });
      return { valid: false, error: issues.join(", ") };
    }
    return { valid: false, error: err.message };
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Provider testing utility - Full integration test
 */
class ProviderTester {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.signal = new AbortController().signal;
    this.results = {};
  }

  /**
   * Load provider module
   */
  loadModule(providerName, moduleName) {
    try {
      const modulePath = path.join(
        rootDir,
        "dist",
        providerName,
        `${moduleName}.js`,
      );
      delete require.cache[require.resolve(modulePath)];
      return require(modulePath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Load manifest to get enabled providers
   */
  loadManifest() {
    try {
      const manifestPath = path.join(rootDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) {
        return [];
      }
      return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get available providers from dist folder (excluding disabled ones)
   */
  getAvailableProviders() {
    const distPath = path.join(rootDir, "dist");
    if (!fs.existsSync(distPath)) {
      console.log("❌ dist folder not found. Run 'npm run build' first.");
      return [];
    }

    const manifest = this.loadManifest();
    const disabledProviders = manifest
      .filter((p) => p.disabled === true)
      .map((p) => p.value);

    return fs
      .readdirSync(distPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => {
        if (disabledProviders.includes(name)) {
          return false;
        }
        return ["catalog.js", "posts.js", "meta.js", "stream.js"].every(
          (file) => fs.existsSync(path.join(distPath, name, file)),
        );
      });
  }

  /**
   * Test a single provider with full flow and show returned output of each function
   */
  async testProvider(providerName) {
    const available = this.getAvailableProviders();
    const resolvedName =
      available.find((p) => p.toLowerCase() === providerName.toLowerCase()) ||
      providerName;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🧪 Testing Provider: ${resolvedName}`);
    console.log("=".repeat(60));

    const result = {
      provider: resolvedName,
      catalog: { success: false, data: null, error: null },
      posts: { success: false, data: null, error: null },
      meta: { success: false, data: null, error: null },
      episodes: { success: false, data: null, error: null, skipped: false },
      stream: { success: false, data: null, error: null, skipped: false },
      summary: { passed: 0, failed: 0, skipped: 0 },
    };

    try {
      // -------------------------------------------------------------
      // Step 1: catalog.ts
      // -------------------------------------------------------------
      console.log("\n📂 [1/4] catalog.ts: catalog & genres");
      console.log("-".repeat(60));

      const catalogModule = this.loadModule(resolvedName, "catalog");
      if (!catalogModule) {
        throw new Error(
          `catalog.js module not found for '${resolvedName}'. Make sure to run 'npm run build' first.`,
        );
      }

      const rawCatalog = catalogModule.catalog;
      const catalog =
        typeof rawCatalog === "function" ? await rawCatalog() : rawCatalog || [];
      const rawGenres = catalogModule.genres;
      const genres =
        typeof rawGenres === "function" ? await rawGenres() : rawGenres || [];

      const catalogOutput = {
        catalog,
        ...(genres && genres.length > 0 ? { genres } : {}),
      };

      console.log("Result (catalog.ts):");
      console.log(JSON.stringify(catalogOutput, null, 2));

      const allFilters = [...catalog, ...genres];
      if (allFilters.length === 0) {
        throw new Error("No catalog items or genres found in catalog.ts");
      }

      result.catalog.success = true;
      result.catalog.data = { count: allFilters.length };
      console.log(
        `\n✅ catalog.ts: ${catalog.length} catalog items${
          genres.length > 0 ? `, ${genres.length} genres` : ""
        }`,
      );

      // -------------------------------------------------------------
      // Step 2: posts.ts (getPosts)
      // -------------------------------------------------------------
      console.log("\n📝 [2/4] posts.ts: getPosts");
      console.log("-".repeat(60));

      const postsModule = this.loadModule(resolvedName, "posts");
      if (!postsModule || !postsModule.getPosts) {
        throw new Error("getPosts function not found in posts.ts");
      }

      const filterToUse = allFilters[0].filter;
      const postsParams = {
        filter: filterToUse,
        page: 1,
        providerValue: resolvedName,
      };

      console.log("Parameters:");
      console.log(JSON.stringify(postsParams, null, 2));

      const posts = await postsModule.getPosts({
        ...postsParams,
        signal: this.signal,
        providerContext,
      });

      console.log(
        `\nResult (getPosts - ${Array.isArray(posts) ? posts.length : 0} items):`,
      );
      console.log(JSON.stringify(posts, null, 2));

      if (!Array.isArray(posts) || posts.length === 0) {
        throw new Error("getPosts returned empty or invalid result");
      }

      const postsVal = validateSchema(z.array(PostSchema), posts, "getPosts");
      if (!postsVal.valid) {
        console.log(`\n⚠️  Schema Warning (getPosts): ${postsVal.error}`);
      } else {
        console.log(`\n✅ getPosts: ${posts.length} post(s) returned`);
      }

      result.posts.success = true;
      result.posts.data = { count: posts.length };

      // -------------------------------------------------------------
      // Step 3: meta.ts (getMeta)
      // -------------------------------------------------------------
      console.log("\n📋 [3/4] meta.ts: getMeta");
      console.log("-".repeat(60));

      const metaModule = this.loadModule(resolvedName, "meta");
      if (!metaModule || !metaModule.getMeta) {
        throw new Error("getMeta function not found in meta.ts");
      }

      const targetPost = posts[0];
      const metaParams = { link: targetPost.link };

      console.log("Parameters:");
      console.log(JSON.stringify(metaParams, null, 2));

      await sleep(300);
      const meta = await metaModule.getMeta({
        link: targetPost.link,
        providerContext,
      });

      console.log("\nResult (getMeta):");
      console.log(JSON.stringify(meta, null, 2));

      if (
        !meta ||
        !meta.linkList ||
        !Array.isArray(meta.linkList) ||
        meta.linkList.length === 0
      ) {
        throw new Error("getMeta returned missing or empty linkList");
      }

      const metaVal = validateSchema(InfoSchema, meta, "getMeta");
      if (!metaVal.valid) {
        console.log(`\n⚠️  Schema Warning (getMeta): ${metaVal.error}`);
      } else {
        console.log(
          `\n✅ getMeta: type=${meta.type}, linkList=${meta.linkList.length} entry/entries`,
        );
      }

      result.meta.success = true;
      result.meta.data = {
        type: meta.type,
        linkListCount: meta.linkList.length,
      };

      // -------------------------------------------------------------
      // Check linkList for episodesLink vs directLinks
      // -------------------------------------------------------------
      let episodeLinkTarget = null;
      let directLinkTarget = null;

      for (const linkGroup of meta.linkList) {
        if (linkGroup.episodesLink && !episodeLinkTarget) {
          episodeLinkTarget = {
            title: linkGroup.title,
            url: linkGroup.episodesLink,
          };
        }
        if (
          linkGroup.directLinks &&
          linkGroup.directLinks.length > 0 &&
          !directLinkTarget
        ) {
          directLinkTarget = linkGroup.directLinks[0];
        }
      }

      let streamLink = null;
      let streamType = meta.type || "movie";

      // -------------------------------------------------------------
      // Step 4: episodes.ts (getEpisodes - if episodesLink present)
      // -------------------------------------------------------------
      if (episodeLinkTarget) {
        console.log("\n📺 [4/5] episodes.ts: getEpisodes");
        console.log("-".repeat(60));

        const episodesModule = this.loadModule(resolvedName, "episodes");
        if (!episodesModule || !episodesModule.getEpisodes) {
          throw new Error(
            "episodesLink present in meta.linkList, but getEpisodes function not found in episodes.ts",
          );
        }

        const episodesParams = { url: episodeLinkTarget.url };
        console.log("Parameters:");
        console.log(JSON.stringify(episodesParams, null, 2));

        await sleep(300);
        const episodes = await episodesModule.getEpisodes({
          url: episodeLinkTarget.url,
          providerContext,
        });

        console.log(
          `\nResult (getEpisodes - ${
            Array.isArray(episodes) ? episodes.length : 0
          } items):`,
        );
        console.log(JSON.stringify(episodes, null, 2));

        if (!Array.isArray(episodes) || episodes.length === 0) {
          throw new Error("getEpisodes returned empty or invalid array");
        }

        const epVal = validateSchema(
          z.array(EpisodeLinkSchema),
          episodes,
          "getEpisodes",
        );
        if (!epVal.valid) {
          console.log(`\n⚠️  Schema Warning (getEpisodes): ${epVal.error}`);
        } else {
          console.log(`\n✅ getEpisodes: ${episodes.length} episode(s) returned`);
        }

        result.episodes.success = true;
        result.episodes.data = { count: episodes.length };

        streamLink = episodes[0].link;
        streamType = "series";
      } else {
        result.episodes.skipped = true;
        if (directLinkTarget) {
          streamLink = directLinkTarget.link;
          streamType = directLinkTarget.type || meta.type || "movie";
        }
      }

      // -------------------------------------------------------------
      // Step 5: stream.ts (getStream)
      // -------------------------------------------------------------
      const streamStepNum = episodeLinkTarget ? "5/5" : "4/4";
      console.log(`\n🎬 [${streamStepNum}] stream.ts: getStream`);
      console.log("-".repeat(60));

      if (!streamLink) {
        throw new Error(
          "No media link found to test getStream (meta.linkList has neither episodesLink nor directLinks)",
        );
      }

      const streamModule = this.loadModule(resolvedName, "stream");
      if (!streamModule || !streamModule.getStream) {
        throw new Error("getStream function not found in stream.ts");
      }

      const streamParams = {
        link: streamLink,
        type: streamType,
      };

      console.log("Parameters:");
      console.log(JSON.stringify(streamParams, null, 2));

      await sleep(300);
      const streams = await streamModule.getStream({
        link: streamLink,
        type: streamType,
        signal: this.signal,
        providerContext,
      });

      console.log(
        `\nResult (getStream - ${Array.isArray(streams) ? streams.length : 0} items):`,
      );
      console.log(JSON.stringify(streams, null, 2));

      if (!Array.isArray(streams) || streams.length === 0) {
        throw new Error("getStream returned empty or invalid array");
      }

      const streamVal = validateSchema(
        z.array(StreamSchema),
        streams,
        "getStream",
      );
      if (!streamVal.valid) {
        console.log(`\n⚠️  Schema Warning (getStream): ${streamVal.error}`);
      } else {
        console.log(`\n✅ getStream: ${streams.length} stream(s) returned`);
      }

      result.stream.success = true;
      result.stream.data = { count: streams.length };
    } catch (error) {
      console.log(`\n❌ Error: ${error.message}`);
      if (!result.catalog.success) {
        result.catalog.error = error.message;
      } else if (!result.posts.success) {
        result.posts.error = error.message;
      } else if (!result.meta.success) {
        result.meta.error = error.message;
      } else if (!result.episodes.success && !result.episodes.skipped) {
        result.episodes.error = error.message;
      } else if (!result.stream.success) {
        result.stream.error = error.message;
      }
    }

    // Summary calculation
    const steps = ["catalog", "posts", "meta", "episodes", "stream"];
    for (const step of steps) {
      if (result[step].success) {
        result.summary.passed++;
      } else if (result[step].skipped) {
        result.summary.skipped++;
      } else if (result[step].error) {
        result.summary.failed++;
      }
    }

    const isPassed = result.summary.failed === 0;

    console.log(`\n${"─".repeat(60)}`);
    console.log(`📊 Provider Summary: ${resolvedName}`);
    console.log("─".repeat(60));
    console.log(
      `   catalog:     ${
        result.catalog.success
          ? `✅ (${result.catalog.data.count} items)`
          : `❌ ${result.catalog.error}`
      }`,
    );
    console.log(
      `   getPosts:    ${
        result.posts.success
          ? `✅ (${result.posts.data.count} posts)`
          : `❌ ${result.posts.error}`
      }`,
    );
    console.log(
      `   getMeta:     ${
        result.meta.success
          ? `✅ (type: ${result.meta.data.type}, ${result.meta.data.linkListCount} linkList entries)`
          : `❌ ${result.meta.error}`
      }`,
    );
    if (result.episodes.success) {
      console.log(`   getEpisodes: ✅ (${result.episodes.data.count} episodes)`);
    } else if (result.episodes.skipped) {
      console.log(`   getEpisodes: ⚪ (not applicable - direct links used)`);
    } else if (result.episodes.error) {
      console.log(`   getEpisodes: ❌ ${result.episodes.error}`);
    }
    console.log(
      `   getStream:   ${
        result.stream.success
          ? `✅ (${result.stream.data.count} stream(s))`
          : `❌ ${result.stream.error}`
      }`,
    );
    console.log(
      `\n   ${isPassed ? "✅" : "❌"} Overall: ${isPassed ? "PASSED" : "FAILED"}`,
    );
    console.log("─".repeat(60));

    return result;
  }

  /**
   * Test all providers
   */
  async testAllProviders() {
    console.log("🚀 Starting comprehensive provider tests...\n");

    if (!providerContext) {
      console.log("❌ Provider context not loaded. Run 'npm run build' first.");
      return null;
    }

    const providers = this.getAvailableProviders();
    if (providers.length === 0) {
      console.log("❌ No providers found.");
      return null;
    }

    console.log(`📦 Found ${providers.length} providers to test:`);
    providers.forEach((p) => console.log(`   • ${p}`));

    const results = {};
    let passed = 0;
    let failed = 0;

    for (const provider of providers) {
      try {
        results[provider] = await this.testProvider(provider);
        if (results[provider].summary.failed === 0) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.log(
          `\n❌ Critical error testing ${provider}: ${error.message}`,
        );
        failed++;
        results[provider] = { error: error.message };
      }

      await sleep(500);
    }

    // Final summary
    console.log(`\n${"═".repeat(60)}`);
    console.log("📊 FINAL TEST SUMMARY");
    console.log("═".repeat(60));
    console.log(`   Total Providers: ${providers.length}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log(`\n${"─".repeat(60)}`);
      console.log("❌ FAILED PROVIDERS:");
      console.log("─".repeat(60));
      for (const [name, result] of Object.entries(results)) {
        if (result.error) {
          console.log(`\n   ❌ ${name}: ${result.error}`);
        } else if (result.summary?.failed > 0) {
          console.log(`\n   ❌ ${name}`);
          const steps = ["catalog", "posts", "meta", "episodes", "stream"];
          for (const step of steps) {
            if (result[step]?.error && !result[step]?.skipped) {
              console.log(`      • ${step}: ${result[step].error}`);
            }
          }
        }
      }
    }

    if (passed > 0) {
      console.log(`\n${"─".repeat(60)}`);
      console.log("✅ PASSED PROVIDERS:");
      console.log("─".repeat(60));
      const passedProviders = Object.entries(results)
        .filter(([_, result]) => result.summary?.failed === 0 && !result.error)
        .map(([name]) => name);
      console.log(`   ${passedProviders.join(", ")}`);
    }

    console.log(`\n${"═".repeat(60)}`);
    return results;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const providerName = args.find((a) => !a.startsWith("-"));

  const tester = new ProviderTester();

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🎯 Vega Providers Integration Tester
=====================================

Usage: npm test -- [provider]

Arguments:
  provider          Name of specific provider to test (optional)
                    If not provided, tests all providers

Examples:
  npm test                                  # Test all providers
  npm test -- kickAssAnime                  # Test kickAssAnime
  npm test -- kickassanime                  # Case-insensitive
  npm test -- everything                    # Test everything provider
    `);
    return;
  }

  if (providerName) {
    await tester.testProvider(providerName);
  } else {
    await tester.testAllProviders();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProviderTester;

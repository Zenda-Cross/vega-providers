// Common test configurations
// You can customize these and run them quickly

const testConfigs = {
  // UHD Tests
  uhdMeta: {
    provider: "uhd",
    module: "meta",
    function: "getMeta",
    params: {
      link: "https://uhdmovies.email/download-squid-game-season-2-hindi-1080p-2160p-4k/",
    },
  },

  // LuxMovies Tests
  luxPosts: {
    provider: "luxMovies",
    module: "posts",
    function: "getPosts",
    params: {
      url: "https://rogmovies.sbs/page/1/?s=pan",
    },
  },

  // PrimeMirror Tests
  primeMirrorEpisodes: {
    provider: "primeMirror",
    module: "episodes",
    function: "getEpisodes",
    params: {
      url: "0KMA7H0RHEPJA51SUBXKN9V6VA",
    },
  },

  primeMirrorMeta: {
    provider: "primeMirror",
    module: "meta",
    function: "getMeta",
    params: {
      link: "https://www.netflixmirror.com/title/82020512",
    },
  },

  primeMirrorSearch: {
    provider: "primeMirror",
    module: "posts",
    function: "getSearchPosts",
    params: {
      searchQuery: "breaking",
      page: 1,
      providerValue: "primeMirror",
    },
  },

  // CinemaLuxe Tests
  cinemaLuxeEpisodes: {
    provider: "cinemaLuxe",
    module: "episodes",
    function: "getEpisodes",
    params: {
      url: "https://cinemalux.net/?88fdac61e5=cVQxdnNXeGRIRXlZTEQ0bTZSZlFsT09qclNlQzExOUNwVk5JZ05JK1ZjbzVxSWt1SHZSZjdZUm5vVnZEOEd1QXlrdXhPdnNETHRHTnpPUUNFN3k3VVdpY0J0OW5rem10c1ZlZ2xRcjI2YjFWRm9Uc3FEeEd0aWZlNFBpOHJ6bms=",
    },
  },

  // Add more test configurations here as needed
  // Template:
  // yourTestName: {
  //   provider: 'providerName',
  //   module: 'moduleName',
  //   function: 'functionName',
  //   params: {
  //     // your parameters here
  //   }
  // }
};

// Predefined test batches
const testBatches = {
  // Test all meta functions
  allMeta: [
    testConfigs.uhdMeta,
    testConfigs.primeMirrorMeta,
    // Add more meta tests
  ],

  // Test all posts/search functions
  allPosts: [
    testConfigs.luxPosts,
    testConfigs.primeMirrorSearch,
    // Add more posts tests
  ],

  // Test all episode functions
  allEpisodes: [
    testConfigs.primeMirrorEpisodes,
    testConfigs.cinemaLuxeEpisodes,
    // Add more episode tests
  ],

  // Quick smoke test - test one function from each major provider
  smokeTest: [
    testConfigs.uhdMeta,
    testConfigs.luxPosts,
    testConfigs.primeMirrorSearch,
  ],
};

module.exports = {
  testConfigs,
  testBatches,
};

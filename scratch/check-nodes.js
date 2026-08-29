const axios = require("axios");

async function checkNodes() {
  const baseUrl = "https://cinejoy.to/_app/immutable/nodes/";
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    Referer: "https://cinejoy.to/",
  };

  const files = ["20.NAlqPo62.js", "21.F4-aFQXN.js", "6.CkPjbEJw.js", "7.CpT_0kMn.js"];

  for (const f of files) {
    try {
      const res = await axios.get(baseUrl + f, { headers });
      console.log(`\n================= ${f} (${res.data.length} bytes) =================`);
      const text = res.data;
      
      // Look for API endpoints, URLs, imports
      const urls = text.match(/https?:\/\/[^"'\s<>]+/g) || [];
      console.log("URLs:", urls);

      const apis = text.match(/["'`]\/[^"'`\s]+["'`]/g) || [];
      const interestingApis = apis.filter(a => a.includes("api") || a.includes("stream") || a.includes("source") || a.includes("player") || a.includes("embed") || a.includes("watch"));
      console.log("Internal routes:", interestingApis);

      const imports = text.match(/import[^;]+from\s*["'][^"']+["']/g) || [];
      console.log("Imports:", imports);
    } catch (e) {
      console.log(`Failed ${f}:`, e.message);
    }
  }
}

checkNodes();

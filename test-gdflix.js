const axios = require("axios");

async function test() {
  const link = "https://gdflix.dev/file/cVDYUFFZaKvlSdD";

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    Cookie:
      "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=nJQQ9ncb6m2Nc7HoxzuphPhnQgLzI6nBmzl2D.9oY4E-1759137994-1.2.1.1-pe7DiQHVsfZjnbHWTnaNbMiTYEuk.VvpPGaMeTtHOh7p9TKG5auBIDGDDW93devKuNcOlkhe6mk4v5OcsM0H_q3Te02eCPoTNgZsW8terjwvnQUebbbe8QKjMaVsVKgnbiAxS2ESM9aB3fbiQ9diuNT6ziY.2U4mPaJ0Y4vCu3404o5qBEw5c2psIuabKUTZviA2NJvN.lx5jAFQnB.HXeXJnUuCcbQac7G1BYBfdso",
  };

  try {
    const res = await axios.get(link, { headers });
    console.log("Success! Length:", res.data.length);
  } catch (err) {
    console.log("Axios Error:", err.message);
  }

  try {
    const res2 = await fetch(link, { headers, redirect: "follow" });
    const text = await res2.text();
    console.log("Fetch Success! Status:", res2.status, "Length:", text.length);
  } catch (err) {
    console.log("Fetch Error:", err.message);
  }
}

test();

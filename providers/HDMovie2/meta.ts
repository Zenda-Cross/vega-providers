import { ProviderContext } from "../types";

export async function getMeta(url: string, providerContext: ProviderContext) {
  try {
    const res = await providerContext.axios.get(url);
    const $ = providerContext.cheerio.load(res.data);

    const title = $("h1.entry-title").text().trim() || "";
    const description = $("meta[name='description']").attr("content") || "";
    const image = $(".post-thumbnail img").attr("src") || "";

    return { title, description, image };
  } catch (err) {
    console.error("HDMovie2 getMeta error:", err);
    return { title: "", description: "", image: "" };
  }
}


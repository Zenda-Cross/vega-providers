import axios from "axios";
import { headers } from "./headers";
import * as cheerio from "cheerio";
import { ProviderContext } from "./types";

export const providerContext: ProviderContext = {
  axios,
  Aes: null,
  commonHeaders: headers,
  cheerio,
};

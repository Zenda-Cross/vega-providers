import { Catalog, ProviderContext } from "../types";
import { initializeKartoons } from "./headers";

const catalogs: Catalog[] = [
  {title:"Latest Shows",filter:"/catalog/show"},
  {title:"Latest Movies",filter:"/catalog/movie"},
  {title:"Popular Shows",filter:"/catalog/show?catalog=popular"},
  {title:"Popular Movies",filter:"/catalog/movie?catalog=popular"},
];

// The app evaluates functional catalogs once before loading provider rows.
// Establish the device link here so row/search/meta calls never open their own WAF.
export const catalog = async function ({providerContext,signal}: {
  providerContext: ProviderContext;
  signal?: AbortSignal;
}): Promise<Catalog[]> {
  await initializeKartoons(providerContext,signal);
  return catalogs;
};

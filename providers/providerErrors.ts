function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function throwProviderError(
  provider: string,
  operation: string,
  error: unknown,
): never {
  const response = (error as any)?.response;
  const status = response?.status;
  const statusText = response?.statusText;
  const url = response?.config?.url || (error as any)?.config?.url;
  const details = [
    status ? `HTTP ${status}${statusText ? ` ${statusText}` : ""}` : "",
    url ? `URL ${url}` : "",
    getErrorMessage(error),
  ].filter(Boolean);

  throw new Error(`${provider} ${operation} failed: ${details.join(" | ")}`);
}

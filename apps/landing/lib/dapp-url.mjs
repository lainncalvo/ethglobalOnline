const LOCAL_DAPP_URL = "http://localhost:3000";

export function resolveDappUrl(configuredUrl) {
  const parsedUrl = new URL(configuredUrl?.trim() || LOCAL_DAPP_URL);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("NEXT_PUBLIC_DAPP_URL must use HTTP or HTTPS.");
  }

  return parsedUrl.toString().replace(/\/+$/, "");
}

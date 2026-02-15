const ORIGIN = "https://south.ayanakojivps.shop"; // 443 default

export default async (request: Request, context: any) => {
  const incomingUrl = new URL(request.url);

  // Forward full path + query
  const targetUrl = ORIGIN + incomingUrl.pathname + incomingUrl.search;

  // Clone headers properly
  const headers = new Headers(request.headers);

  // Fix host header
  headers.set("host", "south.ayanakojivps.shop");

  // Preserve real client IP
  const clientIP =
    request.headers.get("x-forwarded-for")?.split(",")[0] || context.ip;

  if (clientIP) {
    headers.set("x-forwarded-for", clientIP);
  }

  // Detect SSE
  const isSSE =
    request.headers.get("accept")?.includes("text/event-stream");

  // IMPORTANT: duplex required for streaming request body
  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half"
  } as any);

  const responseHeaders = new Headers(backendResponse.headers);

  // Ensure streaming behavior
  if (isSSE) {
    responseHeaders.set("Cache-Control", "no-cache");
    responseHeaders.set("Connection", "keep-alive");
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders
  });
};

const ORIGIN = "https://south.ayanakojivps.shop";

export default async (request: Request) => {
  const url = new URL(request.url);
  const target = ORIGIN + url.pathname + url.search;

  const response = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    duplex: "half"
  } as any);

  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  });
};

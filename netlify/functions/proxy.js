// netlify/functions/proxy.js
const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || "https://gsa.ayanakojivps.shop";

function buildBackendUrl(event) {
  // event.path contains the path after the domain
  // event.rawQueryString may exist (Netlify adds it in some runtimes)
  const path = event.path || "/";
  const qs = (event.rawQueryString && event.rawQueryString.length) ? `?${event.rawQueryString}` : (() => {
    if (event.queryStringParameters && Object.keys(event.queryStringParameters).length) {
      return '?' + Object.entries(event.queryStringParameters).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    }
    return '';
  })();

  return `${BACKEND_URL}${path}${qs}`;
}

exports.handler = async function(event, context) {
  try {
    const backendUrl = buildBackendUrl(event);

    // Build headers and ensure Host is backend host
    const headers = Object.assign({}, event.headers || {});
    try {
      const backendHost = new URL(BACKEND_URL).host;
      headers['host'] = backendHost;
    } catch (e) {
      // ignore
    }

    // Remove headers that can confuse proxies (optional)
    delete headers['x-forwarded-for'];
    delete headers['x-forwarded-proto'];
    delete headers['x-forwarded-host'];
    // Keep content-type and others intact for VLESS/xhttp

    // Prepare body: Netlify passes body as string; may be base64 encoded.
    let body;
    if (event.body) {
      if (event.isBase64Encoded) {
        body = Buffer.from(event.body, 'base64');
      } else {
        // For binary-safety we convert to Buffer (UTF-8)
        body = Buffer.from(event.body, 'utf8');
      }
    } else {
      body = undefined;
    }

    const fetchOptions = {
      method: event.httpMethod,
      headers,
      // Note: node-fetch v2 accepts Buffer for body
      body: (event.httpMethod === 'GET' || event.httpMethod === 'HEAD') ? undefined : body,
      redirect: 'manual',
    };

    const resp = await fetch(backendUrl, fetchOptions);

    // Read response as ArrayBuffer -> Buffer -> base64
    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const b64 = buffer.toString('base64');

    // Convert headers from resp to plain object
    const outHeaders = {};
    resp.headers.forEach((val, key) => {
      // Netlify requires header values to be strings (not arrays)
      outHeaders[key] = val;
    });

    return {
      statusCode: resp.status,
      headers: outHeaders,
      body: b64,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("Proxy function error:", err);
    return {
      statusCode: 502,
      headers: { "Content-Type": "text/plain" },
      body: "Bad Gateway",
      isBase64Encoded: false
    };
  }
};

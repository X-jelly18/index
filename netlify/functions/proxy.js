// Perfect Netlify adaptation of your Vercel proxy
// Same behavior, same logic, binary-safe

const https = require("https");

exports.handler = async (event) => {
  return new Promise((resolve) => {
    const backendHost = "gsa.ayanakojivps.shop/jnjZSkLz4LEnvl6AjxcwLcxU7/fdbe153c-94fd-4fcd-96f7-dc87f3446eed";
    const path = event.path + (event.rawQueryString ? "?" + event.rawQueryString : "");

    // convert incoming headers to Node format
    const headers = { ...event.headers, host: backendHost };

    const options = {
      hostname: backendHost,
      port: 443,
      path,
      method: event.httpMethod,
      headers,
    };

    const req = https.request(options, (backendRes) => {
      // Collect response chunks (binary)
      const chunks = [];
      backendRes.on("data", (chunk) => chunks.push(chunk));

      backendRes.on("end", () => {
        const bodyBuffer = Buffer.concat(chunks);

        // Convert backend headers to plain object
        const responseHeaders = {};
        for (const [key, value] of Object.entries(backendRes.headers)) {
          responseHeaders[key] = value;
        }

        // Return exactly what backend sent, base64-encoded for Netlify
        resolve({
          statusCode: backendRes.statusCode,
          headers: responseHeaders,
          body: bodyBuffer.toString("base64"),
          isBase64Encoded: true,
        });
      });
    });

    req.on("error", (err) => {
      console.error("Backend request error:", err);
      resolve({
        statusCode: 502,
        body: "Bad Gateway",
      });
    });

    // Forward request body for POST / PUT, etc.
    if (event.body && event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
      const body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body;

      req.write(body);
    }

    req.end();
  });
};    // Keep content-type and others intact for VLESS/xhttp

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

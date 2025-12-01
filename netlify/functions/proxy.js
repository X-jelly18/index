const https = require("https");

exports.handler = async function (event) {
  return new Promise((resolve) => {
    try {
      const backendHost = "gsa.ayanakojivps.shop";
      const fullPath =
        event.path + (event.rawQueryString ? "?" + event.rawQueryString : "");

      const headers = { ...event.headers, host: backendHost };

      const options = {
        hostname: backendHost,
        port: 443,
        path: fullPath,
        method: event.httpMethod,
        headers,
      };

      const req = https.request(options, (backendRes) => {
        const chunks = [];

        backendRes.on("data", (chunk) => {
          if (chunk) chunks.push(chunk);
        });

        backendRes.on("end", () => {
          try {
            const body = Buffer.concat(chunks);

            const responseHeaders = {};
            for (const [k, v] of Object.entries(backendRes.headers)) {
              responseHeaders[k] = v;
            }

            resolve({
              statusCode: backendRes.statusCode,
              headers: responseHeaders,
              body: body.toString("base64"),
              isBase64Encoded: true,
            });
          } catch (err) {
            console.error("Response concat error:", err);
            resolve({ statusCode: 502, body: "Bad Gateway" });
          }
        });
      });

      req.on("error", (err) => {
        console.error("Backend request error:", err);
        resolve({ statusCode: 502, body: "Bad Gateway" });
      });

      if (event.body && !["GET", "HEAD"].includes(event.httpMethod)) {
        const body = event.isBase64Encoded
          ? Buffer.from(event.body, "base64")
          : event.body;
        req.write(body);
      }

      req.end();
    } catch (err) {
      console.error("Proxy function fatal error:", err);
      resolve({ statusCode: 500, body: "Internal Server Error" });
    }
  });
};          headers: responseHeaders,
          body: body.toString("base64"),
          isBase64Encoded: true,
        });
      });
    });

    req.on("error", (err) => {
      console.error("Proxy error:", err);

      resolve({
        statusCode: 502,
        body: "Bad Gateway",
      });
    });

    // forward client body
    if (
      event.httpMethod !== "GET" &&
      event.httpMethod !== "HEAD" &&
      event.body
    ) {
      const body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body;

      req.write(body);
    }

    req.end();
  });
};        resolve({
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

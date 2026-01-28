import http from "http";
import https from "https";
import express from "express";

const app = express();

app.set("etag", false);
app.set("x-powered-by", false);

app.all("*", (req, res) => {
  const backendHost = "shayimbuzi.kingbbxvggshop.shop";

  const options = {
    hostname: backendHost,
    port: 443,
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      host: backendHost,
      connection: "keep-alive",
    },
  };

  delete options.headers["content-length"];
  delete options.headers["accept-encoding"];

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    });

    proxyRes.pipe(res, { highWaterMark: 64 * 1024 });
  });

  proxyReq.on("error", (err) => {
    console.error("Upstream error:", err);
    if (!res.headersSent) res.status(502).end();
    else res.end();
  });

  if (req.method !== "GET" && req.method !== "HEAD") {
    req.pipe(proxyReq, { highWaterMark: 64 * 1024 });
  } else {
    proxyReq.end();
  }
});

const port = process.env.PORT || 8080;
http.createServer(app).listen(port);
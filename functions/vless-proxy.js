// functions/vless-proxy.js

const https = require("https");

// --- CONFIGURATION ---
const BACKEND_HOST = "gsa.ayanakojivps.shop"; 
const BACKEND_PORT = 443;
// --- END CONFIGURATION ---

// Netlify/Lambda handler format
exports.handler = async (event, context) => {
    
    // The path and query come from the event object
    const dynamicPath = event.path.replace('/.netlify/functions/vless-proxy', '') + (event.queryStringParameters ? '?' + new URLSearchParams(event.queryStringParameters).toString() : '');
    const clientMethod = event.httpMethod;
    const clientHeaders = event.headers;

    // Reconstruct Headers for the outbound request
    const proxyHeaders = {
        ...clientHeaders,
        host: BACKEND_HOST,
        'Connection': clientHeaders.connection || 'keep-alive',
    };
    
    // Lambda functions require a Promise-based approach
    return new Promise((resolve, reject) => {
        
        const options = {
            hostname: BACKEND_HOST,
            port: BACKEND_PORT,
            path: dynamicPath,
            method: clientMethod,
            headers: proxyHeaders,
            rejectUnauthorized: false
        };

        const proxyReq = https.request(options, (proxyRes) => {
            
            // Reconstruct the response body
            let body = '';
            proxyRes.on('data', (chunk) => { body += chunk; });
            proxyRes.on('end', () => {
                // Lambda function must resolve with a complete response object
                resolve({
                    statusCode: proxyRes.statusCode,
                    headers: proxyRes.headers,
                    body: body,
                    isBase64Encoded: false, // Set to true if VLESS data is binary
                });
            });
        });

        proxyReq.on("error", (err) => {
            console.error("Proxy backend error:", err.message);
            reject({
                statusCode: 502,
                body: "502 Bad Gateway: Proxy failed.",
            });
        });

        // Write the body. VLESS data is typically binary, so we need to handle base64 encoding
        if (event.body) {
            proxyReq.write(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
        }
        proxyReq.end();
    });
                                                                                     };

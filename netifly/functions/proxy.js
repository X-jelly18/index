// netlify/functions/proxy.js

const https = require('https');

// The main handler function for Netlify
exports.handler = async (event, context) => {
    // 1. Define Backend and Request Details
    const backendHost = 'gsa.ayanakojivps.shop';
    
    // Netlify event.path gives the full path, 
    // We strip the function path part '/.netlify/functions/proxy' to get the route for the backend
    const backendPath = event.path.replace('/.netlify/functions/proxy', '');
    
    const method = event.httpMethod;

    // Get the body, handling base64 encoding if necessary for Netlify functions
    const requestBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;

    // 2. Promisify the HTTPS request
    return new Promise((resolve, reject) => {
        const options = {
            hostname: backendHost,
            port: 443,
            path: backendPath,
            method: method,
            // Pass through headers, but ensure 'host' is set correctly for the backend
            headers: { ...event.headers, host: backendHost },
        };

        const backendReq = https.request(options, backendRes => {
            
            // Collect the response data chunks
            let data = [];
            backendRes.on('data', chunk => data.push(chunk));

            backendRes.on('end', () => {
                const responseBody = Buffer.concat(data);

                // Determine if the body should be base64 encoded for Netlify's response format
                const contentType = backendRes.headers['content-type'];
                const isBinary = !contentType || (!contentType.includes('text') && !contentType.includes('json'));
                
                // Construct the required Netlify response object
                resolve({
                    statusCode: backendRes.statusCode,
                    headers: backendRes.headers,
                    body: isBinary ? responseBody.toString('base64') : responseBody.toString('utf8'),
                    isBase64Encoded: isBinary,
                });
            });
        });

        backendReq.on('error', err => {
            console.error('Backend request error:', err);
            // Handle errors by sending a 502 Bad Gateway response
            resolve({
                statusCode: 502,
                body: JSON.stringify({ error: 'Bad Gateway: Proxy request failed.' }),
            });
        });

        // 4. Write the Request Body for POST/PUT/etc.
        if (requestBody && method !== 'GET' && method !== 'HEAD') {
            backendReq.write(requestBody);
        }
        
        backendReq.end();
    });
};￼Enter

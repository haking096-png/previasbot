const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Use internal Railway domain for backend communication
const getApiUrl = () => {
  // In Railway, use internal domain for backend communication (HTTP)
  if (process.env.RAILWAY_BACKEND_URL) {
    return process.env.RAILWAY_BACKEND_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    // Proxy API requests to backend
    if (parsedUrl.pathname.startsWith('/api/')) {
      const apiUrl = getApiUrl();
      const apiUrlParsed = new URL(apiUrl);
      const apiHostname = apiUrlParsed.hostname;
      const apiPort = apiUrlParsed.port || (apiUrlParsed.protocol === 'https:' ? 443 : 80);
      const apiPath = parsedUrl.pathname + (parsedUrl.search || '');

      const options = {
        hostname: apiHostname,
        port: apiPort,
        path: apiPath,
        method: req.method,
        headers: {
          ...req.headers,
          host: apiHostname,
          'X-Forwarded-Host': req.headers.host || '',
          'X-Forwarded-Proto': 'https',
        },
      };

      const proxyReq = (apiUrlParsed.protocol === 'https:' ? require('https') : require('http')).request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy error:', err);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unavailable' }));
      });

      req.pipe(proxyReq);
      return;
    }

    // Handle Next.js requests
    handle(req, res, parsedUrl);
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

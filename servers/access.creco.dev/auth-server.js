const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');

const USERNAME = process.env.AUTH_USER || 'admin';
const PASSWORD = process.env.AUTH_PASS || 'ulOsHo5vnu5bJuwq';
const SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'goaccess_session';
const LOG_FILE = process.env.ACCESS_LOG_PATH || '/var/log/traefik/access.log';

function makeToken() {
  return crypto.createHmac('sha256', SECRET).update(USERNAME + PASSWORD).digest('hex');
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [key, val] = c.trim().split('=');
    if (key && val) cookies[key] = val;
  });
  return cookies;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] === makeToken();
}

// Parse a COMBINED log line
function parseLogLine(line) {
  // Format: %h - %^ [%d:%t %^] "%r" %s %b "%R" "%u"
  const regex = /^(\S+) - \S+ \[([^\]]+)\] "(\S+) (\S+) ([^"]*)" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"/;
  const match = line.match(regex);
  if (!match) return null;
  return {
    ip: match[1],
    time: match[2],
    method: match[3],
    path: match[4],
    protocol: match[5],
    status: parseInt(match[6]),
    size: match[7] === '-' ? 0 : parseInt(match[7]),
    referer: match[8],
    userAgent: match[9]
  };
}

// Read log file with pagination and search
async function readLogs(page = 1, perPage = 100, search = '', statusFilter = '') {
  if (!fs.existsSync(LOG_FILE)) {
    return { logs: [], total: 0, page, perPage };
  }

  const lines = [];
  const fileStream = fs.createReadStream(LOG_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const parsed = parseLogLine(line);
    if (!parsed) continue;

    // Apply search filter
    if (search) {
      const s = search.toLowerCase();
      const matchesSearch =
        parsed.ip.toLowerCase().includes(s) ||
        parsed.path.toLowerCase().includes(s) ||
        parsed.userAgent.toLowerCase().includes(s) ||
        parsed.method.toLowerCase().includes(s) ||
        String(parsed.status).includes(s);
      if (!matchesSearch) continue;
    }

    // Apply status filter
    if (statusFilter) {
      if (statusFilter.endsWith('xx')) {
        const prefix = statusFilter[0];
        if (String(parsed.status)[0] !== prefix) continue;
      } else if (String(parsed.status) !== statusFilter) {
        continue;
      }
    }

    lines.push(parsed);
  }

  // Reverse to show newest first
  lines.reverse();

  const total = lines.length;
  const start = (page - 1) * perPage;
  const paged = lines.slice(start, start + perPage);

  return { logs: paged, total, page, perPage };
}

function parseUrl(url) {
  const [path, queryString] = url.split('?');
  const params = {};
  if (queryString) {
    queryString.split('&').forEach(p => {
      const [k, v] = p.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }
  return { path, params };
}

const server = http.createServer(async (req, res) => {
  const { path, params } = parseUrl(req.url);

  if (path === '/auth' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        if (username === USERNAME && password === PASSWORD) {
          const token = makeToken();
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
          });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid credentials' }));
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Bad request' }));
      }
    });
  } else if (path === '/verify') {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[COOKIE_NAME];
    if (token === makeToken()) {
      res.writeHead(200);
    } else {
      res.writeHead(401);
    }
    res.end();
  } else if (path === '/logout') {
    res.writeHead(302, {
      'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`,
      'Location': '/login'
    });
    res.end();
  } else if (path === '/api/logs') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    try {
      const page = parseInt(params.page) || 1;
      const perPage = Math.min(parseInt(params.perPage) || 100, 500);
      const search = params.search || '';
      const status = params.status || '';
      const result = await readLogs(page, perPage, search, status);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read logs', detail: err.message }));
    }
  } else if (path === '/api/stats') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    try {
      const stat = fs.existsSync(LOG_FILE) ? fs.statSync(LOG_FILE) : null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        fileSize: stat ? stat.size : 0,
        lastModified: stat ? stat.mtime.toISOString() : null
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Auth server running on :3000');
});

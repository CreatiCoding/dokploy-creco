const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');

const USERNAME = process.env.AUTH_USER || 'admin';
const PASSWORD = process.env.AUTH_PASS || 'ulOsHo5vnu5bJuwq';
const SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'goaccess_session';
function resolveLogFile() {
  const candidate = process.env.ACCESS_LOG_PATH || '/var/log/traefik/access.log';
  try {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  } catch {}
  return '/tmp/access.log';
}
const LOG_FILE = resolveLogFile();

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

// KQL (Kibana Query Language) parser
function parseKQL(query) {
  if (!query || !query.trim()) return null;
  const tokens = tokenizeKQL(query);
  return buildAST(tokens);
}

function tokenizeKQL(query) {
  const tokens = [];
  let i = 0;
  while (i < query.length) {
    if (query[i] === ' ' || query[i] === '\t') { i++; continue; }
    // Quoted string
    if (query[i] === '"') {
      let val = '';
      i++;
      while (i < query.length && query[i] !== '"') { val += query[i]; i++; }
      i++; // skip closing quote
      tokens.push({ type: 'value', value: val });
      continue;
    }
    // Operators
    if (query.slice(i, i + 2) === '>=') { tokens.push({ type: 'op', value: '>=' }); i += 2; continue; }
    if (query.slice(i, i + 2) === '<=') { tokens.push({ type: 'op', value: '<=' }); i += 2; continue; }
    if (query[i] === '>' && query[i + 1] !== '=') { tokens.push({ type: 'op', value: '>' }); i++; continue; }
    if (query[i] === '<' && query[i + 1] !== '=') { tokens.push({ type: 'op', value: '<' }); i++; continue; }
    if (query[i] === ':') { tokens.push({ type: 'colon' }); i++; continue; }
    if (query[i] === '(' ) { tokens.push({ type: 'lparen' }); i++; continue; }
    if (query[i] === ')' ) { tokens.push({ type: 'rparen' }); i++; continue; }
    // Word
    let word = '';
    while (i < query.length && ![' ', '\t', ':', '>', '<', '(', ')', '"'].includes(query[i])) {
      word += query[i]; i++;
    }
    const lower = word.toLowerCase();
    if (lower === 'and') tokens.push({ type: 'and' });
    else if (lower === 'or') tokens.push({ type: 'or' });
    else if (lower === 'not') tokens.push({ type: 'not' });
    else tokens.push({ type: 'value', value: word });
  }
  return tokens;
}

function buildAST(tokens) {
  let pos = 0;
  function parseOr() {
    let left = parseAnd();
    while (pos < tokens.length && tokens[pos].type === 'or') {
      pos++;
      const right = parseAnd();
      left = { type: 'or', left, right };
    }
    return left;
  }
  function parseAnd() {
    let left = parseNot();
    while (pos < tokens.length) {
      if (tokens[pos].type === 'or' || tokens[pos].type === 'rparen') break;
      if (tokens[pos].type === 'and') {
        pos++;
        const right = parseNot();
        left = { type: 'and', left, right };
      } else if (tokens[pos].type === 'value' || tokens[pos].type === 'not' || tokens[pos].type === 'lparen') {
        // Implicit AND
        const right = parseNot();
        left = { type: 'and', left, right };
      } else {
        break;
      }
    }
    return left;
  }
  function parseNot() {
    if (pos < tokens.length && tokens[pos].type === 'not') {
      pos++;
      const expr = parsePrimary();
      return { type: 'not', expr };
    }
    return parsePrimary();
  }
  function parsePrimary() {
    if (pos >= tokens.length) return { type: 'match_all' };
    if (tokens[pos].type === 'lparen') {
      pos++;
      const expr = parseOr();
      if (pos < tokens.length && tokens[pos].type === 'rparen') pos++;
      return expr;
    }
    if (tokens[pos].type === 'value') {
      const field = tokens[pos].value;
      pos++;
      // field: value or field: "value"
      if (pos < tokens.length && tokens[pos].type === 'colon') {
        pos++;
        let value = '';
        if (pos < tokens.length && tokens[pos].type === 'value') {
          value = tokens[pos].value; pos++;
        }
        return { type: 'field_match', field: normalizeField(field), value, wildcard: value.includes('*') };
      }
      // field >= value
      if (pos < tokens.length && tokens[pos].type === 'op') {
        const op = tokens[pos].value; pos++;
        let value = '';
        if (pos < tokens.length && tokens[pos].type === 'value') {
          value = tokens[pos].value; pos++;
        }
        return { type: 'compare', field: normalizeField(field), op, value: Number(value) };
      }
      // Free text search
      return { type: 'freetext', value: field };
    }
    pos++;
    return { type: 'match_all' };
  }
  return parseOr();
}

function normalizeField(field) {
  const map = { ua: 'userAgent', useragent: 'userAgent', agent: 'userAgent', user_agent: 'userAgent' };
  return map[field.toLowerCase()] || field.toLowerCase();
}

function matchWildcard(pattern, value) {
  const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
  return regex.test(value);
}

function evaluateKQL(ast, entry) {
  if (!ast) return true;
  switch (ast.type) {
    case 'match_all': return true;
    case 'and': return evaluateKQL(ast.left, entry) && evaluateKQL(ast.right, entry);
    case 'or': return evaluateKQL(ast.left, entry) || evaluateKQL(ast.right, entry);
    case 'not': return !evaluateKQL(ast.expr, entry);
    case 'field_match': {
      const val = getField(entry, ast.field);
      if (ast.wildcard) return matchWildcard(ast.value, String(val));
      return String(val).toLowerCase().includes(ast.value.toLowerCase());
    }
    case 'compare': {
      const val = Number(getField(entry, ast.field));
      switch (ast.op) {
        case '>': return val > ast.value;
        case '>=': return val >= ast.value;
        case '<': return val < ast.value;
        case '<=': return val <= ast.value;
      }
      return false;
    }
    case 'freetext': {
      const s = ast.value.toLowerCase();
      return entry.ip.toLowerCase().includes(s) ||
        entry.path.toLowerCase().includes(s) ||
        entry.userAgent.toLowerCase().includes(s) ||
        entry.method.toLowerCase().includes(s) ||
        String(entry.status).includes(s);
    }
    default: return true;
  }
}

function getField(entry, field) {
  if (field === 'status') return entry.status;
  if (field === 'size') return entry.size;
  return entry[field] || '';
}

// Read log file with pagination and search
async function readLogs(page = 1, perPage = 100, search = '', statusFilter = '') {
  if (!fs.existsSync(LOG_FILE)) {
    return { logs: [], total: 0, page, perPage };
  }

  const ast = parseKQL(search);
  const lines = [];
  const fileStream = fs.createReadStream(LOG_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const parsed = parseLogLine(line);
    if (!parsed) continue;

    // Apply KQL filter
    if (ast && !evaluateKQL(ast, parsed)) continue;

    // Apply status filter (from UI buttons)
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
  } else if (path === '/api/debug') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    try {
      const data = fs.readFileSync(LOG_FILE, 'utf8');
      const lines = data.split('\n').filter(l => l.trim()).slice(0, 5);
      const parsed = lines.map(l => ({ raw: l, parsed: parseLogLine(l) }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logFile: LOG_FILE, sampleLines: parsed }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, logFile: LOG_FILE }));
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

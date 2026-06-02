#!/usr/bin/env node
const https = require('https');

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  SUPABASE_PAT,
} = process.env;

const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/(.+)\.supabase\.co/)?.[1] || '';

async function fetch(url, opts) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(body); } catch { parsed = body; }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
        else reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function sqlViaManagementAPI(sql) {
  if (!SUPABASE_PAT) {
    throw new Error(
      'DDL/SQL execution requires a Supabase Personal Access Token (PAT).\n' +
      'Generate one at: https://supabase.com/dashboard/account/tokens\n' +
      'Then set SUPABASE_PAT in your environment or opencode MCP config.'
    );
  }
  return fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
}

async function listTables() {
  if (!SUPABASE_PAT) throw new Error('SUPABASE_PAT required');
  return sqlViaManagementAPI(
    "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
}

async function runQuery(sql) {
  return sqlViaManagementAPI(sql);
}

async function checkConnection() {
  if (!SUPABASE_PAT) return { connected: false, error: 'SUPABASE_PAT not configured' };
  try {
    await sqlViaManagementAPI('SELECT 1 AS ok');
    return { connected: true, project: PROJECT_REF, auth: 'pat' };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

class McpServer {
  constructor() {
    this.pending = new Set();
    let buf = '';
    process.stdin.on('data', chunk => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          const op = this.handle(line);
          this.pending.add(op);
          op.finally(() => { this.pending.delete(op); });
        }
      }
    });
    process.stdin.on('end', () => {
      if (this.pending.size === 0) process.exit(0);
    });
  }

  async handle(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const { id, method, params } = msg;
    try {
      let result;
      switch (method) {
        case 'initialize':
          result = { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'syncsaga-supabase', version: '1.0.0' } };
          break;
        case 'listTools':
          result = { tools: [
            { name: 'execute_sql', description: 'Execute any SQL on Supabase (DDL + queries)', inputSchema: { type: 'object', properties: { sql: { type: 'string', description: 'SQL to execute' } }, required: ['sql'] } },
            { name: 'list_tables', description: 'List all tables in the public schema', inputSchema: { type: 'object', properties: {} } },
            { name: 'check_connection', description: 'Check Supabase connection status', inputSchema: { type: 'object', properties: {} } },
          ]};
          break;
        case 'tools/call':
        case 'callTool':
          result = await this.call(params);
          break;
        default:
          throw { code: -32601, message: `Unknown method: ${method}` };
      }
      this.send(id, result);
    } catch (e) {
      this.send(id, null, { code: e.code || -32603, message: e.message });
    }
  }

  async call(params) {
    const { name, arguments: args } = params;
    let r;
    switch (name) {
      case 'execute_sql': r = await runQuery(args.sql); break;
      case 'list_tables': r = await listTables(); break;
      case 'check_connection': r = await checkConnection(); break;
      default: throw { code: -32601, message: `Unknown tool: ${name}` };
    }
    return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
  }

  send(id, result, error) {
    process.stdout.write(JSON.stringify(error ? { jsonrpc: '2.0', id, error } : { jsonrpc: '2.0', id, result }) + '\n');
  }
}

new McpServer();

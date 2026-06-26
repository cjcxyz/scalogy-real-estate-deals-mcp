// Smoke test: boot the server over stdio, run the MCP handshake, and confirm
// `find_graded_deals` is registered. No wallet/network is required — the server
// starts without EVM_PRIVATE_KEY (the tool only needs it at call time).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENTRY = join(dirname(fileURLToPath(import.meta.url)), '..', 'index.mjs');

// Send newline-delimited JSON-RPC, collect responses by id until we have the
// tools/list result (or time out).
function rpc(child, msg) {
  child.stdin.write(JSON.stringify(msg) + '\n');
}

test('server boots and exposes find_graded_deals', async () => {
  const child = spawn(process.execPath, [ENTRY], {
    env: { ...process.env, EVM_PRIVATE_KEY: '' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const tools = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('timed out waiting for tools/list response'));
    }, 15000);

    let buf = '';
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === 1) {
          // initialize ack -> announce initialized, then ask for tools
          rpc(child, { jsonrpc: '2.0', method: 'notifications/initialized' });
          rpc(child, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
        } else if (msg.id === 2) {
          clearTimeout(timer);
          child.kill();
          resolve(msg.result?.tools ?? []);
        }
      }
    });
    child.on('error', reject);

    rpc(child, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'smoke-test', version: '0.0.0' },
      },
    });
  });

  const names = tools.map((t) => t.name);
  assert.ok(names.includes('find_graded_deals'), `expected find_graded_deals, got: ${names.join(', ')}`);
});

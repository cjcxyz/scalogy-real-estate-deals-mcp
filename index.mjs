#!/usr/bin/env node
// Scalogy Real Estate Deals — MCP server.
// Exposes `find_graded_deals` as an MCP tool. Each call is paid per-request in
// USDC on Base via x402, using the wallet the user configures (EVM_PRIVATE_KEY).
// The user self-funds; nothing is billed to a shared key.
//
// Config (env):
//   EVM_PRIVATE_KEY     Base wallet private key, funded with a few USDC (required to buy)
//   RESOURCE_SERVER_URL default https://x402-scalogy-production.up.railway.app
//   CLIENT_ID           default the public Scalogy feed id
//   X402_NETWORK        default eip155:8453 (Base mainnet)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

const BASE = (process.env.RESOURCE_SERVER_URL || 'https://x402-scalogy-production.up.railway.app').replace(/\/$/, '');
const CLIENT_ID = process.env.CLIENT_ID || '9e56a91b-3157-40fd-89ca-37e50923b5c2';
const NETWORK = process.env.X402_NETWORK || 'eip155:8453';
const PK = process.env.EVM_PRIVATE_KEY;

// Build a payment-enabled fetch from the user's wallet (if configured).
let payFetch = globalThis.fetch;
let walletAddress = null;
if (PK) {
  const account = privateKeyToAccount(PK.startsWith('0x') ? PK : `0x${PK}`);
  walletAddress = account.address;
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account, networks: [NETWORK] });
  payFetch = wrapFetchWithPayment(globalThis.fetch, client);
}

const server = new McpServer({ name: 'scalogy-real-estate-deals', version: '1.0.0' });

server.registerTool(
  'find_graded_deals',
  {
    title: 'Find graded real-estate deals',
    description:
      'Search proprietary, daily-scored US residential real-estate investment deals (flip, BRRRR, ' +
      'buy-&-hold). Each on-market listing is graded STRONG/MODERATE/FAIR with an estimated ARV from a ' +
      'live comp set, gross spread, margin %, cap rate/cash flow, days-on-market, comp count, and the ' +
      'source URL. Coverage: FL, GA, NC, SC, AL, MS. Paid per call in USDC on Base via x402 (typically ' +
      'a few cents). Use when an agent needs vetted acquisition targets with computed economics.',
    inputSchema: {
      strategy: z.enum(['flip', 'brrrr', 'buy_hold']).optional().describe("Strategy to grade against. Default flip. 'rental' aliases buy_hold."),
      min_grade: z.enum(['STRONG', 'MODERATE', 'FAIR']).optional().describe('Minimum grade to return (this grade and better). Default STRONG.'),
      state: z.string().length(2).optional().describe("2-letter state filter, e.g. 'FL'."),
      zip: z.string().optional().describe('Exact ZIP filter.'),
      city: z.string().optional().describe('City filter (case-insensitive).'),
      min_price: z.number().int().optional().describe('Minimum list price (USD).'),
      max_price: z.number().int().optional().describe('Maximum list price (USD).'),
      beds_min: z.number().int().optional().describe('Minimum bedrooms.'),
      baths_min: z.number().optional().describe('Minimum bathrooms.'),
      min_margin_pct: z.number().optional().describe('Minimum gross margin %, e.g. 25.'),
      min_gross_spread: z.number().int().optional().describe('Minimum gross spread (ARV - list price, USD).'),
      min_arv: z.number().int().optional().describe('Minimum ARV (USD).'),
      min_dom: z.number().int().optional().describe('Minimum days on market (high DOM + strong margin = motivated seller).'),
      max_dom: z.number().int().optional().describe('Maximum days on market.'),
      min_confidence: z.number().int().min(0).max(100).optional().describe('Only ARV-based deals with confidence >= this (0-100).'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (1-100). Default 20.'),
    },
  },
  async (args) => {
    if (!PK) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'No wallet configured. Set EVM_PRIVATE_KEY to a Base wallet funded with a few USDC to purchase deals. See https://pages.scalogy.com/chris/x402/' }],
      };
    }
    const params = new URLSearchParams({ client_id: CLIENT_ID });
    for (const [k, v] of Object.entries(args)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    }
    const url = `${BASE}/find_graded_deals?${params.toString()}`;
    try {
      const res = await payFetch(url);
      const body = await res.text();
      if (res.status !== 200) {
        return { isError: true, content: [{ type: 'text', text: `Request failed (HTTP ${res.status}): ${body.slice(0, 400)}` }] };
      }
      let note = '';
      try {
        const pr = res.headers.get('payment-response');
        if (pr) note = `\n\n[paid via x402 — settlement tx ${decodePaymentResponseHeader(pr).transaction} on Base]`;
      } catch { /* ignore */ }
      return { content: [{ type: 'text', text: body + note }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: `Payment or fetch error: ${e.message}` }] };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`scalogy-real-estate-deals MCP ready (wallet ${walletAddress || 'NOT configured'}, ${BASE})`);

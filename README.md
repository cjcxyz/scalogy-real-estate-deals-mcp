# Scalogy Real Estate Deals — MCP server

An [MCP](https://modelcontextprotocol.io) server that gives your AI agent **vetted, daily-scored
US residential real-estate investment deals** — flip, BRRRR, and buy-&-hold — each graded
STRONG/MODERATE/FAIR with an estimated ARV from a live comp set, gross spread, margin %, cap
rate/cash flow, days-on-market and the source listing URL.

Every call is paid **per request in USDC on Base** via [x402](https://x402.org) — typically a few
cents — using **your own wallet**. No signup, no API key, no subscription. Coverage: FL, GA, NC,
SC, AL, MS (expanding).

Docs & live API: **https://pages.scalogy.com/chris/x402/**

## How it works

The server wraps the `find_graded_deals` x402 endpoint. On each tool call it makes an HTTP request;
the server answers `402 Payment Required` with a price; this MCP server signs a USDC payment from
your configured wallet and retries; you get the deals back. Settlement is **gasless for you** — the
facilitator sponsors gas, so your wallet only needs **USDC** (no ETH).

## Setup

1. **Fund a Base wallet** with a few dollars of **USDC on Base mainnet** (no ETH needed). Export its
   private key. Use a dedicated low-balance wallet — this key is stored in your MCP client config.
2. **Add the server to your MCP client.**

### Claude Desktop — `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "scalogy-real-estate-deals": {
      "command": "npx",
      "args": ["-y", "scalogy-real-estate-deals-mcp"],
      "env": { "EVM_PRIVATE_KEY": "0xYOUR_FUNDED_BASE_WALLET_KEY" }
    }
  }
}
```

### Cursor / other MCP clients — `mcp.json`

```json
{
  "mcpServers": {
    "scalogy-real-estate-deals": {
      "command": "npx",
      "args": ["-y", "scalogy-real-estate-deals-mcp"],
      "env": { "EVM_PRIVATE_KEY": "0xYOUR_FUNDED_BASE_WALLET_KEY" }
    }
  }
}
```

Restart the client. Your agent now has a `find_graded_deals` tool.

## Configuration

| Env var | Default | Notes |
|---|---|---|
| `EVM_PRIVATE_KEY` | — | **Required to buy.** A Base wallet funded with USDC. Without it the tool returns a setup message and spends nothing. |
| `RESOURCE_SERVER_URL` | `https://x402-scalogy-production.up.railway.app` | The deal API. |
| `CLIENT_ID` | Scalogy public feed id | Which feed to query. |
| `X402_NETWORK` | `eip155:8453` | Base mainnet. |

## Pricing

Quoted per call from what it returns, capped at $20/call: base **$0.02** + **$0.15**/STRONG +
**$0.06**/MODERATE + **$0.02**/FAIR. A query that returns nothing costs only the base fee.

## Tool: `find_graded_deals`

Filters (all optional): `strategy` (flip/brrrr/buy_hold), `min_grade` (STRONG/MODERATE/FAIR),
`state`, `zip`, `city`, `min_price`, `max_price`, `beds_min`, `baths_min`, `min_margin_pct`,
`min_gross_spread`, `min_arv`, `min_dom`, `max_dom`, `min_confidence`, `limit`.

Returns JSON `{ count, deals[] }` where each deal has address, beds/baths/sqft/year_built,
property_type, list_price, arv (+ p25/p75), gross_spread, gross_margin_pct, grade, dom, comp_count,
a human-readable reason, the source URL, and an ARV confidence score.

## Run without npm publish

If the package isn't on npm yet, clone this folder and point your client at it:

```json
{ "command": "node", "args": ["/absolute/path/to/x402-mcp/index.mjs"],
  "env": { "EVM_PRIVATE_KEY": "0x..." } }
```

---

*Data is informational, not investment advice. ARV is an automated comp-based estimate — verify
before acting.*

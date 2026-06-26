# Contributing

Thanks for your interest in improving the Scalogy Real Estate Deals MCP server.

## Development

```bash
git clone https://github.com/cjcxyz/scalogy-real-estate-deals-mcp.git
cd scalogy-real-estate-deals-mcp
npm install
npm test
```

The server is a single file, `index.mjs`, exposing one MCP tool
(`find_graded_deals`) over stdio. `npm test` boots the server and verifies the
tool is registered — no wallet or network access is required to run it.

## Pull requests

1. Fork and create a branch off `main`.
2. Keep changes focused; match the existing code style.
3. Make sure `npm test` passes (CI runs it on Node 20 and 22).
4. Open a PR describing what changed and why.

## Questions / issues

Open an issue at
https://github.com/cjcxyz/scalogy-real-estate-deals-mcp/issues. For security
reports, see [SECURITY.md](./SECURITY.md).

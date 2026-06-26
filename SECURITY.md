# Security Policy

## Handling of wallet keys

This MCP server reads a Base wallet private key from the `EVM_PRIVATE_KEY`
environment variable and uses it **only** to sign x402 USDC payments for the
`find_graded_deals` endpoint. The key is never logged, persisted, or transmitted
anywhere other than as part of the x402 payment signature flow.

**Use a dedicated, low-balance wallet.** Fund it with only the USDC you intend to
spend on queries. Never use a primary or high-value wallet — the key lives in your
MCP client's config file in plaintext.

## Reporting a vulnerability

If you discover a security issue, please **do not** open a public GitHub issue.
Instead, email **christian@cruz-law.com** with details and steps to reproduce.
You can expect an acknowledgement within a few business days.

## Supported versions

The latest published version on npm receives security fixes.

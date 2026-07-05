---
name: extract-chat-request
description: Extract the last (or a matching) /v1/chat/completions network request from the current chrome-devtools-noheaders browser session and save it to disk, without ever echoing the live API key into the conversation. Use whenever the user wants to inspect, debug, or save a BYO-LLM request/response captured via chrome-devtools-noheaders — e.g. "grab that last chat completions call", "save the request that just went out", "extract the request to /v1/chat/completions". Always invoke this instead of manually calling get_network_request yourself, since that tool prints the raw Authorization header straight into the transcript.
---

# Extract Chat Request

Use only the `chrome-devtools-noheaders` MCP server tools — never the plain `chrome-devtools` server — since only `chrome-devtools-noheaders` redacts sensitive headers. Before proceeding, read `.mcp.json` and confirm the `chrome-devtools-noheaders` entry's `args` includes `--redact-network-headers`; if it's missing or the entry is absent, stop and report that instead of continuing.

1. URL substring: default `/chat/completions`, or the skill argument if given.
2. Ensure `.debug/network-captures/` exists (gitignored).
3. Call `mcp__chrome-devtools-noheaders__list_network_requests` (`resourceTypes: ["fetch","xhr"]`, `includePreservedRequests: true`); pick the **last** request whose URL contains the substring.
   - No match → stop, report substring + total requests seen. Never guess or substitute another request.
4. Call `mcp__chrome-devtools-noheaders__get_network_request` with that `reqid`, `requestFilePath: .debug/network-captures/<reqid>-request`, `responseFilePath: .debug/network-captures/<reqid>-response`. (Tool appends `.network-request`/`.network-response` itself — use those exact final names.)
   - Save failed → report exactly what failed and stop. Never fall back to reading/relaying the raw file to compensate.
5. Report ONLY: both file paths, `model` field, message count, one-line plain-English summary of the last exchange. No headers, no tokens, no message dump.

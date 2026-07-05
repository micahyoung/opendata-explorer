---
name: extract-chat-request
description: Extract the last (or a matching) /v1/chat/completions network request from the current chrome-devtools browser session and save it to disk, without ever echoing the live API key into the conversation. Use whenever the user wants to inspect, debug, or save a BYO-LLM request/response captured via chrome-devtools — e.g. "grab that last chat completions call", "save the request that just went out", "extract the request to /v1/chat/completions". Always invoke this instead of manually calling get_network_request yourself, since that tool prints the raw Authorization header straight into the transcript.
---

# Extract Chat Request

`get_network_request` always leaks the raw `Authorization` header into whoever calls it. Never call it yourself. Delegate to a subagent — its intermediate tool calls stay hidden; only its final message is visible.

1. URL substring: default `/chat/completions`, or the skill argument if given.
2. Ensure `.debug/network-captures/` exists (gitignored).
3. Spawn one `general-purpose` subagent, `model: "haiku"`, `run_in_background: false`. Prompt must be fully self-contained and include:
   - Call `list_network_requests` (`resourceTypes: ["fetch","xhr"]`, `includePreservedRequests: true`); pick the **last** request whose URL contains the substring.
   - No match → stop, report substring + total requests seen. Never guess or substitute another request.
   - Call `get_network_request` with that `reqid`, `requestFilePath: .debug/network-captures/<reqid>-request`, `responseFilePath: .debug/network-captures/<reqid>-response`. (Tool appends `.network-request`/`.network-response` itself — use those exact final names.)
   - The response WILL contain a real `Authorization` value. Seeing it is fine; **repeating any fragment of it in the final report is not** — banned outright, no exceptions.
   - Redact defense-in-depth: `sed -i '' -E 's/sk-[A-Za-z0-9_-]{20,}/sk-xxxx-REDACTED/g' <request-file>`.
   - Any failure (no match, save failed, sed errored) → report exactly what failed and stop. Never fall back to reading/relaying the raw file to compensate.
   - Success → return ONLY: both file paths, `model` field, message count, one-line plain-English summary of the last exchange. No headers, no tokens, no message dump.
4. Relay the subagent's report verbatim. Never `Read` the saved files yourself — an incomplete subagent report is a skill failure to surface, not a reason to read the raw file.

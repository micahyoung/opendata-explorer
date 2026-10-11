// Import this first in any script that uses Node's built-in fetch.
//
// Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 is set at
// startup. In proxied sandboxes (e.g. cloud agent sessions) that makes hosts
// the sandbox can't resolve directly fail with a bare "fetch failed"
// (ENOTFOUND), which looks like a blocked host. If a proxy is configured and
// the flag is missing, re-run this script once with it set.
import { spawnSync } from "node:child_process";

const proxied = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;

if (proxied && !process.env.NODE_USE_ENV_PROXY) {
  const result = spawnSync(
    process.execPath,
    ["--disable-warning=UNDICI-EHPA", ...process.argv.slice(1)],
    { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } },
  );
  process.exit(result.status ?? 1);
}

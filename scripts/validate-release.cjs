/* global __dirname */
const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const { join, resolve } = require("node:path");

const mobile = resolve(__dirname, "..");
const api = resolve(mobile, "..", "php_api");
const env = { ...process.env, CI: "1", EXPO_NO_DOTENV: "1" };
const npmCli = process.env.npm_execpath;
const php = process.env.TRACKR_PHP_BIN || "php";
let failed = false;

function run(label, command, args, options = {}) {
  console.log(`\n--- ${label} ---`);
  const result = spawnSync(command, args, { cwd: mobile, env, stdio: "inherit", ...options });
  if (result.status === 0) return true;
  failed = true;
  console.error(`${label} failed`, result.error?.message || result.signal || result.status);
  return false;
}

function lintPhp() {
  const files = readdirSync(api, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".php"));
  let passed = 0;
  for (const file of files) {
    const path = join(file.parentPath, file.name);
    const result = spawnSync(php, ["-l", path], { encoding: "utf8" });
    if (result.error) {
      console.error(result.error.message);
      break;
    }
    if (result.status === 0) {
      passed++;
    } else {
      console.error(path, result.stdout, result.stderr);
    }
  }
  console.log(`PHP lint: ${passed}/${files.length} passed`);
  if (passed !== files.length) failed = true;
}

if (!npmCli) throw new Error("Run npm run release:validate to use the current npm CLI.");

const node = process.execPath;
const expo = require.resolve("expo/bin/cli");
run("TypeScript", node, [require.resolve("typescript/bin/tsc"), "--noEmit"]);
run("ESLint", node, [resolve(require.resolve("eslint/package.json"), "../bin/eslint.js"), ".", "--max-warnings", "0"]);
lintPhp();
run("Release policy tests", node, ["--test", "scripts/release-policy.test.cjs"]);
run("PHP release policy tests", php, [resolve(mobile, "../tests/release_api.php")]);
run("Expo SDK dependency check", node, [expo, "install", "--check"]);
run("Expo Doctor", node, [npmCli, "exec", "--yes", "--package=expo-doctor@1.21.9", "--", "expo-doctor"]);
for (const platform of ["android", "ios"]) {
  run(`Expo production bundle for ${platform}`, node, [
    expo, "export", "--platform", platform, "--max-workers", "2",
    "--output-dir", `dist/release-validation/${platform}`,
  ], { env: { ...env, TRACKR_REQUIRE_BUILD_CONFIG: "1", TRACKR_RELEASE_BINARY: "1" } });
}
run("Production dependency audit", node, [npmCli, "audit", "--omit=dev"]);

process.exitCode = failed ? 1 : 0;

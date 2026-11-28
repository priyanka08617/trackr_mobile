/* global __dirname */
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}, globals = {}) {
  const source = readFileSync(join(__dirname, "../src", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), name);
      return dependencies[name];
    },
    AbortController, setTimeout, clearTimeout, ...globals,
  });
  return exports;
}

function versionService(platform, request, options = {}) {
  return load("services/appVersionService.ts", {
    expo: { isRunningInExpoGo: () => !!options.expoGo },
    "expo-application": { nativeApplicationVersion: "1.0.1", nativeBuildVersion: options.build ?? "42" },
    "react-native": { Platform: { OS: platform } },
    "@/services/apiUrlPolicy": {
      getMasterApiBase: () => "https://master.example.com/api/v1",
      fetchWithoutRedirect: request,
    },
  }, options.globals);
}

function response(platform, changes = {}) {
  return {
    ok: true,
    headers: new Headers({ "Content-Type": "application/json; charset=utf-8" }),
    json: async () => ({ success: true, data: {
      platform, current_version: "1.0.1", latest_version: "2.0.0", update_available: true,
      force_update: false, maintenance: false, maintenance_message: "Maintenance",
      store_url: "https://play.google.com/store/apps/details?id=com.example.trackr",
      ...changes,
    } }),
  };
}

test("reads installed Android and iOS version and build and sends them to the master", async () => {
  for (const [platform, build, store] of [
    ["android", "42", "https://play.google.com/store/apps/details?id=com.example.trackr"],
    ["ios", "4.2.1", "https://apps.apple.com/in/app/trackr/id123456"],
  ]) {
    const service = versionService(platform, async (target) => {
      const url = new URL(target);
      assert.equal(url.pathname, "/api/v1/common/app_version.php");
      assert.equal(url.searchParams.get("platform"), platform);
      assert.equal(url.searchParams.get("version"), "1.0.1");
      assert.equal(url.searchParams.get("build"), build);
      return response(platform, { store_url: store });
    }, { build });
    const status = await service.checkAppVersion(service.installedTrackrVersion());
    assert.equal(status.store_url, store);
    assert.equal(status.update_available, true);
  }
  assert.equal(versionService("web").installedTrackrVersion(), null);
  assert.equal(versionService("ios", null, { expoGo: true }).installedTrackrVersion(), null);
});

test("rejects invalid store links while preserving mandatory update policy", async () => {
  for (const store of [
    "", "http://play.google.com/store/apps/details?id=com.example.trackr",
    "https://play.google.com.example.com/store/apps/details?id=com.example.trackr",
    "https://evil@play.google.com/store/apps/details?id=com.example.trackr",
    "https://play.google.com/store/apps/details?id=com.example.trackr&redirect=1",
    "https://play.google.com/store/apps", "https://apps.apple.com/in/app/trackr/id123456",
  ]) {
    const service = versionService("android", async () => response("android", {
      force_update: true, store_url: store,
    }));
    const status = await service.checkAppVersion(service.installedTrackrVersion());
    assert.equal(status.store_url, null);
    assert.equal(status.force_update, true);
  }
});

test("handles offline, HTTP errors, malformed policy and a stalled response body", async () => {
  for (const request of [
    async () => { throw new Error("Offline"); },
    async () => ({ ok: false, status: 503 }),
    async () => response("android", { maintenance: "false" }),
    async () => ({ ...response("android"), json: async () => { throw new Error("Invalid JSON"); } }),
  ]) {
    const service = versionService("android", request);
    assert.equal(await service.checkAppVersion(service.installedTrackrVersion()), null);
  }

  let timeout;
  let signal;
  const service = versionService("android", async (_, init) => {
    signal = init.signal;
    return { ...response("android"), json: () => new Promise(() => {}) };
  }, { globals: { setTimeout: (callback, delay) => {
    assert.equal(delay, 10_000);
    timeout = callback;
  } } });
  const pending = service.checkAppVersion(service.installedTrackrVersion());
  await Promise.resolve();
  timeout();
  assert.equal(await pending, null);
  assert.equal(signal.aborted, true);
});

test("root policy denies unregistered screens for anonymous and authenticated users", () => {
  const { canOpenRootScreen, getSessionDashboard, parseSessionIdentity } = load("services/sessionNavigation.ts");
  const manager = parseSessionIdentity(23, "12", "area_manager");
  assert.equal(getSessionDashboard(manager), "/area_manager/dashboard");
  for (const folder of ["other", "toString", "__proto__", "../area_manager"]) {
    assert.equal(parseSessionIdentity(23, 12, folder), null);
    assert.equal(canOpenRootScreen(folder, true, manager), false);
  }
  for (const folder of ["common", "area_manager", "private/deep-link", "private"]) {
    assert.equal(canOpenRootScreen(folder, true, null), false);
    assert.equal(canOpenRootScreen(folder, false, manager), false);
  }
  assert.equal(canOpenRootScreen("private/deep-link", true, manager), false);
  assert.equal(canOpenRootScreen("private", true, manager), false);
  assert.equal(canOpenRootScreen("common", true, manager), true);
  assert.equal(canOpenRootScreen("area_manager", true, manager), true);
  assert.equal(canOpenRootScreen("login", false, null), true);
});

test("root screen layout redirects an auto-discovered route before mounting its child", () => {
  const navigation = load("services/sessionNavigation.ts");
  const identity = navigation.parseSessionIdentity("23", "12", "area_manager");
  const jsx = (type, props) => ({ type, props });
  const { default: RootLayout } = load("app/_layout.tsx", {
    react: { useEffect: () => {} },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "expo-router": { Redirect: "Redirect", Stack: { Screen: "Screen", Protected: "Protected" } },
    "@/components/AppVersionGuard": { default: "AppVersionGuard" },
    "@/hooks/useSession": { useSession: () => ({ ready: true, identity }) },
    "@/services/sessionNavigation": navigation,
    "@/services/sessionService": {},
  });
  const stack = RootLayout().props.children[0];
  const child = Symbol("screen");
  assert.equal(stack.props.screenLayout({ route: { name: "unregistered/private" }, children: child }).type, "Redirect");
  assert.equal(stack.props.screenLayout({ route: { name: "area_manager" }, children: child }).props.children, child);
});

test("foreground rechecks and retries preserve an active block until a fresh policy clears it", async () => {
  const optionalStatus = (await response("android").json()).data;
  const next = [
    optionalStatus,
    { ...optionalStatus, force_update: true, store_url: null },
    null,
    { ...optionalStatus, maintenance: true, force_update: true },
    { ...optionalStatus, update_available: false },
  ];
  let status = null;
  let dismissed = "";
  let effect;
  let listener;
  let retry;
  let checks = 0;
  const appState = {
    currentState: "active",
    addEventListener: (_, callback) => {
      listener = callback;
      return { remove: () => { listener = undefined; } };
    },
  };
  const jsx = (type, props) => ({ type, props });
  const { default: Guard } = load("components/AppVersionGuard.tsx", {
    react: {
      useEffect: (callback) => { effect = callback; },
      useState: (initial) => initial === "" ? [dismissed, (value) => { dismissed = value; }]
        : [status, (value) => { status = value; }],
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { AppState: appState, StyleSheet: { create: (styles) => styles } },
    "@/components/AppButton": { AppButton: "AppButton" },
    "@/services/appVersionService": {
      installedTrackrVersion: () => ({}),
      checkAppVersion: async () => { checks++; return next.shift(); },
    },
  }, {
    setTimeout: (callback, delay) => { assert.equal(delay, 60_000); retry = callback; },
    clearTimeout: () => { retry = undefined; },
  });
  const settle = () => new Promise(setImmediate);
  const foreground = async () => {
    for (const state of ["background", "active"]) {
      appState.currentState = state;
      listener(state);
    }
    await settle();
  };
  const card = () => Guard().props.children.props.children.props.children;

  assert.equal(Guard(), null);
  const cleanup = effect();
  await settle();
  assert.equal(Guard().props.visible, true);
  assert.equal(card()[3].props.title, "Later");
  Guard().props.onRequestClose();
  assert.equal(Guard().props.visible, false);

  await foreground();
  assert.equal(checks, 2);
  assert.equal(card()[0].props.children, "Update Required");
  assert.equal(card()[2], null);
  Guard().props.onRequestClose();
  assert.equal(Guard().props.visible, true);

  retry();
  await settle();
  assert.equal(card()[0].props.children, "Update Required");
  retry();
  await settle();
  assert.equal(card()[0].props.children, "Scheduled Maintenance");
  assert.equal(card()[2], false);
  await foreground();
  assert.equal(Guard().props.visible, false);
  assert.equal(retry, undefined);
  cleanup();
  assert.equal(listener, undefined);
});

const hostname = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]*$/i;
const httpsBase = /^https:\/\/[a-z0-9.-]+(?::443)?(?:\/[a-z0-9._~-]+)*\/*$/i;
const androidId = /^[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+$/;
const iosId = /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

function validate(name, pattern, required) {
  const value = process.env[name]?.trim();
  if ((value && !pattern.test(value)) || (required && !value)) {
    throw new Error(`Set a valid ${name} for this build environment.`);
  }
  return value;
}

module.exports = ({ config }) => {
  const required = process.env.TRACKR_REQUIRE_BUILD_CONFIG === "1" || process.env.EAS_BUILD === "true";
  const releaseBinary = process.env.TRACKR_RELEASE_BINARY === "1";
  const androidPackage = validate("TRACKR_ANDROID_PACKAGE", androidId, required);
  const iosBundle = validate("TRACKR_IOS_BUNDLE_IDENTIFIER", iosId, required);

  if (required) {
    const master = process.env.EXPO_PUBLIC_MASTER_API_URL?.trim() ?? "";
    if (!httpsBase.test(master) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(master) ||
        !hostname.test(new URL(master).hostname)) {
      throw new Error("Set a valid HTTPS EXPO_PUBLIC_MASTER_API_URL for this build environment.");
    }
    const hosts = process.env.EXPO_PUBLIC_TRUSTED_COMPANY_API_HOSTS?.split(",");
    if (!hosts?.every((host) => hostname.test(host.trim()))) {
      throw new Error("Set EXPO_PUBLIC_TRUSTED_COMPANY_API_HOSTS to the approved exact hostnames for this build environment.");
    }
  }

  return {
    ...config,
    android: { ...config.android, ...(androidPackage && { package: androidPackage }) },
    ios: {
      ...config.ios,
      ...(iosBundle && { bundleIdentifier: iosBundle }),
      ...(releaseBinary && {
        infoPlist: {
          ...config.ios?.infoPlist,
          NSAppTransportSecurity: { NSAllowsArbitraryLoads: false },
        },
      }),
    },
  };
};

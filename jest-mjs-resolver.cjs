// @ts-check

const MJS_EXT_REGEX = /\.mjs$/i;

/**
 * @type {import('jest-resolve').SyncResolver}
 * @param {string} path
 * @param {import('jest-resolve').ResolverOptions} options
 * @returns {string}
 */
const mjsResolver = (path, options) => {
  const defaultResolver = options.defaultResolver;
  if (MJS_EXT_REGEX.test(path)) {
    try {
      const mtsPath = path.replace(MJS_EXT_REGEX, ".mts");
      return defaultResolver(mtsPath, options);
    } catch {
      // use default resolver
    }
  }

  return defaultResolver(path, options);
};

module.exports = mjsResolver;

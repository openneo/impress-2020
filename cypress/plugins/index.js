require("dotenv").config();
const { initPlugin } = require("cypress-plugin-snapshots/plugin");

module.exports = (on, config) => {
  initPlugin(on, config);

  ensureWindowSize(on);

  config.env.AUTH0_TEST_CLIENT_ID = process.env.AUTH0_TEST_CLIENT_ID;
  config.env.AUTH0_TEST_CLIENT_SECRET = process.env.AUTH0_TEST_CLIENT_SECRET;
  config.env.DTI_TEST_USER_PASSWORD = process.env.DTI_TEST_USER_PASSWORD;

  return config;
};

// Our screenshots from `cypress-plugin-snapshots` are affected by the actual
// window size, not just the viewport size! To avoid downscaling outfit
// previews, try to open the window at 1000x800 at minimum.
function ensureWindowSize(on) {
  const w = 1000;
  const h = 800;

  on("before:browser:launch", (browser = {}, launchOptions) => {
    switch (browser.name) {
      case "chrome":
        launchOptions.args.push(`--window-size=${w},${h}`);
        break;
      case "electron":
        launchOptions.preferences.width = w;
        launchOptions.preferences.height = h;
        break;
      default:
        console.warn(
          `[ensureWindowSize] Browser engine ${browser.name} not recognized`
        );
    }
    return launchOptions;
  });
}

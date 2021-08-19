/**
 * /api/assetImage renders a canvas movie to PNG! To do this, we use a headless
 * Chromium browser, which renders a special page in the webapp and screenshots
 * the displayed canvas.
 *
 * This is, of course, a relatively heavyweight operation: it's always gonna be
 * a bit slow, and consume significant RAM. So, caching is going to be
 * important, so that we're not calling this all the time and overloading the
 * endpoint!
 */
const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
  disableInstrumentationOnLoad: true,
});

// To render the image, we load the /internal/assetImage page in the web app,
// a simple page specifically designed for this API endpoint!
const ASSET_IMAGE_PAGE_BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/internal/assetImage`
  : process.env.NODE_ENV === "development"
  ? "http://localhost:3000/internal/assetImage"
  : "https://impress-2020.openneo.net/internal/assetImage";

// TODO: What are the perf implications of sharing one browser instance, with
//       multiple pages open? This feels optimal to me from the *obvious*
//       perspective, but I do wonder whether e.g. there are surprise
//       implications from sharing a browser instance, or if too many pages in
//       parallel will be a problem for our API endpoint.
let BROWSER;
async function getBrowser() {
  if (!BROWSER) {
    if (process.env["NODE_ENV"] === "production") {
      // In production, we use a special chrome-aws-lambda Chromium.
      const chromium = require("chrome-aws-lambda");
      const playwright = require("playwright-core");
      BROWSER = await playwright.chromium.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath,
        headless: true,
      });
    } else {
      // In development, we use the standard playwright Chromium.
      const playwright = require("playwright");
      BROWSER = await playwright.chromium.launch({ headless: true });
    }
  }
  return BROWSER;
}

async function handle(req, res) {
  const { libraryUrl } = req.query;
  if (!libraryUrl) {
    return reject(res, "libraryUrl is required");
  }

  if (!isNeopetsUrl(libraryUrl)) {
    return reject(
      res,
      `libraryUrl must be an HTTPS Neopets URL, but was: ${libraryUrl}`
    );
  }

  let imageBuffer;
  try {
    imageBuffer = await loadAndScreenshotImage(libraryUrl);
  } catch (e) {
    console.error(e);
    return reject(res, `Could not load image: ${e.message}`, 500);
  }

  // TODO: Compress the image?

  // Send a long-term cache header, to avoid running this any more than we have
  // to! If we make a big change, we'll flush the cache or add a version param.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Content-Type", "image/png");
  return res.send(imageBuffer);
}

async function loadAndScreenshotImage(libraryUrl) {
  const assetImagePageUrl = new URL(ASSET_IMAGE_PAGE_BASE_URL);
  assetImagePageUrl.search = new URLSearchParams({ libraryUrl }).toString();

  console.debug("Opening browser page");
  const browser = await getBrowser();
  const page = await browser.newPage();
  console.debug("Page opened, navigating to: " + assetImagePageUrl.toString());

  await page.goto(assetImagePageUrl.toString());
  console.debug("Page loaded, awaiting image");

  // Start looking for the loaded canvas, *and* for an error message.
  // When either one displays, we proceed, either by returning the image if
  // present, or raising the error if present.
  const imageBufferPromise = screenshotImageFromPage(page);
  const errorMessagePromise = readErrorMessageFromPage(page);
  const firstResultFromPage = await Promise.any([
    imageBufferPromise.then((imageBuffer) => ({ imageBuffer })),
    errorMessagePromise.then((errorMessage) => ({ errorMessage })),
  ]);

  if (firstResultFromPage.errorMessage) {
    throw new Error(firstResultFromPage.errorMessage);
  } else if (firstResultFromPage.imageBuffer) {
    return firstResultFromPage.imageBuffer;
  } else {
    throw new Error(
      `Assertion error: Promise.any did not return an errorMessage or an imageBuffer: ` +
        `${JSON.stringify(Object.keys(firstResultFromPage))}`
    );
  }
}

async function screenshotImageFromPage(page) {
  await page.waitForSelector("#asset-image-canvas[data-is-loaded=true]", {
    timeout: 10000,
  });
  const canvas = await page.$("#asset-image-canvas[data-is-loaded=true]");
  console.debug("Image loaded, taking screenshot");

  const imageBuffer = await canvas.screenshot({
    omitBackground: true,
  });
  console.debug(`Screenshot captured, size: ${imageBuffer.length}`);

  return imageBuffer;
}

async function readErrorMessageFromPage(page) {
  await page.waitForSelector("#asset-image-error-message", {
    timeout: 10000,
  });
  const errorMessageContainer = await page.$("#asset-image-error-message");
  const errorMessage = await errorMessageContainer.innerText();
  return errorMessage;
}

function isNeopetsUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch (e) {
    return false;
  }

  return url.origin === "https://images.neopets.com";
}

function reject(res, message, status = 400) {
  res.setHeader("Content-Type", "text/plain");
  return res.status(status).send(message);
}

// Polyfill Promise.any for older Node: https://github.com/ungap/promise-any
Promise.any =
  Promise.any ||
  function ($) {
    return new Promise(function (D, E, A, L) {
      A = [];
      L = $.map(function ($, i) {
        return Promise.resolve($).then(D, function (O) {
          return ((A[i] = O), --L) || E({ errors: A });
        });
      }).length;
    });
  };

async function handleWithBeeline(req, res) {
  beeline.withTrace(
    { name: "api/assetImage", operation_name: "api/assetImage" },
    () => handle(req, res)
  );
}

export default handleWithBeeline;

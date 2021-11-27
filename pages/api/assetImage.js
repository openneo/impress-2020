/**
 * /api/assetImage renders a canvas movie to PNG! To do this, we use a headless
 * Chromium browser, which renders a special page in the webapp and screenshots
 * the displayed canvas.
 *
 * This is, of course, a relatively heavyweight operation: it's always gonna be
 * a bit slow, and consume significant RAM. So, caching is going to be
 * important, so that we're not calling this all the time and overloading the
 * endpoint!
 *
 * Parameters:
 *   - libraryUrl: A https://images.neopets.com/ URL to a JS movie library
 *   - size: 600, 300, or 150. Determines the output image size.
 */
const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});

const puppeteer = require("puppeteer");
const genericPool = require("generic-pool");

console.info(`Creating new browser instance`);
const browserPromise = puppeteer.launch({ headless: true });

// We maintain a small pool of browser pages, to manage memory usage. If all
// the pages are already in use, a request will wait for one of them to become
// available.
//
// NOTE: 4 pages is about where our 1-cpu prod environment maxes out. We might
//       want to upgrade to the 2-cpu box as we add more pressure though, and
//       then maybe we can afford more pages in the pool?

const PAGE_POOL = genericPool.createPool(
  {
    create: async () => {
      console.debug(`Creating a browser page`);
      const browser = await browserPromise;
      return await browser.newPage();
    },
    destroy: (page) => {
      console.debug(`Closing a browser page`);
      page.close();
    },
    validate: (page) => page.browser().isConnected(),
  },
  { min: 4, max: 4, testOnBorrow: true, acquireTimeoutMillis: 15000 }
);
PAGE_POOL.on("factoryCreateError", (error) => console.error(error));
PAGE_POOL.on("factoryDestroyError", (error) => console.error(error));

async function handle(req, res) {
  const { libraryUrl, size } = req.query;
  if (!libraryUrl) {
    return reject(res, "libraryUrl is required");
  }

  if (!isNeopetsUrl(libraryUrl)) {
    return reject(
      res,
      `libraryUrl must be an HTTPS Neopets URL, but was: ${libraryUrl}`
    );
  }

  if (size !== "600" && size !== "300" && size !== "150") {
    return reject(res, `size must be 600, 300, or 150, but was: ${size}`);
  }

  let imageBuffer;
  try {
    imageBuffer = await loadAndScreenshotImage(libraryUrl, size);
  } catch (e) {
    console.error(e);
    if (e.name === "TimeoutError") {
      return reject(res, `Server under heavy load: ${e.message}`, 503);
    }
    return reject(res, `Could not load image: ${e.message}`, 500);
  }

  // TODO: Compress the image?

  // Send a long-term cache header, to avoid running this any more than we have
  // to! If we make a big change, we'll flush the cache or add a version param.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Content-Type", "image/png");
  return res.send(imageBuffer);
}

async function loadAndScreenshotImage(libraryUrl, size) {
  // To render the image, we load the /internal/assetImage page in the web app,
  // a simple page specifically designed for this API endpoint!
  //
  // NOTE: If we deploy to a host where localhost:3000 won't work, make this
  //       configurable with an env var, e.g. process.env.LOCAL_APP_HOST
  const assetImagePageUrl = new URL(
    "http://localhost:3000/internal/assetImage"
  );
  assetImagePageUrl.search = new URLSearchParams({
    libraryUrl,
    size,
  }).toString();

  console.debug("Getting browser page");
  const page = await PAGE_POOL.acquire();

  try {
    console.debug("Page ready, navigating to: " + assetImagePageUrl.toString());
    await page.goto(assetImagePageUrl.toString());
    console.debug("Page loaded, awaiting image");

    // Start looking for the loaded canvas, *and* for an error message.
    // When either one displays, we proceed, either by returning the image if
    // present, or raising the error if present.
    const imageBufferPromise = screenshotImageFromPage(page);
    const errorMessagePromise = readErrorMessageFromPage(page);
    let firstResultFromPage;
    try {
      firstResultFromPage = await Promise.any([
        imageBufferPromise.then((imageBuffer) => ({ imageBuffer })),
        errorMessagePromise.then((errorMessage) => ({ errorMessage })),
      ]);
    } catch (error) {
      if (error.errors) {
        // If both promises failed, show all error messages.
        throw new Error(error.errors.map((e) => e.message).join(", "));
      } else {
        throw error;
      }
    }

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
  } finally {
    // To avoid memory leaks, we destroy the page when we're done with it.
    // The pool will replace it with a fresh one!
    PAGE_POOL.destroy(page);
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
  res.setHeader("Content-Type", "text/plain; charset=utf8");
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

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
  disableInstrumentationOnLoad: true,
});

const playwright = require("playwright");

// We share one browser instance, but create a new independent "context" for
// each request, as a security hedge. (The intent is for the user to request
// very little from the browser, so it shouldn't matter, but it's just an extra
// layer to reduce the risk of what an attack could do!)
//
// TODO: We're probably going to need to limit the number of concurrent browser
//       sessions here, right? I don't actually know how the Next.js server
//       handles concurrency though, let's pressure-test and find out before
//       building a solution.
let SHARED_BROWSER = null;
async function getBrowserContext() {
  if (SHARED_BROWSER == null) {
    SHARED_BROWSER = await playwright.chromium.launch({ headless: true });
  }
  return await SHARED_BROWSER.newContext();
}

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

  console.debug("Opening browser page");
  const context = await getBrowserContext();
  const page = await context.newPage();
  console.debug("Page opened, navigating to: " + assetImagePageUrl.toString());

  try {
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
  } finally {
    // Tear down our resources when we're done! If it fails, log the error, but
    // don't block the success of the image.
    try {
      await page.close();
    } catch (e) {
      console.warn("Error closing page after image finished", e);
    }
    try {
      await context.close();
    } catch (e) {
      console.warn("Error closing browser after image finished", e);
    }
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

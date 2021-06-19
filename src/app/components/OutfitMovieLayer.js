import React from "react";
import LRU from "lru-cache";
import { useToast } from "@chakra-ui/react";

import { loadImage, logAndCapture, safeImageUrl } from "../util";

// Import EaselJS and TweenJS directly into the `window` object! The bundled
// scripts are built to attach themselves to `window.createjs`, and
// `window.createjs` is where the Neopets movie libraries expects to find them!
require("imports-loader?wrapper=window!easeljs/lib/easeljs");
require("imports-loader?wrapper=window!tweenjs/lib/tweenjs");

function OutfitMovieLayer({
  libraryUrl,
  width,
  height,
  isPaused = false,
  onLoad = null,
  onLowFps = null,
}) {
  const [stage, setStage] = React.useState(null);
  const [library, setLibrary] = React.useState(null);
  const [movieClip, setMovieClip] = React.useState(null);
  const canvasRef = React.useRef(null);
  const hasShownErrorMessageRef = React.useRef(false);
  const toast = useToast();

  // Set the canvas's internal dimensions to be higher, if the device has high
  // DPI like retina. But we'll keep the layout width/height as expected!
  const internalWidth = width * window.devicePixelRatio;
  const internalHeight = height * window.devicePixelRatio;

  const updateStage = React.useCallback(() => {
    if (!stage) {
      return;
    }

    try {
      stage.update();
    } catch (e) {
      // If rendering the frame fails, log it and proceed. If it's an
      // animation, then maybe the next frame will work? Also alert the user,
      // just as an FYI. (This is pretty uncommon, so I'm not worried about
      // being noisy!)
      if (!hasShownErrorMessageRef.current) {
        console.error(`Error rendering movie clip ${libraryUrl}`);
        logAndCapture(e);
        toast({
          status: "warning",
          title:
            "Hmm, we're maybe having trouble playing one of these animations.",
          description:
            "If it looks wrong, try pausing and playing, or reloading the " +
            "page. Sorry!",
          duration: 10000,
          isClosable: true,
        });
        // We do this via a ref, not state, because I want to guarantee that
        // future calls see the new value. With state, React's effects might
        // not happen in the right order for it to work!
        hasShownErrorMessageRef.current = true;
      }
    }
  }, [stage, toast, libraryUrl]);

  // This effect gives us a `stage` corresponding to the canvas element.
  React.useLayoutEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    if (canvas.getContext("2d") == null) {
      console.warn(`Out of memory, can't use canvas for ${libraryUrl}.`);
      toast({
        status: "warning",
        title: "Oops, too many animations!",
        description:
          `Your device is out of memory, so we can't show any more ` +
          `animations. Try removing some items, or using another device.`,
        duration: null,
        isClosable: true,
      });
      return;
    }

    setStage((stage) => {
      if (stage && stage.canvas === canvas) {
        return stage;
      }

      return new window.createjs.Stage(canvas);
    });

    return () => {
      setStage(null);

      if (canvas) {
        // There's a Safari bug where it doesn't reliably garbage-collect
        // canvas data. Clean it up ourselves, rather than leaking memory over
        // time! https://stackoverflow.com/a/52586606/107415
        // https://bugs.webkit.org/show_bug.cgi?id=195325
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, [libraryUrl, toast]);

  // This effect gives us the `library` and `movieClip`, based on the incoming
  // `libraryUrl`.
  React.useEffect(() => {
    let canceled = false;

    loadMovieLibrary(libraryUrl)
      .then((library) => {
        if (canceled) {
          return;
        }

        setLibrary(library);

        const movieClip = buildMovieClip(library, libraryUrl);
        setMovieClip(movieClip);
      })
      .catch((e) => {
        console.error(`Error loading outfit movie layer: ${libraryUrl}`, e);
      });

    return () => {
      canceled = true;
      setLibrary(null);
      setMovieClip(null);
    };
  }, [libraryUrl]);

  // This effect puts the `movieClip` on the `stage`, when both are ready.
  React.useEffect(() => {
    if (!stage || !movieClip) {
      return;
    }

    stage.addChild(movieClip);

    // Render the movie's first frame. If it's animated and we're not paused,
    // then another effect will perform subsequent updates.
    updateStage();

    // This is when we trigger `onLoad`: once we're actually showing it!
    if (onLoad) {
      onLoad();
    }

    return () => stage.removeChild(movieClip);
  }, [stage, updateStage, movieClip, onLoad]);

  // This effect updates the `stage` according to the `library`'s framerate,
  // but only if there's actual animation to do - i.e., there's more than one
  // frame to show, and we're not paused.
  React.useEffect(() => {
    if (!stage || !movieClip || !library) {
      return;
    }

    if (isPaused || !hasAnimations(movieClip)) {
      return;
    }

    const targetFps = library.properties.fps;

    let lastFpsLoggedAtInMs = performance.now();
    let numFramesSinceLastLogged = 0;
    const intervalId = setInterval(() => {
      updateStage();

      numFramesSinceLastLogged++;

      const now = performance.now();
      const timeSinceLastFpsLoggedAtInMs = now - lastFpsLoggedAtInMs;
      const timeSinceLastFpsLoggedAtInSec = timeSinceLastFpsLoggedAtInMs / 1000;

      if (timeSinceLastFpsLoggedAtInSec > 2) {
        const fps = numFramesSinceLastLogged / timeSinceLastFpsLoggedAtInSec;
        const roundedFps = Math.round(fps * 100) / 100;

        console.debug(
          `[OutfitMovieLayer] FPS: ${roundedFps} (Target: ${targetFps}) (${libraryUrl})`
        );

        if (onLowFps && fps < 2) {
          onLowFps(fps);
        }

        lastFpsLoggedAtInMs = now;
        numFramesSinceLastLogged = 0;
      }
    }, 1000 / targetFps);

    return () => clearInterval(intervalId);
  }, [libraryUrl, stage, updateStage, movieClip, library, isPaused, onLowFps]);

  // This effect keeps the `movieClip` scaled correctly, based on the canvas
  // size and the `library`'s natural size declaration. (If the canvas size
  // changes on window resize, then this will keep us responsive, so long as
  // the parent updates our width/height props on window resize!)
  React.useEffect(() => {
    if (!stage || !movieClip || !library) {
      return;
    }

    movieClip.scaleX = internalWidth / library.properties.width;
    movieClip.scaleY = internalHeight / library.properties.height;

    // Redraw the stage with the new dimensions - but with `tickOnUpdate` set
    // to `false`, so that we don't advance by a frame. This keeps us
    // really-paused if we're paused, and avoids skipping ahead by a frame if
    // we're playing.
    stage.tickOnUpdate = false;
    updateStage();
    stage.tickOnUpdate = true;
  }, [stage, updateStage, library, movieClip, internalWidth, internalHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={internalWidth}
      height={internalHeight}
      style={{ width: width, height: height }}
    />
  );
}

function loadScriptTag(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.onload = () => resolve(script);
    script.onerror = (e) => reject(e);
    script.src = src;
    document.body.appendChild(script);
  });
}

const MOVIE_LIBRARY_CACHE = new LRU(10);

export async function loadMovieLibrary(librarySrc) {
  // First, check the LRU cache. This will enable us to quickly return movie
  // libraries, without re-loading and re-parsing and re-executing.
  const cachedLibrary = MOVIE_LIBRARY_CACHE.get(librarySrc);
  if (cachedLibrary) {
    return cachedLibrary;
  }

  // These library JS files are interesting in their operation. It seems like
  // the idea is, it pushes an object to a global array, and you need to snap
  // it up and see it at the end of the array! And I don't really see a way to
  // like, get by a name or ID that we know by this point. So, here we go, just
  // try to grab it once it arrives!
  //
  // I'm not _sure_ this method is reliable, but it seems to be stable so far
  // in Firefox for me. The things I think I'm observing are:
  //   - Script execution order should match insert order,
  //   - Onload execution order should match insert order,
  //   - BUT, script executions might be batched before onloads.
  //   - So, each script grabs the _first_ composition from the list, and
  //     deletes it after grabbing. That way, it serves as a FIFO queue!
  // I'm not suuure this is happening as I'm expecting, vs I'm just not seeing
  // the race anymore? But fingers crossed!
  await loadScriptTag(safeImageUrl(librarySrc));
  const [compositionId, composition] = Object.entries(
    window.AdobeAn.compositions
  )[0];
  if (Object.keys(window.AdobeAn.compositions).length > 1) {
    console.warn(
      `Grabbing composition ${compositionId}, but there are >1 here: `,
      Object.keys(window.AdobeAn.compositions).length
    );
  }
  delete window.AdobeAn.compositions[compositionId];
  const library = composition.getLibrary();

  // One more loading step as part of loading this library is loading the
  // images it uses for sprites.
  //
  // TODO: I guess the manifest has these too, so if we could use our DB cache
  //       to get the manifest to us faster, then we could avoid a network RTT
  //       on the critical path by preloading these images before the JS file
  //       even gets to us?
  const librarySrcDir = librarySrc.split("/").slice(0, -1).join("/");
  const manifestImages = new Map(
    library.properties.manifest.map(({ id, src }) => [
      id,
      loadImage({
        src: safeImageUrl(librarySrcDir + "/" + src, {
          crossOrigin: "anonymous",
        }),
        crossOrigin: "anonymous",
      }),
    ])
  );
  await Promise.all(manifestImages.values());

  // Finally, once we have the images loaded, the library object expects us to
  // mutate it (!) to give it the actual image and sprite sheet objects from
  // the loaded images. That's how the MovieClip's internal JS objects will
  // access the loaded data!
  const images = composition.getImages();
  for (const [id, image] of manifestImages.entries()) {
    images[id] = await image;
  }
  const spriteSheets = composition.getSpriteSheet();
  for (const { name, frames } of library.ssMetadata) {
    const image = await manifestImages.get(name);
    spriteSheets[name] = new window.createjs.SpriteSheet({
      images: [image],
      frames,
    });
  }

  MOVIE_LIBRARY_CACHE.set(librarySrc, library);

  return library;
}

export function buildMovieClip(library, libraryUrl) {
  let constructorName;
  try {
    const fileName = decodeURI(libraryUrl).split("/").pop();
    const fileNameWithoutExtension = fileName.split(".")[0];
    constructorName = fileNameWithoutExtension.replace(/[ -]/g, "");
    if (constructorName.match(/^[0-9]/)) {
      constructorName = "_" + constructorName;
    }
  } catch (e) {
    throw new Error(
      `Movie libraryUrl ${JSON.stringify(
        libraryUrl
      )} did not match expected format: ${e.message}`
    );
  }

  const LibraryMovieClipConstructor = library[constructorName];
  if (!LibraryMovieClipConstructor) {
    throw new Error(
      `Expected JS movie library ${libraryUrl} to contain a constructor ` +
        `named ${constructorName}, but it did not: ${Object.keys(library)}`
    );
  }
  const movieClip = new LibraryMovieClipConstructor();

  return movieClip;
}

/**
 * Recursively scans the given MovieClip (or child createjs node), to see if
 * there are any animated areas.
 */
export function hasAnimations(createjsNode) {
  return (
    createjsNode.totalFrames > 1 ||
    (createjsNode.children || []).some(hasAnimations)
  );
}

export default OutfitMovieLayer;

import React from "react";

const EaselContext = React.createContext({
  stage: null,
  addResizeListener: () => {},
  removeResizeListener: () => {},
});

function OutfitCanvas({ children, width, height }) {
  const [stage, setStage] = React.useState(null);
  const resizeListenersRef = React.useRef([]);
  const canvasRef = React.useRef(null);

  const { loading } = useEaselDependenciesLoader();

  React.useLayoutEffect(() => {
    if (loading) {
      return;
    }

    const stage = new window.createjs.Stage(canvasRef.current);
    setStage(stage);

    function onTick(event) {
      stage.update(event);
    }

    window.createjs.Ticker.timingMode = window.createjs.Ticker.RAF;
    window.createjs.Ticker.on("tick", onTick);

    return () => window.createjs.Ticker.off("tick", onTick);
  }, [loading]);

  const addChild = React.useCallback(
    (child, zIndex, { afterFirstDraw = null } = {}) => {
      // Save this child's z-index for future sorting.
      child.DTI_zIndex = zIndex;
      // Add the child, then slot it into the right place in the order.
      stage.addChild(child);
      stage.sortChildren((a, b) => a.DTI_zIndex - b.DTI_zIndex);
      // Then update in bulk!
      stage.update();
      if (afterFirstDraw) {
        stage.on("drawend", afterFirstDraw, null, true);
      }
    },
    [stage]
  );

  const removeChild = React.useCallback(
    (child) => {
      stage.removeChild(child);
      stage.update();
    },
    [stage]
  );

  const addResizeListener = React.useCallback((handler) => {
    resizeListenersRef.current.push(handler);
  }, []);
  const removeResizeListener = React.useCallback((handler) => {
    resizeListenersRef.current = resizeListenersRef.current.filter(
      (h) => h !== handler
    );
  }, []);

  // When the canvas resizes, resize all the layers, then a single bulk update.
  React.useEffect(() => {
    for (const handler of resizeListenersRef.current) {
      handler();
    }
    if (stage) {
      stage.update();
    }
  }, [stage, width, height]);

  // Set the canvas's internal dimensions to be higher, if the device has high
  // DPI like retina. But we'll keep the layout width/height as expected!
  const internalWidth = width * window.devicePixelRatio;
  const internalHeight = height * window.devicePixelRatio;

  if (loading) {
    return null;
  }

  return (
    <EaselContext.Provider
      value={{
        width: internalWidth,
        height: internalHeight,
        addChild,
        removeChild,
        addResizeListener,
        removeResizeListener,
        stage, // Not used, but available for debugging.
      }}
    >
      <canvas
        ref={canvasRef}
        width={internalWidth}
        height={internalHeight}
        style={{
          width: width + "px",
          height: height + "px",
        }}
      />
      {stage && children}
    </EaselContext.Provider>
  );
}

export function OutfitCanvasImage({ src, zIndex }) {
  const {
    width,
    height,
    addChild,
    removeChild,
    addResizeListener,
    removeResizeListener,
  } = React.useContext(EaselContext);

  React.useEffect(() => {
    let image;
    let bitmap;
    let tween;

    function setBitmapSize() {
      bitmap.scaleX = width / image.width;
      bitmap.scaleY = height / image.height;
    }

    async function addBitmap() {
      image = await loadImage(src);
      bitmap = new window.createjs.Bitmap(image);

      // We're gonna fade in! Wait for the first frame to draw, to make the
      // timing smooth, but yeah here we go!
      bitmap.alpha = 0;
      tween = window.createjs.Tween.get(bitmap, { paused: true }).to(
        { alpha: 1 },
        200
      );
      const startFadeIn = () => {
        // NOTE: You must cache bitmaps to apply filters to them, and caching
        //       doesn't work until the first draw.
        bitmap.cache(0, 0, image.width, image.height);
        tween.paused = false;
      };

      setBitmapSize();
      addChild(bitmap, zIndex, { afterFirstDraw: startFadeIn });
      addResizeListener(setBitmapSize);
    }

    function removeBitmap() {
      removeResizeListener(setBitmapSize);
      removeChild(bitmap);
    }

    addBitmap();

    return () => {
      if (bitmap) {
        // Reverse the fade-in into a fade-out, then remove the bitmap.
        tween.reversed = true;
        tween.setPosition(0);
        tween.paused = false;
        tween.on("complete", removeBitmap, null, true);
      }
    };
  }, [
    src,
    zIndex,
    width,
    height,
    addChild,
    removeChild,
    addResizeListener,
    removeResizeListener,
  ]);

  return null;
}

/**
 * useEaselDependenciesLoader loads the CreateJS scripts we use in OutfitCanvas.
 * We load it as part of OutfitCanvas, but callers can also use this to preload
 * the scripts and track loading progress.
 */
export function useEaselDependenciesLoader() {
  // NOTE: I couldn't find an official NPM source for this that worked with
  //       Webpack, and I didn't want to rely on random people's ports, and I
  //       couldn't get a bundled version to work quite right. So we load
  //       createjs async!
  const easelLoading = useScriptTag(
    "https://code.createjs.com/1.0.0/easeljs.min.js"
  );
  const tweenLoading = useScriptTag(
    "https://code.createjs.com/1.0.0/tweenjs.min.js"
  );

  return { loading: easelLoading || tweenLoading };
}

function useScriptTag(src) {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const existingScript = document.querySelector(
      `script[src=${CSS.escape(src)}]`
    );
    if (existingScript) {
      setLoading(false);
      return;
    }

    let canceled = false;
    const script = document.createElement("script");
    script.onload = () => {
      if (!canceled) {
        setLoading(false);
      }
    };
    script.src = src;
    document.body.appendChild(script);

    return () => {
      canceled = true;
      setLoading(true);
    };
  }, [src, setLoading]);

  return loading;
}

export function loadImage(url) {
  const image = new Image();
  const promise = new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);
    image.src = url;
  });
  promise.cancel = () => {
    image.src = "";
  };
  return promise;
}

export default OutfitCanvas;

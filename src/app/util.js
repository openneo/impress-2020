import React from "react";
import { Box, Heading, useColorModeValue } from "@chakra-ui/react";

/**
 * Delay hides its content and first, then shows it after the given delay.
 *
 * This is useful for loading states: it can be disruptive to see a spinner or
 * skeleton element for only a brief flash, we'd rather just show them if
 * loading is genuinely taking a while!
 *
 * 300ms is a pretty good default: that's about when perception shifts from "it
 * wasn't instant" to "the process took time".
 * https://developers.google.com/web/fundamentals/performance/rail
 */
export function Delay({ children, ms = 300 }) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const id = setTimeout(() => setIsVisible(true), ms);
    return () => clearTimeout(id);
  }, [ms, setIsVisible]);

  return (
    <Box opacity={isVisible ? 1 : 0} transition="opacity 0.5s">
      {children}
    </Box>
  );
}

/**
 * Heading1 is a large, page-title-ish heading, with our DTI-brand-y Delicious
 * font and some special typographical styles!
 */
export function Heading1({ children, ...props }) {
  return (
    <Heading
      as="h1"
      size="2xl"
      fontFamily="Delicious, sans-serif"
      fontWeight="800"
      {...props}
    >
      {children}
    </Heading>
  );
}

/**
 * Heading2 is a major subheading, with our DTI-brand-y Delicious font and some
 * special typographical styles!!
 */
export function Heading2({ children, ...props }) {
  return (
    <Heading
      as="h2"
      size="xl"
      fontFamily="Delicious, sans-serif"
      fontWeight="700"
      {...props}
    >
      {children}
    </Heading>
  );
}

/**
 * Heading2 is a minor subheading, with our DTI-brand-y Delicious font and some
 * special typographical styles!!
 */
export function Heading3({ children, ...props }) {
  return (
    <Heading
      as="h3"
      size="lg"
      fontFamily="Delicious, sans-serif"
      fontWeight="700"
      {...props}
    >
      {children}
    </Heading>
  );
}

/**
 * ErrorMessage is a simple error message for simple errors!
 */
export function ErrorMessage({ children }) {
  return <Box color="red.400">{children}</Box>;
}

export function useCommonStyles() {
  return {
    brightBackground: useColorModeValue("white", "gray.700"),
  };
}

/**
 * safeImageUrl returns an HTTPS-safe image URL for Neopets assets!
 */
export function safeImageUrl(urlString) {
  if (urlString == null) {
    return urlString;
  }

  const url = new URL(urlString);

  if (url.origin === "http://images.neopets.com") {
    url.protocol = "https:";
    url.host = "images.neopets-asset-proxy.openneo.net";
  } else if (url.origin === "http://pets.neopets.com") {
    url.protocol = "https:";
    url.host = "pets.neopets-asset-proxy.openneo.net";
  }

  if (url.protocol !== "https:") {
    console.warn(
      "safeImageUrl was provided an unsafe URL, but we don't know how to " +
        "upgrade it to HTTPS. Returning as-is: " +
        urlString
    );
  }

  return url.toString();
}

/**
 * useDebounce helps make a rapidly-changing value change less! It waits for a
 * pause in the incoming data before outputting the latest value.
 *
 * We use it in search: when the user types rapidly, we don't want to update
 * our query and send a new request every keystroke. We want to wait for it to
 * seem like they might be done, while still feeling responsive!
 *
 * Adapted from https://usehooks.com/useDebounce/
 */
export function useDebounce(
  value,
  delay,
  { waitForFirstPause = false, initialValue = null } = {}
) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = React.useState(
    waitForFirstPause ? initialValue : value
  );

  React.useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Only re-call effect if value or delay changes
  );

  return debouncedValue;
}

/**
 * usePageTitle sets the page title!
 */
export function usePageTitle(title, { skip = false } = {}) {
  React.useEffect(() => {
    if (skip) return;
    document.title = title ? `${title} | Dress to Impress` : "Dress to Impress";
  }, [title, skip]);
}

/**
 * useFetch uses `fetch` to fetch the given URL, and returns the request state.
 *
 * Our limited API is designed to match the `use-http` library!
 */
export function useFetch(url, { responseType }) {
  // Just trying to be clear about what you'll get back ^_^` If we want to
  // fetch non-binary data later, extend this and get something else from res!
  if (responseType !== "arrayBuffer") {
    throw new Error(`unsupported responseType ${responseType}`);
  }

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    let canceled = false;

    fetch(url)
      .then(async (res) => {
        if (canceled) {
          return;
        }

        const arrayBuffer = await res.arrayBuffer();
        setLoading(false);
        setError(null);
        setData(arrayBuffer);
      })
      .catch((error) => {
        if (canceled) {
          return;
        }

        setLoading(false);
        setError(error);
        setData(null);
      });

    return () => {
      canceled = true;
    };
  }, [url]);

  return { loading, error, data };
}

/**
 * useLocalStorage is like React.useState, but it persists the value in the
 * device's `localStorage`, so it comes back even after reloading the page.
 *
 * Adapted from https://usehooks.com/useLocalStorage/.
 */
let storageListeners = [];
export function useLocalStorage(key, initialValue) {
  const loadValue = React.useCallback(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = React.useState(loadValue);

  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
      storageListeners.forEach((l) => l());
    } catch (error) {
      console.log(error);
    }
  };

  const reloadValue = React.useCallback(() => {
    setStoredValue(loadValue());
  }, [loadValue, setStoredValue]);

  // Listen for changes elsewhere on the page, and update here too!
  React.useEffect(() => {
    storageListeners.push(reloadValue);
    return () => {
      storageListeners = storageListeners.filter((l) => l !== reloadValue);
    };
  }, [reloadValue]);

  // Listen for changes in other tabs, and update here too! (This does not
  // catch same-page updates!)
  React.useEffect(() => {
    window.addEventListener("storage", reloadValue);
    return () => window.removeEventListener("storage", reloadValue);
  }, [reloadValue]);

  return [storedValue, setValue];
}

export function loadImage({ src, crossOrigin = null }) {
  const image = new Image();
  const promise = new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Failed to load image: ${JSON.stringify(src)}`));
    if (crossOrigin) {
      image.crossOrigin = crossOrigin;
    }
    image.src = src;
  });
  promise.cancel = () => {
    image.src = "";
  };
  return promise;
}

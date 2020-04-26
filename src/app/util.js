import React from "react";
import { Box, Heading } from "@chakra-ui/core";

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

export function Heading1({ children, ...props }) {
  return (
    <Heading fontFamily="Delicious" fontWeight="800" size="2xl" {...props}>
      {children}
    </Heading>
  );
}

export function Heading2({ children, ...props }) {
  return (
    <Heading size="xl" color="green.800" fontFamily="Delicious" {...props}>
      {children}
    </Heading>
  );
}

// From https://usehooks.com/useDebounce/
export function useDebounce(value, delay, { waitForFirstPause = false } = {}) {
  // State and setters for debounced value
  const initialValue = waitForFirstPause ? null : value;
  const [debouncedValue, setDebouncedValue] = React.useState(initialValue);

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

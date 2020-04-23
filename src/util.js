import React from "react";
import { Box } from "@chakra-ui/core";

export function Delay({ children, ms = 500 }) {
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

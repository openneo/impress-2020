import React from "react";
import { Box } from "@chakra-ui/react";
import { css } from "@emotion/react";

/**
 * TextContent is a wrapper for just, like, normal chill text-based content!
 * Its children will receive some simple CSS for tags like <p>, <a>, etc.
 */
function TextContent({ children, ...props }) {
  return (
    <Box
      {...props}
      css={css`
        p {
          margin-bottom: 1em;
        }
        a {
          text-decoration: underline;
        }
        h2,
        h3 {
          margin-bottom: 0.5em;
        }
      `}
    >
      {children}
    </Box>
  );
}

export default TextContent;

import React from "react";
import {
  Box,
  IconButton,
  HStack,
  Link as ChakraLink,
  Tooltip,
  useColorMode,
} from "@chakra-ui/core";
import { EmailIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { SiGithub } from "react-icons/si";
import { Link as RouterLink, useRouteMatch } from "react-router-dom";

function GlobalFooter() {
  const classicDTIUrl = useClassicDTIUrl();

  return (
    <Box as="footer" display="flex" alignItems="flex-start">
      <Box
        // This empty box grows at the same rate as the box on the right, so
        // the middle box will be centered, if there's space!
        flex="1 0 0"
      />
      <Box textAlign="center" fontSize="xs">
        <HStack spacing="4" justifyContent="center">
          <ChakraLink href="https://impress.openneo.net/terms">
            Terms of Use
          </ChakraLink>
          <ChakraLink as={RouterLink} to="/privacy">
            Hey
          </ChakraLink>
          <ChakraLink href={classicDTIUrl}>Classic DTI</ChakraLink>
        </HStack>
        <Box as="p" opacity="0.75">
          Images © 2000–{new Date().getFullYear()} Neopets, Inc. All Rights
          Reserved. Used With Permission.
        </Box>
      </Box>
      <HStack
        flex="1 0 0"
        spacing="2"
        marginLeft="3"
        justifyContent="flex-end"
        opacity="0.75"
        transition="opacity 0.2s"
        _hover={{ opacity: "1" }}
        _focusWithin={{ opacity: "1" }}
        // This will center our content against the top two lines of text to
        // our left, which ends up feeling like the right visual balance, even
        // when the text wraps to 3 lines on mobile.
        // 2 lines at 1.5 line height = 3em.
        fontSize="xs"
        minHeight="3em"
      >
        <Tooltip label="Email">
          <IconButton
            as="a"
            href="mailto:matchu@openneo.net"
            size="sm"
            variant="outline"
            aria-label="Email"
            icon={<EmailIcon />}
          />
        </Tooltip>
        <Tooltip label="GitHub">
          <IconButton
            as="a"
            href="https://github.com/matchu/impress-2020"
            size="sm"
            variant="outline"
            aria-label="GitHub"
            icon={<SiGithub />}
          />
        </Tooltip>
        <ColorModeButton />
      </HStack>
    </Box>
  );
}

function ColorModeButton() {
  const { colorMode, toggleColorMode } = useColorMode();
  const label = colorMode === "light" ? "Dark mode" : "Light mode";

  return (
    <Tooltip label={label}>
      <IconButton
        size="sm"
        variant="outline"
        aria-label={label}
        icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
        onClick={toggleColorMode}
      />
    </Tooltip>
  );
}

function useClassicDTIUrl() {
  const itemPageMatch = useRouteMatch("/items/:itemId");
  const userItemsPageMatch = useRouteMatch("/user/:userId/items");
  const modelingPageMatch = useRouteMatch("/modeling");

  if (itemPageMatch) {
    const { itemId } = itemPageMatch.params;
    return `https://impress.openneo.net/items/${itemId}`;
  }

  if (userItemsPageMatch) {
    const { userId } = userItemsPageMatch.params;
    return `https://impress.openneo.net/user/${userId}/closet`;
  }

  if (modelingPageMatch) {
    return "https://impress.openneo.net/modeling";
  }

  return "https://impress.openneo.net/";
}

export default GlobalFooter;

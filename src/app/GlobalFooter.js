import React from "react";
import {
  Box,
  IconButton,
  HStack,
  Link as ChakraLink,
  Tooltip,
  useColorMode,
  Grid,
} from "@chakra-ui/react";
import { EmailIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { SiGithub, SiTwitter } from "react-icons/si";
import { useRouter } from "next/router";
import Link from "next/link";

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
          <Link href="/terms" passHref>
            <ChakraLink>Terms of Use (Sep 2022)</ChakraLink>
          </Link>
          <Link href="/privacy" passHref>
            <ChakraLink>Privacy Policy (Sep 2022)</ChakraLink>
          </Link>
          <Link href="/donate" passHref>
            <ChakraLink>Donors</ChakraLink>
          </Link>
          <ChakraLink href={classicDTIUrl}>Classic DTI</ChakraLink>
        </HStack>
        <Box as="p" opacity="0.75">
          Images © 2000–{new Date().getFullYear()} Neopets, Inc. All Rights
          Reserved. Used With Permission.
        </Box>
      </Box>
      <Grid
        flex="1 0 0"
        templateColumns={{
          base: "repeat(2, min-content)",
          sm: "repeat(4, min-content)",
        }}
        gap="2"
        justifyContent="end"
        marginLeft="3"
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
        <Tooltip label="Twitter">
          <IconButton
            as="a"
            href="https://twitter.com/NeopetsDTI"
            size="sm"
            variant="outline"
            aria-label="Twitter"
            icon={<SiTwitter />}
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
      </Grid>
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
  const { pathname, query } = useRouter();

  if (pathname === "/items/[itemId]") {
    return `https://impress.openneo.net/items/${query.itemId}`;
  }

  if (pathname === "/user/[userId]/lists") {
    return `https://impress.openneo.net/user/${query.userId}/closet`;
  }

  if (pathname === "/modeling") {
    return "https://impress.openneo.net/modeling";
  }

  return "https://impress.openneo.net/";
}

export default GlobalFooter;

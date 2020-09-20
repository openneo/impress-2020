import React from "react";
import {
  Box,
  IconButton,
  HStack,
  Tooltip,
  useColorMode,
} from "@chakra-ui/core";
import { EmailIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { SiGithub } from "react-icons/si";

function GlobalFooter() {
  return (
    <Box
      as="footer"
      display="flex"
      alignItems="center"
      justifyContent="flex-end"
    >
      <Box textAlign="center" fontSize="xs" opacity="0.75">
        Images © 2000–{new Date().getFullYear()} Neopets, Inc. All Rights
        Reserved. Used With Permission.
      </Box>
      <HStack
        spacing="2"
        marginLeft="3"
        opacity="0.75"
        transition="opacity 0.2s"
        _hover={{ opacity: "1" }}
        _focusWithin={{ opacity: "1" }}
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

export default GlobalFooter;

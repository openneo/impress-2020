import React from "react";
import { css, cx } from "emotion";
import {
  Box,
  Button,
  Flex,
  Image,
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
  useTheme,
} from "@chakra-ui/core";

import { safeImageUrl } from "./util";

function PosePicker({ onLockFocus, onUnlockFocus }) {
  const theme = useTheme();

  return (
    <Popover
      placement="top-end"
      usePortal
      onOpen={onLockFocus}
      onClose={onUnlockFocus}
    >
      {({ isOpen }) => (
        <>
          <PopoverTrigger>
            <Button
              variant="unstyled"
              boxShadow="md"
              d="flex"
              alignItems="center"
              justifyContent="center"
              border="2px solid transparent"
              _focus={{ borderColor: "gray.50" }}
              _hover={{ borderColor: "gray.50" }}
              outline="initial"
              className={cx(
                css`
                  border: 2px solid transparent;

                  &:focus,
                  &:hover,
                  &.is-open {
                    border-color: ${theme.colors.gray["50"]};
                  }
                `,
                isOpen && "is-open"
              )}
            >
              <span role="img" aria-label="Choose a pose">
                😊
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Box p="4">
              <table width="100%" borderSpacing="8px">
                <thead>
                  <tr>
                    <th />
                    <Box as="th" textAlign="center">
                      😊
                    </Box>
                    <Box as="th" textAlign="center">
                      😢
                    </Box>
                    <Box as="th" textAlign="center">
                      🤒
                    </Box>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <Box as="th" textAlign="right">
                      🙍‍♂️
                    </Box>
                    <PoseCell>
                      <PoseButton src="http://pets.neopets.com/cp/42j5q3zx/1/1.png" />
                    </PoseCell>
                    <PoseCell>
                      <PoseButton src="http://pets.neopets.com/cp/42j5q3zx/2/1.png" />
                    </PoseCell>
                    <PoseCell>
                      <PoseButton src="http://pets.neopets.com/cp/42j5q3zx/4/1.png" />
                    </PoseCell>
                  </tr>
                  <tr>
                    <Box as="th" textAlign="right">
                      🙍‍♀️
                    </Box>
                    <PoseCell>
                      <PoseButton src="http://pets.neopets.com/cp/xgnghng7/1/1.png" />
                    </PoseCell>
                    <PoseCell>
                      <PoseButton src="http://pets.neopets.com/cp/xgnghng7/2/1.png" />
                    </PoseCell>
                    <PoseCell>
                      <PoseButton src="http://pets.neopets.com/cp/xgnghng7/4/1.png" />
                    </PoseCell>
                  </tr>
                </tbody>
              </table>
            </Box>
            <PopoverArrow />
          </PopoverContent>
        </>
      )}
    </Popover>
  );
}

function PoseCell({ children }) {
  return (
    <td>
      <Flex justify="center" p="1">
        {children}
      </Flex>
    </td>
  );
}

function PoseButton({ src }) {
  return (
    <Box rounded="full" boxShadow="md" overflow="hidden">
      <Button variant="unstyled" width="auto" height="auto">
        <Image
          src={safeImageUrl(src)}
          width="50px"
          height="50px"
          className={css`
            opacity: 0.01;

            &[src] {
              opacity: 1;
              transition: opacity 0.2s;
            }
          `}
        />
      </Button>
    </Box>
  );
}

export default PosePicker;

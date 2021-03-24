import React from "react";
import { Box, Flex, Tooltip } from "@chakra-ui/react";

import { useCommonStyles } from "../util";

import WIPXweeImg from "../images/wip-xwee.png";
import WIPXweeImg2x from "../images/wip-xwee@2x.png";

function WIPCallout({
  children,
  details,
  size = "md",
  placement = "bottom",
  ...props
}) {
  const { brightBackground } = useCommonStyles();

  let content = (
    <Flex
      alignItems="center"
      border="1px solid"
      borderColor="green.600"
      background={brightBackground}
      transition="all 0.2s"
      borderRadius="full"
      boxShadow="md"
      paddingLeft="2"
      paddingRight="4"
      paddingY="1"
      fontSize={size === "sm" ? "xs" : "sm"}
      {...props}
    >
      <Box
        as="img"
        src={WIPXweeImg}
        srcSet={`${WIPXweeImg} 1x, ${WIPXweeImg2x} 2x`}
        alt=""
        width={size === "sm" ? "24px" : "36px"}
        height={size === "sm" ? "24px" : "36px"}
        marginRight="2"
      />
      {children || (
        <>
          <Box display={{ base: "none", md: "block" }}>
            We're working on this page!
          </Box>
          <Box display={{ base: "block", md: "none" }}>WIP!</Box>
        </>
      )}
    </Flex>
  );

  if (details) {
    content = (
      <Tooltip
        label={<Box textAlign="center">{details}</Box>}
        placement={placement}
        shouldWrapChildren
      >
        <Box cursor="help">{content}</Box>
      </Tooltip>
    );
  }

  return content;
}

export default WIPCallout;

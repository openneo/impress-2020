import React from "react";
import { Box, Flex, Tooltip } from "@chakra-ui/react";

import WIPXweeImg from "../../images/wip-xwee.png";
import WIPXweeImg2x from "../../images/wip-xwee@2x.png";

function WIPCallout({ children, details }) {
  let content = (
    <Flex
      alignItems="center"
      border="1px solid"
      borderColor="green.600"
      borderRadius="full"
      boxShadow="md"
      paddingLeft="2"
      paddingRight="4"
      paddingY="1"
      fontSize="sm"
    >
      <Box
        as="img"
        src={WIPXweeImg}
        srcSet={`${WIPXweeImg} 1x, ${WIPXweeImg2x} 2x`}
        alt=""
        width="36px"
        height="36px"
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
        placement="bottom"
        shouldWrapChildren
      >
        {content}
      </Tooltip>
    );
  }

  return content;
}

export default WIPCallout;

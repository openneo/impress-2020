import React from "react";
import { css } from "@emotion/react";
import {
  AspectRatio,
  Box,
  Button,
  Center,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Input,
  InputGroup,
  InputRightElement,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useBreakpointValue,
  useClipboard,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";

import { Delay, Heading1, Heading2 } from "./util";
import HangerSpinner from "./components/HangerSpinner";
import { gql, useQuery } from "@apollo/client";

function OutfitUrlsPage() {
  return (
    <>
      <Heading1 marginBottom="4">Changing our outfit URLs</Heading1>
      <VStack
        spacing="4"
        alignItems="flex-start"
        css={css`
          max-width: 800px;

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
        <section>
          <p>
            Hi, friends! Sorry for the trouble 😓 In short, by switching to the
            new outfit URLs below, we'll decrease our hosting costs by
            $20/month! 🙏
          </p>
          <OutfitUrlConverter />
        </section>
        <Box height="2" />
        <section>
          <Heading2>The history</Heading2>
          <p>
            When we started hosting outfit images back in 2012, we didn't know a
            lot about web infrastructure, and we weren't thinking a lot about
            permanent URLs 😅 We uploaded images directly to{" "}
            <a href="https://aws.amazon.com/s3/">Amazon S3</a>, and gave you
            Amazon's URL for them, at <code>amazonaws.com</code>.
          </p>
          <p>
            Since then, we've grown a lot, and our Amazon costs have increased a
            lot too! These days, it costs about $30/month to serve outfit images
            from S3—and $20 of that is just to <em>store</em> our millions of
            outfit images, including the ones nobody visits 😅
          </p>
          <p>
            So, we've moved our apps to a new, more cost-efficient way to share
            outfit images! But, until we delete the old images from Amazon S3
            altogether, we're still paying $20/month <em>just</em> to support
            the old <code>amazonaws.com</code> URLs.
          </p>
          <p>
            I looked hard for a way to redirect the old Amazon URLs to our new
            service, but it seems to not be possible, and it seems like
            $20/month could be better spent another way 😖
          </p>
          <p>
            I'm truly sorry for breaking some of the lookups and petpages out
            there, and I hope this tool helps folks migrate to the new version
            quickly and easily! 🙏
          </p>
        </section>
      </VStack>
    </>
  );
}

function OutfitUrlConverter() {
  return (
    <Tabs>
      <TabList>
        <Tab>Convert an image</Tab>
        <Tab>Convert a lookup/petpage</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <SingleImageConverter />
        </TabPanel>
        <TabPanel>
          <BulkImageConverter />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

function SingleImageConverter() {
  const [inputUrl, setInputUrl] = React.useState("");

  let parsedUrl;
  let parseError;
  try {
    parsedUrl = parseS3OutfitUrl(inputUrl);
  } catch (e) {
    parseError = e;
  }

  const outfitId = parsedUrl?.outfitId;
  const size = parsedUrl?.size;

  const { loading, error: gqlError, data } = useQuery(
    gql`
      query OutfitUrlsSingleImageConverter(
        $outfitId: ID!
        $size: OutfitImageSize
      ) {
        outfit(id: $outfitId) {
          id
          imageUrl(size: $size)
        }
      }
    `,
    {
      variables: { outfitId, size: `SIZE_${size}` },
      skip: outfitId == null || size == null,
      onError: (e) => console.error(e),
    }
  );

  const imageUrl = data?.outfit?.imageUrl;

  const previewBackground = useColorModeValue("gray.200", "whiteAlpha.300");
  const spinnerSize = useBreakpointValue({ base: "md", md: "sm" });

  const { onCopy, hasCopied } = useClipboard(imageUrl);

  return (
    <Grid
      templateAreas={{
        base: `
          "input"
          "output"
          "preview"
        `,
        md: `
          "preview input"
          "preview output"
        `,
      }}
      templateColumns={{ base: "auto", md: "auto 1fr" }}
      columnGap="4"
      rowGap="2"
      justifyItems="center"
    >
      <FormControl gridArea="input" isInvalid={Boolean(parseError) || gqlError}>
        <FormLabel fontWeight="bold">Enter an outfit image URL</FormLabel>
        <Input
          placeholder="https://openneo-uploads.s3.amazonaws.com/outfits/123/456/789/preview.png"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
        />
        <FormErrorMessage>
          {parseError?.message ||
            (gqlError && `Error loading outfit data. Try again?`) ||
            null}
        </FormErrorMessage>
      </FormControl>
      <FormControl gridArea="output">
        <FormLabel fontSize="sm">
          Then, use this new URL in your layouts instead:
        </FormLabel>
        <InputGroup size="sm">
          <Input
            placeholder="https://impress-outfit-images.openneo.net/outfits/123456789/v/1020304050/600.png"
            isReadOnly
            value={imageUrl}
          />
          {imageUrl && (
            <InputRightElement width="4rem" paddingRight="1">
              <Button
                height="calc(100% - .5rem)"
                size="xs"
                minWidth="100%"
                onClick={onCopy}
              >
                {hasCopied ? "Copied!" : "Copy"}
              </Button>
            </InputRightElement>
          )}
        </InputGroup>
      </FormControl>
      <AspectRatio
        gridArea="preview"
        width={{ base: "100%", md: "150px" }}
        maxWidth={{ base: "300px", md: "150px" }}
        ratio={1}
        background={previewBackground}
        borderRadius="md"
        boxShadow="sm"
        marginTop={{ base: "4", md: "0" }}
        overflow="hidden"
      >
        <Center>
          {loading ? (
            <Delay ms={1000}>
              <HangerSpinner size={spinnerSize} />
            </Delay>
          ) : imageUrl ? (
            <Box
              as="img"
              src={imageUrl}
              alt="Outfit image preview"
              width={size}
              height={size}
              maxWidth="100%"
              maxHeight="100%"
              sx={{
                // Don't let alt text flash in while loading
                "&:-moz-loading": {
                  visibility: "hidden",
                },
              }}
            />
          ) : null}
        </Center>
      </AspectRatio>
    </Grid>
  );
}

function BulkImageConverter() {
  return <Box>TODO: Bulk image converter</Box>;
}

const S3_OUTFIT_URL_PATTERN = /^https?:\/\/openneo-uploads\.s3\.amazonaws\.com\/outfits\/([0-9]{3})\/([0-9]{3})\/([0-9]{3})\/(preview|medium_preview|small_preview)\.png$/;
const S3_FILENAMES_TO_SIZES = {
  preview: 600,
  medium_preview: 300,
  small_preview: 150,
};

function parseS3OutfitUrl(url) {
  if (!url) {
    return null;
  }

  const match = S3_OUTFIT_URL_PATTERN.exec(url);
  if (!match) {
    throw new Error(
      `This URL didn't match the expected pattern. Make sure it's formatted like this: https://openneo-uploads.s3.amazonaws.com/outfits/123/456/789/preview.png`
    );
  }

  // Convert ID to number to remove leading 0s, then convert back to string for
  // consistency with how we handle outfit IDs in this app.
  const outfitId = String(Number(`${match[1]}${match[2]}${match[3]}`));
  const size = S3_FILENAMES_TO_SIZES[match[4]];

  return { outfitId, size };
}

export default OutfitUrlsPage;

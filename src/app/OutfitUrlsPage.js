import React from "react";
import { css } from "@emotion/react";
import {
  AspectRatio,
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Input,
  InputGroup,
  InputRightElement,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Textarea,
  useBreakpointValue,
  useClipboard,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";

import { Delay, ErrorMessage, Heading1, Heading2, usePageTitle } from "./util";
import HangerSpinner from "./components/HangerSpinner";
import { gql, useQuery } from "@apollo/client";
import { CheckIcon, WarningIcon } from "@chakra-ui/icons";

function OutfitUrlsPage() {
  usePageTitle("Changing our outfit URLs");

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
            We haven't removed these images from Amazon yet, so old image URLs
            will continue to work until <strong>at least July 1, 2021</strong>!
            Then, we'll replace the old images with a short message and a link
            to this page, so it's easy to learn what happened and fix things up.
          </p>
          <p>
            I'm truly sorry for breaking some of the lookups and petpages out
            there, and I hope this tool helps folks migrate to the new version
            quickly and easily! 🙏
          </p>
          <p>
            Thanks again everyone for your constant support, we appreciate you
            so so much!! 💖 And please let me know at{" "}
            <a href="mailto:matchu@openneo.net">matchu@openneo.net</a> with any
            thoughts you have—it's always great to hear from you, and it always
            make things better 💕
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

  const imageUrl = data?.outfit?.imageUrl || "";

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
        maxHeight={{ base: "300px", md: "150px" }}
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
  const [inputHtml, setInputHtml] = React.useState("");

  const parsedUrls = parseManyS3OutfitUrlsFromHtml(inputHtml);
  const outfitIds = parsedUrls.map((pu) => pu.outfitId);

  // TODO: Do this query in batches for large pages?
  const { loading, error, data } = useQuery(
    gql`
      query OutfitUrlsBulkImageConverter($outfitIds: [ID!]!) {
        outfits(ids: $outfitIds) {
          id
          # Rather than send requests for different sizes separately, I'm just
          # requesting them all and having the client choose, to simplify the
          # query. gzip should compress it very efficiently!
          imageUrl600: imageUrl(size: SIZE_600)
          imageUrl300: imageUrl(size: SIZE_300)
          imageUrl150: imageUrl(size: SIZE_150)
        }
      }
    `,
    {
      variables: { outfitIds },
      skip: outfitIds.length === 0,
      onError: (e) => console.error(e),
    }
  );

  const { outputHtml, numReplacements, replacementErrors } = React.useMemo(
    () =>
      inputHtml && data?.outfits
        ? replaceS3OutfitUrlsInHtml(inputHtml, data.outfits)
        : { outputHtml: "", numReplacements: 0, replacementErrors: [] },
    [inputHtml, data?.outfits]
  );

  React.useEffect(() => {
    for (const replacementError of replacementErrors) {
      console.error("Error replacing outfit URLs in HTML:", replacementError);
    }
  }, [replacementErrors]);

  const { onCopy, hasCopied } = useClipboard(outputHtml);

  return (
    <Grid
      templateAreas={`
        "input"
        "output"
      `}
      rowGap="4"
    >
      <FormControl gridArea="input">
        <FormLabel fontWeight="bold">Enter your lookup/petpage HTML</FormLabel>
        <Textarea
          fontFamily="monospace"
          fontSize="xs"
          placeholder={`<table> <!-- Example input, paste your HTML here! -->
  <tr>
    <td><img src="https://openneo-uploads.s3.amazonaws.com/outfits/123/456/700/preview.png"></td>
    <td><img src="https://openneo-uploads.s3.amazonaws.com/outfits/123/456/701/preview.png"></td>
    <td><img src="https://openneo-uploads.s3.amazonaws.com/outfits/123/456/702/preview.png"></td>
    ...`}
          value={inputHtml}
          onChange={(e) => setInputHtml(e.target.value)}
        />
      </FormControl>
      <FormControl gridArea="output">
        <Grid
          templateAreas={{
            base: `
              "header"
              "textarea"
              "status"
            `,
            md: `
              "header status"
              "textarea textarea"
            `,
          }}
          alignItems="center"
          rowGap="2"
        >
          <Flex gridArea="header" alignItems="center">
            <FormLabel fontSize="sm" margin="0">
              Then, use this new HTML for your page instead:
            </FormLabel>
            <Box width="2" flex={{ base: "1 0 auto", sm: "0 0 auto" }} />
            {outputHtml && (
              <Button size="xs" onClick={onCopy}>
                <Grid templateAreas="the-area">
                  <Box gridArea="the-area">
                    {hasCopied ? "Copied!" : "Copy"}
                  </Box>
                  {/* This invisible "Copied!" enforces a min size for the button
                   * content, so that the button never changes size. */}
                  <Box gridArea="the-area" aria-hidden visibility="hidden">
                    Copied!
                  </Box>
                </Grid>
              </Button>
            )}
          </Flex>
          <Textarea
            gridArea="textarea"
            isReadOnly
            fontFamily="monospace"
            fontSize="xs"
            placeholder={`<table> <!-- Example output, your new HTML will appear here! -->
  <tr>
    <td><img src="https://impress-outfit-images.openneo.net/outfits/123456700/v/1234/600.png"></td>
    <td><img src="https://impress-outfit-images.openneo.net/outfits/123456701/v/5678/600.png"></td>
    <td><img src="https://impress-outfit-images.openneo.net/outfits/123456702/v/9012/600.png"></td>
    ...`}
            value={outputHtml}
          />
          <Box gridArea="status" textAlign="right" justifySelf="end">
            {loading ? (
              <Delay ms={1000}>
                <Flex alignItems="center" opacity="0.8">
                  <Spinner size="xs" marginRight="1.5" />
                  <Box fontSize="sm">
                    Found {outfitIds.length} outfit images, converting…
                  </Box>
                </Flex>
              </Delay>
            ) : error ? (
              <ErrorMessage fontSize="sm">
                Error loading outfits. Try again?
              </ErrorMessage>
            ) : inputHtml && !outputHtml && outfitIds.length === 0 ? (
              <Popover trigger="hover">
                <PopoverTrigger>
                  <Flex
                    as={ErrorMessage}
                    alignItems="center"
                    fontSize="sm"
                    tabIndex="0"
                    borderRadius="md"
                    paddingX="2"
                    marginRight="-2"
                    _focus={{ outline: "0", boxShadow: "outline" }}
                  >
                    <WarningIcon marginRight="1.5" />
                    <Box>No outfit image URLs found</Box>
                  </Flex>
                </PopoverTrigger>
                <PopoverContent>
                  <PopoverArrow />
                  <PopoverBody>
                    <Box fontSize="xs" textAlign="center">
                      <b>Make sure they're in the right format:</b>
                      <br />
                      https://openneo-uploads.s3.amazonaws.com/outfits/123/456/789/preview.png
                      <br />
                      <br />
                      <b>
                        If they're already in the new format, then you're
                        already done!
                      </b>{" "}
                      The new format is:
                      <br />
                      https://impress-outfit-images.openneo.net/outfits/123456789/v/1020304050/600.png
                    </Box>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            ) : outputHtml && replacementErrors.length > 0 ? (
              <Popover trigger="hover">
                <PopoverTrigger>
                  <Flex
                    as={
                      replacementErrors.length > numReplacements
                        ? ErrorMessage
                        : undefined
                    }
                    alignItems="center"
                    fontSize="sm"
                    tabIndex="0"
                    borderRadius="md"
                    paddingX="2"
                    marginRight="-2"
                    _focus={{ outline: "0", boxShadow: "outline" }}
                  >
                    <WarningIcon marginRight="1.5" />
                    <Box>
                      Converted {numReplacements} outfit images, with{" "}
                      {replacementErrors.length} errors
                    </Box>
                  </Flex>
                </PopoverTrigger>
                <PopoverContent width="50ch">
                  <PopoverArrow />
                  <PopoverBody>
                    <Box fontSize="xs" textAlign="center">
                      Errors are unusual at this point in the process. Sorry
                      about this!
                      <br />
                      Email me at{" "}
                      <a href="mailto:matchu@openneo.net">
                        matchu@openneo.net
                      </a>{" "}
                      and I'll try to help!
                      <br />
                      We've left the {replacementErrors.length} erroring images
                      unchanged for now.
                    </Box>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            ) : outputHtml ? (
              <Flex alignItems="center" fontSize="sm" opacity="0.8">
                <CheckIcon marginRight="1.5" />
                <Box>Converted {numReplacements} outfit images!</Box>
              </Flex>
            ) : null}
          </Box>
        </Grid>
      </FormControl>
    </Grid>
  );
}

// These patterns have the same content, but different boundary conditions and
// flags. EXACT is for checking a single string for an exact match, GLOBAL is
// for finding multiple matches in large text.
const S3_OUTFIT_URL_EXACT_PATTERN = /^https?:\/\/openneo-uploads\.s3\.amazonaws\.com\/outfits\/([0-9]{3})\/([0-9]{3})\/([0-9]{3})\/(preview|medium_preview|small_preview)\.png$/;
const S3_OUTFIT_URL_GLOBAL_PATTERN = /https?:\/\/openneo-uploads\.s3\.amazonaws\.com\/outfits\/([0-9]{3})\/([0-9]{3})\/([0-9]{3})\/(preview|medium_preview|small_preview)\.png/g;
const S3_FILENAMES_TO_SIZES = {
  preview: 600,
  medium_preview: 300,
  small_preview: 150,
};

function parseS3OutfitUrl(url) {
  if (!url) {
    return null;
  }

  const match = S3_OUTFIT_URL_EXACT_PATTERN.exec(url);
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

function parseManyS3OutfitUrlsFromHtml(html) {
  const matches = html.match(S3_OUTFIT_URL_GLOBAL_PATTERN) || [];
  return matches.map(parseS3OutfitUrl);
}

function replaceS3OutfitUrlsInHtml(html, outfits) {
  const outfitsById = new Map();
  for (const outfit of outfits) {
    if (!outfit) {
      continue;
    }
    outfitsById.set(outfit.id, outfit);
  }

  // Use the `replace` method to scan the HTML for matches, which will run this
  // function on each match to decide what to replace it with. We'll count
  // successes and log failures along the way!
  let numReplacements = 0;
  const replacementErrors = [];
  const outputHtml = html.replace(S3_OUTFIT_URL_GLOBAL_PATTERN, (match) => {
    let newUrl;
    try {
      const { outfitId, size } = parseS3OutfitUrl(match);
      const outfit = outfitsById.get(outfitId);
      if (!outfit) {
        throw new Error(`could not find outfit ${outfitId}`);
      }

      const sizeKey = `imageUrl` + size;

      if (!(sizeKey in outfit)) {
        throw new Error(
          `outfit ${outfitId} has no image key ${sizeKey}: ${JSON.stringify(
            outfit
          )}`
        );
      }

      newUrl = outfit[sizeKey];
    } catch (e) {
      e.message += ` (${match})`; // help us understand which URL failed!
      replacementErrors.push(e);
      return match;
    }

    numReplacements++;
    return newUrl;
  });

  return { outputHtml, numReplacements, replacementErrors };
}

export default OutfitUrlsPage;

import React from "react";
import { css } from "@emotion/react";
import { VStack } from "@chakra-ui/react";

import { Heading1, Heading2 } from "./util";

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
          <p>Hi, friends! Sorry for the trouble 😓</p>
          <p>
            In short: Old outfit image URLs are expiring, but you can get the
            updated URL right here!
          </p>
          <p>TODO: Outfit image URL converter goes here</p>
        </section>
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

export default OutfitUrlsPage;

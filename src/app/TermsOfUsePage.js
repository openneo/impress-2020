import { VStack } from "@chakra-ui/react";
import Head from "next/head";

import { Heading1, Heading2 } from "./util";
import TextContent from "./components/TextContent";

function TermsOfUsePage() {
  return (
    <>
      <Head>
        <title>Terms of Use | Dress to Impress</title>
      </Head>
      <Heading1 marginBottom="4">Our terms of use</Heading1>
      <TextContent maxWidth="800px">
        <VStack spacing="4" alignItems="flex-start">
          <section>
            <p>
              Hi, friends! Here's some information about how Dress to Impress is
              meant to be used. The rules here aren't very formal, but we hope
              they're clear, and we take them very seriously. Thank you for
              taking the time to read!
            </p>
          </section>
          <section>
            <Heading2>Who can use this service</Heading2>
            <p>
              <strong>No crypto or NFT projects.</strong> Dress to Impress must
              not be used as part of a cryptocurrency-related or NFT-related
              project, commercial or otherwise. If you use our code, service, or
              data to generate NFTs or other products distributed on the
              blockchain or similar technologies, the expected remediation is to
              cease and desist all distribution of works derived from this
              service, in addition to offering appropriate compensation.
            </p>
            <p>
              <strong>Some users might get banned.</strong> We sometimes refuse
              service to users we feel are detrimental to our community, at our
              sole discretion. This includes users who post content that doesn't
              adhere to our terms, which you can see below.
            </p>
          </section>
          <section>
            <Heading2>What you can post on this service</Heading2>
            <p>
              <strong>Keep it Neoboard-safe.</strong> Neopets.com allows links
              to Dress to Impress, so everything needs to be safe for Neopians
              of all ages! Please keep all content "PG" and appropriate for
              young community members, just like you do on Neopets.com. (That
              said, the rules on the Neoboards haven't always been morally
              right, such as when LGBTQIA+ discussion was banned. We'll always
              diverge from those rules when it's ethically appropriate!)
            </p>
            <p>
              <strong>Don't sell things for real money here.</strong> We don't
              have the capacity to validate who is and isn't a legitimate
              seller, so we err on the side of safety and ban <em>all</em>{" "}
              sales. If you're selling something, please do it in a community
              where trust and reputation can be managed more appropriately, and
              please make sure it's in line with Neopets's terms.
            </p>
          </section>
          <section>
            <Heading2>How you can use our data</Heading2>
            <p>
              <strong>Be thoughtful using Neopets's data.</strong> While Dress
              to Impress has a license to distribute Neopets data and images, we
              aren't authorized to extend all of the same permissions to you.
              Please think carefully about how you use Neopets's art and data
              you find on this site, and make sure you're complying with their
              licensing agreements and fair use laws, especially for derived
              works like outfits. But personal use, and usage that stays on our
              site, are always okay!
            </p>
            <p>
              <strong>Be thoughtful using user-generated data.</strong> Some
              data posted to Dress to Impress is generated by our users, like
              their outfits and item lists. When you post those to Dress to
              Impress, you grant us a license to redistribute them with
              attribution as part of the site's functionality, respecting your
              privacy settings when applicable. But each user still owns their
              own creations, so only they can grant you permission to use or
              share it yourself.
            </p>
            <p>
              <strong>Please reach out before using our APIs!</strong> If you'd
              like to use our data to build something new, please contact us!
              We'd like to help if we can. But please don't use our APIs without
              talking to us first: it can cause performance issues for us, and
              reliability issues for you. But we have a few folks who use Dress
              to Impress for things like Discord bots, and we'd like to support
              you and your community too!
            </p>
          </section>
          <section>
            <Heading2>Warranty and liability</Heading2>
            <p>
              <strong>Our data won't always be correct.</strong> While we do our
              best to keep the customization on our site in sync with
              Neopets.com, sometimes our data is out-of-date, and sometimes an
              item looks different on our site than on Neopets.com. We're glad
              to be a resource for users buying Neocash items, but as an
              unofficial service we simply can't make guarantees, and we
              encourage you to check other sources before making a purchase.
            </p>
          </section>
        </VStack>
      </TextContent>
    </>
  );
}

export default TermsOfUsePage;

import React from "react";
import Head from "next/head";
import { Heading1, Heading2 } from "./util";
import TextContent from "./components/TextContent";

import FastlyLogoImg from "./images/fastly-logo.svg";
import { Box, Wrap, WrapItem } from "@chakra-ui/react";
import Image from "next/image";
import { OutfitCard } from "./UserOutfitsPage";

function DonationsPage({ campaigns }) {
  return (
    <>
      <Head>
        <title>Donations | Dress to Impress</title>
      </Head>
      <TextContent>
        <Heading1 marginBottom="4">Our donors</Heading1>
        <p>
          Dress to Impress has been around a long time—from back when Matchu was
          in middle school! Without a real source of income, we used to depend a
          lot on community donations to keep the site running.
        </p>
        <p>
          Since then, life has changed a lot, and we're able to comfortably fund
          Dress to Impress out-of-pocket. But we're still very grateful to the
          donors who got us through those tougher years! Here's a showcase of
          their outfits 💖
        </p>
        <p>
          {/* Thanking Fastly somewhere in a sponsors page on our site is a
           * condition of the program, so here we are! But also it's a great
           * deal and I mean what I say! */}
          We're also grateful to <FastlyLogoLink />, who offer us some CDN
          hosting services under their non-profit &amp; open-source partner
          program! They help us load all the big images around the site much
          faster! Thank you!
        </p>
      </TextContent>
      {campaigns.map((campaign) => (
        <CampaignSection key={campaign.id} campaign={campaign} />
      ))}
    </>
  );
}

function CampaignSection({ campaign }) {
  const { donationFeatures, name } = campaign;
  const featuresWithNames = donationFeatures.filter(
    (f) => f.donorName?.length > 0
  );
  const allDonorNames = new Set(featuresWithNames.map((f) => f.donorName));
  const donorNamesWithOutfits = new Set(
    featuresWithNames.filter((f) => f.outfit != null).map((f) => f.donorName)
  );
  const donorNamesWithoutOutfits = [...allDonorNames]
    .filter((n) => !donorNamesWithOutfits.has(n))
    .sort((a, b) => a.localeCompare(b));

  return (
    <Box marginBottom="8">
      <Heading2 marginBottom="4">{name} donors</Heading2>
      <Wrap spacing="4" justify="space-around">
        {donationFeatures
          .filter((f) => f.outfit != null)
          .map((donationFeature) => (
            <WrapItem key={donationFeature.outfit.id}>
              <DonationOutfitCard
                outfit={donationFeature.outfit}
                donorName={donationFeature.donorName || "Anonymous"}
              />
            </WrapItem>
          ))}
      </Wrap>
      {donorNamesWithoutOutfits.length > 0 && (
        <Box
          textAlign="center"
          fontStyle="italic"
          maxWidth="800px"
          marginX="auto"
          marginTop="8"
        >
          <strong>And a few more:</strong> {donorNamesWithoutOutfits.join(", ")}
          . <strong>Thank you!</strong>
        </Box>
      )}
    </Box>
  );
}

function DonationOutfitCard({ outfit, donorName }) {
  return (
    <OutfitCard
      outfit={outfit}
      caption={
        <Box>
          <Box fontSize="sm">Thank you, {donorName}!</Box>
          <Box fontSize="xs">{outfit.name}</Box>
        </Box>
      }
      alt={`Outfit thumbnail: ${outfit.name}`}
    />
  );
}

function FastlyLogoLink() {
  return (
    <a href="https://www.fastly.com/">
      <Box
        display="inline-block"
        verticalAlign="middle"
        filter="saturate(90%)"
        marginBottom="-2px"
      >
        <Image
          src={FastlyLogoImg}
          width={40}
          height={16}
          alt="Fastly"
          title="Fastly"
        />
      </Box>
    </a>
  );
}

export default DonationsPage;

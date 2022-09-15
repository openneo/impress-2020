// This is a copy of our higher-level catch-all page, but with some
// extra SSR for outfit sharing meta tags!

import Head from "next/head";
import { NextPageWithLayout } from "../_app";
import WardrobePage from "../../src/app/WardrobePage";
// @ts-ignore: doesn't understand module.exports
import connectToDb from "../../src/server/db";
// @ts-ignore: doesn't understand module.exports
import { normalizeRow } from "../../src/server/util";
import { GetServerSideProps } from "next";

type Outfit = {
  id: string;
  name: string;
  updatedAt: string;
};
type PageProps = {
  outfit: Outfit;
};

const WardrobePageWrapper: NextPageWithLayout<PageProps> = ({ outfit }) => {
  return (
    <>
      <Head>
        <title>{outfit.name || "Untitled outfit"} | Dress to Impress</title>
        <OutfitMetaTags outfit={outfit} />
      </Head>
      <WardrobePage />
    </>
  );
};

WardrobePageWrapper.renderWithLayout = (children) => children;

function OutfitMetaTags({ outfit }: { outfit: Outfit }) {
  const updatedAtTimestamp = Math.floor(
    new Date(outfit.updatedAt).getTime() / 1000
  );
  const outfitUrl =
    `https://impress-2020.openneo.net/outfits` +
    `/${encodeURIComponent(outfit.id)}`;
  const imageUrl =
    `https://impress-outfit-images.openneo.net/outfits` +
    `/${encodeURIComponent(outfit.id)}` +
    `/v/${encodeURIComponent(updatedAtTimestamp)}` +
    `/600.png`;

  return (
    <>
      <meta property="og:title" content={outfit.name || "Untitled outfit"} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={outfitUrl} />
      <meta property="og:site_name" content="Dress to Impress" />
      <meta
        property="og:description"
        content="A custom Neopets outfit, designed on Dress to Impress!"
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const outfitId = params?.outfitId;
  if (typeof outfitId !== "string") {
    throw new Error(`assertion failed: outfitId route param is missing`);
  }

  const outfit = await loadOutfitData(outfitId);
  if (outfit == null) {
    return { notFound: true };
  }

  return {
    props: {
      outfit: {
        id: outfit.id,
        name: outfit.name,
        updatedAt: outfit.updatedAt.toISOString(),
      },
    },
  };
};

async function loadOutfitData(id: string) {
  const db = await connectToDb();
  const [rows] = await db.query(`SELECT * FROM outfits WHERE id = ?;`, [id]);
  if (rows.length === 0) {
    return null;
  }

  return normalizeRow(rows[0]);
}

export default WardrobePageWrapper;

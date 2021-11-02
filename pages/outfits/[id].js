// This is a copy of our higher-level catch-all page, but with some
// extra SSR for outfit sharing meta tags!

import Head from "next/head";
import connectToDb from "../../src/server/db";
import { normalizeRow } from "../../src/server/util";

// import NextIndexWrapper from '../../src'

// next/dynamic is used to prevent breaking incompatibilities
// with SSR from window.SOME_VAR usage, if this is not used
// next/dynamic can be removed to take advantage of SSR/prerendering
import dynamic from "next/dynamic";

// try changing "ssr" to true below to test for incompatibilities, if
// no errors occur the above static import can be used instead and the
// below removed
const NextIndexWrapper = dynamic(() => import("../../src"), { ssr: false });

export default function Page({ outfit, ...props }) {
  return (
    <>
      <Head>
        <title>{outfit.name || "Untitled outfit"} | Dress to Impress</title>
        <OutfitMetaTags outfit={outfit} />
      </Head>
      <NextIndexWrapper {...props} />
    </>
  );
}

function OutfitMetaTags({ outfit }) {
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

export async function getServerSideProps({ params }) {
  const outfit = await loadOutfitData(params.id);
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
}

async function loadOutfitData(id) {
  const db = await connectToDb();
  const [rows] = await db.query(`SELECT * FROM outfits WHERE id = ?;`, [id]);
  if (rows.length === 0) {
    return null;
  }

  return normalizeRow(rows[0]);
}

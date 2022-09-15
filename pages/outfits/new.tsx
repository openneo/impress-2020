import { GetServerSideProps } from "next";
import WardrobePage from "../../src/app/WardrobePage";
import { readOutfitStateFromQuery } from "../../src/app/WardrobePage/useOutfitState";
import type { NextPageWithLayout } from "../_app";
import { loadGraphqlQuery, gql } from "../../src/server/ssr-graphql";
import {
  itemAppearanceFragment,
  petAppearanceFragment,
} from "../../src/app/components/useOutfitAppearance";

const WardrobePageWrapper: NextPageWithLayout = () => {
  return <WardrobePage />;
};

WardrobePageWrapper.renderWithLayout = (children) => children;

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  // Read the outfit info necessary to start rendering the image ASAP, and SSR
  // with it! We add it as a special `pageProps` key named `graphqlState`,
  // which the `App` component intercepts and gives to the Apollo client.
  const outfitState = readOutfitStateFromQuery(query);
  const { errors, graphqlState } = await loadGraphqlQuery({
    query: gql`
      query OutfitsNew_GetServerSideProps(
        $speciesId: ID!
        $colorId: ID!
        $pose: Pose!
        $wornItemIds: [ID!]!
      ) {
        petAppearance(speciesId: $speciesId, colorId: $colorId, pose: $pose) {
          id
          ...PetAppearanceForOutfitPreview
        }
        items(ids: $wornItemIds) {
          id
          name
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            ...ItemAppearanceForOutfitPreview
          }
        }
      }
      ${petAppearanceFragment}
      ${itemAppearanceFragment}
    `,
    variables: {
      speciesId: outfitState.speciesId,
      colorId: outfitState.colorId,
      pose: outfitState.pose,
      wornItemIds: outfitState.wornItemIds,
    },
  });
  if (errors) {
    console.warn(
      `[SSR: /outfits/new] Skipping GraphQL preloading, got errors:`
    );
    for (const error of errors) {
      console.warn(`[SSR: /outfits/new]`, error);
    }
    return { props: { graphqlState: {} } };
  }

  return { props: { graphqlState } };
};

export default WardrobePageWrapper;

import { NextPageWithLayout } from "../_app";
import WardrobePage from "../../src/app/WardrobePage";
import { GetServerSideProps } from "next";
import { gql, loadGraphqlQuery } from "../../src/server/ssr-graphql";

const WardrobePageWrapper: NextPageWithLayout = () => {
  return <WardrobePage />;
};

WardrobePageWrapper.renderWithLayout = (children) => children;

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const outfitId = params?.outfitId;
  if (typeof outfitId !== "string") {
    throw new Error(`assertion failed: outfitId route param is missing`);
  }

  const { data, errors, graphqlState } = await loadGraphqlQuery({
    query: gql`
      query OutfitsOutfitId_GetServerSideProps($outfitId: ID!) {
        outfit(id: $outfitId) {
          id
          name
          updatedAt
        }
      }
    `,
    variables: { outfitId },
  });
  if (errors) {
    console.warn(
      `[SSR: /outfits/[outfitId]] Skipping GraphQL preloading, got errors:`
    );
    for (const error of errors) {
      console.warn(`[SSR: /outfits/[outfitId]]`, error);
    }
    return { props: { outfit: null, graphqlState: {} } };
  }
  if (data?.outfit == null) {
    return { notFound: true };
  }

  return { props: { graphqlState } };
};

export default WardrobePageWrapper;

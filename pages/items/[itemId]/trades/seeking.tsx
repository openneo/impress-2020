import { GetServerSideProps } from "next";
import { ItemTradesSeekingPage } from "../../../../src/app/ItemTradesPage";
import { gql, loadGraphqlQuery } from "../../../../src/server/ssr-graphql";
// @ts-ignore doesn't understand module.exports
import { oneDay, oneWeek } from "../../../../src/server/util";

export default function ItemTradesSeekingPageWrapper() {
  return <ItemTradesSeekingPage />;
}

export const getServerSideProps: GetServerSideProps = async ({
  params,
  res,
}) => {
  if (params?.itemId == null) {
    throw new Error(`assertion error: itemId param is missing`);
  }

  // Load the most important, most stable item data to get onto the page ASAP.
  // We'll cache it real hard, to help it load extra-fast for popular items!
  const { errors, graphqlState } = await loadGraphqlQuery({
    query: gql`
      query ItemsTradesSeeking_GetServerSideProps($itemId: ID!) {
        item(id: $itemId) {
          id
          name
          thumbnailUrl
          description
          isNc
          isPb
          createdAt
        }
      }
    `,
    variables: { itemId: params.itemId },
  });
  if (errors) {
    console.warn(
      `[SSR: /items/[itemId]/trades/seeking] Skipping GraphQL preloading, got errors:`
    );
    for (const error of errors) {
      console.warn(`[SSR: /items/[itemId]/trades/seeking]`, error);
    }
    return { props: { graphqlState: {} } };
  }

  // Cache this very aggressively, because it's such stable data!
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${oneDay}, stale-while-revalidate=${oneWeek}`
  );

  return { props: { graphqlState } };
};

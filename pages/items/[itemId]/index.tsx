import { GetServerSideProps } from "next";
import ItemSearchPageToolbar from "../../../src/app/components/ItemSearchPageToolbar";
import ItemPage from "../../../src/app/ItemPage";
import PageLayout from "../../../src/app/PageLayout";
import { gql, loadGraphqlQuery } from "../../../src/server/ssr-graphql";
import type { NextPageWithLayout } from "../../_app";
// @ts-ignore doesn't understand module.exports
import { oneDay, oneWeek } from "../../../src/server/util";

const ItemPageWrapper: NextPageWithLayout = () => {
  return <ItemPage />;
};

ItemPageWrapper.renderWithLayout = (children) => {
  return (
    <PageLayout>
      <ItemSearchPageToolbar marginBottom="8" />
      {children}
    </PageLayout>
  );
};

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
      query ItemsIndex_GetServerSideProps($itemId: ID!) {
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
      `[SSR: /items/[itemId]] Skipping GraphQL preloading, got errors:`
    );
    for (const error of errors) {
      console.warn(`[SSR: /items/[itemId]]`, error);
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

export default ItemPageWrapper;

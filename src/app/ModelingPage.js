import React from "react";
import { Badge, Box, Tooltip, VStack } from "@chakra-ui/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

import { Delay } from "./util";
import HangerSpinner from "./components/HangerSpinner";
import { Heading1, Heading2 } from "./util";
import ItemCard, {
  ItemBadgeList,
  ItemCardList,
  NcBadge,
  YouOwnThisBadge,
} from "./components/ItemCard";
import useCurrentUser from "./components/useCurrentUser";
import Head from "next/head";

function ModelingPage() {
  return (
    <>
      <Head>
        <title>Modeling Hub | Dress to Impress</title>
      </Head>
      <Box>
        <Heading1 marginBottom="2">Modeling Hub</Heading1>
        <ItemModelsSection />
      </Box>
    </>
  );
}

function ItemModelsSection() {
  const { isLoggedIn } = useCurrentUser();

  const { loading, error, data } = useQuery(
    gql`
      query ModelingPage {
        standardItems: itemsThatNeedModels {
          ...ItemFields
          speciesThatNeedModels {
            id
            name
          }
        }

        babyItems: itemsThatNeedModels(colorId: "6") {
          ...ItemFields
          speciesThatNeedModels(colorId: "6") {
            id
            name
          }
        }

        maraquanItems: itemsThatNeedModels(colorId: "44") {
          ...ItemFields
          speciesThatNeedModels(colorId: "44") {
            id
            name
          }
        }

        mutantItems: itemsThatNeedModels(colorId: "46") {
          ...ItemFields
          speciesThatNeedModels(colorId: "46") {
            id
            name
          }
        }
      }

      fragment ItemFields on Item {
        id
        name
        thumbnailUrl
        isNc
        createdAt
      }
    `
  );

  // We're going to be silent about the loading/error states here, because it's
  // not essential info anyway, and announcing the wait or the failure would be
  // more confusing than anything.
  const { data: userData } = useQuery(
    gql`
      query ModelingPage_UserData {
        currentUser {
          itemsTheyOwn {
            id
          }
        }
      }
    `,
    { context: { sendAuth: true }, skip: !isLoggedIn }
  );

  if (loading) {
    return (
      <>
        <Heading2 marginBottom="2">Items we need modeled</Heading2>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          marginTop="8"
        >
          <HangerSpinner />
          <Box fontSize="xs" marginTop="1">
            <Delay ms={2500}>Checking all the items…</Delay>
          </Box>
        </Box>
      </>
    );
  }

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const ownedItemIds = new Set(
    userData?.currentUser?.itemsTheyOwn?.map((item) => item.id)
  );

  if (
    data.standardItems.length === 0 &&
    data.babyItems.length === 0 &&
    data.maraquanItems.length === 0 &&
    data.mutantItems.length === 0
  ) {
    return <p>All items seem to be fully modeled! Good job, everyone! 🥳</p>;
  }

  return (
    <VStack spacing="6" align="flex-start">
      {data.standardItems.length > 0 && (
        <ItemModelsColorSection
          title="Items we need modeled"
          items={data.standardItems}
          ownedItemIds={ownedItemIds}
        />
      )}
      {data.babyItems.length > 0 && (
        <ItemModelsColorSection
          title="Items we need modeled on Baby pets"
          items={data.babyItems}
          ownedItemIds={ownedItemIds}
        />
      )}
      {data.maraquanItems.length > 0 && (
        <ItemModelsColorSection
          title="Items we need modeled on Maraquan pets"
          items={data.maraquanItems}
          ownedItemIds={ownedItemIds}
        />
      )}
      {data.mutantItems.length > 0 && (
        <ItemModelsColorSection
          title="Items we need modeled on Mutant pets"
          items={data.mutantItems}
          ownedItemIds={ownedItemIds}
        />
      )}
    </VStack>
  );
}

function ItemModelsColorSection({ title, items, ownedItemIds, ...props }) {
  items = items
    // enough MMEs are broken that I just don't want to deal right now!
    // TODO: solve this with our new database omission feature instead?
    .filter((item) => !item.name.includes("MME"))
    .sort((a, b) => {
      // This is a cute sort hack. We sort first by, bringing "New!" to the
      // top, and then sorting by name _within_ those two groups.
      const aName = `${itemIsNew(a) ? "000" : "999"} ${a.name}`;
      const bName = `${itemIsNew(b) ? "000" : "999"} ${b.name}`;
      return aName.localeCompare(bName);
    });

  return (
    <Box {...props}>
      <Heading2 marginBottom="2">{title}</Heading2>
      <ItemCardList>
        {items.map((item) => (
          <ItemModelCard
            key={item.id}
            item={item}
            currentUserOwnsItem={ownedItemIds.has(item.id)}
          />
        ))}
      </ItemCardList>
    </Box>
  );
}

function ItemModelCard({ item, currentUserOwnsItem, ...props }) {
  const badges = (
    <ItemModelBadges item={item} currentUserOwnsItem={currentUserOwnsItem} />
  );

  return <ItemCard item={item} badges={badges} {...props} />;
}

function ItemModelBadges({ item, currentUserOwnsItem }) {
  return (
    <ItemBadgeList>
      {itemIsNew(item) && <NewItemBadge createdAt={item.createdAt} />}
      {item.isNc && <NcBadge />}
      {currentUserOwnsItem && <YouOwnThisBadge />}
      {item.speciesThatNeedModels.map((species) => (
        <Badge key={species.id}>{species.name}</Badge>
      ))}
    </ItemBadgeList>
  );
}

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
});
function NewItemBadge({ createdAt }) {
  const date = new Date(createdAt);

  return (
    <Tooltip
      label={`Added on ${fullDateFormatter.format(date)}`}
      placement="top"
      openDelay={400}
    >
      <Badge colorScheme="yellow">New!</Badge>
    </Tooltip>
  );
}

function itemIsNew(item) {
  const date = new Date(item.createdAt);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  return date > oneMonthAgo;
}

export default ModelingPage;

import React from "react";
import { css } from "emotion";
import {
  AspectRatio,
  Badge,
  Button,
  Box,
  IconButton,
  Skeleton,
  SkeletonText,
  Tooltip,
  VisuallyHidden,
  VStack,
  useBreakpointValue,
  useColorModeValue,
  useTheme,
  useToast,
} from "@chakra-ui/core";
import {
  CheckIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  StarIcon,
  WarningIcon,
} from "@chakra-ui/icons";
import { MdPause, MdPlayArrow } from "react-icons/md";
import gql from "graphql-tag";
import { useQuery, useMutation } from "@apollo/client";
import { useParams } from "react-router-dom";

import {
  ItemBadgeList,
  ItemThumbnail,
  NcBadge,
  NpBadge,
} from "./components/ItemCard";
import { Delay, Heading1, usePageTitle } from "./util";
import {
  itemAppearanceFragment,
  petAppearanceFragment,
} from "./components/useOutfitAppearance";
import OutfitPreview from "./components/OutfitPreview";
import SpeciesColorPicker from "./components/SpeciesColorPicker";
import useCurrentUser from "./components/useCurrentUser";
import { useLocalStorage } from "./util";
import WIPCallout from "./components/WIPCallout";

function ItemPage() {
  const { itemId } = useParams();
  return <ItemPageContent itemId={itemId} />;
}

/**
 * ItemPageContent is the content of ItemPage, but we also use it as the
 * entry point for ItemPageDrawer! When embedded in ItemPageDrawer, the
 * `isEmbedded` prop is true, so we know not to e.g. set the page title.
 */
export function ItemPageContent({ itemId, isEmbedded }) {
  const { isLoggedIn } = useCurrentUser();

  return (
    <VStack spacing="8">
      <ItemPageHeader itemId={itemId} isEmbedded={isEmbedded} />
      {isLoggedIn && <ItemPageOwnWantButtons itemId={itemId} />}
      {!isEmbedded && <ItemPageOutfitPreview itemId={itemId} />}
      <WIPCallout>Trade lists coming soon!</WIPCallout>
    </VStack>
  );
}

function ItemPageHeader({ itemId, isEmbedded }) {
  const { error, data } = useQuery(
    gql`
      query ItemPage($itemId: ID!) {
        item(id: $itemId) {
          id
          name
          isNc
          thumbnailUrl
          description
          createdAt
        }
      }
    `,
    { variables: { itemId }, returnPartialData: true }
  );

  usePageTitle(data?.item?.name, { skip: isEmbedded });

  // Show 2 lines of description text placeholder on small screens, or when
  // embedded in the wardrobe page's narrow drawer. In larger contexts, show
  // just 1 line.
  const viewportNumDescriptionLines = useBreakpointValue({ base: 2, md: 1 });
  const numDescriptionLines = isEmbedded ? 2 : viewportNumDescriptionLines;

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const item = data?.item;

  return (
    <>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="flex-start"
        width="100%"
      >
        <SubtleSkeleton isLoaded={item?.thumbnailUrl} marginRight="4">
          <ItemThumbnail item={item} size="lg" isActive flex="0 0 auto" />
        </SubtleSkeleton>
        <Box>
          <SubtleSkeleton isLoaded={item?.name}>
            <Heading1
              lineHeight="1.1"
              // Nudge down the size a bit in the embed case, to better fit the
              // tighter layout!
              size={isEmbedded ? "xl" : "2xl"}
            >
              {item?.name || "Item name here"}
            </Heading1>
          </SubtleSkeleton>
          <ItemPageBadges item={item} isEmbedded={isEmbedded} />
        </Box>
      </Box>
      <Box width="100%" alignSelf="flex-start">
        {item?.description || (
          <Box
            maxWidth="40em"
            minHeight={numDescriptionLines * 1.5 + "em"}
            display="flex"
            flexDirection="column"
            alignItems="stretch"
            justifyContent="center"
          >
            <Delay ms={500}>
              <SkeletonText noOfLines={numDescriptionLines} spacing="4" />
            </Delay>
          </Box>
        )}
      </Box>
    </>
  );
}

function ItemPageBadges({ item, isEmbedded }) {
  const searchBadgesAreLoaded = item?.name != null && item?.isNc != null;

  return (
    <ItemBadgeList>
      <SubtleSkeleton isLoaded={item?.isNc != null}>
        {item?.isNc ? <NcBadge /> : <NpBadge />}
      </SubtleSkeleton>
      {
        // If the createdAt date is null (loaded and empty), hide the badge.
        item.createdAt !== null && (
          <SubtleSkeleton
            // Distinguish between undefined (still loading) and null (loaded and
            // empty).
            isLoaded={item.createdAt !== undefined}
          >
            <Badge
              display="block"
              minWidth="5.25em"
              boxSizing="content-box"
              textAlign="center"
            >
              {item.createdAt && <ShortTimestamp when={item.createdAt} />}
            </Badge>
          </SubtleSkeleton>
        )
      }
      <SubtleSkeleton isLoaded={searchBadgesAreLoaded}>
        <LinkBadge
          href={`https://impress.openneo.net/items/${item.id}`}
          isEmbedded={isEmbedded}
        >
          Classic DTI
        </LinkBadge>
      </SubtleSkeleton>
      <SubtleSkeleton isLoaded={searchBadgesAreLoaded}>
        <LinkBadge
          href={
            "https://items.jellyneo.net/search/?name=" +
            encodeURIComponent(item.name) +
            "&name_type=3"
          }
          isEmbedded={isEmbedded}
        >
          Jellyneo
        </LinkBadge>
      </SubtleSkeleton>
      <SubtleSkeleton isLoaded={searchBadgesAreLoaded}>
        {!item?.isNc && (
          <LinkBadge
            href={
              "http://www.neopets.com/market.phtml?type=wizard&string=" +
              encodeURIComponent(item.name)
            }
            isEmbedded={isEmbedded}
          >
            Shop Wiz
          </LinkBadge>
        )}
      </SubtleSkeleton>
      <SubtleSkeleton isLoaded={searchBadgesAreLoaded}>
        {!item?.isNc && (
          <LinkBadge
            href={
              "http://www.neopets.com/portal/supershopwiz.phtml?string=" +
              encodeURIComponent(item.name)
            }
            isEmbedded={isEmbedded}
          >
            Super Wiz
          </LinkBadge>
        )}
      </SubtleSkeleton>
      <SubtleSkeleton isLoaded={searchBadgesAreLoaded}>
        {!item?.isNc && (
          <LinkBadge
            href={
              "http://www.neopets.com/island/tradingpost.phtml?type=browse&criteria=item_exact&search_string=" +
              encodeURIComponent(item.name)
            }
            isEmbedded={isEmbedded}
          >
            Trade Post
          </LinkBadge>
        )}
      </SubtleSkeleton>
      <SubtleSkeleton isLoaded={searchBadgesAreLoaded}>
        {!item?.isNc && (
          <LinkBadge
            href={
              "http://www.neopets.com/genie.phtml?type=process_genie&criteria=exact&auctiongenie=" +
              encodeURIComponent(item.name)
            }
            isEmbedded={isEmbedded}
          >
            Auctions
          </LinkBadge>
        )}
      </SubtleSkeleton>
    </ItemBadgeList>
  );
}

function LinkBadge({ children, href, isEmbedded }) {
  return (
    <Badge
      as="a"
      href={href}
      display="flex"
      alignItems="center"
      // Normally we want to act like a normal webpage, and treat links as
      // normal. But when we're on the wardrobe page, we want to avoid
      // disrupting the outfit, and open in a new window instead.
      target={isEmbedded ? "_blank" : undefined}
    >
      {children}
      {
        // We also change the icon to signal whether this will launch in a new
        // window or not!
        isEmbedded ? <ExternalLinkIcon marginLeft="1" /> : <ChevronRightIcon />
      }
    </Badge>
  );
}

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
});
const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});
const monthDayYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
function ShortTimestamp({ when }) {
  const date = new Date(when);

  // To find the start of last month, take today, then set its date to the 1st
  // and its time to midnight (the start of this month), and subtract one
  // month. (JS handles negative months and rolls them over correctly.)
  const startOfLastMonth = new Date();
  startOfLastMonth.setDate(1);
  startOfLastMonth.setHours(0);
  startOfLastMonth.setMinutes(0);
  startOfLastMonth.setSeconds(0);
  startOfLastMonth.setMilliseconds(0);
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

  const dateIsOlderThanLastMonth = date < startOfLastMonth;

  return (
    <Tooltip
      label={`First seen on ${fullDateFormatter.format(date)}`}
      placement="top"
      openDelay={400}
    >
      {dateIsOlderThanLastMonth
        ? monthYearFormatter.format(date)
        : monthDayYearFormatter.format(date)}
    </Tooltip>
  );
}

function ItemPageOwnWantButtons({ itemId }) {
  const { loading, error, data } = useQuery(
    gql`
      query ItemPageOwnWantButtons($itemId: ID!) {
        item(id: $itemId) {
          id
          currentUserOwnsThis
          currentUserWantsThis
        }
      }
    `,
    { variables: { itemId } }
  );

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  return (
    <Box display="flex">
      <SubtleSkeleton isLoaded={!loading} marginRight="4">
        <ItemPageOwnButton
          itemId={itemId}
          isChecked={data?.item?.currentUserOwnsThis}
        />
      </SubtleSkeleton>

      <SubtleSkeleton isLoaded={!loading}>
        <ItemPageWantButton
          itemId={itemId}
          isChecked={data?.item?.currentUserWantsThis}
        />
      </SubtleSkeleton>
    </Box>
  );
}

function ItemPageOwnButton({ itemId, isChecked }) {
  const theme = useTheme();
  const toast = useToast();

  const [sendAddMutation] = useMutation(
    gql`
      mutation ItemPageOwnButtonAdd($itemId: ID!) {
        addToItemsCurrentUserOwns(itemId: $itemId) {
          id
          currentUserOwnsThis
        }
      }
    `,
    {
      variables: { itemId },
      optimisticResponse: {
        __typename: "Mutation",
        addToItemsCurrentUserOwns: {
          __typename: "Item",
          id: itemId,
          currentUserOwnsThis: true,
        },
      },
    }
  );

  const [sendRemoveMutation] = useMutation(
    gql`
      mutation ItemPageOwnButtonRemove($itemId: ID!) {
        removeFromItemsCurrentUserOwns(itemId: $itemId) {
          id
          currentUserOwnsThis
        }
      }
    `,
    {
      variables: { itemId },
      optimisticResponse: {
        __typename: "Mutation",
        removeFromItemsCurrentUserOwns: {
          __typename: "Item",
          id: itemId,
          currentUserOwnsThis: false,
        },
      },
    }
  );

  return (
    <Box as="label">
      <VisuallyHidden
        as="input"
        type="checkbox"
        checked={isChecked}
        onChange={(e) => {
          if (e.target.checked) {
            sendAddMutation().catch((e) => {
              console.error(e);
              toast({
                title: "We had trouble adding this to the items you own.",
                description: "Check your internet connection, and try again.",
                status: "error",
                duration: 5000,
              });
            });
          } else {
            sendRemoveMutation().catch((e) => {
              console.error(e);
              toast({
                title: "We had trouble removing this from the items you own.",
                description: "Check your internet connection, and try again.",
                status: "error",
                duration: 5000,
              });
            });
          }
        }}
      />
      <Button
        as="div"
        colorScheme={isChecked ? "green" : "gray"}
        size="lg"
        cursor="pointer"
        transitionDuration="0.4s"
        className={css`
          input:focus + & {
            box-shadow: ${theme.shadows.outline};
          }
        `}
      >
        <IconCheckbox
          icon={<CheckIcon />}
          isChecked={isChecked}
          marginRight="0.5em"
        />
        I own this
      </Button>
    </Box>
  );
}

function ItemPageWantButton({ itemId, isChecked }) {
  const theme = useTheme();
  const toast = useToast();

  const [sendAddMutation] = useMutation(
    gql`
      mutation ItemPageWantButtonAdd($itemId: ID!) {
        addToItemsCurrentUserWants(itemId: $itemId) {
          id
          currentUserWantsThis
        }
      }
    `,
    {
      variables: { itemId },
      optimisticResponse: {
        __typename: "Mutation",
        addToItemsCurrentUserWants: {
          __typename: "Item",
          id: itemId,
          currentUserWantsThis: true,
        },
      },
    }
  );

  const [sendRemoveMutation] = useMutation(
    gql`
      mutation ItemPageWantButtonRemove($itemId: ID!) {
        removeFromItemsCurrentUserWants(itemId: $itemId) {
          id
          currentUserWantsThis
        }
      }
    `,
    {
      variables: { itemId },
      optimisticResponse: {
        __typename: "Mutation",
        removeFromItemsCurrentUserWants: {
          __typename: "Item",
          id: itemId,
          currentUserWantsThis: false,
        },
      },
    }
  );

  return (
    <Box as="label">
      <VisuallyHidden
        as="input"
        type="checkbox"
        isChecked={isChecked}
        onChange={(e) => {
          if (e.target.checked) {
            sendAddMutation().catch((e) => {
              console.error(e);
              toast({
                title: "We had trouble adding this to the items you want.",
                description: "Check your internet connection, and try again.",
                status: "error",
                duration: 5000,
              });
            });
          } else {
            sendRemoveMutation().catch((e) => {
              console.error(e);
              toast({
                title: "We had trouble removing this from the items you want.",
                description: "Check your internet connection, and try again.",
                status: "error",
                duration: 5000,
              });
            });
          }
        }}
      />
      <Button
        as="div"
        colorScheme={isChecked ? "blue" : "gray"}
        size="lg"
        cursor="pointer"
        transitionDuration="0.4s"
        className={css`
          input:focus + & {
            box-shadow: ${theme.shadows.outline};
          }
        `}
      >
        <IconCheckbox
          icon={<StarIcon />}
          isChecked={isChecked}
          marginRight="0.5em"
        />
        I want this
      </Button>
    </Box>
  );
}

function IconCheckbox({ icon, isChecked, ...props }) {
  return (
    <Box display="grid" gridTemplateAreas="the-same-area" {...props}>
      <Box
        gridArea="the-same-area"
        width="1em"
        height="1em"
        border="2px solid currentColor"
        borderRadius="md"
        opacity={isChecked ? "0" : "0.75"}
        transform={isChecked ? "scale(0.75)" : "none"}
        transition="all 0.4s"
      />
      <Box
        gridArea="the-same-area"
        display="flex"
        opacity={isChecked ? "1" : "0"}
        transform={isChecked ? "none" : "scale(0.1)"}
        transition="all 0.4s"
      >
        {icon}
      </Box>
    </Box>
  );
}

function ItemPageOutfitPreview({ itemId }) {
  const idealPose = React.useMemo(
    () => (Math.random() > 0.5 ? "HAPPY_FEM" : "HAPPY_MASC"),
    []
  );
  const [petState, setPetState] = React.useState({
    // We'll fill these in once the canonical appearance data arrives.
    speciesId: null,
    colorId: null,
    pose: null,

    // We use appearance ID, in addition to the above, to give the Apollo cache
    // a really clear hint that the canonical pet appearance we preloaded is
    // the exact right one to show! But switching species/color will null this
    // out again, and that's okay. (We'll do an unnecessary reload if you
    // switch back to it though... we could maybe do something clever there!)
    appearanceId: null,
  });

  // Start by loading the "canonical" pet and item appearance for the outfit
  // preview. We'll use this to initialize both the preview and the picker.
  //
  // TODO: If this is a non-standard pet color, like Mutant, we'll do an extra
  //       query after this loads, because our Apollo cache can't detect the
  //       shared item appearance. (For standard colors though, our logic to
  //       cover standard-color switches works for this preloading too.)
  const { loading, error } = useQuery(
    gql`
      query ItemPageOutfitPreview($itemId: ID!) {
        item(id: $itemId) {
          id
          canonicalAppearance {
            id
            ...ItemAppearanceForOutfitPreview
            body {
              id
              canonicalAppearance {
                id
                species {
                  id
                }
                color {
                  id
                }
                pose

                ...PetAppearanceForOutfitPreview
              }
            }
          }
        }
      }

      ${itemAppearanceFragment}
      ${petAppearanceFragment}
    `,
    {
      variables: { itemId },
      onCompleted: (data) => {
        const canonicalBody = data?.item?.canonicalAppearance?.body;
        const canonicalPetAppearance = canonicalBody?.canonicalAppearance;

        setPetState({
          speciesId: canonicalPetAppearance?.species?.id,
          colorId: canonicalPetAppearance?.color?.id,
          pose: canonicalPetAppearance?.pose,
          appearanceId: canonicalPetAppearance?.id,
        });
      },
    }
  );

  // To check whether the item is compatible with this pet, query for the
  // appearance, but only against the cache. That way, we don't send a
  // redundant network request just for this (the OutfitPreview component will
  // handle it!), but we'll get an update once it arrives in the cache.
  const { data: cachedData } = useQuery(
    gql`
      query ItemPageOutfitPreview_CacheOnly(
        $itemId: ID!
        $speciesId: ID!
        $colorId: ID!
      ) {
        item(id: $itemId) {
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            layers {
              id
            }
          }
        }
      }
    `,
    {
      variables: {
        itemId,
        speciesId: petState.speciesId,
        colorId: petState.colorId,
      },
      fetchPolicy: "cache-only",
    }
  );

  const [hasAnimations, setHasAnimations] = React.useState(false);
  const [isPaused, setIsPaused] = useLocalStorage("DTIOutfitIsPaused", true);

  const borderColor = useColorModeValue("green.700", "green.400");
  const errorColor = useColorModeValue("red.600", "red.400");

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  // If the layers are null-y, then we're still loading. Otherwise, if the
  // layers are an empty array, then we're incomaptible. Or, if they're a
  // non-empty array, then we're compatible!
  const layers = cachedData?.item?.appearanceOn?.layers;
  const isIncompatible = Array.isArray(layers) && layers.length === 0;

  return (
    <VStack spacing="3" width="100%">
      <AspectRatio
        width="300px"
        maxWidth="100%"
        ratio="1"
        border="1px"
        borderColor={borderColor}
        transition="border-color 0.2s"
        borderRadius="lg"
        boxShadow="lg"
        overflow="hidden"
      >
        <Box>
          <OutfitPreview
            speciesId={petState.speciesId}
            colorId={petState.colorId}
            pose={petState.pose}
            appearanceId={petState.appearanceId}
            wornItemIds={[itemId]}
            isLoading={loading}
            spinnerVariant="corner"
            loadingDelayMs={2000}
            engine="canvas"
            onChangeHasAnimations={setHasAnimations}
          />
          {hasAnimations && (
            <IconButton
              icon={isPaused ? <MdPlayArrow /> : <MdPause />}
              aria-label={isPaused ? "Play" : "Pause"}
              onClick={() => setIsPaused(!isPaused)}
              borderRadius="full"
              boxShadow="md"
              color="gray.50"
              backgroundColor="blackAlpha.700"
              position="absolute"
              bottom="2"
              left="2"
              _hover={{ backgroundColor: "blackAlpha.900" }}
              _focus={{ backgroundColor: "blackAlpha.900" }}
            />
          )}
        </Box>
      </AspectRatio>
      <Box display="flex" width="100%" alignItems="center">
        <Box
          // This empty box grows at the same rate as the box on the right, so
          // the middle box will be centered, if there's space!
          flex="1 0 0"
        />
        <SpeciesColorPicker
          speciesId={petState.speciesId}
          colorId={petState.colorId}
          pose={petState.pose}
          idealPose={idealPose}
          onChange={(species, color, _, closestPose) => {
            setPetState({
              speciesId: species.id,
              colorId: color.id,
              pose: closestPose,
              appearanceId: null,
            });
          }}
          size="sm"
          showPlaceholders
          // This is just a UX affordance: while we could handle invalid states
          // from a UI perspective, we figure that, if a pet preview is already
          // visible and responsive to changes, it feels better to treat the
          // changes as atomic and always-valid.
          stateMustAlwaysBeValid
        />
        <Box flex="1 0 0" lineHeight="1">
          {isIncompatible && (
            <Tooltip label="No data yet" placement="top">
              <WarningIcon
                color={errorColor}
                transition="color 0.2"
                marginLeft="2"
              />
            </Tooltip>
          )}
        </Box>
      </Box>
    </VStack>
  );
}

/**
 * SubtleSkeleton hides the skeleton animation until a second has passed, and
 * doesn't fade in the content if it loads near-instantly. This helps avoid
 * flash-of-content stuff!
 *
 * For plain Skeletons, we often use <Delay><Skeleton /></Delay> instead. But
 * that pattern doesn't work as well for wrapper skeletons where we're using
 * placeholder content for layout: we don't want the delay if the content
 * really _is_ present!
 */
function SubtleSkeleton({ isLoaded, ...props }) {
  const [shouldFadeIn, setShouldFadeIn] = React.useState(false);
  const [shouldShowSkeleton, setShouldShowSkeleton] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!isLoaded) {
        setShouldFadeIn(true);
      }
    }, 150);
    return () => clearTimeout(t);
  });

  React.useEffect(() => {
    const t = setTimeout(() => setShouldShowSkeleton(true), 500);
    return () => clearTimeout(t);
  });

  return (
    <Skeleton
      fadeDuration={shouldFadeIn ? undefined : 0}
      startColor={shouldShowSkeleton ? undefined : "transparent"}
      endColor={shouldShowSkeleton ? undefined : "transparent"}
      isLoaded={isLoaded}
      {...props}
    />
  );
}

export default ItemPage;

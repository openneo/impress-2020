import React from "react";
import { css } from "emotion";
import {
  AspectRatio,
  Button,
  Box,
  HStack,
  IconButton,
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
  ChevronRightIcon,
  StarIcon,
  WarningIcon,
} from "@chakra-ui/icons";
import { MdPause, MdPlayArrow } from "react-icons/md";
import gql from "graphql-tag";
import { useQuery, useMutation } from "@apollo/client";
import { useParams } from "react-router-dom";

import ItemPageLayout, { SubtleSkeleton } from "./ItemPageLayout";
import { Delay, usePageTitle } from "./util";
import {
  itemAppearanceFragment,
  petAppearanceFragment,
} from "./components/useOutfitAppearance";
import OutfitPreview from "./components/OutfitPreview";
import SpeciesColorPicker from "./components/SpeciesColorPicker";
import useCurrentUser from "./components/useCurrentUser";
import { useLocalStorage } from "./util";

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

  const { error, data } = useQuery(
    gql`
      query ItemPage($itemId: ID!) {
        item(id: $itemId) {
          id
          name
          isNc
          isPb
          thumbnailUrl
          description
          createdAt
        }
      }
    `,
    { variables: { itemId }, returnPartialData: true }
  );

  usePageTitle(data?.item?.name, { skip: isEmbedded });

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const item = data?.item;

  return (
    <ItemPageLayout item={item} isEmbedded={isEmbedded}>
      <VStack spacing="8" marginTop="4">
        <ItemPageDescription
          description={item?.description}
          isEmbedded={isEmbedded}
        />
        <VStack spacing="4">
          {isLoggedIn && <ItemPageOwnWantButtons itemId={itemId} />}
          <ItemPageTradeLinks itemId={itemId} isEmbedded={isEmbedded} />
        </VStack>
        {!isEmbedded && <ItemPageOutfitPreview itemId={itemId} />}
      </VStack>
    </ItemPageLayout>
  );
}

function ItemPageDescription({ description, isEmbedded }) {
  // Show 2 lines of description text placeholder on small screens, or when
  // embedded in the wardrobe page's narrow drawer. In larger contexts, show
  // just 1 line.
  const viewportNumDescriptionLines = useBreakpointValue({ base: 2, md: 1 });
  const numDescriptionLines = isEmbedded ? 2 : viewportNumDescriptionLines;

  return (
    <Box width="100%" alignSelf="flex-start">
      {description || (
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

function ItemPageTradeLinks({ itemId, isEmbedded }) {
  const { data, loading, error } = useQuery(
    gql`
      query ItemPageTradeLinks($itemId: ID!) {
        item(id: $itemId) {
          id
          numUsersOfferingThis
          numUsersSeekingThis
        }
      }
    `,
    { variables: { itemId } }
  );

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  return (
    <HStack spacing="2">
      <Box as="header" fontSize="sm" fontWeight="bold">
        Trading:
      </Box>
      <SubtleSkeleton isLoaded={!loading}>
        <ItemPageTradeLink
          itemId={itemId}
          count={data?.item?.numUsersOfferingThis || 0}
          label="offering"
          colorScheme="green"
          isEmbedded={isEmbedded}
        />
      </SubtleSkeleton>
      <SubtleSkeleton isLoaded={!loading}>
        <ItemPageTradeLink
          itemId={itemId}
          count={data?.item?.numUsersSeekingThis || 0}
          label="seeking"
          colorScheme="blue"
          isEmbedded={isEmbedded}
        />
      </SubtleSkeleton>
    </HStack>
  );
}

function ItemPageTradeLink({ itemId, count, label, colorScheme, isEmbedded }) {
  return (
    <Button
      as="a"
      // TODO: Link to a new Impress 2020 page instead!
      href={`https://impress.openneo.net/items/${itemId}`}
      target={isEmbedded ? "_blank" : undefined}
      size="xs"
      variant="outline"
      colorScheme={colorScheme}
      borderRadius="full"
      paddingRight="1"
    >
      <Box display="grid" gridTemplateAreas="single-area">
        <Box
          gridArea="single-area"
          display="flex"
          flexAlign="center"
          justifyContent="center"
        >
          {count} {label} <ChevronRightIcon minHeight="1.2em" />
        </Box>
        <Box
          gridArea="single-area"
          display="flex"
          flexAlign="center"
          justifyContent="center"
          visibility="hidden"
        >
          888 offering <ChevronRightIcon minHeight="1.2em" />
        </Box>
      </Box>
    </Button>
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

export default ItemPage;

import React from "react";
import { ClassNames } from "@emotion/react";
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
  useToken,
  Stack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import {
  CheckIcon,
  ChevronRightIcon,
  EditIcon,
  StarIcon,
  WarningIcon,
} from "@chakra-ui/icons";
import { MdPause, MdPlayArrow } from "react-icons/md";
import gql from "graphql-tag";
import { useQuery, useMutation } from "@apollo/client";
import { Link, useParams } from "react-router-dom";

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
    { variables: { itemId }, context: { sendAuth: true } }
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
      context: { sendAuth: true },
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
      context: { sendAuth: true },
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
    <ClassNames>
      {({ css }) => (
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
                    description:
                      "Check your internet connection, and try again.",
                    status: "error",
                    duration: 5000,
                  });
                });
              } else {
                sendRemoveMutation().catch((e) => {
                  console.error(e);
                  toast({
                    title:
                      "We had trouble removing this from the items you own.",
                    description:
                      "Check your internet connection, and try again.",
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
      )}
    </ClassNames>
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
      context: { sendAuth: true },
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
      context: { sendAuth: true },
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
    <ClassNames>
      {({ css }) => (
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
                    description:
                      "Check your internet connection, and try again.",
                    status: "error",
                    duration: 5000,
                  });
                });
              } else {
                sendRemoveMutation().catch((e) => {
                  console.error(e);
                  toast({
                    title:
                      "We had trouble removing this from the items you want.",
                    description:
                      "Check your internet connection, and try again.",
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
      )}
    </ClassNames>
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
          href={`/items/${itemId}/trades/offering`}
          count={data?.item?.numUsersOfferingThis || 0}
          label="offering"
          colorScheme="green"
          isEmbedded={isEmbedded}
        />
      </SubtleSkeleton>
      <SubtleSkeleton isLoaded={!loading}>
        <ItemPageTradeLink
          href={`/items/${itemId}/trades/seeking`}
          count={data?.item?.numUsersSeekingThis || 0}
          label="seeking"
          colorScheme="blue"
          isEmbedded={isEmbedded}
        />
      </SubtleSkeleton>
    </HStack>
  );
}

function ItemPageTradeLink({ href, count, label, colorScheme, isEmbedded }) {
  return (
    <Button
      as={Link}
      to={href}
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
    <Stack direction={{ base: "column", md: "row" }} spacing="8">
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
            <CustomizeMoreButton
              speciesId={petState.speciesId}
              colorId={petState.colorId}
              pose={petState.pose}
              itemId={itemId}
            />
            {hasAnimations && (
              <PlayPauseButton
                isPaused={isPaused}
                onClick={() => setIsPaused(!isPaused)}
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
      <SpeciesFacesPicker
        itemId={itemId}
        selectedSpeciesId={petState.speciesId}
        onChange={({ speciesId, colorId }) =>
          setPetState({
            speciesId,
            colorId,
            pose: idealPose,
            appearanceId: null,
          })
        }
        isLoading={loading}
      />
    </Stack>
  );
}

function CustomizeMoreButton({ speciesId, colorId, pose, itemId }) {
  const url =
    `/outfits/new?species=${speciesId}&color=${colorId}&pose=${pose}&` +
    `objects[]=${itemId}`;

  // The default background is good in light mode, but in dark mode it's a
  // very subtle transparent white... make it a semi-transparent black, for
  // better contrast against light-colored background items!
  const backgroundColor = useColorModeValue(undefined, "blackAlpha.600");
  const backgroundColorHover = useColorModeValue(undefined, "blackAlpha.700");

  return (
    <Tooltip label="Customize more" placement="left" colorScheme="white">
      <IconButton
        as={Link}
        to={url}
        icon={<EditIcon />}
        position="absolute"
        top="2"
        right="2"
        size="sm"
        background={backgroundColor}
        _hover={{ backgroundColor: backgroundColorHover }}
        _focus={{ backgroundColor: backgroundColorHover }}
        boxShadow="sm"
      />
    </Tooltip>
  );
}

function PlayPauseButton({ isPaused, onClick }) {
  return (
    <IconButton
      icon={isPaused ? <MdPlayArrow /> : <MdPause />}
      aria-label={isPaused ? "Play" : "Pause"}
      onClick={onClick}
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
  );
}

function SpeciesFacesPicker({ selectedSpeciesId, onChange, isLoading }) {
  const selectedBorderColor = useColorModeValue("green.600", "green.400");
  const selectedBackgroundColor = useColorModeValue("green.200", "green.600");
  const focusBorderColor = "blue.400";
  const focusBackgroundColor = "blue.100";
  const [
    selectedBorderColorValue,
    selectedBackgroundColorValue,
    focusBorderColorValue,
    focusBackgroundColorValue,
  ] = useToken("colors", [
    selectedBorderColor,
    selectedBackgroundColor,
    focusBorderColor,
    focusBackgroundColor,
  ]);
  const lgShadow = useToken("shadows", "xl");

  const allSpeciesFaces = speciesFaces.sort((a, b) =>
    a.speciesName.localeCompare(b.speciesName)
  );

  return (
    <ClassNames>
      {({ css }) => (
        <Box
          _focusWithin={{
            boxShadow: `${focusBackgroundColorValue} 0 0 1px 2px`,
          }}
          maxWidth="400px"
          boxSizing="content-box"
          padding="2"
          borderRadius="md"
          transition="all 0.2s"
        >
          <Wrap
            spacing="0"
            justify="center"
            // On mobile, give this a scroll container, and some extra padding so
            // the selected-face effects still fit inside.
            maxHeight={{ base: "200px", md: "none" }}
            overflow={{ base: "auto", md: "visible" }}
            padding={{ base: "8px", md: "0" }}
          >
            {allSpeciesFaces.map(
              ({ speciesId, speciesName, colorId, neopetsImageHash }) => (
                <WrapItem
                  key={speciesId}
                  as="label"
                  cursor={isLoading ? "wait" : "pointer"}
                  position="relative"
                >
                  <VisuallyHidden
                    as="input"
                    type="radio"
                    aria-label={speciesName}
                    name="species-faces-picker"
                    value={speciesId}
                    checked={speciesId === selectedSpeciesId}
                    disabled={isLoading}
                    onChange={() => onChange({ speciesId, colorId })}
                  />
                  <Box
                    overflow="hidden"
                    transition="all 0.2s"
                    className={css`
                      input:checked + & {
                        background: ${selectedBackgroundColorValue};
                        border-radius: 6px;
                        box-shadow: ${lgShadow},
                          ${selectedBorderColorValue} 0 0 2px 2px;
                        transform: scale(1.2);
                        z-index: 1;
                      }

                      input:focus + & {
                        background: ${focusBackgroundColorValue};
                        box-shadow: ${lgShadow},
                          ${focusBorderColorValue} 0 0 0 3px;
                      }
                    `}
                  >
                    <Box
                      as="img"
                      src={`https://pets.neopets-asset-proxy.openneo.net/cp/${neopetsImageHash}/1/1.png`}
                      srcSet={
                        `https://pets.neopets-asset-proxy.openneo.net/cp/${neopetsImageHash}/1/1.png 1x, ` +
                        `https://pets.neopets-asset-proxy.openneo.net/cp/${neopetsImageHash}/1/6.png 2x`
                      }
                      alt={speciesName}
                      width={50}
                      height={50}
                      filter="saturate(90%)"
                      opacity="0.9"
                      transition="all 0.2s"
                      className={css`
                        input:checked + * & {
                          opacity: 1;
                          filter: saturate(110%);
                        }
                      `}
                    />
                  </Box>
                </WrapItem>
              )
            )}
          </Wrap>
        </Box>
      )}
    </ClassNames>
  );
}

// HACK: I'm just hardcoding all this, rather than connecting up to the
//       database and adding a loading state. Tbh I'm not sure it's a good idea
//       to load this dynamically until we have SSR to make it come in fast!
//       And it's not so bad if this gets out of sync with the database,
//       because the SpeciesColorPicker will still be usable!
const colors = { BLUE: "8", RED: "61", GREEN: "34", YELLOW: "84" };
const speciesFaces = [
  {
    speciesId: "1",
    neopetsImageHash: "obxdjm88",
    colorId: colors.GREEN,
    speciesName: "Acara",
  },
  {
    speciesId: "2",
    neopetsImageHash: "n9ozx4z5",
    colorId: colors.BLUE,
    speciesName: "Aisha",
  },
  {
    speciesId: "3",
    neopetsImageHash: "kfonqhdc",
    colorId: colors.YELLOW,
    speciesName: "Blumaroo",
  },
  {
    speciesId: "4",
    neopetsImageHash: "sc2hhvhn",
    colorId: colors.YELLOW,
    speciesName: "Bori",
  },
  {
    speciesId: "5",
    neopetsImageHash: "wqz8xn4t",
    colorId: colors.YELLOW,
    speciesName: "Bruce",
  },
  {
    speciesId: "6",
    neopetsImageHash: "jc9klfxm",
    colorId: colors.YELLOW,
    speciesName: "Buzz",
  },
  {
    speciesId: "7",
    neopetsImageHash: "4lrb4n3f",
    colorId: colors.RED,
    speciesName: "Chia",
  },
  {
    speciesId: "8",
    neopetsImageHash: "bdml26md",
    colorId: colors.YELLOW,
    speciesName: "Chomby",
  },
  {
    speciesId: "9",
    neopetsImageHash: "xl6msllv",
    colorId: colors.GREEN,
    speciesName: "Cybunny",
  },
  {
    speciesId: "10",
    neopetsImageHash: "bob39shq",
    colorId: colors.YELLOW,
    speciesName: "Draik",
  },
  {
    speciesId: "11",
    neopetsImageHash: "jhhhbrww",
    colorId: colors.RED,
    speciesName: "Elephante",
  },
  {
    speciesId: "12",
    neopetsImageHash: "6kngmhvs",
    colorId: colors.RED,
    speciesName: "Eyrie",
  },
  {
    speciesId: "13",
    neopetsImageHash: "47vt32x2",
    colorId: colors.GREEN,
    speciesName: "Flotsam",
  },
  {
    speciesId: "14",
    neopetsImageHash: "5nrd2lvd",
    colorId: colors.YELLOW,
    speciesName: "Gelert",
  },
  {
    speciesId: "15",
    neopetsImageHash: "6c275jcg",
    colorId: colors.BLUE,
    speciesName: "Gnorbu",
  },
  {
    speciesId: "16",
    neopetsImageHash: "j7q65fv4",
    colorId: colors.BLUE,
    speciesName: "Grarrl",
  },
  {
    speciesId: "17",
    neopetsImageHash: "5xn4kjf8",
    colorId: colors.GREEN,
    speciesName: "Grundo",
  },
  {
    speciesId: "18",
    neopetsImageHash: "jsfvcqwt",
    colorId: colors.RED,
    speciesName: "Hissi",
  },
  {
    speciesId: "19",
    neopetsImageHash: "w32r74vo",
    colorId: colors.GREEN,
    speciesName: "Ixi",
  },
  {
    speciesId: "20",
    neopetsImageHash: "kz43rnld",
    colorId: colors.YELLOW,
    speciesName: "Jetsam",
  },
  {
    speciesId: "21",
    neopetsImageHash: "m267j935",
    colorId: colors.GREEN,
    speciesName: "Jubjub",
  },
  {
    speciesId: "22",
    neopetsImageHash: "4gsrb59g",
    colorId: colors.YELLOW,
    speciesName: "Kacheek",
  },
  {
    speciesId: "23",
    neopetsImageHash: "ktlxmrtr",
    colorId: colors.BLUE,
    speciesName: "Kau",
  },
  {
    speciesId: "24",
    neopetsImageHash: "42j5q3zx",
    colorId: colors.GREEN,
    speciesName: "Kiko",
  },
  {
    speciesId: "25",
    neopetsImageHash: "ncfn87wk",
    colorId: colors.GREEN,
    speciesName: "Koi",
  },
  {
    speciesId: "26",
    neopetsImageHash: "omx9c876",
    colorId: colors.RED,
    speciesName: "Korbat",
  },
  {
    speciesId: "27",
    neopetsImageHash: "rfsbh59t",
    colorId: colors.BLUE,
    speciesName: "Kougra",
  },
  {
    speciesId: "28",
    neopetsImageHash: "hxgsm5d4",
    colorId: colors.BLUE,
    speciesName: "Krawk",
  },
  {
    speciesId: "29",
    neopetsImageHash: "blxmjgbk",
    colorId: colors.YELLOW,
    speciesName: "Kyrii",
  },
  {
    speciesId: "30",
    neopetsImageHash: "8r94jhfq",
    colorId: colors.YELLOW,
    speciesName: "Lenny",
  },
  {
    speciesId: "31",
    neopetsImageHash: "z42535zh",
    colorId: colors.YELLOW,
    speciesName: "Lupe",
  },
  {
    speciesId: "32",
    neopetsImageHash: "qgg6z8s7",
    colorId: colors.BLUE,
    speciesName: "Lutari",
  },
  {
    speciesId: "33",
    neopetsImageHash: "kk2nn2jr",
    colorId: colors.YELLOW,
    speciesName: "Meerca",
  },
  {
    speciesId: "34",
    neopetsImageHash: "jgkoro5z",
    colorId: colors.GREEN,
    speciesName: "Moehog",
  },
  {
    speciesId: "35",
    neopetsImageHash: "xwlo9657",
    colorId: colors.BLUE,
    speciesName: "Mynci",
  },
  {
    speciesId: "36",
    neopetsImageHash: "bx7fho8x",
    colorId: colors.BLUE,
    speciesName: "Nimmo",
  },
  {
    speciesId: "37",
    neopetsImageHash: "rjzmx24v",
    colorId: colors.YELLOW,
    speciesName: "Ogrin",
  },
  {
    speciesId: "38",
    neopetsImageHash: "kokc52kh",
    colorId: colors.RED,
    speciesName: "Peophin",
  },
  {
    speciesId: "39",
    neopetsImageHash: "fw6lvf3c",
    colorId: colors.GREEN,
    speciesName: "Poogle",
  },
  {
    speciesId: "40",
    neopetsImageHash: "tjhwbro3",
    colorId: colors.RED,
    speciesName: "Pteri",
  },
  {
    speciesId: "41",
    neopetsImageHash: "jdto7mj4",
    colorId: colors.YELLOW,
    speciesName: "Quiggle",
  },
  {
    speciesId: "42",
    neopetsImageHash: "qsgbm5f6",
    colorId: colors.BLUE,
    speciesName: "Ruki",
  },
  {
    speciesId: "43",
    neopetsImageHash: "hkjoncsx",
    colorId: colors.RED,
    speciesName: "Scorchio",
  },
  {
    speciesId: "44",
    neopetsImageHash: "mmvn4tkg",
    colorId: colors.YELLOW,
    speciesName: "Shoyru",
  },
  {
    speciesId: "45",
    neopetsImageHash: "fc4cxk3t",
    colorId: colors.RED,
    speciesName: "Skeith",
  },
  {
    speciesId: "46",
    neopetsImageHash: "84gvowmj",
    colorId: colors.YELLOW,
    speciesName: "Techo",
  },
  {
    speciesId: "47",
    neopetsImageHash: "jd433863",
    colorId: colors.BLUE,
    speciesName: "Tonu",
  },
  {
    speciesId: "48",
    neopetsImageHash: "q39wn6vq",
    colorId: colors.YELLOW,
    speciesName: "Tuskaninny",
  },
  {
    speciesId: "49",
    neopetsImageHash: "njzvoflw",
    colorId: colors.GREEN,
    speciesName: "Uni",
  },
  {
    speciesId: "50",
    neopetsImageHash: "rox4mgh5",
    colorId: colors.RED,
    speciesName: "Usul",
  },
  {
    speciesId: "51",
    neopetsImageHash: "dnr2kj4b",
    colorId: colors.YELLOW,
    speciesName: "Wocky",
  },
  {
    speciesId: "52",
    neopetsImageHash: "tdkqr2b6",
    colorId: colors.RED,
    speciesName: "Xweetok",
  },
  {
    speciesId: "53",
    neopetsImageHash: "h95cs547",
    colorId: colors.RED,
    speciesName: "Yurble",
  },
  {
    speciesId: "54",
    neopetsImageHash: "x8c57g2l",
    colorId: colors.BLUE,
    speciesName: "Zafara",
  },
  {
    speciesId: "55",
    neopetsImageHash: "xkntzsww",
    colorId: colors.YELLOW,
    speciesName: "Vandagyre",
  },
];

export default ItemPage;

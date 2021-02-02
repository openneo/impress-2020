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
        selectedSpeciesId={petState.speciesId}
        compatibleBodyIds={["180"]}
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

function SpeciesFacesPicker({
  selectedSpeciesId,
  compatibleBodyIds,
  onChange,
  isLoading,
}) {
  const allSpeciesFaces = speciesFaces.sort((a, b) =>
    a.speciesName.localeCompare(b.speciesName)
  );

  const focusBorderColorValue = useToken("colors", "blue.100");

  return (
    <Box
      _focusWithin={{
        boxShadow: `${focusBorderColorValue} 0 0 1px 2px`,
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
        {allSpeciesFaces.map((speciesFace) => (
          <WrapItem key={speciesFace.speciesId}>
            <SpeciesFaceOption
              speciesId={speciesFace.speciesId}
              speciesName={speciesFace.speciesName}
              colorId={speciesFace.colorId}
              neopetsImageHash={speciesFace.neopetsImageHash}
              isCompatible={compatibleBodyIds.includes(speciesFace.bodyId)}
              isSelected={speciesFace.speciesId === selectedSpeciesId}
              onChange={onChange}
              isLoading={isLoading}
            />
          </WrapItem>
        ))}
      </Wrap>
    </Box>
  );
}

function SpeciesFaceOption({
  speciesId,
  speciesName,
  colorId,
  neopetsImageHash,
  isCompatible,
  isSelected,
  onChange,
  isLoading,
}) {
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
  const xlShadow = useToken("shadows", "xl");

  const isHappy = isLoading || isCompatible;
  const emotionId = isHappy ? "1" : "2";

  const tooltipLabel = isCompatible ? (
    speciesName
  ) : (
    <div style={{ textAlign: "center" }}>
      {speciesName}
      <div style={{ fontStyle: "italic", fontSize: "0.75em" }}>
        (Not compatible yet)
      </div>
    </div>
  );

  const cursor = isLoading ? "wait" : !isCompatible ? "not-allowed" : "pointer";

  return (
    <ClassNames>
      {({ css }) => (
        <Tooltip label={tooltipLabel} placement="top" gutter={-12}>
          <Box as="label" cursor={cursor}>
            <VisuallyHidden
              as="input"
              type="radio"
              aria-label={speciesName}
              name="species-faces-picker"
              value={speciesId}
              checked={isSelected}
              disabled={isLoading || !isCompatible}
              onChange={() => onChange({ speciesId, colorId })}
            />
            <Box
              overflow="hidden"
              transition="all 0.2s"
              position="relative"
              className={css`
                input:checked + & {
                  background: ${selectedBackgroundColorValue};
                  border-radius: 6px;
                  box-shadow: ${xlShadow},
                    ${selectedBorderColorValue} 0 0 2px 2px;
                  transform: scale(1.2);
                  z-index: 1;
                }

                input:focus + & {
                  background: ${focusBackgroundColorValue};
                  box-shadow: ${xlShadow}, ${focusBorderColorValue} 0 0 0 3px;
                }
              `}
            >
              <Box
                as="img"
                src={`https://pets.neopets-asset-proxy.openneo.net/cp/${neopetsImageHash}/${emotionId}/1.png`}
                srcSet={
                  `https://pets.neopets-asset-proxy.openneo.net/cp/${neopetsImageHash}/${emotionId}/1.png 1x, ` +
                  `https://pets.neopets-asset-proxy.openneo.net/cp/${neopetsImageHash}/${emotionId}/6.png 2x`
                }
                alt={speciesName}
                width={50}
                height={50}
                filter={isCompatible ? "saturate(90%)" : "saturate(0%)"}
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
          </Box>
        </Tooltip>
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
    speciesName: "Acara",
    speciesId: "1",
    colorId: colors.GREEN,
    bodyId: "93",
    neopetsImageHash: "obxdjm88",
  },
  {
    speciesName: "Aisha",
    speciesId: "2",
    colorId: colors.BLUE,
    bodyId: "106",
    neopetsImageHash: "n9ozx4z5",
  },
  {
    speciesName: "Blumaroo",
    speciesId: "3",
    colorId: colors.YELLOW,
    bodyId: "47",
    neopetsImageHash: "kfonqhdc",
  },
  {
    speciesName: "Bori",
    speciesId: "4",
    colorId: colors.YELLOW,
    bodyId: "84",
    neopetsImageHash: "sc2hhvhn",
  },
  {
    speciesName: "Bruce",
    speciesId: "5",
    colorId: colors.YELLOW,
    bodyId: "146",
    neopetsImageHash: "wqz8xn4t",
  },
  {
    speciesName: "Buzz",
    speciesId: "6",
    colorId: colors.YELLOW,
    bodyId: "250",
    neopetsImageHash: "jc9klfxm",
  },
  {
    speciesName: "Chia",
    speciesId: "7",
    colorId: colors.RED,
    bodyId: "212",
    neopetsImageHash: "4lrb4n3f",
  },
  {
    speciesName: "Chomby",
    speciesId: "8",
    colorId: colors.YELLOW,
    bodyId: "74",
    neopetsImageHash: "bdml26md",
  },
  {
    speciesName: "Cybunny",
    speciesId: "9",
    colorId: colors.GREEN,
    bodyId: "94",
    neopetsImageHash: "xl6msllv",
  },
  {
    speciesName: "Draik",
    speciesId: "10",
    colorId: colors.YELLOW,
    bodyId: "132",
    neopetsImageHash: "bob39shq",
  },
  {
    speciesName: "Elephante",
    speciesId: "11",
    colorId: colors.RED,
    bodyId: "56",
    neopetsImageHash: "jhhhbrww",
  },
  {
    speciesName: "Eyrie",
    speciesId: "12",
    colorId: colors.RED,
    bodyId: "90",
    neopetsImageHash: "6kngmhvs",
  },
  {
    speciesName: "Flotsam",
    speciesId: "13",
    colorId: colors.GREEN,
    bodyId: "136",
    neopetsImageHash: "47vt32x2",
  },
  {
    speciesName: "Gelert",
    speciesId: "14",
    colorId: colors.YELLOW,
    bodyId: "138",
    neopetsImageHash: "5nrd2lvd",
  },
  {
    speciesName: "Gnorbu",
    speciesId: "15",
    colorId: colors.BLUE,
    bodyId: "166",
    neopetsImageHash: "6c275jcg",
  },
  {
    speciesName: "Grarrl",
    speciesId: "16",
    colorId: colors.BLUE,
    bodyId: "119",
    neopetsImageHash: "j7q65fv4",
  },
  {
    speciesName: "Grundo",
    speciesId: "17",
    colorId: colors.GREEN,
    bodyId: "126",
    neopetsImageHash: "5xn4kjf8",
  },
  {
    speciesName: "Hissi",
    speciesId: "18",
    colorId: colors.RED,
    bodyId: "67",
    neopetsImageHash: "jsfvcqwt",
  },
  {
    speciesName: "Ixi",
    speciesId: "19",
    colorId: colors.GREEN,
    bodyId: "163",
    neopetsImageHash: "w32r74vo",
  },
  {
    speciesName: "Jetsam",
    speciesId: "20",
    colorId: colors.YELLOW,
    bodyId: "147",
    neopetsImageHash: "kz43rnld",
  },
  {
    speciesName: "Jubjub",
    speciesId: "21",
    colorId: colors.GREEN,
    bodyId: "80",
    neopetsImageHash: "m267j935",
  },
  {
    speciesName: "Kacheek",
    speciesId: "22",
    colorId: colors.YELLOW,
    bodyId: "117",
    neopetsImageHash: "4gsrb59g",
  },
  {
    speciesName: "Kau",
    speciesId: "23",
    colorId: colors.BLUE,
    bodyId: "201",
    neopetsImageHash: "ktlxmrtr",
  },
  {
    speciesName: "Kiko",
    speciesId: "24",
    colorId: colors.GREEN,
    bodyId: "51",
    neopetsImageHash: "42j5q3zx",
  },
  {
    speciesName: "Koi",
    speciesId: "25",
    colorId: colors.GREEN,
    bodyId: "208",
    neopetsImageHash: "ncfn87wk",
  },
  {
    speciesName: "Korbat",
    speciesId: "26",
    colorId: colors.RED,
    bodyId: "196",
    neopetsImageHash: "omx9c876",
  },
  {
    speciesName: "Kougra",
    speciesId: "27",
    colorId: colors.BLUE,
    bodyId: "143",
    neopetsImageHash: "rfsbh59t",
  },
  {
    speciesName: "Krawk",
    speciesId: "28",
    colorId: colors.BLUE,
    bodyId: "150",
    neopetsImageHash: "hxgsm5d4",
  },
  {
    speciesName: "Kyrii",
    speciesId: "29",
    colorId: colors.YELLOW,
    bodyId: "175",
    neopetsImageHash: "blxmjgbk",
  },
  {
    speciesName: "Lenny",
    speciesId: "30",
    colorId: colors.YELLOW,
    bodyId: "173",
    neopetsImageHash: "8r94jhfq",
  },
  {
    speciesName: "Lupe",
    speciesId: "31",
    colorId: colors.YELLOW,
    bodyId: "199",
    neopetsImageHash: "z42535zh",
  },
  {
    speciesName: "Lutari",
    speciesId: "32",
    colorId: colors.BLUE,
    bodyId: "52",
    neopetsImageHash: "qgg6z8s7",
  },
  {
    speciesName: "Meerca",
    speciesId: "33",
    colorId: colors.YELLOW,
    bodyId: "109",
    neopetsImageHash: "kk2nn2jr",
  },
  {
    speciesName: "Moehog",
    speciesId: "34",
    colorId: colors.GREEN,
    bodyId: "134",
    neopetsImageHash: "jgkoro5z",
  },
  {
    speciesName: "Mynci",
    speciesId: "35",
    colorId: colors.BLUE,
    bodyId: "95",
    neopetsImageHash: "xwlo9657",
  },
  {
    speciesName: "Nimmo",
    speciesId: "36",
    colorId: colors.BLUE,
    bodyId: "96",
    neopetsImageHash: "bx7fho8x",
  },
  {
    speciesName: "Ogrin",
    speciesId: "37",
    colorId: colors.YELLOW,
    bodyId: "154",
    neopetsImageHash: "rjzmx24v",
  },
  {
    speciesName: "Peophin",
    speciesId: "38",
    colorId: colors.RED,
    bodyId: "55",
    neopetsImageHash: "kokc52kh",
  },
  {
    speciesName: "Poogle",
    speciesId: "39",
    colorId: colors.GREEN,
    bodyId: "76",
    neopetsImageHash: "fw6lvf3c",
  },
  {
    speciesName: "Pteri",
    speciesId: "40",
    colorId: colors.RED,
    bodyId: "156",
    neopetsImageHash: "tjhwbro3",
  },
  {
    speciesName: "Quiggle",
    speciesId: "41",
    colorId: colors.YELLOW,
    bodyId: "78",
    neopetsImageHash: "jdto7mj4",
  },
  {
    speciesName: "Ruki",
    speciesId: "42",
    colorId: colors.BLUE,
    bodyId: "191",
    neopetsImageHash: "qsgbm5f6",
  },
  {
    speciesName: "Scorchio",
    speciesId: "43",
    colorId: colors.RED,
    bodyId: "187",
    neopetsImageHash: "hkjoncsx",
  },
  {
    speciesName: "Shoyru",
    speciesId: "44",
    colorId: colors.YELLOW,
    bodyId: "46",
    neopetsImageHash: "mmvn4tkg",
  },
  {
    speciesName: "Skeith",
    speciesId: "45",
    colorId: colors.RED,
    bodyId: "178",
    neopetsImageHash: "fc4cxk3t",
  },
  {
    speciesName: "Techo",
    speciesId: "46",
    colorId: colors.YELLOW,
    bodyId: "100",
    neopetsImageHash: "84gvowmj",
  },
  {
    speciesName: "Tonu",
    speciesId: "47",
    colorId: colors.BLUE,
    bodyId: "130",
    neopetsImageHash: "jd433863",
  },
  {
    speciesName: "Tuskaninny",
    speciesId: "48",
    colorId: colors.YELLOW,
    bodyId: "188",
    neopetsImageHash: "q39wn6vq",
  },
  {
    speciesName: "Uni",
    speciesId: "49",
    colorId: colors.GREEN,
    bodyId: "257",
    neopetsImageHash: "njzvoflw",
  },
  {
    speciesName: "Usul",
    speciesId: "50",
    colorId: colors.RED,
    bodyId: "206",
    neopetsImageHash: "rox4mgh5",
  },
  {
    speciesName: "Vandagyre",
    speciesId: "55",
    colorId: colors.YELLOW,
    bodyId: "306",
    neopetsImageHash: "xkntzsww",
  },
  {
    speciesName: "Wocky",
    speciesId: "51",
    colorId: colors.YELLOW,
    bodyId: "101",
    neopetsImageHash: "dnr2kj4b",
  },
  {
    speciesName: "Xweetok",
    speciesId: "52",
    colorId: colors.RED,
    bodyId: "68",
    neopetsImageHash: "tdkqr2b6",
  },
  {
    speciesName: "Yurble",
    speciesId: "53",
    colorId: colors.RED,
    bodyId: "182",
    neopetsImageHash: "h95cs547",
  },
  {
    speciesName: "Zafara",
    speciesId: "54",
    colorId: colors.BLUE,
    bodyId: "180",
    neopetsImageHash: "x8c57g2l",
  },
];

export default ItemPage;

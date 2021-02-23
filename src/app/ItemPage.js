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
  Wrap,
  WrapItem,
  Flex,
  usePrefersReducedMotion,
  Grid,
} from "@chakra-ui/react";
import {
  CheckIcon,
  ChevronRightIcon,
  EditIcon,
  StarIcon,
  WarningIcon,
  WarningTwoIcon,
} from "@chakra-ui/icons";
import { MdPause, MdPlayArrow } from "react-icons/md";
import gql from "graphql-tag";
import { useQuery, useMutation } from "@apollo/client";
import { Link, useParams } from "react-router-dom";

import ItemPageLayout, { SubtleSkeleton } from "./ItemPageLayout";
import { Delay, logAndCapture, usePageTitle } from "./util";
import HTML5Badge, { layerUsesHTML5 } from "./components/HTML5Badge";
import {
  itemAppearanceFragment,
  petAppearanceFragment,
} from "./components/useOutfitAppearance";
import { useOutfitPreview } from "./components/OutfitPreview";
import SpeciesColorPicker, {
  useAllValidPetPoses,
  getValidPoses,
  getClosestPose,
} from "./components/SpeciesColorPicker";
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

          # For Support users.
          rarityIndex
          isManuallyNc
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
    isValid: false,

    // We use appearance ID, in addition to the above, to give the Apollo cache
    // a really clear hint that the canonical pet appearance we preloaded is
    // the exact right one to show! But switching species/color will null this
    // out again, and that's okay. (We'll do an unnecessary reload if you
    // switch back to it though... we could maybe do something clever there!)
    appearanceId: null,
  });
  const [preferredSpeciesId, setPreferredSpeciesId] = useLocalStorage(
    "DTIItemPreviewPreferredSpeciesId",
    null
  );
  const [preferredColorId, setPreferredColorId] = useLocalStorage(
    "DTIItemPreviewPreferredColorId",
    null
  );

  const setPetStateFromUserAction = (newPetState) => {
    setPetState(newPetState);

    // When the user _intentionally_ chooses a species or color, save it in
    // local storage for next time. (This won't update when e.g. their
    // preferred species or color isn't available for this item, so we update
    // to the canonical species or color automatically.)
    //
    // Re the "ifs", I have no reason to expect null to come in here, but,
    // since this is touching client-persisted data, I want it to be even more
    // reliable than usual!
    if (newPetState.speciesId && newPetState.speciesId !== petState.speciesId) {
      setPreferredSpeciesId(newPetState.speciesId);
    }
    if (newPetState.colorId && newPetState.colorId !== petState.colorId) {
      if (colorIsBasic(newPetState.colorId)) {
        // When the user chooses a basic color, don't index on it specifically,
        // and instead reset to use default colors.
        setPreferredColorId(null);
      } else {
        setPreferredColorId(newPetState.colorId);
      }
    }
  };

  // We don't need to reload this query when preferred species/color change, so
  // cache their initial values here to use as query arguments.
  const [initialPreferredSpeciesId] = React.useState(preferredSpeciesId);
  const [initialPreferredColorId] = React.useState(preferredColorId);

  // Start by loading the "canonical" pet and item appearance for the outfit
  // preview. We'll use this to initialize both the preview and the picker.
  //
  // If the user has a preferred species saved from using the ItemPage in the
  // past, we'll send that instead. This will return the appearance on that
  // species if possible, or the default canonical species if not.
  //
  // TODO: If this is a non-standard pet color, like Mutant, we'll do an extra
  //       query after this loads, because our Apollo cache can't detect the
  //       shared item appearance. (For standard colors though, our logic to
  //       cover standard-color switches works for this preloading too.)
  const { loading: loadingGQL, error: errorGQL, data } = useQuery(
    gql`
      query ItemPageOutfitPreview(
        $itemId: ID!
        $preferredSpeciesId: ID
        $preferredColorId: ID
      ) {
        item(id: $itemId) {
          id
          name
          restrictedZones {
            id
            label @client
          }
          compatibleBodiesAndTheirZones {
            body {
              id
              representsAllBodies
              species {
                id
                name
              }
            }
            zones {
              id
              label @client
            }
          }
          canonicalAppearance(
            preferredSpeciesId: $preferredSpeciesId
            preferredColorId: $preferredColorId
          ) {
            id
            ...ItemAppearanceForOutfitPreview
            body {
              id
              canonicalAppearance(preferredColorId: $preferredColorId) {
                id
                species {
                  id
                  name
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
      variables: {
        itemId,
        preferredSpeciesId: initialPreferredSpeciesId,
        preferredColorId: initialPreferredColorId,
      },
      onCompleted: (data) => {
        const canonicalBody = data?.item?.canonicalAppearance?.body;
        const canonicalPetAppearance = canonicalBody?.canonicalAppearance;

        setPetState({
          speciesId: canonicalPetAppearance?.species?.id,
          colorId: canonicalPetAppearance?.color?.id,
          pose: canonicalPetAppearance?.pose,
          isValid: true,
          appearanceId: canonicalPetAppearance?.id,
        });
      },
    }
  );

  const compatibleBodies =
    data?.item?.compatibleBodiesAndTheirZones?.map(({ body }) => body) || [];
  const compatibleBodiesAndTheirZones =
    data?.item?.compatibleBodiesAndTheirZones || [];

  // If there's only one compatible body, and the canonical species's name
  // appears in the item name, then this is probably a species-specific item,
  // and we should adjust the UI to avoid implying that other species could
  // model it.
  const isProbablySpeciesSpecific =
    compatibleBodies.length === 1 &&
    !compatibleBodies[0].representsAllBodies &&
    (data?.item?.name || "").includes(
      data?.item?.canonicalAppearance?.body?.canonicalAppearance?.species?.name
    );
  const couldProbablyModelMoreData = !isProbablySpeciesSpecific;

  // TODO: Does this double-trigger the HTTP request with SpeciesColorPicker?
  const {
    loading: loadingValids,
    error: errorValids,
    valids,
  } = useAllValidPetPoses();

  const [hasAnimations, setHasAnimations] = React.useState(false);
  const [isPaused, setIsPaused] = useLocalStorage("DTIOutfitIsPaused", true);

  // This is like <OutfitPreview />, but we can use the appearance data, too!
  const { appearance, preview } = useOutfitPreview({
    speciesId: petState.speciesId,
    colorId: petState.colorId,
    pose: petState.pose,
    appearanceId: petState.appearanceId,
    wornItemIds: [itemId],
    isLoading: loadingGQL || loadingValids,
    spinnerVariant: "corner",
    engine: "canvas",
    onChangeHasAnimations: setHasAnimations,
  });

  // If there's an appearance loaded for this item, but it's empty, then the
  // item is incompatible. (There should only be one item appearance: this one!)
  const itemAppearance = appearance?.itemAppearances?.[0];
  const itemLayers = itemAppearance?.layers || [];
  const isCompatible = itemLayers.length > 0;
  const usesHTML5 = itemLayers.every(layerUsesHTML5);

  const borderColor = useColorModeValue("green.700", "green.400");
  const errorColor = useColorModeValue("red.600", "red.400");

  const error = errorGQL || errorValids;
  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  return (
    <Grid
      templateAreas={{
        base: `
          "preview"
          "speciesColorPicker"
          "speciesFacesPicker"
          "zones"
        `,
        md: `
          "preview             speciesFacesPicker"
          "speciesColorPicker  zones"
        `,
      }}
      templateRows={{
        // HACK: Really I wanted 400px to match the natural height of the
        //       preview in md, but in Chromium that creates a scrollbar and
        //       401px doesn't, not sure exactly why?
        base: "auto auto 200px auto",
        md: "401px auto",
      }}
      templateColumns={{
        base: "minmax(min-content, 400px)",
        md: "minmax(min-content, 400px) fit-content(480px)",
      }}
      rowGap="4"
      columnGap="6"
      justifyContent="center"
    >
      <AspectRatio
        gridArea="preview"
        maxWidth="400px"
        maxHeight="400px"
        ratio="1"
        border="1px"
        borderColor={borderColor}
        transition="border-color 0.2s"
        borderRadius="lg"
        boxShadow="lg"
        overflow="hidden"
      >
        <Box>
          {petState.isValid && preview}
          <CustomizeMoreButton
            speciesId={petState.speciesId}
            colorId={petState.colorId}
            pose={petState.pose}
            itemId={itemId}
            isDisabled={!petState.isValid}
          />
          {hasAnimations && (
            <PlayPauseButton
              isPaused={isPaused}
              onClick={() => setIsPaused(!isPaused)}
            />
          )}
        </Box>
      </AspectRatio>
      <Flex gridArea="speciesColorPicker" alignSelf="start" align="center">
        <Box
          // This box grows at the same rate as the box on the right, so the
          // middle box will be centered, if there's space!
          flex="1 0 0"
        />
        <SpeciesColorPicker
          speciesId={petState.speciesId}
          colorId={petState.colorId}
          pose={petState.pose}
          idealPose={idealPose}
          onChange={(species, color, isValid, closestPose) => {
            setPetStateFromUserAction({
              speciesId: species.id,
              colorId: color.id,
              pose: closestPose,
              isValid,
              appearanceId: null,
            });
          }}
          speciesIsDisabled={isProbablySpeciesSpecific}
          size="sm"
          showPlaceholders
        />
        <Box flex="1 0 0" lineHeight="1" paddingLeft="1">
          {
            // Wait for us to start _requesting_ the appearance, and _then_
            // for it to load, and _then_ check compatibility.
            !loadingGQL &&
              !appearance.loading &&
              petState.isValid &&
              !isCompatible && (
                <Tooltip
                  label={
                    couldProbablyModelMoreData
                      ? "Item needs models"
                      : "Not compatible"
                  }
                  placement="top"
                >
                  <WarningIcon
                    color={errorColor}
                    transition="color 0.2"
                    marginLeft="2"
                    borderRadius="full"
                    tabIndex="0"
                    _focus={{ outline: "none", boxShadow: "outline" }}
                  />
                </Tooltip>
              )
          }
        </Box>
      </Flex>
      <Box
        gridArea="speciesFacesPicker"
        paddingTop="2"
        overflow="auto"
        padding="8px"
      >
        <SpeciesFacesPicker
          selectedSpeciesId={petState.speciesId}
          selectedColorId={petState.colorId}
          compatibleBodies={compatibleBodies}
          couldProbablyModelMoreData={couldProbablyModelMoreData}
          onChange={({ speciesId, colorId }) => {
            const validPoses = getValidPoses(valids, speciesId, colorId);
            const pose = getClosestPose(validPoses, idealPose);
            setPetStateFromUserAction({
              speciesId,
              colorId,
              pose,
              isValid: true,
              appearanceId: null,
            });
          }}
          isLoading={loadingGQL || loadingValids}
        />
      </Box>
      <Flex gridArea="zones" justifySelf="center" align="center">
        {compatibleBodiesAndTheirZones.length > 0 && (
          <ItemZonesInfo
            compatibleBodiesAndTheirZones={compatibleBodiesAndTheirZones}
            restrictedZones={data?.item?.restrictedZones || []}
          />
        )}
        <Box width="6" />
        <Flex
          // Avoid layout shift while loading
          minWidth="54px"
        >
          <HTML5Badge
            usesHTML5={usesHTML5}
            // If we're not compatible, act the same as if we're loading:
            // don't change the badge, but don't show one yet if we don't
            // have one yet.
            isLoading={appearance.loading || !isCompatible}
          />
        </Flex>
      </Flex>
    </Grid>
  );
}

function CustomizeMoreButton({ speciesId, colorId, pose, itemId, isDisabled }) {
  const url =
    `/outfits/new?species=${speciesId}&color=${colorId}&pose=${pose}&` +
    `objects[]=${itemId}`;

  // The default background is good in light mode, but in dark mode it's a
  // very subtle transparent white... make it a semi-transparent black, for
  // better contrast against light-colored background items!
  const backgroundColor = useColorModeValue(undefined, "blackAlpha.700");
  const backgroundColorHover = useColorModeValue(undefined, "blackAlpha.900");

  return (
    <Button
      as={isDisabled ? "button" : Link}
      to={isDisabled ? null : url}
      role="group"
      position="absolute"
      top="2"
      right="2"
      size="sm"
      background={backgroundColor}
      _hover={{ backgroundColor: backgroundColorHover }}
      _focus={{ backgroundColor: backgroundColorHover, boxShadow: "outline" }}
      boxShadow="sm"
      isDisabled={isDisabled}
    >
      <ExpandOnGroupHover paddingRight="2">Customize more</ExpandOnGroupHover>
      <EditIcon />
    </Button>
  );
}

/**
 * ExpandOnGroupHover starts at width=0, and expands to full width when a
 * parent with role="group" gains hover or focus state.
 */
function ExpandOnGroupHover({ children, ...props }) {
  const [measuredWidth, setMeasuredWidth] = React.useState(null);
  const measurerRef = React.useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  React.useLayoutEffect(() => {
    if (!measurerRef) {
      // I don't think this is possible, but I'd like to know if it happens!
      logAndCapture(
        new Error(
          `Measurer node not ready during effect. Transition won't be smooth.`
        )
      );
      return;
    }

    if (measuredWidth != null) {
      // Skip re-measuring when we already have a measured width. This is
      // mainly defensive, to prevent the possibility of loops, even though
      // this algorithm should be stable!
      return;
    }

    const newMeasuredWidth = measurerRef.current.offsetWidth;
    setMeasuredWidth(newMeasuredWidth);
  }, [measuredWidth]);

  return (
    <Flex
      // In block layout, the overflowing children would _also_ be constrained
      // to width 0. But in flex layout, overflowing children _keep_ their
      // natural size, so we can measure it even when not visible.
      width="0"
      overflow="hidden"
      // Right-align the children, to keep the text feeling right-aligned when
      // we expand. (To support left-side expansion, make this a prop!)
      justify="flex-end"
      // If the width somehow isn't measured yet, expand to width `auto`, which
      // won't transition smoothly but at least will work!
      _groupHover={{ width: measuredWidth ? measuredWidth + "px" : "auto" }}
      _groupFocus={{ width: measuredWidth ? measuredWidth + "px" : "auto" }}
      transition={!prefersReducedMotion && "width 0.2s"}
    >
      <Box ref={measurerRef} {...props}>
        {children}
      </Box>
    </Flex>
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
  selectedColorId,
  compatibleBodies,
  couldProbablyModelMoreData,
  onChange,
  isLoading,
}) {
  // For basic colors (Blue, Green, Red, Yellow), we just use the hardcoded
  // data, which is part of the bundle and loads super-fast. For other colors,
  // we load in all the faces of that color, falling back to basic colors when
  // absent!
  //
  // TODO: Could we move this into our `build-cached-data` script, and just do
  //       the query all the time, and have Apollo happen to satisfy it fast?
  //       The semantics of returning our colorful random set could be weird…
  const selectedColorIsBasic = colorIsBasic(selectedColorId);
  const { loading: loadingGQL, error, data } = useQuery(
    gql`
      query SpeciesFacesPicker($selectedColorId: ID!) {
        color(id: $selectedColorId) {
          id
          appliedToAllCompatibleSpecies {
            id
            neopetsImageHash
            species {
              id
            }
            body {
              id
            }
          }
        }
      }
    `,
    {
      variables: { selectedColorId },
      skip: selectedColorId == null || selectedColorIsBasic,
      onError: (e) => console.error(e),
    }
  );

  const allBodiesAreCompatible = compatibleBodies.some(
    (body) => body.representsAllBodies
  );
  const compatibleBodyIds = compatibleBodies.map((body) => body.id);

  const speciesFacesFromData = data?.color?.appliedToAllCompatibleSpecies || [];

  const allSpeciesFaces = DEFAULT_SPECIES_FACES.map((defaultSpeciesFace) => {
    const providedSpeciesFace = speciesFacesFromData.find(
      (f) => f.species.id === defaultSpeciesFace.speciesId
    );
    if (providedSpeciesFace) {
      return {
        ...defaultSpeciesFace,
        colorId: selectedColorId,
        bodyId: providedSpeciesFace.body.id,
        // If this species/color pair exists, but without an image hash, then
        // we want to provide a face so that it's enabled, but use the fallback
        // image even though it's wrong, so that it looks like _something_.
        neopetsImageHash:
          providedSpeciesFace.neopetsImageHash ||
          defaultSpeciesFace.neopetsImageHash,
      };
    } else {
      return defaultSpeciesFace;
    }
  });

  return (
    <Box>
      <Wrap spacing="0" justify="center">
        {allSpeciesFaces.map((speciesFace) => (
          <WrapItem key={speciesFace.speciesId}>
            <SpeciesFaceOption
              speciesId={speciesFace.speciesId}
              speciesName={speciesFace.speciesName}
              colorId={speciesFace.colorId}
              neopetsImageHash={speciesFace.neopetsImageHash}
              isSelected={speciesFace.speciesId === selectedSpeciesId}
              // If the face color doesn't match the current color, this is a
              // fallback face for an invalid species/color pair.
              isValid={
                speciesFace.colorId === selectedColorId || selectedColorIsBasic
              }
              bodyIsCompatible={
                allBodiesAreCompatible ||
                compatibleBodyIds.includes(speciesFace.bodyId)
              }
              couldProbablyModelMoreData={couldProbablyModelMoreData}
              onChange={onChange}
              isLoading={isLoading || loadingGQL}
            />
          </WrapItem>
        ))}
      </Wrap>
      {error && (
        <Flex
          color="yellow.500"
          fontSize="xs"
          marginTop="1"
          textAlign="center"
          width="100%"
          align="flex-start"
          justify="center"
        >
          <WarningTwoIcon marginTop="0.4em" marginRight="1" />
          <Box>
            Error loading this color's pet photos.
            <br />
            Check your connection and try again.
          </Box>
        </Flex>
      )}
    </Box>
  );
}

function SpeciesFaceOption({
  speciesId,
  speciesName,
  colorId,
  neopetsImageHash,
  isSelected,
  bodyIsCompatible,
  isValid,
  couldProbablyModelMoreData,
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

  const [labelIsHovered, setLabelIsHovered] = React.useState(false);
  const [inputIsFocused, setInputIsFocused] = React.useState(false);

  const isDisabled = isLoading || !isValid || !bodyIsCompatible;
  const isHappy = isLoading || (isValid && bodyIsCompatible);
  const emotionId = isHappy ? "1" : "2";
  const cursor = isLoading ? "wait" : isDisabled ? "not-allowed" : "pointer";

  let disabledExplanation = null;
  if (isLoading) {
    // If we're still loading, don't try to explain anything yet!
  } else if (!isValid) {
    disabledExplanation = "(Can't be this color)";
  } else if (!bodyIsCompatible) {
    disabledExplanation = couldProbablyModelMoreData
      ? "(Item needs models)"
      : "(Not compatible)";
  }

  const tooltipLabel = (
    <div style={{ textAlign: "center" }}>
      {speciesName}
      {disabledExplanation && (
        <div style={{ fontStyle: "italic", fontSize: "0.75em" }}>
          {disabledExplanation}
        </div>
      )}
    </div>
  );

  // NOTE: Because we render quite a few of these, avoiding using Chakra
  //       elements like Box helps with render performance!
  return (
    <ClassNames>
      {({ css }) => (
        <DeferredTooltip
          label={tooltipLabel}
          placement="top"
          gutter={-10}
          // We track hover and focus state manually for the tooltip, so that
          // keyboard nav to switch between options causes the tooltip to
          // follow. (By default, the tooltip appears on the first tab focus,
          // but not when you _change_ options!)
          isOpen={labelIsHovered || inputIsFocused}
        >
          <label
            style={{ cursor }}
            onMouseEnter={() => setLabelIsHovered(true)}
            onMouseLeave={() => setLabelIsHovered(false)}
          >
            <input
              type="radio"
              aria-label={speciesName}
              name="species-faces-picker"
              value={speciesId}
              checked={isSelected}
              // It's possible to get this selected via the SpeciesColorPicker,
              // even if this would normally be disabled. If so, make this
              // option enabled, so keyboard users can focus and change it.
              disabled={isDisabled && !isSelected}
              onChange={() => onChange({ speciesId, colorId })}
              onFocus={() => setInputIsFocused(true)}
              onBlur={() => setInputIsFocused(false)}
              className={css`
                /* Copied from Chakra's <VisuallyHidden /> */
                border: 0px;
                clip: rect(0px, 0px, 0px, 0px);
                height: 1px;
                width: 1px;
                margin: -1px;
                padding: 0px;
                overflow: hidden;
                white-space: nowrap;
                position: absolute;
              `}
            />
            <div
              className={css`
                overflow: hidden;
                transition: all 0.2s;
                position: relative;

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
              <CrossFadeImage
                src={`https://pets.neopets-asset-proxy.openneo.net/cp/${neopetsImageHash}/${emotionId}/1.png`}
                srcSet={
                  `https://pets.neopets-asset-proxy.openneo.net/cp/${neopetsImageHash}/${emotionId}/1.png 1x, ` +
                  `https://pets.neopets-asset-proxy.openneo.net/cp/${neopetsImageHash}/${emotionId}/6.png 2x`
                }
                alt={speciesName}
                width={55}
                height={55}
                data-is-loading={isLoading}
                data-is-disabled={isDisabled}
                className={css`
                  filter: saturate(90%);
                  opacity: 0.9;
                  transition: all 0.2s;

                  &[data-is-disabled="true"] {
                    filter: saturate(0%);
                    opacity: 0.6;
                  }

                  &[data-is-loading="true"] {
                    animation: 0.8s linear 0s infinite alternate none running
                      pulse;
                  }

                  input:checked + * &[data-body-is-disabled="false"] {
                    opacity: 1;
                    filter: saturate(110%);
                  }

                  input:checked + * &[data-body-is-disabled="true"] {
                    opacity: 0.85;
                  }

                  @keyframes pulse {
                    from {
                      opacity: 0.5;
                    }
                    to {
                      opacity: 1;
                    }
                  }

                  /* Alt text for when the image fails to load! We hide it
                     * while still loading though! */
                  font-size: 0.75rem;
                  text-align: center;
                  &:-moz-loading {
                    visibility: hidden;
                  }
                  &:-moz-broken {
                    padding: 0.5rem;
                  }
                `}
              />
            </div>
          </label>
        </DeferredTooltip>
      )}
    </ClassNames>
  );
}

function ItemZonesInfo({ compatibleBodiesAndTheirZones, restrictedZones }) {
  // Reorganize the body-and-zones data, into zone-and-bodies data. Also, we're
  // merging zones with the same label, because that's how user-facing zone UI
  // generally works!
  const zoneLabelsAndTheirBodiesMap = {};
  for (const { body, zones } of compatibleBodiesAndTheirZones) {
    for (const zone of zones) {
      if (!zoneLabelsAndTheirBodiesMap[zone.label]) {
        zoneLabelsAndTheirBodiesMap[zone.label] = {
          zoneLabel: zone.label,
          bodies: [],
        };
      }
      zoneLabelsAndTheirBodiesMap[zone.label].bodies.push(body);
    }
  }
  const zoneLabelsAndTheirBodies = Object.values(zoneLabelsAndTheirBodiesMap);

  const sortedZonesAndTheirBodies = [...zoneLabelsAndTheirBodies].sort((a, b) =>
    buildSortKeyForZoneLabelsAndTheirBodies(a).localeCompare(
      buildSortKeyForZoneLabelsAndTheirBodies(b)
    )
  );

  const restrictedZoneLabels = [
    ...new Set(restrictedZones.map((z) => z.label)),
  ].sort();

  // We only show body info if there's more than one group of bodies to talk
  // about. If they all have the same zones, it's clear from context that any
  // preview available in the list has the zones listed here.
  const bodyGroups = new Set(
    zoneLabelsAndTheirBodies.map(({ bodies }) =>
      bodies.map((b) => b.id).join(",")
    )
  );
  const showBodyInfo = bodyGroups.size > 1;

  return (
    <Flex
      fontSize="sm"
      textAlign="center"
      // If the text gets too long, wrap Restricts onto another line, and center
      // them relative to each other.
      wrap="wrap"
      justify="center"
      data-test-id="item-zones-info"
    >
      <Box flex="0 0 auto" maxWidth="100%">
        <Box as="header" fontWeight="bold" display="inline">
          Occupies:
        </Box>{" "}
        <Box as="ul" listStyleType="none" display="inline">
          {sortedZonesAndTheirBodies.map(({ zoneLabel, bodies }) => (
            <Box
              key={zoneLabel}
              as="li"
              display="inline"
              _notLast={{ _after: { content: '", "' } }}
            >
              <Box
                as="span"
                // Don't wrap any of the list item content. But, by putting
                // this in an extra container element, we _do_ allow wrapping
                // _between_ list items.
                whiteSpace="nowrap"
              >
                <ItemZonesInfoListItem
                  zoneLabel={zoneLabel}
                  bodies={bodies}
                  showBodyInfo={showBodyInfo}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Box width="4" flex="0 0 auto" />
      <Box flex="0 0 auto" maxWidth="100%">
        <Box as="header" fontWeight="bold" display="inline">
          Restricts:
        </Box>{" "}
        {restrictedZoneLabels.length > 0 ? (
          <Box as="ul" listStyleType="none" display="inline">
            {restrictedZoneLabels.map((zoneLabel) => (
              <Box
                key={zoneLabel}
                as="li"
                display="inline"
                _notLast={{ _after: { content: '", "' } }}
              >
                <Box
                  as="span"
                  // Don't wrap any of the list item content. But, by putting
                  // this in an extra container element, we _do_ allow wrapping
                  // _between_ list items.
                  whiteSpace="nowrap"
                >
                  {zoneLabel}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box as="span" fontStyle="italic" opacity="0.8">
            N/A
          </Box>
        )}
      </Box>
    </Flex>
  );
}

function ItemZonesInfoListItem({ zoneLabel, bodies, showBodyInfo }) {
  let content = zoneLabel;

  if (showBodyInfo) {
    if (bodies.some((b) => b.representsAllBodies)) {
      content = <>{content} (all species)</>;
    } else {
      // TODO: This is a bit reductive, if it's different for like special
      //       colors, e.g. Blue Acara vs Mutant Acara, this will just show
      //       "Acara" in either case! (We are at least gonna be defensive here
      //       and remove duplicates, though, in case both the Blue Acara and
      //       Mutant Acara body end up in the same list.)
      const speciesNames = new Set(bodies.map((b) => b.species.name));
      const speciesListString = [...speciesNames].sort().join(", ");

      content = (
        <>
          {content}{" "}
          <Tooltip
            label={speciesListString}
            textAlign="center"
            placement="bottom"
          >
            <Box
              as="span"
              tabIndex="0"
              _focus={{ outline: "none", boxShadow: "outline" }}
              fontStyle="italic"
              textDecoration="underline"
              style={{ textDecorationStyle: "dotted" }}
              opacity="0.8"
            >
              {/* Show the speciesNames count, even though it's less info,
               * because it's more important that the tooltip content matches
               * the count we show! */}
              ({speciesNames.size} species)
            </Box>
          </Tooltip>
        </>
      );
    }
  }

  return content;
}

function buildSortKeyForZoneLabelsAndTheirBodies({ zoneLabel, bodies }) {
  // Sort by "represents all bodies", then by body count descending, then
  // alphabetically.
  const representsAllBodies = bodies.some((body) => body.representsAllBodies);

  // To sort by body count _descending_, we subtract it from a large number.
  // Then, to make it work in string comparison, we pad it with leading zeroes.
  // Hacky but solid!
  const inverseBodyCount = (9999 - bodies.length).toString().padStart(4, "0");

  return `${representsAllBodies ? "A" : "Z"}-${inverseBodyCount}-${zoneLabel}`;
}

/**
 * CrossFadeImage is like <img>, but listens for successful load events, and
 * fades from the previous image to the new image once it loads.
 *
 * We treat `src` as a unique key representing the image's identity, but we
 * also carry along the rest of the props during the fade, like `srcSet` and
 * `className`.
 */
function CrossFadeImage(incomingImageProps) {
  const [prevImageProps, setPrevImageProps] = React.useState(null);
  const [currentImageProps, setCurrentImageProps] = React.useState(null);

  const incomingImageIsCurrentImage =
    incomingImageProps.src === currentImageProps?.src;

  const onLoadNextImage = () => {
    setPrevImageProps(currentImageProps);
    setCurrentImageProps(incomingImageProps);
  };

  // The main trick to this component is using React's `key` feature! When
  // diffing the rendered tree, if React sees two nodes with the same `key`, it
  // treats them as the same node and makes the prop changes to match.
  //
  // We usually use this in `.map`, to make sure that adds/removes in a list
  // don't cause our children to shift around and swap their React state or DOM
  // nodes with each other.
  //
  // But here, we use `key` to get React to transition the same <img> DOM node
  // between 3 different states!
  //
  // The image starts its life as the last in the list, from
  // `incomingImageProps`: it's invisible, and still loading. We use its `src`
  // as the `key`.
  //
  // When it loads, we update the state so that this `key` now belongs to the
  // _second_ node, from `currentImageProps`. React will see this and make the
  // correct transition for us: it sets opacity to 0, sets z-index to 2,
  // removes aria-hidden, and removes the `onLoad` handler.
  //
  // Then, when another image is ready to show, we update the state so that
  // this key now belongs to the _first_ node, from `prevImageProps` (and the
  // second node is showing something new). React sees this, and makes the
  // transition back to invisibility, but without the `onLoad` handler this
  // time! (And transitions the current image into view, like it did for this
  // one.)
  //
  // Finally, when yet _another_ image is ready to show, we stop rendering any
  // images with this key anymore, and so React unmounts the image entirely.
  //
  // Thanks, React, for handling our multiple overlapping transitions through
  // this little state machine! This could have been a LOT harder to write,
  // whew!

  return (
    <ClassNames>
      {({ css }) => (
        <div
          className={css`
            display: grid;
            grid-template-areas: "shared-overlapping-area";
            isolation: isolate; /* Avoid z-index conflicts with parent! */

            > div {
              grid-area: shared-overlapping-area;
              transition: opacity 0.2s;
            }
          `}
        >
          {prevImageProps && (
            <div
              key={prevImageProps.src}
              className={css`
                z-index: 3;
                opacity: 0;
              `}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img {...prevImageProps} aria-hidden />
            </div>
          )}

          {currentImageProps && (
            <div
              key={currentImageProps.src}
              className={css`
                z-index: 2;
                opacity: 1;
              `}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img
                {...currentImageProps}
                // If the current image _is_ the incoming image, we'll allow
                // new props to come in and affect it. But if it's a new image
                // incoming, we want to stick to the last props the current
                // image had! (This matters for e.g. `bodyIsCompatible`
                // becoming true in `SpeciesFaceOption` and restoring color,
                // before the new color's image loads in.)
                {...(incomingImageIsCurrentImage ? incomingImageProps : {})}
              />
            </div>
          )}

          {!incomingImageIsCurrentImage && (
            <div
              key={incomingImageProps.src}
              className={css`
                z-index: 1;
                opacity: 0;
              `}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img
                {...incomingImageProps}
                aria-hidden
                onLoad={onLoadNextImage}
              />
            </div>
          )}
        </div>
      )}
    </ClassNames>
  );
}

/**
 * DeferredTooltip is like Chakra's <Tooltip />, but it waits until `isOpen` is
 * true before mounting it, and unmounts it after closing.
 *
 * This can drastically improve render performance when there are lots of
 * tooltip targets to re-render… but it comes with some limitations, like the
 * extra requirement to control `isOpen`, and some additional DOM structure!
 */
function DeferredTooltip({ children, isOpen, ...props }) {
  const [shouldShowTooltip, setShouldShowToolip] = React.useState(isOpen);

  React.useEffect(() => {
    if (isOpen) {
      setShouldShowToolip(true);
    } else {
      const timeoutId = setTimeout(() => setShouldShowToolip(false), 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  return (
    <ClassNames>
      {({ css }) => (
        <div
          className={css`
            position: relative;
          `}
        >
          {children}
          {shouldShowTooltip && (
            <Tooltip isOpen={isOpen} {...props}>
              <div
                className={css`
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  pointer-events: none;
                `}
              />
            </Tooltip>
          )}
        </div>
      )}
    </ClassNames>
  );
}

function colorIsBasic(colorId) {
  return ["8", "34", "61", "84"].includes(colorId);
}

// HACK: I'm just hardcoding all this, rather than connecting up to the
//       database and adding a loading state. Tbh I'm not sure it's a good idea
//       to load this dynamically until we have SSR to make it come in fast!
//       And it's not so bad if this gets out of sync with the database,
//       because the SpeciesColorPicker will still be usable!
const colors = { BLUE: "8", RED: "61", GREEN: "34", YELLOW: "84" };
const DEFAULT_SPECIES_FACES = [
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

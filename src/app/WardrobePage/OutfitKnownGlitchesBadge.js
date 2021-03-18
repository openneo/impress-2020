import React from "react";
import { Box, VStack } from "@chakra-ui/react";
import { WarningTwoIcon } from "@chakra-ui/icons";
import { FaBug } from "react-icons/fa";
import { GlitchBadgeLayout, layerUsesHTML5 } from "../components/HTML5Badge";
import { petAppearanceFragment } from "../components/useOutfitAppearance";

function OutfitKnownGlitchesBadge({ appearance }) {
  const glitchMessages = [];

  const { petAppearance, items } = appearance;

  // Look for UC/Invisible/etc incompatibilities that we hid, that we should
  // just mark Incompatible someday instead.
  //
  // HACK: Most of this logic is copy-pasted from `useOutfitAppearance`.
  const petOccupiedZoneIds = new Set(
    petAppearance?.layers.map((l) => l.zone.id)
  );
  const petRestrictedZoneIds = new Set(
    petAppearance?.restrictedZones.map((z) => z.id)
  );
  const petOccupiedOrRestrictedZoneIds = new Set([
    ...petOccupiedZoneIds,
    ...petRestrictedZoneIds,
  ]);
  for (const item of items) {
    const itemHasZoneRestrictedByPet = item.appearance.layers.some(
      (layer) =>
        layer.bodyId !== "0" &&
        petOccupiedOrRestrictedZoneIds.has(layer.zone.id)
    );
    if (itemHasZoneRestrictedByPet) {
      glitchMessages.push(
        <Box key={`uc-conflict-for-item-${item.id}`}>
          <i>{item.name}</i> isn't actually compatible with this special pet.
          We're still showing the old behavior, which is to hide the item.
          Fixing this is in our todo list, sorry for the confusing UI!
        </Box>
      );
    }
  }

  // Look for items with the OFFICIAL_SWF_IS_INCORRECT glitch.
  for (const item of items) {
    const itemHasBrokenOnNeopetsDotCom = item.appearance.layers.some((l) =>
      (l.knownGlitches || []).includes("OFFICIAL_SWF_IS_INCORRECT")
    );
    const itemHasBrokenUnconvertedLayers = item.appearance.layers.some(
      (l) =>
        (l.knownGlitches || []).includes("OFFICIAL_SWF_IS_INCORRECT") &&
        !layerUsesHTML5(l)
    );
    if (itemHasBrokenOnNeopetsDotCom) {
      glitchMessages.push(
        <Box key={`official-swf-is-incorrect-for-item-${item.id}`}>
          {itemHasBrokenUnconvertedLayers ? (
            <>
              We're aware of a glitch affecting the art for <i>{item.name}</i>.
              Last time we checked, this glitch affected its appearance on
              Neopets.com, too. Hopefully this will be fixed once it's converted
              to HTML5!
            </>
          ) : (
            <>
              We're aware of a previous glitch affecting the art for{" "}
              <i>{item.name}</i>, but it might have been resolved during HTML5
              conversion. Please use the feedback form on the homepage to let us
              know if it looks right, or still looks wrong! Thank you!
            </>
          )}
        </Box>
      );
    }
  }

  // Look for items with the OFFICIAL_SVG_IS_INCORRECT glitch.
  for (const item of items) {
    const itemHasOfficialSvgIsIncorrect = item.appearance.layers.some((l) =>
      (l.knownGlitches || []).includes("OFFICIAL_SVG_IS_INCORRECT")
    );
    if (itemHasOfficialSvgIsIncorrect) {
      glitchMessages.push(
        <Box key={`official-svg-is-incorrect-for-item-${item.id}`}>
          There's a glitch in the art for <i>{item.name}</i> that prevents us
          from showing the full-scale SVG version of the image. Instead, we're
          showing a PNG, which might look a bit blurry on larger screens.
        </Box>
      );
    }
  }

  // Look for Dyeworks items that aren't converted yet.
  for (const item of items) {
    const itemIsDyeworks = item.name.includes("Dyeworks");
    const itemIsConverted = item.appearance.layers.every(layerUsesHTML5);

    if (itemIsDyeworks && !itemIsConverted) {
      glitchMessages.push(
        <Box key={`unconverted-dyeworks-warning-for-item-${item.id}`}>
          <i>{item.name}</i> isn't converted to HTML5 yet, and our Classic DTI
          code often shows old Dyeworks items in the wrong color. Once it's
          converted, we'll display it correctly!
        </Box>
      );
    }
  }

  // Check whether the pet appearance is marked as Glitched.
  if (petAppearance?.isGlitched) {
    glitchMessages.push(
      // NOTE: This message assumes that the current pet appearance is the
      //       best canonical one, but it's _possible_ to view Glitched
      //       appearances even if we _do_ have a better one saved... but
      //       only the Support UI ever takes you there.
      <Box key={`pet-appearance-is-glitched`}>
        We know that the art for this pet is incorrect, but we still haven't
        seen a <em>correct</em> model for this pose yet. Once someone models the
        correct data, we'll use that instead. For now, you could also try
        switching to another pose, by clicking the emoji face to the right!
      </Box>
    );
  }

  // Check whether the pet has OFFICIAL_SVG_IS_INCORRECT.
  const petLayers = petAppearance?.layers || [];
  for (const layer of petLayers) {
    const layerHasOfficialSvgIsIncorrect = (layer.knownGlitches || []).includes(
      "OFFICIAL_SVG_IS_INCORRECT"
    );
    if (layerHasOfficialSvgIsIncorrect) {
      glitchMessages.push(
        <Box key={`official-svg-is-incorrect-for-pet-layer-${layer.id}`}>
          There's a glitch in the art for this pet's <i>{layer.zone.label}</i>{" "}
          zone that prevents us from showing the full-scale SVG version of the
          image. Instead, we're showing a PNG, which might look a bit blurry on
          larger screens.
        </Box>
      );
    }
  }

  if (glitchMessages.length === 0) {
    return null;
  }

  return (
    <GlitchBadgeLayout
      aria-label="Has known glitches"
      tooltipLabel={
        <Box>
          <Box as="header" fontWeight="bold" fontSize="sm" marginBottom="1">
            Known glitches
          </Box>
          <VStack spacing="1em">{glitchMessages}</VStack>
        </Box>
      }
    >
      <WarningTwoIcon fontSize="xs" marginRight="1" />
      <FaBug />
    </GlitchBadgeLayout>
  );
}

export default OutfitKnownGlitchesBadge;

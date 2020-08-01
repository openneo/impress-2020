import React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { css, cx } from "emotion";
import {
  Box,
  Button,
  Flex,
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
  VisuallyHidden,
  useTheme,
} from "@chakra-ui/core";

import {
  getVisibleLayers,
  petAppearanceFragment,
} from "../components/useOutfitAppearance";
import { OutfitLayers } from "../components/OutfitPreview";

// From https://twemoji.twitter.com/, thank you!
import twemojiSmile from "../../images/twemoji/smile.svg";
import twemojiCry from "../../images/twemoji/cry.svg";
import twemojiSick from "../../images/twemoji/sick.svg";
import twemojiMasc from "../../images/twemoji/masc.svg";
import twemojiFem from "../../images/twemoji/fem.svg";

function PosePicker({
  outfitState,
  dispatchToOutfit,
  onLockFocus,
  onUnlockFocus,
}) {
  const theme = useTheme();
  const checkedInputRef = React.useRef();
  const { loading, error, poseInfos } = usePoses(outfitState);

  if (loading) {
    return null;
  }

  // This is a low-stakes enough control, where enough pairs don't have data
  // anyway, that I think I want to just not draw attention to failures.
  if (error) {
    return null;
  }

  // If there's only one pose anyway, don't bother showing a picker!
  const numAvailablePoses = Object.values(poseInfos).filter(
    (p) => p.isAvailable
  ).length;
  if (numAvailablePoses <= 1) {
    return null;
  }

  const onChange = (e) => {
    dispatchToOutfit({ type: "setPose", pose: e.target.value });
  };

  return (
    <Popover
      placement="bottom-end"
      usePortal
      returnFocusOnClose
      onOpen={onLockFocus}
      onClose={onUnlockFocus}
      initialFocusRef={checkedInputRef}
    >
      {({ isOpen }) => (
        <>
          <PopoverTrigger>
            <Button
              variant="unstyled"
              boxShadow="md"
              d="flex"
              alignItems="center"
              justifyContent="center"
              _focus={{ borderColor: "gray.50" }}
              _hover={{ borderColor: "gray.50" }}
              outline="initial"
              className={cx(
                css`
                  border: 1px solid transparent !important;
                  transition: border-color 0.2s !important;

                  &:focus,
                  &:hover,
                  &.is-open {
                    border-color: ${theme.colors.gray["50"]} !important;
                  }

                  &.is-open {
                    border-width: 2px !important;
                  }
                `,
                isOpen && "is-open"
              )}
            >
              {getEmotion(outfitState.pose) === "HAPPY" && (
                <EmojiImage src={twemojiSmile} alt="Choose a pose" />
              )}
              {getEmotion(outfitState.pose) === "SAD" && (
                <EmojiImage src={twemojiCry} alt="Choose a pose" />
              )}
              {getEmotion(outfitState.pose) === "SICK" && (
                <EmojiImage src={twemojiSick} alt="Choose a pose" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Box p="4">
              <table width="100%">
                <thead>
                  <tr>
                    <th />
                    <Cell as="th">
                      <EmojiImage src={twemojiSmile} alt="Happy" />
                    </Cell>
                    <Cell as="th">
                      <EmojiImage src={twemojiCry} alt="Sad" />
                    </Cell>
                    <Cell as="th">
                      <EmojiImage src={twemojiSick} alt="Sick" />
                    </Cell>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <Cell as="th">
                      <EmojiImage src={twemojiMasc} alt="Masculine" />
                    </Cell>
                    <Cell as="td">
                      <PoseOption
                        poseInfo={poseInfos.happyMasc}
                        onChange={onChange}
                        inputRef={
                          poseInfos.happyMasc.isSelected && checkedInputRef
                        }
                      />
                    </Cell>
                    <Cell as="td">
                      <PoseOption
                        poseInfo={poseInfos.sadMasc}
                        onChange={onChange}
                        inputRef={
                          poseInfos.sadMasc.isSelected && checkedInputRef
                        }
                      />
                    </Cell>
                    <Cell as="td">
                      <PoseOption
                        poseInfo={poseInfos.sickMasc}
                        onChange={onChange}
                        inputRef={
                          poseInfos.sickMasc.isSelected && checkedInputRef
                        }
                      />
                    </Cell>
                  </tr>
                  <tr>
                    <Cell as="th">
                      <EmojiImage src={twemojiFem} alt="Feminine" />
                    </Cell>
                    <Cell as="td">
                      <PoseOption
                        poseInfo={poseInfos.happyFem}
                        onChange={onChange}
                        inputRef={
                          poseInfos.happyFem.isSelected && checkedInputRef
                        }
                      />
                    </Cell>
                    <Cell as="td">
                      <PoseOption
                        poseInfo={poseInfos.sadFem}
                        onChange={onChange}
                        inputRef={
                          poseInfos.sadFem.isSelected && checkedInputRef
                        }
                      />
                    </Cell>
                    <Cell as="td">
                      <PoseOption
                        poseInfo={poseInfos.sickFem}
                        onChange={onChange}
                        inputRef={
                          poseInfos.sickFem.isSelected && checkedInputRef
                        }
                      />
                    </Cell>
                  </tr>
                </tbody>
              </table>
            </Box>
            <PopoverArrow />
          </PopoverContent>
        </>
      )}
    </Popover>
  );
}

function Cell({ children, as }) {
  const Tag = as;
  return (
    <Tag>
      <Flex justify="center" p="1">
        {children}
      </Flex>
    </Tag>
  );
}

const EMOTION_STRINGS = {
  HAPPY: "Happy",
  SAD: "Sad",
  SICK: "Sick",
};

const GENDER_PRESENTATION_STRINGS = {
  MASCULINE: "Masculine",
  FEMININE: "Feminine",
};

function PoseOption({ poseInfo, onChange, inputRef }) {
  const theme = useTheme();
  const genderPresentationStr =
    GENDER_PRESENTATION_STRINGS[poseInfo.genderPresentation];
  const emotionStr = EMOTION_STRINGS[poseInfo.emotion];

  let label = `${emotionStr} and ${genderPresentationStr}`;
  if (!poseInfo.isAvailable) {
    label += ` (not modeled yet)`;
  }

  return (
    <Box
      as="label"
      cursor="pointer"
      onClick={(e) => {
        // HACK: We need the timeout to beat the popover's focus stealing!
        const input = e.currentTarget.querySelector("input");
        setTimeout(() => input.focus(), 0);
      }}
    >
      <VisuallyHidden
        as="input"
        type="radio"
        aria-label={label}
        name="pose"
        value={poseInfo.pose}
        checked={poseInfo.isSelected}
        disabled={!poseInfo.isAvailable}
        onChange={onChange}
        ref={inputRef || null}
      />
      <Box
        aria-hidden
        borderRadius="full"
        boxShadow="md"
        overflow="hidden"
        width="50px"
        height="50px"
        title={
          poseInfo.isAvailable
            ? // A lil debug output, so that we can quickly identify glitched
              // PetStates and manually mark them as glitched!
              window.location.hostname.includes("localhost") &&
              `#${poseInfo.petStateId}`
            : "Not modeled yet"
        }
        position="relative"
        className={css`
          transform: scale(0.8);
          opacity: 0.8;
          transition: all 0.2s;

          input:checked + & {
            transform: scale(1);
            opacity: 1;
          }
        `}
      >
        <Box
          borderRadius="full"
          position="absolute"
          top="0"
          bottom="0"
          left="0"
          right="0"
          zIndex="2"
          className={cx(
            css`
              border: 0px solid ${theme.colors.green["600"]};
              transition: border-width 0.2s;

              &.not-available {
                border-color: ${theme.colors.gray["500"]};
                border-width: 1px;
              }

              input:checked + * & {
                border-width: 1px;
              }

              input:focus + * & {
                border-width: 3px;
              }
            `,
            !poseInfo.isAvailable && "not-available"
          )}
        />
        {poseInfo.isAvailable ? (
          <Box
            width="50px"
            height="50px"
            transform={
              transformsByBodyId[poseInfo.bodyId] || transformsByBodyId.default
            }
          >
            <OutfitLayers visibleLayers={getVisibleLayers(poseInfo, [])} />
          </Box>
        ) : (
          <Flex align="center" justify="center">
            <Box
              fontFamily="Delicious, sans-serif"
              fontSize="3xl"
              fontWeight="900"
              color="gray.600"
            >
              ?
            </Box>
          </Flex>
        )}
      </Box>
    </Box>
  );
}

function EmojiImage({ src, alt }) {
  return <img src={src} alt={alt} width="16px" height="16px" />;
}

function usePoses(outfitState) {
  const { speciesId, colorId } = outfitState;

  const { loading, error, data } = useQuery(
    gql`
      query PosePicker($speciesId: ID!, $colorId: ID!) {
        petAppearances(speciesId: $speciesId, colorId: $colorId) {
          id
          petStateId
          bodyId
          pose
          ...PetAppearanceForOutfitPreview
        }
      }
      ${petAppearanceFragment}
    `,
    { variables: { speciesId, colorId } }
  );

  const petAppearances = data?.petAppearances || [];
  const buildPoseInfo = (pose) => {
    const appearance = petAppearances.find((pa) => pa.pose === pose);
    return {
      ...appearance,
      isAvailable: Boolean(appearance),
      isSelected: outfitState.pose === pose,
    };
  };

  const poseInfos = {
    happyMasc: buildPoseInfo("HAPPY_MASC"),
    sadMasc: buildPoseInfo("SAD_MASC"),
    sickMasc: buildPoseInfo("SICK_MASC"),
    happyFem: buildPoseInfo("HAPPY_FEM"),
    sadFem: buildPoseInfo("SAD_FEM"),
    sickFem: buildPoseInfo("SICK_FEM"),
  };

  return { loading, error, poseInfos };
}

function getEmotion(pose) {
  if (["HAPPY_MASC", "HAPPY_FEM"].includes(pose)) {
    return "HAPPY";
  } else if (["SAD_MASC", "SAD_FEM"].includes(pose)) {
    return "SAD";
  } else if (["SICK_MASC", "SICK_FEM"].includes(pose)) {
    return "SICK";
  } else if (["UNCONVERTED", "UNKNOWN"].includes(pose)) {
    return null;
  } else {
    throw new Error(`unrecognized pose ${JSON.stringify(pose)}`);
  }
}

const transformsByBodyId = {
  "93": "translate(-5px, 10px) scale(2.8)",
  "106": "translate(-8px, 8px) scale(2.9)",
  "47": "translate(-1px, 17px) scale(3)",
  "84": "translate(-21px, 22px) scale(3.2)",
  "146": "translate(2px, 15px) scale(3.3)",
  "250": "translate(-14px, 28px) scale(3.4)",
  "212": "translate(-4px, 8px) scale(2.9)",
  "74": "translate(-26px, 30px) scale(3.0)",
  "94": "translate(-4px, 8px) scale(3.1)",
  "132": "translate(-14px, 18px) scale(3.0)",
  "56": "translate(-7px, 24px) scale(2.9)",
  "90": "translate(-16px, 20px) scale(3.5)",
  "136": "translate(-11px, 18px) scale(3.0)",
  "138": "translate(-14px, 26px) scale(3.5)",
  "166": "translate(-13px, 24px) scale(3.1)",
  "119": "translate(-6px, 29px) scale(3.1)",
  "126": "translate(3px, 13px) scale(3.1)",
  "67": "translate(2px, 27px) scale(3.4)",
  "163": "translate(-7px, 16px) scale(3.1)",
  "147": "translate(-2px, 15px) scale(3.0)",
  "80": "translate(-2px, -17px) scale(3.0)",
  "117": "translate(-14px, 16px) scale(3.6)",
  "201": "translate(-16px, 16px) scale(3.2)",
  "51": "translate(-2px, 6px) scale(3.2)",
  "208": "translate(-3px, 6px) scale(3.7)",
  "196": "translate(-7px, 19px) scale(5.2)",
  "143": "translate(-16px, 20px) scale(3.5)",
  "150": "translate(-3px, 24px) scale(3.2)",
  "175": "translate(-9px, 15px) scale(3.4)",
  "173": "translate(3px, 57px) scale(4.4)",
  "199": "translate(-28px, 35px) scale(3.8)",
  "52": "translate(-8px, 33px) scale(3.5)",
  "109": "translate(-8px, -6px) scale(3.2)",
  "134": "translate(-14px, 14px) scale(3.1)",
  "95": "translate(-12px, 0px) scale(3.4)",
  "96": "translate(6px, 23px) scale(3.3)",
  "154": "translate(-20px, 25px) scale(3.6)",
  "55": "translate(-16px, 28px) scale(4.0)",
  "76": "translate(-8px, 11px) scale(3.0)",
  "156": "translate(2px, 12px) scale(3.5)",
  "78": "translate(-3px, 18px) scale(3.0)",
  "191": "translate(-18px, 46px) scale(4.4)",
  "187": "translate(-6px, 22px) scale(3.2)",
  "46": "translate(-2px, 19px) scale(3.4)",
  "178": "translate(-11px, 32px) scale(3.3)",
  "100": "translate(-13px, 23px) scale(3.3)",
  "130": "translate(-14px, 4px) scale(3.1)",
  "188": "translate(-9px, 24px) scale(3.5)",
  "257": "translate(-14px, 25px) scale(3.4)",
  "206": "translate(-7px, 4px) scale(3.6)",
  "101": "translate(-13px, 16px) scale(3.2)",
  "68": "translate(-2px, 13px) scale(3.2)",
  "182": "translate(-6px, 4px) scale(3.1)",
  "180": "translate(-15px, 22px) scale(3.6)",
  "306": "translate(1px, 14px) scale(3.1)",
  default: "scale(2.5)",
};

export default PosePicker;

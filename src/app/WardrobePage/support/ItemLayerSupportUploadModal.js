import * as React from "react";
import gql from "graphql-tag";
import { useApolloClient } from "@apollo/client";
import {
  Button,
  Box,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
} from "@chakra-ui/core";
import { ExternalLinkIcon } from "@chakra-ui/icons";

import useSupportSecret from "./useSupportSecret";

/**
 * ItemLayerSupportUploadModal helps Support users create and upload PNGs for
 * broken appearance layers. Useful when the auto-converters are struggling,
 * e.g. the SWF uses a color filter our server-side Flash player can't support!
 */
function ItemLayerSupportUploadModal({ item, itemLayer, isOpen, onClose }) {
  const [step, setStep] = React.useState(1);
  const [imageOnBlackUrl, setImageOnBlackUrl] = React.useState(null);
  const [imageOnWhiteUrl, setImageOnWhiteUrl] = React.useState(null);

  const [imageWithAlphaUrl, setImageWithAlphaUrl] = React.useState(null);
  const [imageWithAlphaBlob, setImageWithAlphaBlob] = React.useState(null);
  const [numWarnings, setNumWarnings] = React.useState(null);

  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState(null);

  const supportSecret = useSupportSecret();
  const toast = useToast();
  const apolloClient = useApolloClient();

  // Once both images are ready, merge them!
  React.useEffect(() => {
    if (!imageOnBlackUrl || !imageOnWhiteUrl) {
      return;
    }

    setImageWithAlphaUrl(null);
    setNumWarnings(null);
    setIsUploading(false);

    mergeIntoImageWithAlpha(imageOnBlackUrl, imageOnWhiteUrl).then(
      ([url, blob, numWarnings]) => {
        setImageWithAlphaUrl(url);
        setImageWithAlphaBlob(blob);
        setNumWarnings(numWarnings);
      }
    );
  }, [imageOnBlackUrl, imageOnWhiteUrl]);

  const onUpload = React.useCallback(
    (e) => {
      const file = e.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (re) => {
        switch (step) {
          case 1:
            setImageOnBlackUrl(re.target.result);
            setStep(2);
            return;
          case 2:
            setImageOnWhiteUrl(re.target.result);
            setStep(3);
            return;
          default:
            throw new Error(`unexpected step ${step}`);
        }
      };
      reader.readAsDataURL(file);
    },
    [step]
  );

  const onSubmitFinalImage = React.useCallback(async () => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await fetch(`/api/uploadLayerImage?layerId=${itemLayer.id}`, {
        method: "POST",
        headers: {
          "DTI-Support-Secret": supportSecret,
        },
        body: imageWithAlphaBlob,
      });

      if (!res.ok) {
        setIsUploading(false);
        setUploadError(
          new Error(`Network error: ${res.status} ${res.statusText}`)
        );
        return;
      }

      setIsUploading(false);
      onClose();
      toast({
        status: "success",
        title: "Image successfully uploaded",
        description: "It might take a few seconds to update in the app!",
      });

      // NOTE: I tried to do this as a cache update, but I couldn't ever get
      //       the fragment with size parameters to work :/ (Other fields would
      //       update, but not these!) Ultimately the eviction is the only
      //       reliable method I found :/
      apolloClient.cache.evict({
        id: `AppearanceLayer:${itemLayer.id}`,
        fieldName: "imageUrl",
      });
    } catch (e) {
      setIsUploading(false);
      setUploadError(e);
    }
  }, [imageWithAlphaBlob, supportSecret, itemLayer.id, toast, onClose]);

  return (
    <Modal
      // HACK: The built-in `full` size also sets 100% height, which I don't
      //       want; and the docs suggest it will accept px values, but it
      //       doesn't. But I discovered that invalid size values are treated
      //       as 100% width and auto height, so, okay! ^_^` Probably a bug,
      //       but I intend to use it for now!
      size="full-hack"
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalOverlay>
        <ModalContent color="green.800">
          <ModalHeader textAlign="center">
            Upload PNG for {item.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody
            paddingBottom="2"
            display="flex"
            flexDirection="column"
            alignItems="center"
            textAlign="center"
          >
            {(step === 1 || step === 2) && (
              <ItemLayerSupportScreenshotStep
                itemLayer={itemLayer}
                step={step}
                onUpload={onUpload}
              />
            )}
            {step === 3 && (
              <ItemLayerSupportReviewStep
                imageWithAlphaUrl={imageWithAlphaUrl}
                numWarnings={numWarnings}
              />
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" onClick={() => setStep(1)}>
              Restart
            </Button>
            <Box flex="1 1 0" />
            {uploadError && (
              <Box
                color="red.400"
                fontSize="sm"
                marginRight="2"
                textAlign="right"
              >
                {uploadError.message}
              </Box>
            )}
            <Button onClick={onClose}>Close</Button>
            {step === 3 && (
              <Button
                colorScheme="green"
                marginLeft="2"
                onClick={onSubmitFinalImage}
                isLoading={isUploading}
              >
                Upload
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
}

function ItemLayerSupportScreenshotStep({ itemLayer, step, onUpload }) {
  return (
    <>
      <Box>
        <b>Step {step}:</b> Take a screenshot of exactly the 600&times;600 Flash
        region, then upload it below.
        <br />
        The border will turn green once the entire region is in view.
      </Box>
      <Box
        display="flex"
        alignItems="center"
        maxWidth="600px"
        width="100%"
        marginTop="2"
      >
        <input key={step} type="file" accept="image/png" onChange={onUpload} />
        <Box flex="1 1 0" />
        <Button
          as="a"
          href="https://support.mozilla.org/en-US/kb/firefox-screenshots"
          target="_blank"
          size="xs"
          marginLeft="1"
          colorScheme="gray"
        >
          Firefox help <ExternalLinkIcon marginLeft="1" />
        </Button>
        <Button
          as="a"
          href="https://umaar.com/dev-tips/156-element-screenshot/"
          target="_blank"
          size="xs"
          marginLeft="1"
          colorScheme="gray"
        >
          Chrome help <ExternalLinkIcon marginLeft="1" />
        </Button>
      </Box>
      <ItemLayerSupportFlashPlayer
        swfUrl={itemLayer.swfUrl}
        backgroundColor={step === 1 ? "black" : "white"}
      />
    </>
  );
}

function ItemLayerSupportReviewStep({ imageWithAlphaUrl, numWarnings }) {
  if (imageWithAlphaUrl == null) {
    return <Box>Generating image…</Box>;
  }

  const ratioBad = numWarnings / (600 * 600);
  const ratioGood = 1 - ratioBad;

  return (
    <>
      <Box>
        <b>Step 3:</b> Does this look correct? If so, let's upload it!
      </Box>
      <Box fontSize="sm" color="gray.500">
        ({Math.floor(ratioGood * 10000) / 100}% match,{" "}
        {Math.floor(ratioBad * 10000) / 100}% mismatch.)
      </Box>
      <Box
        // Checkerboard pattern: https://stackoverflow.com/a/35362074/107415
        backgroundImage="linear-gradient(45deg, #c0c0c0 25%, transparent 25%), linear-gradient(-45deg, #c0c0c0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #c0c0c0 75%), linear-gradient(-45deg, transparent 75%, #c0c0c0 75%)"
        backgroundSize="20px 20px"
        backgroundPosition="0 0, 0 10px, 10px -10px, -10px 0px"
        marginTop="2"
      >
        {imageWithAlphaUrl && (
          <img
            src={imageWithAlphaUrl}
            width={600}
            height={600}
            alt="Generated layer PNG, on a checkered background"
          />
        )}
      </Box>
    </>
  );
}

function ItemLayerSupportFlashPlayer({ swfUrl, backgroundColor }) {
  const [isVisible, setIsVisible] = React.useState(null);
  const regionRef = React.useRef(null);

  // We detect whether the entire SWF region is visible, because Flash only
  // bothers to render in visible places. So, screenshotting a SWF container
  // that isn't fully visible will fill the not-visible space with black,
  // instead of the actual SWF content. We change the border color to hint this
  // to the user!
  React.useEffect(() => {
    const region = regionRef.current;
    if (!region) {
      return;
    }

    const scrollParent = region.closest(".chakra-modal__overlay");
    if (!scrollParent) {
      throw new Error(`could not find .chakra-modal__overlay scroll parent`);
    }

    const onMountAndOnScroll = () => {
      const regionBox = region.getBoundingClientRect();
      const scrollParentBox = scrollParent.getBoundingClientRect();
      const isVisible =
        regionBox.left > scrollParentBox.left &&
        regionBox.right < scrollParentBox.right &&
        regionBox.top > scrollParentBox.top &&
        regionBox.bottom < scrollParentBox.bottom;
      setIsVisible(isVisible);
    };

    onMountAndOnScroll();

    scrollParent.addEventListener("scroll", onMountAndOnScroll);

    return () => scrollParent.removeEventListener("scroll", onMountAndOnScroll);
  }, [regionRef.current]);

  let borderColor;
  if (isVisible === null) {
    borderColor = "gray.400";
  } else if (isVisible === false) {
    borderColor = "red.400";
  } else if (isVisible === true) {
    borderColor = "green.400";
  }

  return (
    <Box
      data-hint="No: Don't screenshot this node! Use the one below!"
      borderWidth="3px"
      borderStyle="dashed"
      borderColor={borderColor}
      marginTop="4"
    >
      <Box
        // In Chrome on macOS, I observe that I need to shift the SWF
        // one pixel to the left in order to capture it correctly.
        //
        // So, in Chrome, who are using a DevTools procedure, we add a
        // hint that this is the node to use.
        //
        // In Firefox, the GUI to target the SWF seems to work just
        // fine. So, the margin hack and these hints don't matter!
        data-hint="Yes: Screenshot this node! This is the one!"
        backgroundColor={backgroundColor}
      >
        <Box
          data-hint="No: Don't screenshot this node! Use the one above!"
          width="600px"
          height="600px"
          // In Chrome on macOS, I observe that I need to shift the SWF
          // one pixel to the left in order to capture it correctly.
          //
          // But this disrupts the Firefox capture! So here, we do a cheap
          // browser detection, to shift left only in Chrome.
          marginLeft={navigator.userAgent.includes("Chrome") ? "-1px" : "0"}
          ref={regionRef}
        >
          <object
            type="application/x-shockwave-flash"
            data={`/api/assetProxy?url=${encodeURIComponent(swfUrl)}`}
            width="100%"
            height="100%"
          >
            <param name="wmode" value="transparent" />
          </object>
        </Box>
      </Box>
    </Box>
  );
}

async function mergeIntoImageWithAlpha(imageOnBlackUrl, imageOnWhiteUrl) {
  const [imageOnBlack, imageOnWhite] = await Promise.all([
    readImageDataFromUrl(imageOnBlackUrl),
    readImageDataFromUrl(imageOnWhiteUrl),
  ]);

  const [imageWithAlphaData, numWarnings] = mergeDataIntoImageWithAlpha(
    imageOnBlack,
    imageOnWhite
  );
  const [
    imageWithAlphaUrl,
    imageWithAlphaBlob,
  ] = await writeImageDataToUrlAndBlob(imageWithAlphaData);

  return [imageWithAlphaUrl, imageWithAlphaBlob, numWarnings];
}

function mergeDataIntoImageWithAlpha(imageOnBlack, imageOnWhite) {
  const imageWithAlpha = new ImageData(600, 600);
  let numWarnings = 0;

  for (let x = 0; x < 600; x++) {
    for (let y = 0; y < 600; y++) {
      const pixelIndex = (600 * y + x) << 2;

      const rOnBlack = imageOnBlack.data[pixelIndex];
      const gOnBlack = imageOnBlack.data[pixelIndex + 1];
      const bOnBlack = imageOnBlack.data[pixelIndex + 2];
      const rOnWhite = imageOnWhite.data[pixelIndex];
      const gOnWhite = imageOnWhite.data[pixelIndex + 1];
      const bOnWhite = imageOnWhite.data[pixelIndex + 2];
      if (rOnWhite < rOnBlack || gOnWhite < gOnBlack || bOnWhite < bOnBlack) {
        if (numWarnings < 100) {
          console.warn(
            `[${x}x${y}] color on white should be lighter than color on ` +
              `black, see pixel ${x}x${y}: ` +
              `#${rOnWhite.toString(16)}${bOnWhite.toString(16)}` +
              `${gOnWhite.toString(16)}` +
              ` vs ` +
              `#${rOnBlack.toString(16)}${bOnBlack.toString(16)}` +
              `${gOnWhite.toString(16)}. ` +
              `Falling back to the pixel on black, with alpha = 100%. `
          );
        }
        imageWithAlpha.data[pixelIndex] = rOnBlack;
        imageWithAlpha.data[pixelIndex + 1] = gOnBlack;
        imageWithAlpha.data[pixelIndex + 2] = bOnBlack;
        imageWithAlpha.data[pixelIndex + 3] = 255;
        numWarnings++;
        continue;
      }

      // The true alpha is how close together the on-white and on-black colors
      // are. If they're totally the same, it's 255 opacity. If they're totally
      // different, it's 0 opacity. In between, it scales linearly with the
      // difference!
      const alpha = 255 - (rOnWhite - rOnBlack);

      // Check that the alpha derived from other channels makes sense too.
      const alphaByB = 255 - (bOnWhite - bOnBlack);
      const alphaByG = 255 - (gOnWhite - gOnBlack);
      const highestAlpha = Math.max(Math.max(alpha, alphaByB), alphaByG);
      const lowestAlpha = Math.min(Math.min(alpha, alphaByB, alphaByG));
      if (highestAlpha - lowestAlpha > 2) {
        if (numWarnings < 100) {
          console.warn(
            `[${x}x${y}] derived alpha values don't match: ` +
              `${alpha} vs ${alphaByB} vs ${alphaByG}. ` +
              `Colors: #${rOnWhite.toString(16)}${bOnWhite.toString(16)}` +
              `${gOnWhite.toString(16)}` +
              ` vs ` +
              `#${rOnBlack.toString(16)}${bOnBlack.toString(16)}` +
              `${gOnWhite.toString(16)}. ` +
              `Falling back to the pixel on black, with alpha = 100%. `
          );
        }
        imageWithAlpha.data[pixelIndex] = rOnBlack;
        imageWithAlpha.data[pixelIndex + 1] = gOnBlack;
        imageWithAlpha.data[pixelIndex + 2] = bOnBlack;
        imageWithAlpha.data[pixelIndex + 3] = 255;
        numWarnings++;
        continue;
      }

      // And the true color is the color on black, divided by the true alpha.
      // We can derive this from the definition of the color on black, which is
      // simply the true color times the true alpha. Divide to undo!
      const alphaRatio = alpha / 255;
      const rOnAlpha = Math.round(rOnBlack / alphaRatio);
      const gOnAlpha = Math.round(gOnBlack / alphaRatio);
      const bOnAlpha = Math.round(bOnBlack / alphaRatio);

      imageWithAlpha.data[pixelIndex] = rOnAlpha;
      imageWithAlpha.data[pixelIndex + 1] = gOnAlpha;
      imageWithAlpha.data[pixelIndex + 2] = bOnAlpha;
      imageWithAlpha.data[pixelIndex + 3] = alpha;
    }
  }

  return [imageWithAlpha, numWarnings];
}

/**
 * readImageDataFromUrl reads an image URL to ImageData, by drawing it on a
 * canvas and reading ImageData back from it.
 */
async function readImageDataFromUrl(url) {
  const image = new Image();

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 600;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, 600, 600);
  return ctx.getImageData(0, 0, 600, 600);
}

/**
 * writeImageDataToUrl writes an ImageData to a data URL and Blob, by drawing
 * it on a canvas and reading the URL and Blob back from it.
 */
async function writeImageDataToUrlAndBlob(imageData) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 600;

  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  return [dataUrl, blob];
}

export default ItemLayerSupportUploadModal;

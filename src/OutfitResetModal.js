import React from "react";
import {
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Input,
  Button,
  ModalFooter,
  FormErrorMessage,
  FormControl,
} from "@chakra-ui/core";

function OutfitResetModal({ isOpen, onClose, dispatchToOutfit }) {
  const [petName, setPetName] = React.useState("");

  const onComplete = ({ custom_pet, object_info_registry }) => {
    dispatchToOutfit({
      type: "reset",
      name: custom_pet.name,
      speciesId: custom_pet.species_id,
      colorId: custom_pet.color_id,
      wornItemIds: Object.values(object_info_registry).map(
        (o) => o.obj_info_id
      ),
      closetedItemIds: [],
    });
    onClose();
    setPetName("");
  };
  const { loading, error, loadOutfitData } = useLoadOutfitData(
    petName,
    onComplete
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadOutfitData();
          }}
        >
          <ModalHeader>
            <Text fontFamily="Delicious">
              Want to try your own pet?{" "}
              <span role="img" aria-label="(surprise emoji)">
                😮
              </span>
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>
              Choose a pet from Neopets.com, and we'll pull their outfit data
              into here for you to play with!
            </Text>
            <FormControl isInvalid={error}>
              <Input
                placeholder="Enter a pet's name…"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                autoFocus
              />
              {error && (
                <FormErrorMessage>
                  We had trouble loading that pet, sorry{" "}
                  <span role="img" aria-label="(confounded emoji)">
                    😖
                  </span>
                </FormErrorMessage>
              )}
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button type="submit" variantColor="green" isLoading={loading}>
              Show me!
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

function useLoadOutfitData(petName, onComplete) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const loadOutfitData = async () => {
    setLoading(true);
    setError(null);

    let json;
    try {
      const res = await fetch(
        `http://www.neopets.com/amfphp/json.php/CustomPetService.getViewerData` +
          `/${petName}`
      );
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      json = await res.json();
      if (!json.custom_pet) {
        throw new Error(`missing custom_pet data`);
      }
    } catch (e) {
      setLoading(false);
      setError(e);
      return;
    }

    setLoading(false);
    onComplete(json);
  };

  return { loading, error, loadOutfitData };
}

export default OutfitResetModal;

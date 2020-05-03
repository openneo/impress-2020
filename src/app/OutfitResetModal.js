import React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";
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
  Box,
} from "@chakra-ui/core";

/**
 * OutfitResetModal gives the user the ability to reset their outfit, by either
 * clearing out most of the data, or letting them type in a pet name to load
 * from Neopets.com!
 */
function OutfitResetModal({ isOpen, onClose, dispatchToOutfit }) {
  const [petName, setPetName] = React.useState("");
  const [submittedPetName, submitPetName] = React.useState("");

  const { loading, error } = useQuery(
    gql`
      query($petName: String!) {
        petOnNeopetsDotCom(petName: $petName) {
          color {
            id
          }
          species {
            id
          }
          items {
            id
          }
        }
      }
    `,
    {
      variables: { petName: submittedPetName },
      skip: !submittedPetName,
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        if (!data) return;

        const { species, color, items } = data.petOnNeopetsDotCom;
        dispatchToOutfit({
          type: "reset",
          name: petName,
          speciesId: species.id,
          colorId: color.id,
          emotion: "HAPPY", // TODO: Ask PetService
          genderPresentation: "FEMININE", // TODO: Ask PetService
          wornItemIds: items.map((i) => i.id),
          closetedItemIds: [],
        });
        onClose();
        setPetName("");
        submitPetName("");
      },
    }
  );

  const clearOutfit = () => {
    dispatchToOutfit({
      type: "reset",
      name: "",
      wornItemIds: [],
      closetedItemIds: [],
    });
    onClose();
    setPetName("");
    submitPetName("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitPetName(petName);
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
            <Text>
              Choose a pet from Neopets.com, and we'll pull their outfit data
              into here for you to play with!
            </Text>
            <Box height="4" />
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
            <Button
              leftIcon="delete"
              variant="outline"
              variantColor="red"
              onClick={clearOutfit}
            >
              Reset outfit
            </Button>
            <Box flex="1"></Box>
            <Button type="submit" variantColor="green" isLoading={loading}>
              Show me!
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export default OutfitResetModal;

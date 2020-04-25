import React from "react";
import {
  Box,
  Editable,
  EditablePreview,
  EditableInput,
  Flex,
  IconButton,
  PseudoBox,
  Skeleton,
} from "@chakra-ui/core";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import { Delay, Heading1, Heading2 } from "./util";
import ItemList, { ItemListSkeleton } from "./ItemList";

import "./ItemsPanel.css";

function ItemsPanel({ outfitState, loading, dispatchToOutfit }) {
  const { zonesAndItems } = outfitState;

  return (
    <Box color="green.800">
      <OutfitHeading
        outfitState={outfitState}
        dispatchToOutfit={dispatchToOutfit}
      />
      <Flex direction="column">
        {loading &&
          [1, 2, 3].map((i) => (
            <Box key={i}>
              <Delay>
                <Skeleton height="2.3rem" width="12rem" />
                <ItemListSkeleton count={3} />
              </Delay>
            </Box>
          ))}
        {!loading && (
          <TransitionGroup component={null}>
            {zonesAndItems.map(({ zone, items }) => (
              <CSSTransition
                key={zone.id}
                classNames="items-panel-zone"
                timeout={500}
                onExit={(e) => {
                  e.style.height = e.offsetHeight + "px";
                }}
              >
                <Box mb="10">
                  <Heading2>{zone.label}</Heading2>
                  <ItemList
                    items={items}
                    outfitState={outfitState}
                    dispatchToOutfit={dispatchToOutfit}
                  />
                </Box>
              </CSSTransition>
            ))}
          </TransitionGroup>
        )}
      </Flex>
    </Box>
  );
}

function OutfitHeading({ outfitState, dispatchToOutfit }) {
  return (
    <Box>
      <PseudoBox role="group" d="inline-block" position="relative" width="100%">
        <Heading1 mb="6">
          <Editable
            value={outfitState.name}
            placeholder="Untitled outfit (click to edit)"
            onChange={(value) =>
              dispatchToOutfit({ type: "rename", outfitName: value })
            }
          >
            {({ isEditing, onRequestEdit }) => (
              <>
                <EditablePreview />
                <EditableInput />
                {!isEditing && (
                  <OutfitNameEditButton onRequestEdit={onRequestEdit} />
                )}
              </>
            )}
          </Editable>
        </Heading1>
      </PseudoBox>
    </Box>
  );
}

function OutfitNameEditButton({ onRequestEdit }) {
  return (
    <PseudoBox
      d="inline-block"
      opacity="0"
      transition="opacity 0.5s"
      _groupHover={{ opacity: "1" }}
      onClick={onRequestEdit}
      position="absolute"
    >
      <IconButton
        icon="edit"
        variant="link"
        color="green.600"
        aria-label="Edit outfit name"
        title="Edit outfit name"
      />
    </PseudoBox>
  );
}

export default ItemsPanel;

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
  VisuallyHidden,
} from "@chakra-ui/core";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import { Delay, Heading1, Heading2 } from "./util";
import { ItemListContainer, Item, ItemListSkeleton } from "./ItemList";

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
            <Box key={i} mb="10">
              <Delay>
                <Skeleton height="2.3rem" width="12rem" />
                <ItemListSkeleton count={3} />
              </Delay>
            </Box>
          ))}
        {!loading && (
          <TransitionGroup component={null}>
            {zonesAndItems.map(({ zoneLabel, items }) => (
              <CSSTransition
                key={zoneLabel}
                classNames="items-panel-zone"
                timeout={500}
                onExit={(e) => {
                  e.style.height = e.offsetHeight + "px";
                }}
              >
                <Box mb="10">
                  <Heading2>{zoneLabel}</Heading2>
                  <ItemRadioList
                    name={zoneLabel}
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

function ItemRadioList({ name, items, outfitState, dispatchToOutfit }) {
  const onChange = (e) => {
    const itemId = e.target.value;
    dispatchToOutfit({ type: "wearItem", itemId });
  };

  const onToggle = (e) => {
    // Clicking the radio button when already selected deselects it - this is
    // how you can select none!
    const itemId = e.target.value;
    if (outfitState.wornItemIds.includes(itemId)) {
      // We need the event handler to finish before this, so that simulated
      // events don't just come back around and undo it - but we can't just
      // solve that with `preventDefault`, because it breaks the radio's
      // intended visual updates when we unwear. So, we `setTimeout` to do it
      // after all event handlers resolve!
      setTimeout(() => dispatchToOutfit({ type: "unwearItem", itemId }), 0);
    }
  };

  return (
    <ItemListContainer>
      <TransitionGroup component={null}>
        {items.map((item) => (
          <CSSTransition
            key={item.id}
            classNames="item-list-row"
            timeout={500}
            onExit={(e) => {
              e.style.height = e.offsetHeight + "px";
            }}
          >
            <label>
              <VisuallyHidden
                as="input"
                type="radio"
                name={name}
                value={item.id}
                checked={outfitState.wornItemIds.includes(item.id)}
                onChange={onChange}
                onClick={onToggle}
                onKeyUp={(e) => {
                  if (e.key === " ") {
                    onToggle(e);
                  }
                }}
              />
              <Item
                item={item}
                outfitState={outfitState}
                dispatchToOutfit={dispatchToOutfit}
              />
            </label>
          </CSSTransition>
        ))}
      </TransitionGroup>
    </ItemListContainer>
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

import React from "react";
import { css } from "emotion";
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
import { Item, ItemListContainer, ItemListSkeleton } from "./Item";

function ItemsPanel({ outfitState, loading, dispatchToOutfit }) {
  const { zonesAndItems } = outfitState;

  return (
    <Box color="green.800">
      <Box px="1">
        <OutfitHeading
          outfitState={outfitState}
          dispatchToOutfit={dispatchToOutfit}
        />
      </Box>
      <Flex direction="column">
        {loading &&
          [1, 2, 3].map((i) => (
            <Box key={i} mb="10">
              <Delay>
                <Box px="1">
                  <Skeleton height="2.3rem" width="12rem" />
                </Box>
                <ItemListSkeleton count={3} />
              </Delay>
            </Box>
          ))}
        {!loading && (
          <TransitionGroup component={null}>
            {zonesAndItems.map(({ zoneLabel, items }) => (
              <CSSTransition
                key={zoneLabel}
                classNames={css`
                  &-exit {
                    opacity: 1;
                    height: auto;
                  }

                  &-exit-active {
                    opacity: 0;
                    height: 0 !important;
                    margin-top: 0 !important;
                    margin-bottom: 0 !important;
                    transition: all 0.5s;
                  }
                `}
                timeout={500}
                onExit={(e) => {
                  e.style.height = e.offsetHeight + "px";
                }}
              >
                <Box mb="10">
                  <Box px="1">
                    <Heading2>{zoneLabel}</Heading2>
                  </Box>
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
            classNames={css`
              &-exit {
                opacity: 1;
                height: auto;
              }

              &-exit-active {
                opacity: 0;
                height: 0 !important;
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                transition: all 0.5s;
              }
            `}
            timeout={500}
            onExit={(e) => {
              e.style.height = e.offsetHeight + "px";
            }}
          >
            <label>
              <VisuallyHidden
                as="input"
                type="radio"
                aria-labelledby={`${name}-item-${item.id}-name`}
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
                itemNameId={`${name}-item-${item.id}-name`}
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
              <Flex align="flex-top">
                <EditablePreview />
                <EditableInput />
                {!isEditing && (
                  <OutfitNameEditButton onRequestEdit={onRequestEdit} />
                )}
              </Flex>
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
      opacity="0"
      transition="opacity 0.5s"
      _groupHover={{ opacity: "1" }}
      onClick={onRequestEdit}
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

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

/**
 * ItemsPanel shows the items in the current outfit, and lets the user toggle
 * between them! It also shows an editable outfit name, to help set context.
 *
 * Note that this component provides an effective 1 unit of padding around
 * itself, which is uncommon in this app: we usually prefer to let parents
 * control the spacing!
 *
 * This is because Item has padding, but it's generally not visible; so, to
 * *look* aligned with the other elements like the headings, the headings need
 * to have extra padding. Essentially: while the Items _do_ stretch out the
 * full width of the container, it doesn't look like it!
 */
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
        {loading ? (
          <>
            <ItemZoneGroupSkeleton />
            <ItemZoneGroupSkeleton />
            <ItemZoneGroupSkeleton />
          </>
        ) : (
          <TransitionGroup component={null}>
            {zonesAndItems.map(({ zoneLabel, items }) => (
              <CSSTransition key={zoneLabel} {...fadeOutAndRollUpTransition}>
                <ItemZoneGroup
                  zoneLabel={zoneLabel}
                  items={items}
                  outfitState={outfitState}
                  dispatchToOutfit={dispatchToOutfit}
                />
              </CSSTransition>
            ))}
          </TransitionGroup>
        )}
      </Flex>
    </Box>
  );
}

/**
 * ItemZoneGroup shows the items for a particular zone, and lets the user
 * toggle between them.
 *
 * For each item, it renders a <label> with a visually-hidden radio button and
 * the Item component (which will visually reflect the radio's state). This
 * makes the list screen-reader- and keyboard-accessible!
 */
function ItemZoneGroup({ zoneLabel, items, outfitState, dispatchToOutfit }) {
  // onChange is fired when the radio button becomes checked, not unchecked!
  const onChange = (e) => {
    const itemId = e.target.value;
    dispatchToOutfit({ type: "wearItem", itemId });
  };

  // Clicking the radio button when already selected deselects it - this is how
  // you can select none!
  const onClick = (e) => {
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
    <Box mb="10">
      <Heading2 mx="1">{zoneLabel}</Heading2>
      <ItemListContainer>
        <TransitionGroup component={null}>
          {items.map((item) => (
            <CSSTransition key={item.id} {...fadeOutAndRollUpTransition}>
              <label>
                <VisuallyHidden
                  as="input"
                  type="radio"
                  aria-labelledby={`${zoneLabel}-item-${item.id}-name`}
                  name={zoneLabel}
                  value={item.id}
                  checked={outfitState.wornItemIds.includes(item.id)}
                  onChange={onChange}
                  onClick={onClick}
                  onKeyUp={(e) => {
                    if (e.key === " ") {
                      onClick(e);
                    }
                  }}
                />
                <Item
                  item={item}
                  itemNameId={`${zoneLabel}-item-${item.id}-name`}
                  outfitState={outfitState}
                  dispatchToOutfit={dispatchToOutfit}
                />
              </label>
            </CSSTransition>
          ))}
        </TransitionGroup>
      </ItemListContainer>
    </Box>
  );
}

/**
 * ItemZoneGroupSkeleton is a placeholder for when an ItemZoneGroup is loading.
 */
function ItemZoneGroupSkeleton() {
  return (
    <Box mb="10">
      <Delay>
        <Skeleton mx="1" height="2.3rem" width="12rem" />
        <ItemListSkeleton count={3} />
      </Delay>
    </Box>
  );
}

/**
 * OutfitHeading is an editable outfit name, as a big pretty page heading!
 */
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
                )}
              </Flex>
            )}
          </Editable>
        </Heading1>
      </PseudoBox>
    </Box>
  );
}

/**
 * fadeOutAndRollUpTransition is the props for a CSSTransition, to manage the
 * fade-out and height decrease when an Item or ItemZoneGroup is removed.
 *
 * Note that this _cannot_ be implemented as a wrapper component that returns a
 * CSSTransition. This is because the CSSTransition must be the direct child of
 * the TransitionGroup, and a wrapper breaks the parent-child relationship.
 *
 * See react-transition-group docs for more info!
 */
const fadeOutAndRollUpTransition = {
  classNames: css`
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
  `,
  timeout: 500,
  onExit: (e) => {
    e.style.height = e.offsetHeight + "px";
  },
};

export default ItemsPanel;

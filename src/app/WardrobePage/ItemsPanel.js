import React from "react";
import { css } from "emotion";
import {
  Box,
  Editable,
  EditablePreview,
  EditableInput,
  Flex,
  IconButton,
  Skeleton,
  Tooltip,
  VisuallyHidden,
} from "@chakra-ui/core";
import { EditIcon, QuestionIcon } from "@chakra-ui/icons";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import { Delay, Heading1, Heading2 } from "../util";
import Item, { ItemListContainer, ItemListSkeleton } from "./Item";

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
  const { zonesAndItems, incompatibleItems } = outfitState;

  return (
    <Box>
      <Box px="1">
        <OutfitHeading
          outfitState={outfitState}
          dispatchToOutfit={dispatchToOutfit}
        />
      </Box>
      <Flex direction="column">
        {loading ? (
          <ItemZoneGroupsSkeleton itemCount={outfitState.allItemIds.length} />
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
            {incompatibleItems.length > 0 && (
              <ItemZoneGroup
                zoneLabel="Incompatible"
                afterHeader={
                  <Tooltip
                    label="These items don't fit this pet"
                    placement="top"
                    openDelay={100}
                  >
                    <QuestionIcon fontSize="sm" />
                  </Tooltip>
                }
                items={incompatibleItems}
                outfitState={outfitState}
                dispatchToOutfit={dispatchToOutfit}
                isDisabled
              />
            )}
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
function ItemZoneGroup({
  zoneLabel,
  items,
  outfitState,
  dispatchToOutfit,
  isDisabled = false,
  afterHeader = null,
}) {
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

  const onRemove = React.useCallback(
    (itemId) => {
      dispatchToOutfit({ type: "removeItem", itemId });
    },
    [dispatchToOutfit]
  );

  return (
    <Box mb="10">
      <Heading2 display="flex" alignItems="center" mx="1">
        {zoneLabel}
        {afterHeader && <Box marginLeft="2">{afterHeader}</Box>}
      </Heading2>
      <ItemListContainer>
        <TransitionGroup component={null}>
          {items.map((item) => {
            const itemNameId =
              zoneLabel.replace(/ /g, "-") + `-item-${item.id}-name`;
            const itemNode = (
              <Item
                item={item}
                itemNameId={itemNameId}
                isWorn={
                  !isDisabled && outfitState.wornItemIds.includes(item.id)
                }
                isInOutfit={outfitState.allItemIds.includes(item.id)}
                onRemove={onRemove}
                isDisabled={isDisabled}
              />
            );

            return (
              <CSSTransition key={item.id} {...fadeOutAndRollUpTransition}>
                {isDisabled ? (
                  itemNode
                ) : (
                  <label>
                    <VisuallyHidden
                      as="input"
                      type="radio"
                      aria-labelledby={itemNameId}
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
                    {itemNode}
                  </label>
                )}
              </CSSTransition>
            );
          })}
        </TransitionGroup>
      </ItemListContainer>
    </Box>
  );
}

/**
 * ItemZoneGroupSkeletons is a placeholder for when the items are loading.
 *
 * We try to match the approximate size of the incoming data! This is
 * especially nice for when you start with a fresh pet from the homepage, so
 * we don't show skeleton items that just clear away!
 */
function ItemZoneGroupsSkeleton({ itemCount }) {
  const groups = [];
  for (let i = 0; i < itemCount; i++) {
    // NOTE: I initially wrote this to return groups of 3, which looks good for
    //     outfit shares I think, but looks bad for pet loading... once shares
    //     become a more common use case, it might be useful to figure out how
    //     to differentiate these cases and show 1-per-group for pets, but
    //     maybe more for built outfits?
    groups.push(<ItemZoneGroupSkeleton key={i} itemCount={1} />);
  }
  return groups;
}

/**
 * ItemZoneGroupSkeleton is a placeholder for when an ItemZoneGroup is loading.
 */
function ItemZoneGroupSkeleton({ itemCount }) {
  return (
    <Box mb="10">
      <Delay>
        <Skeleton
          mx="1"
          // 2.25rem font size, 1.25rem line height
          height={`${2.25 * 1.25}rem`}
          width="12rem"
        />
        <ItemListSkeleton count={itemCount} />
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
      <Box role="group" d="inline-block" position="relative" width="100%">
        <Heading1 mb="6">
          <Editable
            value={outfitState.name}
            placeholder="Untitled outfit"
            onChange={(value) =>
              dispatchToOutfit({ type: "rename", outfitName: value })
            }
          >
            {({ isEditing, onEdit }) => (
              <Flex align="flex-top">
                <EditablePreview />
                <EditableInput />
                {!isEditing && (
                  <Box
                    opacity="0"
                    transition="opacity 0.5s"
                    _groupHover={{ opacity: "1" }}
                    onClick={onEdit}
                  >
                    <IconButton
                      icon={<EditIcon />}
                      variant="link"
                      aria-label="Edit outfit name"
                      title="Edit outfit name"
                    />
                  </Box>
                )}
              </Flex>
            )}
          </Editable>
        </Heading1>
      </Box>
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

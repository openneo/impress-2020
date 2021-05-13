import React from "react";
import {
  Skeleton,
  useColorModeValue,
  useTheme,
  useToken,
} from "@chakra-ui/react";
import { ClassNames } from "@emotion/react";
import { Link } from "react-router-dom";

import { safeImageUrl, useCommonStyles } from "../util";

function SquareItemCard({ item, ...props }) {
  const outlineShadowValue = useToken("shadows", "outline");

  return (
    <ClassNames>
      {({ css }) => (
        // SquareItemCard renders in large lists of 1k+ items, so we get a big
        // perf win by using Emotion directly instead of Chakra's styled-system
        // Box.
        <Link
          to={`/items/${item.id}`}
          className={css`
            transition: all 0.2s;
            &:hover,
            &:focus {
              transform: scale(1.05);
            }
            &:focus {
              box-shadow: ${outlineShadowValue};
              outline: none;
            }
          `}
          {...props}
        >
          <SquareItemCardLayout
            name={item.name}
            thumbnailImage={<ItemThumbnail item={item} />}
          />
        </Link>
      )}
    </ClassNames>
  );
}

function SquareItemCardLayout({ name, thumbnailImage, minHeightNumLines = 2 }) {
  const { brightBackground } = useCommonStyles();
  const brightBackgroundValue = useToken("colors", brightBackground);
  const theme = useTheme();

  return (
    // SquareItemCard renders in large lists of 1k+ items, so we get a big perf
    // win by using Emotion directly instead of Chakra's styled-system Box.
    <ClassNames>
      {({ css }) => (
        <div
          className={css`
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            box-shadow: ${theme.shadows.md};
            border-radius: ${theme.radii.md};
            padding: ${theme.space["3"]};
            width: calc(80px + 2em);
            background: ${brightBackgroundValue};
          `}
        >
          {thumbnailImage}
          <div
            className={css`
              margin-top: ${theme.space["1"]};
              font-size: ${theme.fontSizes.sm};
              /* Set min height to match a 2-line item name, so the cards
               * in a row aren't toooo differently sized... */
              min-height: ${minHeightNumLines * 1.5 + "em"};
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
            `}
            // HACK: Emotion turns this into -webkit-display: -webkit-box?
            style={{ display: "-webkit-box" }}
          >
            {name}
          </div>
        </div>
      )}
    </ClassNames>
  );
}

function ItemThumbnail({ item }) {
  const mdRadiusValue = useToken("radii", "md");

  const colorScheme = item.isNc ? "purple" : item.isPb ? "orange" : "gray";

  const badgeBackground = useColorModeValue(
    `${colorScheme}.100`,
    `${colorScheme}.500`
  );
  const badgeColor = useColorModeValue(
    `${colorScheme}.500`,
    `${colorScheme}.100`
  );
  const thumbnailShadowColor = useColorModeValue(
    `${colorScheme}.200`,
    `${colorScheme}.600`
  );

  const [
    badgeBackgroundValue,
    badgeColorValue,
    thumbnailShadowColorValue,
  ] = useToken("colors", [badgeBackground, badgeColor, thumbnailShadowColor]);

  return (
    <ClassNames>
      {({ css }) => (
        <div
          className={css`
            position: relative;
          `}
        >
          <img
            src={safeImageUrl(item.thumbnailUrl)}
            alt={`Thumbnail art for ${item.name}`}
            width={80}
            height={80}
            className={css`
              border-radius: ${mdRadiusValue};
              box-shadow: 0 0 4px ${thumbnailShadowColorValue};

              /* Don't let alt text flash in while loading */
              &:-moz-loading {
                visibility: hidden;
              }
            `}
            loading="lazy"
          />
          {item.isNc != null && (
            <div
              className={css`
                position: absolute;
                bottom: -6px;
                right: -3px;
                /* Copied from Chakra <Badge> */
                display: inline-block;
                white-space: nowrap;
                vertical-align: middle;
                padding-left: 0.25rem;
                padding-right: 0.25rem;
                text-transform: uppercase;
                font-size: 0.65rem;
                border-radius: 0.125rem;
                font-weight: 700;
                background: ${badgeBackgroundValue};
                color: ${badgeColorValue};
              `}
            >
              {item.isNc ? "NC" : item.isPb ? "PB" : "NP"}
            </div>
          )}
        </div>
      )}
    </ClassNames>
  );
}

export function SquareItemCardSkeleton({ minHeightNumLines }) {
  return (
    <SquareItemCardLayout
      name={
        <>
          <Skeleton width="100%" height="1em" marginTop="2" />
          {minHeightNumLines >= 3 && (
            <Skeleton width="100%" height="1em" marginTop="2" />
          )}
        </>
      }
      thumbnailImage={<Skeleton width="80px" height="80px" />}
      minHeightNumLines={minHeightNumLines}
    />
  );
}

export default SquareItemCard;

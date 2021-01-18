import React from "react";
import { Skeleton, useTheme, useToken } from "@chakra-ui/react";
import { ClassNames } from "@emotion/react";
import { Link } from "react-router-dom";

import { safeImageUrl, useCommonStyles } from "../util";

function SquareItemCard({ item, ...props }) {
  const theme = useTheme();

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
              box-shadow: ${theme.shadows.outline};
              outline: none;
            }
          `}
          {...props}
        >
          <SquareItemCardLayout
            name={item.name}
            thumbnailImage={
              <img
                src={safeImageUrl(item.thumbnailUrl)}
                alt={`Thumbnail art for ${item.name}`}
                width={80}
                height={80}
                className={css`
                  border-radius: ${theme.radii.md};

                  /* Don't let alt text flash in while loading */
                  &:-moz-loading {
                    visibility: hidden;
                  }
                `}
                loading="lazy"
              />
            }
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

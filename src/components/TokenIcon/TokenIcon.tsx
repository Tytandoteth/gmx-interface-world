import cx from "classnames";

import { createDebugLogger } from "lib/debug/logger";
import { importImage } from "lib/legacy";
import "./TokenIcon.scss";

const logger = createDebugLogger("TokenIcon");

function getIconUrlPath(symbol, size: 24 | 40) {
  if (!symbol || !size) return;
  return `ic_${symbol.toLowerCase()}_${size}.svg`;
}

type Props = {
  symbol: string;
  displaySize: number;
  importSize?: 24 | 40;
  className?: string;
  badge?: string | readonly [topSymbol: string, bottomSymbol: string];
};

function TokenIcon({ className, symbol, displaySize, importSize = 24, badge }: Props) {
  const iconPath = getIconUrlPath(symbol, importSize);
  const classNames = cx("Token-icon inline", className);

  if (!iconPath) return <></>;

  let sub;
  let iconSrc;
  
  try {
    // Try to import the image, if it fails use a fallback
    iconSrc = importImage(iconPath);
  } catch (error) {
    // Create a fallback SVG with the token symbol as text
    const svgSize = displaySize || 40;
    const fontSize = Math.floor(svgSize / 2.5);
    const symbolText = symbol.length > 4 ? symbol.substring(0, 4) : symbol;
    const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}"><circle cx="${svgSize/2}" cy="${svgSize/2}" r="${svgSize/2}" fill="%23666"/><text x="50%" y="50%" font-size="${fontSize}px" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial">${symbolText}</text></svg>`;
    iconSrc = fallbackSvg;
    logger.warn(`Image for "${symbol}" (${iconPath}) not found, using fallback.`);
  }

  const img = (
    <img
      data-qa="token-icon"
      className={classNames}
      src={iconSrc}
      alt={symbol}
      width={displaySize}
      height={displaySize}
    />
  );

  if (badge) {
    if (typeof badge === "string") {
      sub = (
        <span className="pointer-events-none absolute -bottom-8 -right-8 z-10 rounded-20 border border-slate-800 bg-slate-500 px-4 py-2 text-12 !text-white">
          {badge}
        </span>
      );
    } else {
      sub = (
        <span className="absolute -bottom-8 -right-8 flex flex-row items-center justify-center !text-white">
          <img
            className="z-20 -mr-10 rounded-[100%] border border-slate-800"
            src={importImage(getIconUrlPath(badge[0], 24))}
            alt={badge[0]}
            width={20}
            height={20}
          />
          <img
            className="z-10 rounded-[100%] border border-slate-800"
            src={importImage(getIconUrlPath(badge[1], 24))}
            alt={badge[0]}
            width={20}
            height={20}
          />
        </span>
      );
    }
  }

  if (!sub) {
    return img;
  }

  return (
    <span className="relative">
      {img}
      {sub}
    </span>
  );
}

export default TokenIcon;

import React from "react";

import logoBlackSvg from "../assets/images/logo.svg";
import logoWhiteSvg from "../assets/images/logo_white.svg";

export interface LogoProps {
  white?: boolean;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export function Logo({
  white = false,
  width = 128,
  height = 128,
  className,
  style,
  alt = "Logo"
}: LogoProps) {
  const logoSvg = white ? logoWhiteSvg : logoBlackSvg;

  return (
    <div
      className={className}
      style={{
        width,
        height,
        display: "inline-block",
        ...style
      }}
      role="img"
      aria-label={alt}
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  );
}


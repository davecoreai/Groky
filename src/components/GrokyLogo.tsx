import React from "react";

interface GrokyLogoProps {
  className?: string;
  size?: number | string;
}

export const GrokyLogo: React.FC<GrokyLogoProps> = ({ className = "w-4 h-4" }) => {
  return (
    <img
      src="https://i.imgur.com/qA2EE5o.jpeg"
      alt="Groky AI"
      className={`object-cover select-none shrink-0 ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};


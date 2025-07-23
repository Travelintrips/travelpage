import React from "react";

// SVG Icon for Wheelchair
export const WheelchairIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 512 512"
    className={className || "text-gray-600 h-8 w-8"}
    fill="currentColor"
  >
    <path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0S96 57.3 96 128s57.3 128 128 128zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z" />
  </svg>
);

// SVG Custom Icons
export const GolfIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/golf.svg"
    alt="Golf Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const SurfingIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/surfboard.svg"
    alt="Surfboard Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const CameraIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/camera.svg"
    alt="Camera Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const LaptopIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/laptop.svg"
    alt="Laptop Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const GuitarIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/guitar.svg"
    alt="Guitar Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const KeyboardIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/keyboard.svg"
    alt="Keyboard Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const JoinedIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/joined.svg"
    alt="Joined Icon"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const CashIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/cash-money.svg"
    alt="Cash Money"
    className={className || "h-8 w-8 object-contain"}
  />
);

export const PaylabsIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/Paylabs.png"
    alt="paylabs"
    className={className || "h-8 w-8 object-contain"}
  />
);

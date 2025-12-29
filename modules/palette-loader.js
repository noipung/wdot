import { MESSAGES } from "./constants.js";

export const loadPaletteData = async () => {
  try {
    const response = await fetch(new URL("/palette.json", import.meta.url));
    if (!response.ok) {
      throw new Error(MESSAGES.ERROR.PALETTE_LOAD_FAILED);
    }
    return await response.json();
  } catch (error) {
    console.error(MESSAGES.ERROR.PALETTE_LOAD_ERROR, error);

    return {
      WPlace: {
        customColor: false,
        terrainColor: false,
        colors: [
          { rgb: [0, 0, 0], name: "Black", type: "locked" },
          { rgb: [255, 255, 255], name: "White", type: "locked" },
        ],
      },
    };
  }
};

export const DRAG_THRESHOLD = 3;
export const DPR = window.devicePixelRatio || 1;
export const GA_ID = "G-3V8JLXQZ5F";
export const CLARITY_ID = "ugv6yvdo6v";

export const ZOOM_STEP = 0.15;
export const MIN_ZOOM = 0.5;
export const ZOOM_LEVEL_DECIMAL_PLACES = 2;
export const SHOW_GRID_ZOOM_THRESHOLD = 200;
export const SPEECH_BUBBLE_WIDTH = 30;
export const SPEECH_BUBBLE_HEIGHT = 30;
export const SPEECH_BUBBLE_RADIUS = 4;
export const SPEECH_BUBBLE_BORDER = 4;
export const GRID_COLOR = "#0002";
export const SPEECH_BUBBLE_BG_COLOR = "#fff";
export const SPEECH_BUBBLE_BORDER_COLOR = "#000";

export const DEFAULT_INIT_ZOOM_FACTOR = 0.75;
export const MIN_VALUE = 0;
export const MAX_VALUE = 100;
export const SECONDS_PER_PIXEL_MANUAL = 30;
export const SECONDS_PER_PIXEL_WITH_TOOL = 27;

export const LUMA_COEFF_R = 0.2126;
export const LUMA_COEFF_G = 0.7152;
export const LUMA_COEFF_B = 0.0722;
export const LUMA_THRESHOLD = 0.5;

export const PALETTE_TYPE_BASIC = "basic";
export const PALETTE_TYPE_LOCKED = "locked";
export const PALETTE_TYPE_ADDED = "added";
export const PALETTE_NAME_CUSTOM = "커스텀";

export const MESSAGES = {
  VALIDATION: {
    INVALID_HEX: "VALIDATION.INVALID_HEX",
    COLOR_ALREADY_EXISTS: "VALIDATION.COLOR_ALREADY_EXISTS",
    NAME_ALREADY_EXISTS: "VALIDATION.NAME_ALREADY_EXISTS",
    VALID_COLOR: "VALIDATION.VALID_COLOR",
    EMPTY_PALETTE_NAME: "VALIDATION.EMPTY_PALETTE_NAME",
    PALETTE_ALREADY_EXISTS: "VALIDATION.PALETTE_ALREADY_EXISTS",
    VALID_PALETTE_SAVE: "VALIDATION.VALID_PALETTE_SAVE",
  },
  ERROR: {
    IMAGE_ONLY: "ERROR.IMAGE_ONLY",
    PALETTE_LOAD_FAILED: "ERROR.PALETTE_LOAD_FAILED",
    PALETTE_LOAD_ERROR: "ERROR.PALETTE_LOAD_ERROR",
  },
};

export const UI_LABELS = {
  SET_TERRAIN_COLOR: "UI_LABELS.SET_TERRAIN_COLOR",
  DELETE: "UI_LABELS.DELETE",
  ADD_COLOR: "UI_LABELS.ADD_COLOR",
};

// Theme
export const THEME_STORAGE_KEY = "theme";
export const THEME_ICONS = {
  LIGHT: `${import.meta.env.BASE_URL}icon.svg`,
  DARK: `${import.meta.env.BASE_URL}icon-dark.svg`,
};

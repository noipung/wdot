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
    INVALID_HEX: "헥스코드가 올바르지 않습니다.",
    COLOR_ALREADY_EXISTS: "현재 팔레트에 중복되는 색이 있습니다.",
    NAME_ALREADY_EXISTS: "현재 팔레트에 중복되는 색 이름이 있습니다.",
    VALID_COLOR: "이 색을 추가합니다.",
    EMPTY_PALETTE_NAME: "팔레트 이름을 입력해주세요.",
    PALETTE_ALREADY_EXISTS: "이미 사용 중인 팔레트 이름입니다.",
    VALID_PALETTE_SAVE: "이 팔레트를 저장합니다.",
  },
  ERROR: {
    IMAGE_ONLY: "이미지 파일만 업로드할 수 있습니다.",
    PALETTE_LOAD_FAILED: "팔레트 데이터를 불러오지 못했습니다.",
    PALETTE_LOAD_ERROR: "팔레트 데이터 로딩 에러:",
  },
};

export const UI_LABELS = {
  SET_TERRAIN_COLOR: "지형 색 설정",
  DELETE: "삭제",
  ADD_COLOR: "색 추가",
};

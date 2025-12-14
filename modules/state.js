export const state = {
  brightness: null,
  contrast: null,
  saturation: null,
  dither: null,
  aspectRatio: 1,
  width: null,
  height: null,
  mark: null,
  initPaletteData: {},
  paletteData: {},
  paletteName: "WPlace",
  palette: null,
  colorTexts: new Map(),
  fileName: null,
  image: null,
  adjusted: null,
  resized: null,
  dithered: null,
  dataURL: null,
  showOriginal: false,
  showGrid: false,
  showTerrainBg: true,
  pickedColor: null,
  addColorValidation: {},
  colorsToAdd: [],
  method: localStorage.getItem("method") || "rgb",
  workers: {
    adjust: { instance: null, isProcessing: false },
    dither: { instance: null, isProcessing: false },
  },
  isPixelMode: false,
  // 뷰포트 관련 상태
  viewport: {
    // 이미지 오프셋 (이미지 좌표계에서의 이동량, 캔버스 좌표)
    offset: { x: 0, y: 0 },
    // 드래그 중 임시 오프셋
    tempOffset: { x: 0, y: 0 },
    // 줌 레벨 (퍼센트)
    zoom: null,
    // 이미지가 화면에 그려지는 영역 {x, y, width, height} (캔버스 좌표계)
    bounds: null,
  },
  // 상호작용 관련 상태
  interaction: {
    // 드래그/줌 시작점 (화면 좌표계)
    startPoint: { x: 0, y: 0 },
    // 드래그 중 여부
    isDragging: false,
    // 터치 관련
    touches: [],
    startTouchDistance: 0,
    startZoom: 0,
  },
};

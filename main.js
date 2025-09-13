const state = {
  brightness: null,
  contrast: null,
  saturation: null,
  dither: null,
  aspectRatio: 1,
  width: null,
  height: null,
  zoom: null,
  startPosition: [0, 0],
  position: [0, 0],
  currentPosition: [0, 0],
  isDragging: false,
  touchStartDistance: 0,
  touchStartZoom: 0,
  currentTouches: [],
  palette: null,
  fileName: null,
  image: null,
  adjusted: null,
  resized: null,
  dithered: null,
};

const downloadBtn = document.querySelector(".download-btn");
const total = document.querySelector(".total");

const form = document.querySelector("form");

const canvasOverlay = document.querySelector(".canvas-overlay");
const canvasControlLayer = document.querySelector(".canvas-control-layer");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const preventDefaults = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

const validate = () =>
  state.image &&
  state.brightness >= 0 &&
  state.brightness <= 100 &&
  state.contrast >= 0 &&
  state.contrast <= 100 &&
  state.saturation >= 0 &&
  state.saturation <= 100 &&
  state.dither >= 0 &&
  state.dither <= 100 &&
  state.width >= 1 &&
  state.height >= 1;

const disableImageSmoothing = () => {
  ctx.imageSmoothingEnabled = false;
};

disableImageSmoothing();

// 이미지 드롭

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  canvasControlLayer.addEventListener(eventName, preventDefaults, false);
});

["dragenter", "dragover"].forEach((eventName) => {
  canvasControlLayer.addEventListener(
    eventName,
    () => canvasOverlay.classList.add("active"),
    false
  );
});

["dragleave", "drop"].forEach((eventName) => {
  canvasControlLayer.addEventListener(
    eventName,
    () => canvasOverlay.classList.remove("active"),
    false
  );
});

// 팔레트

const initPalette = wplacePalette
  .filter(({ locked }) => !locked)
  .map(({ rgb }) => rgb);

const wholePalette = wplacePalette.map(({ rgb }) => rgb);

state.palette = initPalette;

const basicPaletteList = document.querySelector(".palette.basic");
const lockedPaletteList = document.querySelector(".palette.locked");

const getContentColor = ([r, g, b]) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5 ? "#000" : "#fff";

const checks = [];

const createColorListItem = (rgb, name, locked) => {
  const li = document.createElement("li");
  const check = document.createElement("input");
  const label = document.createElement("label");
  const tooltip = document.createElement("div");

  const id = name.toLowerCase().replaceAll(" ", "-");

  check.type = "checkbox";
  check.id = label.htmlFor = id;
  check.checked = check.isBasicColor = !locked;
  label.style.background = `rgb(${rgb})`;
  label.style.color = getContentColor(rgb);
  tooltip.classList.add(...["tooltip"].concat(locked ? ["locked"] : []));
  tooltip.textContent = `${name} ${locked ? "🔒︎" : ""}`;

  li.append(check, label, tooltip);
  checks.push(check);

  check.addEventListener("change", () => {
    state.palette = check.checked
      ? state.palette.concat([rgb])
      : state.palette.filter(
          (item) => JSON.stringify(item) !== JSON.stringify(rgb)
        );

    if (!validate()) return;

    updateImageProcessing();
    draw();
  });

  return li;
};

wplacePalette.forEach(({ rgb, name, locked }) => {
  const colorListItem = createColorListItem(rgb, name, locked);
  (locked ? lockedPaletteList : basicPaletteList).append(colorListItem);
});

const handleClickInitBtn = () => {
  state.palette = initPalette;
  checks.forEach((check) => {
    check.checked = check.isBasicColor;
  });

  if (!validate()) return;

  updateImageProcessing();
  draw();
};

const li = document.createElement("li");
const initBtn = document.createElement("button");
initBtn.addEventListener("click", handleClickInitBtn);
initBtn.classList.add("init-btn");
initBtn.type = "button";

li.append(initBtn);
basicPaletteList.append(li);

const selectAllBtn = document.querySelector(".select-all-btn");
const unselectAllBtn = document.querySelector(".unselect-all-btn");

const handleClickSelectAllBtn = () => {
  state.palette = wholePalette;
  checks.forEach((check) => {
    check.checked = true;
  });

  if (!validate()) return;

  updateImageProcessing();
  draw();
};

selectAllBtn.addEventListener("click", handleClickSelectAllBtn);

const handleClickUnselectAllBtn = () => {
  state.palette = [];
  checks.forEach((check) => {
    check.checked = false;
  });

  if (!validate()) return;

  updateImageProcessing();
  draw();
};

unselectAllBtn.addEventListener("click", handleClickUnselectAllBtn);

// 디더링

const dist = (a, b) => a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0);

const createColorMatcher = () => {
  let cache = new Map();
  let cachedPalette = null;

  return (color, palette) => {
    if (cachedPalette !== palette) {
      cache.clear();
      cachedPalette = palette;
    }

    const key = color.join(",");

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = palette.reduce(
      (closest, current) =>
        !closest || dist(color, current) < dist(color, closest)
          ? current
          : closest,
      null
    );

    cache.set(key, result);
    return result;
  };
};

let getClosestColor = createColorMatcher();

function dither(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const ditherIntensity = state.dither / 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const palette = state.palette.length ? state.palette : [[0, 0, 0]];
      const newColor = getClosestColor([oldR, oldG, oldB], palette);
      data[idx] = newColor[0];
      data[idx + 1] = newColor[1];
      data[idx + 2] = newColor[2];

      const errR = oldR - newColor[0];
      const errG = oldG - newColor[1];
      const errB = oldB - newColor[2];

      if (x + 1 < width) {
        const rightIdx = idx + 4;
        data[rightIdx] += ((errR * 7) / 16) * ditherIntensity;
        data[rightIdx + 1] += ((errG * 7) / 16) * ditherIntensity;
        data[rightIdx + 2] += ((errB * 7) / 16) * ditherIntensity;
      }

      if (y + 1 < height) {
        const downIdx = idx + width * 4;
        data[downIdx] += ((errR * 5) / 16) * ditherIntensity;
        data[downIdx + 1] += ((errG * 5) / 16) * ditherIntensity;
        data[downIdx + 2] += ((errB * 5) / 16) * ditherIntensity;

        if (x - 1 >= 0) {
          const downLeftIdx = downIdx - 4;
          data[downLeftIdx] += ((errR * 3) / 16) * ditherIntensity;
          data[downLeftIdx + 1] += ((errG * 3) / 16) * ditherIntensity;
          data[downLeftIdx + 2] += ((errB * 3) / 16) * ditherIntensity;
        }

        if (x + 1 < width) {
          const downRightIdx = downIdx + 4;
          data[downRightIdx] += ((errR * 1) / 16) * ditherIntensity;
          data[downRightIdx + 1] += ((errG * 1) / 16) * ditherIntensity;
          data[downRightIdx + 2] += ((errB * 1) / 16) * ditherIntensity;
        }
      }
    }
  }

  return imageData;
}

function getAdjusted(image, brightness, contrast, saturation) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = image.width;
  canvas.height = image.height;

  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const contrastFactor = (contrast - 50) * 2;
  const factor =
    (259 * (contrastFactor + 255)) / (255 * (259 - contrastFactor));

  const brightnessOffset = ((brightness - 50) * 255) / 100;

  const saturationFactor = saturation / 50;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const avg = (r + g + b) / 3;

    const newR = factor * (r - 128) + 128 + brightnessOffset;
    const newG = factor * (g - 128) + 128 + brightnessOffset;
    const newB = factor * (b - 128) + 128 + brightnessOffset;

    data[i] = (newR - avg) * saturationFactor + avg;
    data[i + 1] = (newG - avg) * saturationFactor + avg;
    data[i + 2] = (newB - avg) * saturationFactor + avg;

    data[i] = Math.min(255, Math.max(0, data[i]));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1]));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2]));
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

function makeOpaque(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= 1) {
      data[i] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

const countOpaquePixels = (imageData) => {
  let count = 0;
  const data = imageData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 255) count++;
  }
  return count;
};

const updateImageProcessing = () => {
  const resized = document.createElement("canvas");
  const dithered = document.createElement("canvas");

  const resizedCtx = resized.getContext("2d", { willReadFrequently: true });
  const ditheredCtx = dithered.getContext("2d");

  state.adjusted = getAdjusted(
    state.image,
    state.brightness,
    state.contrast,
    state.saturation
  );

  const pw = state.width;
  const ph = state.height;

  resized.width = pw;
  resized.height = ph;
  dithered.width = pw;
  dithered.height = ph;

  resizedCtx.drawImage(state.adjusted, 0, 0, pw, ph);

  makeOpaque(resized);

  const imageData = dither(resizedCtx, pw, ph);

  total.textContent = countOpaquePixels(imageData);

  ditheredCtx.putImageData(imageData, 0, 0);

  state.resized = resized;
  state.dithered = dithered;
};

const draw = () => {
  const { width: cw, height: ch } = canvas;

  ctx.clearRect(0, 0, cw, ch);

  const { width: rw, height: rh } = state.resized;
  const zoom = state.zoom / 100;
  const zw = rw * zoom;
  const zh = rh * zoom;

  const center = [(cw - zw) / 2, (ch - zh) / 2];
  const [px, py] = state.position;

  center[0] += px;
  center[1] += py;

  ctx.drawImage(state.dithered, ...center, zw, zh);
};

const getZoom = (size = 3 / 4) =>
  ~~(
    (state.aspectRatio > canvas.width / canvas.height
      ? canvas.width / state.width
      : canvas.height / state.height) *
    size *
    100
  );

const updateZoom = () => {
  zoomInput.value = state.zoom = getZoom();
};

const handleImageLoad = (image) => {
  state.image = image;
  state.aspectRatio = image.width / image.height;

  state.width = form.width.value = image.width;
  state.height = form.height.value = image.height;
  state.position = state.currentPosition = [0, 0];

  updateZoom();

  canvasOverlay.classList.add("image-loaded");
  zoomInBtn.disabled = false;
  zoomOutBtn.disabled = false;
  downloadBtn.disabled = false;

  updateImageProcessing();
  draw();
};

const uploadBtn = document.querySelector("#upload-btn");

const handleFile = (file) => {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    console.error("이미지 파일만 업로드할 수 있습니다.");
    return;
  }

  state.fileName = file.name;

  const reader = new FileReader();

  reader.onload = ({ target: { result } }) => {
    const image = new Image();

    image.addEventListener("load", () => {
      handleImageLoad(image);
    });
    image.src = result;
  };

  reader.readAsDataURL(file);
};

const handleUpload = (e) => {
  const [file] = e.target.files;
  handleFile(file);
};

const handleDrop = (e) => {
  const [file] = e.dataTransfer.files;
  handleFile(file);
};

uploadBtn.addEventListener("change", handleUpload, false);

const zoom = (deltaY) => {
  console.log(deltaY);

  const isZoomIn = deltaY < 0;

  state.zoom = zoomInput.value = Math.max(
    ~~(+zoomInput.value * (1 + (isZoomIn ? 0.1 : -0.1))),
    10
  );

  if (!validate()) return;

  draw();
};

const zoomInBtn = document.querySelector(".zoom-in");
const zoomOutBtn = document.querySelector(".zoom-out");

zoomInBtn.addEventListener("click", () => zoom(-1), false);
zoomOutBtn.addEventListener("click", () => zoom(1), false);

canvasControlLayer.addEventListener("drop", handleDrop, false);
canvasControlLayer.addEventListener("wheel", (e) => zoom(e.deltaY), false);

// 상태 유효성 검사 및 초기화 함수 추가
function initState() {
  if (!state.currentPosition) {
    state.currentPosition = [...state.position];
  }
}

// 드래그 임계값 설정 (의도하지 않은 작은 움직임 무시)
const DRAG_THRESHOLD = 3;

// 핀치 줌을 위한 보조 함수들 추가
const getTouchDistance = (touch1, touch2) => {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getMidpoint = (touch1, touch2) => {
  return [
    (touch1.clientX + touch2.clientX) / 2,
    (touch1.clientY + touch2.clientY) / 2,
  ];
};

// 핀치 줌 이벤트 처리
const handlePinchZoom = (e) => {
  if (state.currentTouches.length < 2) return;

  // 두 터치 포인트 찾기
  const touch1 = state.currentTouches[0];
  const touch2 = state.currentTouches[1];

  // 현재 거리 계산
  const currentDistance = getTouchDistance(touch1, touch2);

  if (state.touchStartDistance > 0) {
    // 거리 변화에 따라 줌 조정
    const zoomFactor = currentDistance / state.touchStartDistance;
    const newZoom = Math.max(10, ~~(state.touchStartZoom * zoomFactor));

    state.zoom = newZoom;
    zoomInput.value = newZoom;

    if (!validate()) return;

    // 줌 중심을 기준으로 이미지 위치 조정
    const midpoint = getMidpoint(touch1, touch2);
    const canvasRect = canvas.getBoundingClientRect();

    // 캔버스 내에서의 상대적 위치 계산
    const canvasX = midpoint[0] - canvasRect.left;
    const canvasY = midpoint[1] - canvasRect.top;

    // 현재 이미지의 위치와 크기
    const currentZoom = state.touchStartZoom / 100;
    const currentImgWidth = state.resized.width * currentZoom;
    const currentImgHeight = state.resized.height * currentZoom;

    // 현재 이미지의 그려진 위치
    const currentImgX =
      (canvas.width - currentImgWidth) / 2 + state.touchStartPosition[0];
    const currentImgY =
      (canvas.height - currentImgHeight) / 2 + state.touchStartPosition[1];

    // 터치 지점의 이미지 내 상대적 위치 계산
    const imgRelativeX = (canvasX - currentImgX) / currentImgWidth;
    const imgRelativeY = (canvasY - currentImgY) / currentImgHeight;

    // 새로운 줌에서의 이미지 크기
    const newZoomValue = newZoom / 100;
    const newImgWidth = state.resized.width * newZoomValue;
    const newImgHeight = state.resized.height * newZoomValue;

    // 새로운 이미지 위치 계산 (터치 지점을 기준으로)
    const newImgX = canvasX - imgRelativeX * newImgWidth;
    const newImgY = canvasY - imgRelativeY * newImgHeight;

    // 캔버스 중심을 기준으로 한 오프셋 계산
    const newOffsetX = newImgX - (canvas.width - newImgWidth) / 2;
    const newOffsetY = newImgY - (canvas.height - newImgHeight) / 2;

    state.position = [newOffsetX, newOffsetY];
    state.currentPosition = [newOffsetX, newOffsetY];

    draw();
  }
};

// 터치 시작 이벤트 처리
canvasControlLayer.addEventListener("touchstart", (e) => {
  preventDefaults(e);

  // 모든 터치 포인트 저장
  state.currentTouches = Array.from(e.touches);

  if (e.touches.length === 2) {
    // 핀치 줌 시작
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];

    state.touchStartDistance = getTouchDistance(touch1, touch2);
    state.touchStartZoom = state.zoom;
    state.touchStartPosition = [...state.position]; // 핀치 시작 시 위치 저장
  } else if (e.touches.length === 1) {
    // 드래그 시작
    state.startPosition = [e.touches[0].clientX, e.touches[0].clientY];
    state.currentPosition = [...state.position];
    state.isDragging = true;
    canvasOverlay.classList.add("dragging");
  }
});

// 터치 이동 이벤트 처리
canvasControlLayer.addEventListener("touchmove", (e) => {
  preventDefaults(e);

  // 터치 포인트 업데이트
  state.currentTouches = Array.from(e.touches);

  if (e.touches.length === 2) {
    // 핀치 줌 처리
    handlePinchZoom(e);
  } else if (e.touches.length === 1 && state.isDragging) {
    // 드래그 처리
    const touch = e.touches[0];
    const movedX = touch.clientX - state.startPosition[0];
    const movedY = touch.clientY - state.startPosition[1];

    state.position = [
      state.currentPosition[0] + movedX,
      state.currentPosition[1] + movedY,
    ];

    if (!validate()) return;
    draw();
  }
});

// 터치 종료 이벤트 처리
canvasControlLayer.addEventListener("touchend", (e) => {
  preventDefaults(e);

  // 터치 포인트 업데이트
  state.currentTouches = Array.from(e.touches);

  if (e.touches.length < 2) {
    // 핀치 줌 종료
    state.touchStartDistance = 0;
    state.touchStartPosition = null;
  }

  if (e.touches.length === 0) {
    // 모든 터치 종료
    state.isDragging = false;
    state.currentPosition = [...state.position];
    canvasOverlay.classList.remove("dragging");
  }
});

canvasControlLayer.addEventListener(
  "pointerdown",
  (e) => {
    if (e.pointerType !== "touch") {
      if (e.button === 0) {
        initState();
        state.startPosition = [e.clientX, e.clientY];
        state.isDragging = false;
        canvasControlLayer.setPointerCapture(e.pointerId);
        canvasOverlay.classList.add("dragging");
      }
    }
  },
  false
);

canvasControlLayer.addEventListener(
  "pointermove",
  (e) => {
    if (
      e.pointerType !== "touch" &&
      canvasControlLayer.hasPointerCapture(e.pointerId)
    ) {
      e.preventDefault();

      // 드래그 임계값 체크
      const movedX = e.clientX - state.startPosition[0];
      const movedY = e.clientY - state.startPosition[1];

      // 작은 움직임은 무시 (의도치 않은 클릭/터치 방지)
      if (
        !state.isDragging &&
        Math.abs(movedX) < DRAG_THRESHOLD &&
        Math.abs(movedY) < DRAG_THRESHOLD
      ) {
        return;
      }

      // 드래그 시작으로 표시
      if (!state.isDragging) {
        state.isDragging = true;
      }

      // 위치 계산
      state.position = [
        state.currentPosition[0] + movedX,
        state.currentPosition[1] + movedY,
      ];

      if (!validate()) return;

      // 부드러운 애니메이션을 위한 requestAnimationFrame 사용
      requestAnimationFrame(draw);
    }
  },
  false
);

// PointerUp 이벤트 리스너
canvasControlLayer.addEventListener(
  "pointerup",
  (e) => {
    // 드래그가 실제로 발생한 경우에만 위치 업데이트
    if (state.isDragging) {
      state.currentPosition = [...state.position];
    }

    // 상태 초기화
    state.isDragging = false;
    canvasControlLayer.releasePointerCapture(e.pointerId);
    canvasOverlay.classList.remove("dragging");
  },
  false
);

// PointerCancel 이벤트 리스너 추가 (터치 장치에서 중요)
canvasControlLayer.addEventListener(
  "pointercancel",
  (e) => {
    state.isDragging = false;
    canvasControlLayer.releasePointerCapture(e.pointerId);
    canvasOverlay.classList.remove("dragging");
  },
  false
);

// 세팅 값 동기화

const zoomInput = document.querySelector("#zoom");

const handleZoomInput = () => {
  state.zoom = +zoomInput.value;

  if (!validate()) return;

  draw();
};

zoomInput.addEventListener("input", handleZoomInput);

handleZoomInput();

form.addEventListener("submit", preventDefaults);

const links = [
  { link: ["brightness", "brightness-range"] },
  { link: ["contrast", "contrast-range"] },
  { link: ["saturation", "saturation-range"] },
  { link: ["dither", "dither-range"] },
  {
    link: ["width", "height"],
    logic: (value, name) =>
      ~~(value * state.aspectRatio ** (name === "width" ? -1 : 1)),
    cb: updateZoom,
  },
];

links.forEach(({ link, logic, cb }) => {
  const inputs = link.map((key) => form[key]);

  inputs.forEach((input) => {
    const handleInput = () => {
      const numberValue = +input.value;

      state[input.name] = numberValue;

      const restInputs = inputs.filter(
        (currentInput) => currentInput !== input
      );

      if (restInputs.length === 0) return;

      restInputs.forEach((restInput) => {
        restInput.value = state[restInput.name] = logic
          ? logic(numberValue, input.name)
          : numberValue;
      });

      if (cb) cb();

      if (!validate()) return;

      updateImageProcessing();
      draw();
    };

    input.addEventListener("input", handleInput);

    handleInput();
  });
});

// 다운로드

const dialog = document.querySelector(".dialog");

downloadBtn.addEventListener("click", (e) => {
  if (!state.dithered) return;

  dialog.showModal();
});

const saveBtn = document.querySelector(".save-btn");
const cancelBtn = document.querySelector(".cancel-btn");

cancelBtn.addEventListener("click", (e) => {
  dialog.close();
});

saveBtn.addEventListener("click", (e) => {
  const imageURL = state.dithered.toDataURL("image/png");
  const link = document.createElement("a");

  link.href = imageURL;
  link.download = `${state.fileName.replace(/\.[a-zA-Z0-9]+$/, "")}_edited.png`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  dialog.close();
});

// 리사이즈

const resizeCanvas = () => {
  const { width, height } = canvas.getBoundingClientRect();

  canvas.width = width;
  canvas.height = height;

  disableImageSmoothing();

  if (!validate()) return;

  draw();
};

addEventListener("resize", resizeCanvas);

resizeCanvas();

import { state } from "./state.js";
import {
  canvas,
  canvasOverlay,
  canvasControlLayer,
  form,
  uploadBtn,
  zoomInBtn,
  zoomOutBtn,
  zoomInput,
  dropdownCurrentOption,
  optionRadios,
  downloadBtn,
  downloadConfirmBtn,
  downloadCancelBtn,
  downloadDialog,
  DRAG_THRESHOLD,
  resetBtn,
  sizeBtns,
  showOriginalInput,
  pixelModeToggle,
} from "./constants.js";
import {
  preventDefaults,
  validate,
  getTouchDistance,
  getMidpoint,
} from "./utils.js";
import {
  handleImageLoad,
  drawUpdatedImage,
  updateZoom,
} from "./image-processing.js";
import { draw } from "./drawing.js";

// 이미지 드롭 이벤트
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

// 파일 처리
export const handleFile = (file) => {
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

export const handleUpload = (e) => {
  const [file] = e.target.files;
  handleFile(file);
};

export const handleDrop = (e) => {
  const [file] = e.dataTransfer.files;
  handleFile(file);
};

uploadBtn.addEventListener("change", handleUpload, false);

// 줌 이벤트
export const zoom = (deltaY) => {
  const isZoomIn = deltaY < 0;

  state.zoom = zoomInput.value = Math.max(
    ~~(+zoomInput.value * (1 + (isZoomIn ? 0.1 : -0.1))),
    10
  );

  if (!validate()) return;

  draw();
};

zoomInBtn.addEventListener("click", () => zoom(-1), false);
zoomOutBtn.addEventListener("click", () => zoom(1), false);

zoomInput.addEventListener("change", (e) => {
  let value = Math.max(10, ~~e.target.value);
  e.target.value = state.zoom = value;

  if (!validate()) return;

  draw();
});

// 메서드 드롭다운 선택

optionRadios.forEach((optionRadio) => {
  optionRadio.addEventListener("change", (e) => {
    dropdownCurrentOption.textContent = e.target.dataset.label;
    state.method = e.target.value;

    drawUpdatedImage();
  });
});

canvasControlLayer.addEventListener("drop", handleDrop, false);
canvasControlLayer.addEventListener("wheel", (e) => zoom(e.deltaY), false);

// 상태 유효성 검사 및 초기화 함수
export const initState = () => {
  if (!state.currentPosition) {
    state.currentPosition = [...state.position];
  }
};

// 핀치 줌 이벤트 처리
export const handlePinchZoom = (e) => {
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

    requestAnimationFrame(draw);
  }
};

// 터치 이벤트
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
    requestAnimationFrame(draw);
  }
});

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

// 포인터 이벤트
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

canvasControlLayer.addEventListener(
  "pointercancel",
  (e) => {
    state.isDragging = false;
    canvasControlLayer.releasePointerCapture(e.pointerId);
    canvasOverlay.classList.remove("dragging");
  },
  false
);

showOriginalInput.addEventListener("change", (e) => {
  state.showOriginal = e.target.checked;

  if (!validate()) return;

  draw();
});

pixelModeToggle.addEventListener("change", (e) => {
  state.isPixelMode = e.target.checked;

  drawUpdatedImage();
});

// 입력 동기화
const links = [
  { link: ["#brightness", "#brightness-range"], init: () => 50 },
  { link: ["#contrast", "#contrast-range"], init: () => 50 },
  { link: ["#saturation", "#saturation-range"], init: () => 50 },
  { link: ["#dither", "#dither-range"], init: () => 0 },
  {
    link: ["#width", "#height"],
    init: () => (state.image ? state.image.width : 1),
    logic: (value, name) =>
      ~~(value * state.aspectRatio ** (name === "width" ? -1 : 1)),
    cb: () => {
      if (!validate()) return;

      updateZoom();
    },
  },
];

links.forEach(({ link, logic, cb }) => {
  const inputs = link.map((selector) => document.querySelector(selector));

  inputs.forEach((input) => {
    const eventType = input.type === "range" ? "input" : "change";

    input.syncInputs = () => {
      let numberValue = +input.value;

      if (input.type === "number" && eventType === "change") {
        const min = input.min !== "" ? +input.min : -Infinity;
        const max = input.max !== "" ? +input.max : Infinity;
        numberValue = Math.max(min, Math.min(max, numberValue));
      }

      input.value = state[input.name] = numberValue;

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
    };

    input.addEventListener(eventType, () => {
      input.syncInputs();
      drawUpdatedImage();
    });

    input.syncInputs();
  });
});

sizeBtns.forEach((button) => {
  button.addEventListener("click", () => {
    const { dimension, delta } = button.dataset;
    const input = form[dimension];
    const value = Math.max(1, +input.value + +delta);
    input.value = value;
    input.dispatchEvent(new InputEvent("change"));
  });
});

export const resetLinks = () => {
  links.forEach(({ link, init }) => {
    if (!init) return;

    const firstInput = document.querySelector(link[0]);

    firstInput.value = init();
    firstInput.syncInputs();
  });

  drawUpdatedImage();
};

resetBtn.addEventListener("click", resetLinks);

// 다운로드 이벤트
downloadBtn.addEventListener("click", (e) => {
  if (!state.dithered) return;

  downloadDialog.showModal();
});

downloadCancelBtn.addEventListener("click", (e) => {
  downloadDialog.close();
});

downloadConfirmBtn.addEventListener("click", (e) => {
  const imageURL = state.dithered.toDataURL("image/png");
  const link = document.createElement("a");

  link.href = imageURL;
  link.download = `${state.fileName.replace(/\.[a-zA-Z0-9]+$/, "")}_edited.png`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  downloadDialog.close();
});

// 폼 제출 방지
form.addEventListener("submit", preventDefaults);

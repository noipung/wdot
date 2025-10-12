import { state } from "./state.js";
import {
  canvas,
  canvasOverlay,
  canvasControlLayer,
  settingsForm,
  uploadBtn,
  zoomInBtn,
  zoomOutBtn,
  zoomInput,
  downloadBtn,
  downloadConfirmBtn,
  downloadCancelBtn,
  downloadDialog,
  DRAG_THRESHOLD,
  paletteResetBtn,
  settingsResetBtn,
  sizeBtns,
  showOriginalInput,
  pixelatedModeToggle,
  aside,
  DPR,
  paletteDropdown,
  methodDropdown,
  addColorAlert,
  addColorCancelBtn,
  addColorDialog,
  addColorConfirmBtn,
  addColorPreviewSingle,
  inputR,
  inputG,
  inputB,
  inputHex,
  terrainColorCancelBtn,
  terrainColorDialog,
  terrainColorInputs,
  showTerrainBgCheckbox,
  addColorForm,
  addColorTextarea,
  addColorPreviewContainer,
  addColorTabSingle,
  showGridInput,
} from "./constants.js";
import {
  preventDefaults,
  validate,
  getTouchDistance,
  getMidpoint,
  rgb2Hex,
  isValidHex,
  hex2Rgb,
  getContentColor,
  shortenHex,
  enableAutoResize,
} from "./utils.js";
import {
  handleImageLoad,
  drawUpdatedImage,
  updateZoom,
} from "./image-processing.js";
import { draw } from "./drawing.js";

// 파일 처리
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

// 줌 이벤트
const zoom = (deltaY) => {
  const isZoomIn = deltaY < 0;

  state.zoom = zoomInput.value = Math.max(
    ~~(+zoomInput.value * (1 + (isZoomIn ? 0.1 : -0.1))),
    10
  );

  if (!validate()) return;

  draw();
};

// 상태 유효성 검사 및 초기화 함수
const initState = () => {
  if (!state.position) {
    state.position = [...state.movedPosition];
  }
};

const moveTempPosition = (deltaX, deltaY) => {
  if (
    !state.dragging &&
    Math.abs(deltaX) < DRAG_THRESHOLD &&
    Math.abs(deltaY) < DRAG_THRESHOLD
  )
    return;

  startDragging();

  state.movedPosition = [
    state.position[0] + deltaX,
    state.position[1] + deltaY,
  ];
};

const handlePinchZoom = (e) => {
  if (state.currentTouches.length < 2) return;

  const touch1 = state.currentTouches[0];
  const touch2 = state.currentTouches[1];

  const currentDistance = getTouchDistance(touch1, touch2);

  if (state.startTouchDistance > 0) {
    const zoomFactor = currentDistance / state.startTouchDistance;
    const newZoom = Math.max(10, ~~(state.startZoom * zoomFactor));

    state.zoom = newZoom;
    zoomInput.value = newZoom;

    if (!validate()) return;

    const midpoint = getMidpoint(touch1, touch2);

    const deltaX = midpoint[0] - state.startPosition[0];
    const deltaY = midpoint[1] - state.startPosition[1];

    const imageCenterX = canvas.width / DPR / 2 + state.position[0];
    const imageCenterY = canvas.height / DPR / 2 + state.position[1];

    const offsetX = (midpoint[0] - imageCenterX) * (1 - zoomFactor);
    const offsetY = (midpoint[1] - imageCenterY) * (1 - zoomFactor);

    moveTempPosition(offsetX + deltaX, offsetY + deltaY);

    requestAnimationFrame(draw);
  }
};

const startDragging = () => {
  state.dragging = true;
  canvasOverlay.classList.add("dragging");
};

const highlightColorAt = (x, y) => {
  if (!state.dithered) return;

  const [zx, zy, zw, zh] = state.zoomRect;

  const rx = (x - zx) / zw;
  const ry = (y - zy) / zh;
  const ax = ~~(rx * state.adjusted.width);
  const ay = ~~(ry * state.adjusted.height);
  const ix = ~~(rx * state.width);
  const iy = ~~(ry * state.height);

  if (ix < 0 || ix >= state.width || iy < 0 || iy >= state.height) {
    state.palette.unhighlightAll();
    return;
  }

  const [currentCanvas, currentX, currentY] = state.showOriginal
    ? [state.adjusted, ax, ay]
    : [state.dithered, ix, iy];

  const currentCtx = currentCanvas.getContext("2d");
  const imageData = currentCtx.getImageData(currentX - 1, currentY - 1, 3, 3);
  const { data } = imageData;
  const [r, g, b, a] = data.slice(16, 20);

  if (a === 0) {
    state.palette.unhighlightAll();
    return;
  }

  const colorOnPalette = state.palette.getColorByRgb(r, g, b);

  if (!colorOnPalette) {
    state.palette.unhighlightAll();
    if (state.palette.hasCustomColor) {
      const { addColorBtn } = state.palette;
      addColorBtn.style.background = `rgb(${r}, ${g}, ${b})`;
      addColorBtn.style.color = getContentColor(r, g, b);
      inputR.value = r;
      inputG.value = g;
      inputB.value = b;
      inputHex.value = rgb2Hex(r, g, b);
    }
  } else {
    state.palette.highlight(colorOnPalette);
  }

  state.mark = {
    r: [rx, ry],
    imageData,
  };
};

export const setBgOfTerrainColorBtn = (hex) => {
  const color = hex !== "none" ? hex : "#0000";
  const { setTerrainColorBtn } = state.palette;

  setTerrainColorBtn.style.setProperty("--background-color", color);
  setTerrainColorBtn.classList.toggle("applied", hex !== "none");
};

export const updateScrollClass = (container) => {
  const wrapper = container.parentNode;
  const { scrollLeft, clientWidth, scrollWidth } = container;

  const epsilon = 2;
  const atStart = scrollLeft === 0;
  const atEnd = scrollLeft + clientWidth >= scrollWidth - epsilon;

  wrapper.classList.toggle("at-start", atStart);
  wrapper.classList.toggle("at-end", atEnd);
};

const confirmAddColor = (e) => {
  preventDefaults(e);

  if (addColorTabSingle.checked) {
    if (!isValidHex(inputHex.value)) {
      addColorAlert.classList.remove("hidden");
      addColorAlert.textContent = "헥스코드가 올바르지 않습니다.";
      return;
    }

    addColorAlert.classList.toggle("hidden", !state.contained);

    if (state.contained) return;

    const r = +inputR.value;
    const g = +inputG.value;
    const b = +inputB.value;

    state.palette.addColor([r, g, b], inputHex.value.toUpperCase(), "added");
  } else {
    if (!state.colorsToAdd.length) return;

    state.colorsToAdd.forEach(([hex, name]) =>
      state.palette.addColor(hex2Rgb(hex), name || hex, "added")
    );
  }

  drawUpdatedImage();

  addColorDialog.close();
};

const handleInputRgb = (e) => {
  const value = +e.target.value;
  const newValue = Math.max(0, Math.min(255, value));
  e.target.value = newValue;

  const r = +inputR.value;
  const g = +inputG.value;
  const b = +inputB.value;

  inputHex.value = rgb2Hex(r, g, b);

  state.contained = state.palette.getColorByRgb(r, g, b);
  addColorAlert.classList.toggle("hidden", !state.contained);

  addColorPreviewSingle.style.background = inputHex.value;
};

const handleInputHex = (e) => {
  const newValue =
    "#" + e.target.value.replace(/[^a-f0-9]/gi, "").toUpperCase();

  e.target.value = newValue;

  if (!isValidHex(newValue)) {
    addColorAlert.classList.remove("hidden");
    addColorAlert.textContent = "헥스코드가 올바르지 않습니다.";
    return;
  }

  const [r, g, b] = hex2Rgb(newValue);

  inputR.value = r;
  inputG.value = g;
  inputB.value = b;

  state.contained = state.palette.getColorByRgb(r, g, b);

  if (state.contained)
    addColorAlert.textContent = "이미 팔레트에 있는 색입니다.";
  addColorAlert.classList.toggle("hidden", !state.contained);

  addColorPreviewSingle.style.background = newValue;
};

const createAddColorPreview = (hex) => {
  const addColorPreview = document.createElement("div");

  addColorPreview.classList.add("add-color-preview");
  addColorPreview.style.background = hex;

  return addColorPreview;
};

const handleInputTextarea = (e) => {
  const value = e.target.value;
  const parsedInfos = [
    ...new Map(
      value
        .split(",")
        .map((str) =>
          (
            str
              .trim()
              .replace(/^#?/, "#")
              .match(/^(#(?:[a-f0-9]{3}){1,2})\s?(?:\((.+)?\)|$)?$/i) || []
          ).slice(1)
        )
        .filter(
          ([hex]) =>
            isValidHex(hex) && !state.palette.getColorByRgb(...hex2Rgb(hex))
        )
        .map(([hex, name]) => [shortenHex(hex), [hex.toUpperCase(), name]])
    ).values(),
  ];

  addColorPreviewContainer.innerHTML = "";
  state.colorsToAdd = parsedInfos;

  if (parsedInfos.length)
    parsedInfos.forEach((info) => {
      const addColorPreview = createAddColorPreview(...info);
      addColorPreviewContainer.append(addColorPreview);
    });

  updateScrollClass(addColorPreviewContainer);
};

export const initEventListeners = () => {
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

  uploadBtn.addEventListener("change", handleUpload, false);

  zoomInBtn.addEventListener("click", () => zoom(-1), false);
  zoomOutBtn.addEventListener("click", () => zoom(1), false);

  zoomInput.addEventListener("change", (e) => {
    let value = Math.max(10, ~~e.target.value);
    e.target.value = state.zoom = value;

    if (!validate()) return;

    draw();
  });

  [
    {
      dropdown: paletteDropdown,
      cb: (value) => {
        state.paletteName = value;
        state.palette.setPalette(value);
      },
    },
    {
      dropdown: methodDropdown,
      cb: (value) => {
        state.method = value;
      },
    },
  ].forEach(({ dropdown, cb }) => {
    const optionRadios = dropdown.querySelectorAll(".option-item input");
    const dropdownOpen = dropdown.querySelector(".dropdown-open");
    const dropdownCurrentOption = dropdown.querySelector(
      ".dropdown-current-option"
    );

    optionRadios.forEach((optionRadio) => {
      optionRadio.addEventListener("change", (e) => {
        dropdownCurrentOption.textContent = e.target.dataset.label;
        dropdownOpen.checked = false;
        cb(e.target.value);
        drawUpdatedImage();
      });
    });
  });

  canvasControlLayer.addEventListener("drop", handleDrop, false);
  canvasControlLayer.addEventListener("wheel", (e) => zoom(e.deltaY), false);

  // 터치 이벤트
  canvasControlLayer.addEventListener("touchstart", (e) => {
    preventDefaults(e);

    // 모든 터치 포인트 저장
    state.currentTouches = Array.from(e.touches);

    if (e.touches.length === 1) {
      state.position = [...state.movedPosition];
      state.startPosition = [e.touches[0].clientX, e.touches[0].clientY];
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      state.position = [...state.movedPosition];
      state.startPosition = getMidpoint(touch1, touch2);

      state.startTouchDistance = getTouchDistance(touch1, touch2);
      state.startZoom = state.zoom;
    }
  });

  canvasControlLayer.addEventListener("touchmove", (e) => {
    preventDefaults(e);

    // 터치 포인트 업데이트
    state.currentTouches = Array.from(e.touches);

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - state.startPosition[0];
      const deltaY = touch.clientY - state.startPosition[1];

      moveTempPosition(deltaX, deltaY);

      if (!validate()) return;
      requestAnimationFrame(draw);
    } else if (e.touches.length === 2) {
      handlePinchZoom(e);
    }
  });

  canvasControlLayer.addEventListener("touchend", (e) => {
    preventDefaults(e);
    state.currentTouches = Array.from(e.touches);
    if (e.touches.length < 2) {
      state.position = [...state.movedPosition];
      if (e.touches[0])
        state.startPosition = [e.touches[0].clientX, e.touches[0].clientY];
      state.startTouchDistance = 0;
    }

    if (e.touches.length === 0) {
      if (!state.dragging) {
        highlightColorAt(
          e.changedTouches[0].clientX,
          e.changedTouches[0].clientY
        );
      }
      state.dragging = false;
      state.position = [...state.movedPosition];
      canvasOverlay.classList.remove("dragging");
      if (!validate()) return;
      draw();
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
          state.dragging = false;
          canvasControlLayer.setPointerCapture(e.pointerId);
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

        const deltaX = e.clientX - state.startPosition[0];
        const deltaY = e.clientY - state.startPosition[1];

        moveTempPosition(deltaX, deltaY);

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
      if (e.pointerType === "touch") return;

      if (state.dragging) {
        state.position = [...state.movedPosition];
      }

      if (!state.dragging) {
        highlightColorAt(e.clientX, e.clientY);
      }

      state.dragging = false;
      canvasControlLayer.releasePointerCapture(e.pointerId);
      canvasOverlay.classList.remove("dragging");

      if (!validate()) return;

      draw();
    },
    false
  );

  canvasControlLayer.addEventListener(
    "pointercancel",
    (e) => {
      state.dragging = false;
      canvasControlLayer.releasePointerCapture(e.pointerId);
      canvasOverlay.classList.remove("dragging");
    },
    false
  );

  showOriginalInput.addEventListener("change", (e) => {
    state.showOriginal = e.target.checked;
    state.palette.unhighlightAll();

    if (!validate()) return;

    draw();
  });

  showGridInput.addEventListener("change", (e) => {
    state.showGrid = e.target.checked;

    if (!validate()) return;

    draw();
  });

  pixelatedModeToggle.addEventListener("change", (e) => {
    state.isPixelMode = e.target.checked;

    drawUpdatedImage();
  });

  paletteResetBtn.addEventListener("click", () => {
    if (state.palette.hasCustomColor) {
      state.palette.removeAddedColors();
    }
    state.palette.selectUnlockedColors();

    drawUpdatedImage();
  });

  // 입력 동기화
  const links = {
    brightness: {
      link: ["#brightness", "#brightness-range"],
      init: { label: ["label[for=brightness]"], fn: () => 50 },
    },
    contrast: {
      link: ["#contrast", "#contrast-range"],
      init: { label: ["label[for=contrast]"], fn: () => 50 },
    },
    saturation: {
      link: ["#saturation", "#saturation-range"],
      init: { label: ["label[for=saturation]"], fn: () => 50 },
    },
    dither: {
      link: ["#dither", "#dither-range"],
      init: { label: ["label[for=dither]"], fn: () => 0 },
    },
    size: {
      link: ["#width", "#height"],
      init: {
        label: ["label[for=width]", "label[for=height]"],
        fn: () => (state.image ? state.image.width : 1),
      },
      logic: (value, name) =>
        ~~(value * state.aspectRatio ** (name === "width" ? -1 : 1)),
      cb: (prevValue, newValue) => {
        if (!validate()) return;

        const newZoom = Math.round(state.zoom * (prevValue / newValue));

        updateZoom(newZoom);
      },
    },
  };

  const resetLink =
    (withDraw = true) =>
    (key) => {
      const { link, init } = links[key];

      if (!init.fn) return;

      const firstInput = document.querySelector(link[0]);
      const newValue = init.fn();

      if (firstInput.value == newValue) return;

      firstInput.value = newValue;
      firstInput.syncInputs();

      if (withDraw) drawUpdatedImage();
    };

  Object.keys(links).forEach((key) => {
    const { link, init, logic, cb } = links[key];
    const $ = (selector) => document.querySelector(selector);
    const inputs = link.map($);
    const labels = init.label.map($);

    inputs.forEach((input) => {
      const eventType = input.type === "range" ? "input" : "change";

      input.syncInputs = () => {
        let numberValue = +input.value;
        const prevValue = state[input.name];

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

        if (cb) cb(prevValue, numberValue);
      };

      input.addEventListener(eventType, () => {
        input.syncInputs();
        drawUpdatedImage();
      });

      input.syncInputs();
    });

    if (labels.length) {
      labels.forEach((label) => {
        label.addEventListener("click", () => {
          if (!validate()) return;
          resetLink(true)(key);
        });
      });
    }
  });

  sizeBtns.forEach((button) => {
    button.addEventListener("click", () => {
      const { dimension, delta } = button.dataset;
      const input = settingsForm[dimension];
      const value = Math.max(1, +input.value + +delta);
      input.value = value;
      input.dispatchEvent(new InputEvent("change"));
    });
  });

  const resetLinks = () => {
    Object.keys(links).forEach(resetLink(false));

    drawUpdatedImage();
  };

  settingsResetBtn.addEventListener("click", resetLinks);

  // 다운로드 이벤트
  downloadBtn.addEventListener("click", (e) => {
    if (!state.dithered) return;

    downloadDialog.showModal();
  });

  downloadConfirmBtn.addEventListener("click", (e) => {
    const imageURL = state.dithered.toDataURL("image/png");
    const link = document.createElement("a");

    link.href = imageURL;
    link.download = `${state.fileName.replace(
      /\.[a-zA-Z0-9]+$/,
      ""
    )}_edited.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    downloadDialog.close();
  });

  downloadCancelBtn.addEventListener("click", (e) => {
    downloadDialog.close();
  });

  showTerrainBgCheckbox.addEventListener("change", (e) => {
    const { checked } = e.target;
    state.showTerrainBg = checked;
    canvas.style.background = checked
      ? `rgb(${state.palette.terrainColor})`
      : "#0000";
  });

  terrainColorInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      const hex = e.target.value;

      state.palette.setTerrainColor(hex);

      setBgOfTerrainColorBtn(hex);

      const color = hex !== "none" ? hex : "#0000";

      canvas.style.background = state.showTerrainBg ? color : "#0000";

      drawUpdatedImage();
    });

    const label = input.nextElementSibling;
    const color = input.value;

    if (color === "none") return;

    label.style.backgroundColor = color;
    label.style.color = getContentColor(...hex2Rgb(color));
  });

  terrainColorCancelBtn.addEventListener("click", (e) => {
    terrainColorDialog.close();
  });

  addColorPreviewContainer.addEventListener("scroll", (e) =>
    updateScrollClass(e.target)
  );

  [inputR, inputG, inputB].forEach((input) =>
    input.addEventListener("input", handleInputRgb)
  );

  inputHex.addEventListener("input", handleInputHex);

  enableAutoResize(addColorTextarea);

  addColorTextarea.addEventListener("input", handleInputTextarea);

  addColorForm.addEventListener("submit", confirmAddColor);
  addColorConfirmBtn.addEventListener("click", confirmAddColor);

  addColorCancelBtn.addEventListener("click", () => addColorDialog.close());

  aside.addEventListener("pointerdown", () => state.palette.unhighlightAll());

  settingsForm.addEventListener("submit", preventDefaults);
};

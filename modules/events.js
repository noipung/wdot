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
  colorPreviewSingle,
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
  resultImage,
  savePaletteBtn,
  savePaletteDialog,
  savePaletteColorPreviewContainer,
  savePaletteCancelBtn,
  savePaletteConfirmBtn,
  savePaletteNameInput,
  savePaletteColorCount,
  addColorTabList,
  savePaletteAlert,
  inputColorName,
  customPaletteList,
  downloadFileName,
  downloadImageSize,
  ZOOM_STEP,
  MIN_ZOOM,
  PALETTE_NAME_CUSTOM,
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
  enableAutoResize,
  dispatchEventTo,
  formatColorTexts,
  parseColorText,
  shortenHex,
} from "./utils.js";
import {
  handleImageLoad,
  drawUpdatedImage,
  updateZoom,
} from "./image-processing.js";
import { draw } from "./drawing.js";
import {
  getCustomPaletteData,
  removePaletteUI,
  setCustomPaletteData,
  setPaletteUI,
} from "./palette.js";

// 파일 처리
const handleFile = (file) => {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    console.error("이미지 파일만 업로드할 수 있습니다.");
    return;
  }

  state.fileName = `${file.name.replace(/\.[a-zA-Z0-9]+$/, "")}_wdot.png`;

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
const zoom = (deltaY, point = null) => {
  const isZoomIn = deltaY < 0;
  const oldZoom = state.zoom;

  state.zoom = zoomInput.value = Math.max(
    ~~(+zoomInput.value * (1 + (isZoomIn ? ZOOM_STEP : -ZOOM_STEP))),
    MIN_ZOOM
  );

  if (!validate()) return;

  if (point) {
    const zoomFactor = state.zoom / oldZoom;
    const [mouseX, mouseY] = point;

    const imageCenterX = canvas.width / DPR / 2 + state.position[0];
    const imageCenterY = canvas.height / DPR / 2 + state.position[1];

    const offsetX = (mouseX - imageCenterX) * (1 - zoomFactor);
    const offsetY = (mouseY - imageCenterY) * (1 - zoomFactor);

    state.position[0] += offsetX;
    state.position[1] += offsetY;
    state.movedPosition = [...state.position];
  }

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
    const newZoom = Math.max(MIN_ZOOM, ~~(state.startZoom * zoomFactor));

    state.zoom = newZoom;
    zoomInput.value = newZoom;

    if (!validate()) return;

    const midpoint = getMidpoint(touch1, touch2);

    const deltaX = midpoint[0] - state.startPosition[0];
    const deltaY = midpoint[1] - state.startPosition[1];

    const imageCenterX = canvas.width / DPR / 2 + state.position[0];
    const imageCenterY = canvas.height / DPR / 2 + state.position[1];

    const offsetX = (state.startPosition[0] - imageCenterX) * (1 - zoomFactor);
    const offsetY = (state.startPosition[1] - imageCenterY) * (1 - zoomFactor);

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
      addColorTabSingle.checked = true;
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
    const colorName =
      inputColorName.value || shortenHex(inputHex.value).toUpperCase();

    state.palette.addColor([r, g, b], colorName, "added");
  } else {
    if (!state.colorsToAdd.length) return;

    state.colorsToAdd.forEach(([hex, name]) =>
      state.palette.addColor(hex2Rgb(hex), name, "added")
    );
  }

  drawUpdatedImage();

  savePaletteBtn.disabled = false;

  addColorDialog.close();
};

const updateAddColorValidationUI = () => {
  const { addColorValidation } = state;

  const messages = {
    invalidHex: "헥스코드가 올바르지 않습니다.",
    colorAlreadyExists: "현재 팔레트에 중복되는 색이 있습니다.",
    nameAlreadyExists: "현재 팔레트에 중복되는 색 이름이 있습니다.",
    valid: "이 색을 추가합니다.",
  };

  const isInvalid = Object.values(addColorValidation).some((error) => error);

  const type =
    Object.keys(messages).find((key) => addColorValidation[key]) || "valid";

  addColorAlert.classList.toggle("good", !isInvalid);
  addColorAlert.textContent = messages[type];
  addColorConfirmBtn.disabled = isInvalid;
};

const handleInputRgb = (e) => {
  const value = +e.target.value;
  const newValue = Math.max(0, Math.min(255, value));

  e.target.value = newValue;

  const rgb = [inputR, inputG, inputB].map(({ value }) => +value);

  inputHex.value = inputColorName.placeholder = rgb2Hex(...rgb);

  state.addColorValidation.colorAlreadyExists = !!state.palette.getColorByRgb(
    ...rgb
  );

  colorPreviewSingle.style.background = inputHex.value;

  updateAddColorValidationUI();
};

const handleInputHex = (e) => {
  const newValue =
    "#" + e.target.value.replace(/[^a-f0-9]/gi, "").toUpperCase();

  e.target.value = inputColorName.placeholder = newValue;
  const invalidHex = (state.addColorValidation.invalidHex =
    !isValidHex(newValue));

  if (invalidHex) {
    updateAddColorValidationUI();
    return;
  }

  const rgb = hex2Rgb(newValue);

  [inputR.value, inputG.value, inputB.value] = rgb;

  state.addColorValidation.colorAlreadyExists = !!state.palette.getColorByRgb(
    ...rgb
  );

  colorPreviewSingle.style.background = newValue;

  updateAddColorValidationUI();
};

const handleInputColorName = (e) => {
  const colorName = e.target.value.trim();

  state.addColorValidation.nameAlreadyExists = state.palette.colors
    .map(({ name }) => name.toUpperCase())
    .includes(colorName.toUpperCase());

  updateAddColorValidationUI();
};

const createColorPreview = (hex) => {
  const colorPreview = document.createElement("div");

  colorPreview.classList.add("color-preview");
  colorPreview.style.background = hex;

  return colorPreview;
};

const handleInputTextarea = (e) => {
  const value = e.target.value;
  const parsedInfos = parseColorText(value);

  addColorPreviewContainer.innerHTML = "";
  state.colorsToAdd = parsedInfos;

  if (parsedInfos.length) {
    parsedInfos.forEach((info) => {
      const colorPreview = createColorPreview(...info);
      addColorPreviewContainer.append(colorPreview);
    });

    addColorConfirmBtn.disabled = false;
  } else {
    addColorConfirmBtn.disabled = true;
  }

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
    let value = Math.max(MIN_ZOOM, ~~e.target.value);
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

        const isCustomPalette = value === PALETTE_NAME_CUSTOM;

        savePaletteBtn.classList.toggle("hidden", !isCustomPalette);

        const noColorInCustomPalette =
          isCustomPalette && !state.paletteData[value].colors.length;

        savePaletteBtn.disabled = noColorInCustomPalette;
      },
    },
    {
      dropdown: methodDropdown,
      init: (dropdown, dropdownCurrentOption) => {
        const input = dropdown.querySelector(`input[value="${state.method}"]`);

        if (input) {
          input.checked = true;
          dropdownCurrentOption.textContent = input.dataset.label;
        }
      },
      cb: (value) => {
        localStorage.setItem("method", value);
        state.method = value;
      },
    },
  ].forEach(({ dropdown, cb, init }) => {
    const dropdownOpen = dropdown.querySelector(".dropdown-open");
    const dropdownCurrentOption = dropdown.querySelector(
      ".dropdown-current-option"
    );

    if (init) init(dropdown, dropdownCurrentOption);

    dropdown.addEventListener("change", (e) => {
      const target = e.target;

      if (target.matches('.option-item input[type="radio"]')) {
        dropdownCurrentOption.textContent = target.dataset.label;
        dropdownOpen.checked = false;

        cb(target.value);

        drawUpdatedImage();
      }
    });

    dropdown.addEventListener("click", (e) => {
      const target = e.target;

      if (target.matches(".option-remove-btn")) {
        const name = target.previousElementSibling.textContent;
        const colorTextData = localStorage.getItem(
          "custom_palette_color_text_data"
        );
        const colorTextMap = JSON.parse(colorTextData);

        removePaletteUI(name);

        delete state.paletteData[name];
        delete colorTextMap[name];

        const newColorTextData = JSON.stringify(colorTextMap);

        localStorage.setItem(
          "custom_palette_color_text_data",
          newColorTextData
        );
      }
    });
  });

  canvasControlLayer.addEventListener("drop", handleDrop, false);
  canvasControlLayer.addEventListener(
    "wheel",
    (e) => zoom(e.deltaY, [e.clientX, e.clientY]),
    false
  );

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
  canvasControlLayer.addEventListener("contextmenu", preventDefaults);

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

  savePaletteBtn.addEventListener("click", () => {
    const { colors } = state.palette;
    const colorCount = colors.length;
    const hexes = colors.map(({ rgb }) => rgb2Hex(...rgb));

    if (!colorCount) return;

    savePaletteColorCount.textContent = colorCount;

    savePaletteDialog.showModal();
    savePaletteNameInput.select();
    savePaletteColorPreviewContainer.innerHTML = "";

    hexes.forEach((hex) => {
      const colorPreview = createColorPreview(hex);
      savePaletteColorPreviewContainer.append(colorPreview);
    });

    updateScrollClass(savePaletteColorPreviewContainer);
    dispatchEventTo(savePaletteNameInput, "input");
  });

  const addCustomPalette = (name) => {
    const { colors } = state.palette;

    const alreadyExists = Object.keys(state.paletteData).includes(name);

    if (alreadyExists) return;

    const colorTextData = localStorage.getItem(
      "custom_palette_color_text_data"
    );
    const colorTextMap = colorTextData ? JSON.parse(colorTextData) : {};
    const currentColorTexts = formatColorTexts(colors);

    colorTextMap[name] = currentColorTexts;

    const customPaletteData = getCustomPaletteData(colorTextMap);

    setCustomPaletteData(customPaletteData);

    localStorage.setItem(
      "custom_palette_color_text_data",
      JSON.stringify(colorTextMap)
    );

    setPaletteUI(name, { checked: true, custom: true });
  };

  savePaletteNameInput.addEventListener("input", (e) => {
    const paletteName = e.target.value.trim();
    const isEmpty = !paletteName;
    const alreadyExists = Object.keys(state.paletteData).includes(paletteName);
    const isValid = !isEmpty && !alreadyExists;

    savePaletteAlert.textContent = isValid
      ? "이 팔레트를 저장합니다."
      : isEmpty
        ? "팔레트 이름을 입력해주세요."
        : "이미 사용 중인 팔레트 이름입니다.";
    savePaletteAlert.classList.toggle("good", isValid);
    savePaletteConfirmBtn.disabled = !isValid;
  });

  savePaletteConfirmBtn.addEventListener("click", () => {
    const paletteName = savePaletteNameInput.value.trim();

    addCustomPalette(paletteName);

    savePaletteDialog.close();
  });

  savePaletteCancelBtn.addEventListener("click", () =>
    savePaletteDialog.close()
  );

  paletteResetBtn.addEventListener("click", () => {
    if (state.palette.hasCustomColor) {
      state.palette.removeAddedColors();
      savePaletteBtn.disabled = true;
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
    downloadFileName.textContent = state.fileName;
    downloadImageSize.textContent = `${state.width}×${state.height}`;

    const { width, naturalWidth } = resultImage;

    resultImage.classList.toggle("smaller", width > naturalWidth);
  });

  downloadConfirmBtn.addEventListener("click", (e) => {
    const imageURL = state.dataURL;
    const link = document.createElement("a");

    link.href = imageURL;
    link.download = state.fileName;

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

  [addColorPreviewContainer, savePaletteColorPreviewContainer].forEach(
    (colorPreviewContainer) => {
      colorPreviewContainer.addEventListener("scroll", (e) =>
        updateScrollClass(e.target)
      );
    }
  );

  [inputR, inputG, inputB].forEach((input) =>
    input.addEventListener("input", handleInputRgb)
  );

  inputHex.addEventListener("input", handleInputHex);

  inputColorName.addEventListener("input", handleInputColorName);

  enableAutoResize(addColorTextarea);

  [addColorTabSingle, addColorTabList].forEach((tab) =>
    tab.addEventListener("change", (e) => {
      const textField =
        e.target === addColorTabSingle ? inputHex : addColorTextarea;

      dispatchEventTo(textField, "input");

      textField.select();
    })
  );

  addColorTextarea.addEventListener("input", handleInputTextarea);

  addColorForm.addEventListener("submit", confirmAddColor);
  addColorConfirmBtn.addEventListener("click", confirmAddColor);

  addColorCancelBtn.addEventListener("click", () => addColorDialog.close());

  aside.addEventListener("pointerdown", (e) => {
    state.palette.unhighlightAll();

    if (e.target.matches(".color-remove-btn")) return;

    const colorsToRemove = customPaletteList.querySelectorAll("label.removing");

    if (!colorsToRemove.length) return;

    colorsToRemove.forEach((label) => {
      label.classList.remove("removing");
    });
  });

  settingsForm.addEventListener("submit", preventDefaults);
};

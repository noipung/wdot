const state = {
  brightness: null,
  contrast: null,
  dither: null,
  aspectRatio: 1,
  width: null,
  height: null,
  zoom: null,
  palette: null,
  fileName: null,
  image: null,
  resized: null,
  dithered: null,
};

const downloadBtn = document.querySelector(".download-btn");
const total = document.querySelector(".total");

const form = document.querySelector("form");

const canvasOverlay = document.querySelector(".canvas-overlay");
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

// 이미지 드롭

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  canvasOverlay.addEventListener(eventName, preventDefaults, false);
});

["dragenter", "dragover"].forEach((eventName) => {
  canvasOverlay.addEventListener(
    eventName,
    () => canvasOverlay.classList.add("active"),
    false
  );
});

["dragleave", "drop"].forEach((eventName) => {
  canvasOverlay.addEventListener(
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

const paletteList = document.querySelector(".palette");

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

    getResized();
    draw();
  });

  return li;
};

wplacePalette.forEach(({ rgb, name, locked }) => {
  const colorListItem = createColorListItem(rgb, name, locked);
  paletteList.append(colorListItem);
});

const handleClickInitBtn = () => {
  state.palette = initPalette;
  checks.forEach((check) => {
    check.checked = check.isBasicColor;
  });

  if (!validate()) return;

  getResized();
  draw();
};

const li = document.createElement("li");
const initBtn = document.createElement("button");
initBtn.addEventListener("click", handleClickInitBtn);
initBtn.classList.add("init-btn");

li.append(initBtn);
paletteList.append(li);

const selectAllBtn = document.querySelector(".select-all-btn");
const unselectAllBtn = document.querySelector(".unselect-all-btn");

const handleClickSelectAllBtn = () => {
  state.palette = wholePalette;
  checks.forEach((check) => {
    check.checked = true;
  });

  if (!validate()) return;

  getResized();
  draw();
};

selectAllBtn.addEventListener("click", handleClickSelectAllBtn);

const handleClickUnselectAllBtn = () => {
  state.palette = [];
  checks.forEach((check) => {
    check.checked = false;
  });

  if (!validate()) return;

  getResized();
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

const flattenTransparentPixels = (canvas) => {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];

    if (alpha > 0 && alpha < 255) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];

      const newRed = Math.round(red * (alpha / 255) + 255 * (1 - alpha / 255));
      const newGreen = Math.round(
        green * (alpha / 255) + 255 * (1 - alpha / 255)
      );
      const newBlue = Math.round(
        blue * (alpha / 255) + 255 * (1 - alpha / 255)
      );

      data[i] = newRed;
      data[i + 1] = newGreen;
      data[i + 2] = newBlue;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const countOpaquePixels = (imageData) => {
  let count = 0;
  const data = imageData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 255) count++;
  }
  return count;
};

const getResized = () => {
  const resized = document.createElement("canvas");
  const dithered = document.createElement("canvas");

  const resizedCtx = resized.getContext("2d");
  const processedCtx = dithered.getContext("2d");

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

  flattenTransparentPixels(resized);

  const imageData = dither(resizedCtx, pw, ph);

  total.textContent = countOpaquePixels(imageData);

  processedCtx.putImageData(imageData, 0, 0);

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

  ctx.imageSmoothingEnabled = false;
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

const handleImageLoad = (image) => {
  state.image = image;
  state.aspectRatio = image.width / image.height;

  state.width = form.width.value = image.width;
  state.height = form.height.value = image.height;

  zoomInput.value = state.zoom = getZoom();

  canvasOverlay.classList.add("image-loaded");
  downloadBtn.disabled = false;

  getResized();
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

canvasOverlay.addEventListener("drop", handleDrop, false);
canvasOverlay.addEventListener(
  "wheel",
  (e) => {
    state.zoom = zoomInput.value = ~~(+zoomInput.value * (1 - e.deltaY / 1000));

    if (!validate()) return;

    draw();
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

[
  "brightness",
  "brightness-range",
  "contrast",
  "contrast-range",
  "saturation",
  "saturation-range",
  "dither",
  "dither-range",
  "width",
  "height",
].forEach((key) => {
  const input = form[key];

  const handleInput = () => {
    const numberValue = +input.value;

    if (!["width", "height"].includes(key)) {
      const isRange = key.endsWith("range");
      const pairKey = isRange ? key.replace("-range", "") : `${key}-range`;

      state[isRange ? pairKey : key] = numberValue;

      const pairInput = form[pairKey];

      if (pairInput) pairInput.value = numberValue;
    } else {
      if (key === "width") {
        state.width = numberValue;
        form.height.value = state.height = ~~(state.width / state.aspectRatio);
      } else {
        state.height = numberValue;
        form.width.value = state.width = ~~(state.height * state.aspectRatio);
      }
      zoomInput.value = state.zoom = getZoom();
    }

    if (!validate()) return;

    getResized();
    draw();
  };

  input.addEventListener("input", handleInput);

  handleInput();
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

  if (!validate()) return;

  // zoomInput.value = state.zoom = getZoom();

  draw();
};

addEventListener("resize", resizeCanvas);

resizeCanvas();

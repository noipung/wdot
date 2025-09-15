import { state } from "./state.js";
import { dist } from "./utils.js";

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

export const getClosestColor = createColorMatcher();

// dither 함수만 워커를 사용할 수 있도록 수정

let ditherWorker = null;
function getDitherWorker() {
  if (!ditherWorker) {
    ditherWorker = new Worker(new URL("./dither.worker.js", import.meta.url), {
      type: "module",
    });
  }
  return ditherWorker;
}

/**
 * 워커를 사용한 비동기 디더링 함수
 * @returns {Promise<ImageData>}
 */
export function dither(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const ditherIntensity = state.dither / 100;
  const palette = state.palette.getEnabledColors().map(({ rgb }) => rgb);

  return new Promise((resolve, reject) => {
    const worker = getDitherWorker();

    const handleMessage = (e) => {
      worker.removeEventListener("message", handleMessage);
      resolve(e.data.imageData);
    };
    const handleError = (err) => {
      worker.removeEventListener("error", handleError);
      reject(err);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    // imageData는 transferable로 전달
    worker.postMessage(
      {
        imageData,
        width,
        height,
        palette,
        ditherIntensity,
      },
      [imageData.data.buffer]
    );
  });
}

export function getAdjusted(image, brightness, contrast, saturation) {
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

export function makeOpaque(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / 255) * 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

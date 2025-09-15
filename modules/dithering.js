import { state } from "./state.js";
import { createWorkerTask } from "./worker.js";

export async function dither(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const ditherIntensity = state.dither / 100;
  const palette = state.palette.getEnabledColors().map(({ rgb }) => rgb);

  const dataToSend = {
    imageData,
    width,
    height,
    palette,
    ditherIntensity,
  };

  const transferableObjects = [imageData.data.buffer];

  const result = await createWorkerTask(
    state.worker.dither,
    dataToSend,
    transferableObjects
  );

  return result.imageData;
}

export async function adjust(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { brightness, contrast, saturation } = state;

  const dataToSend = { imageData, brightness, contrast, saturation };

  const transferableObjects = [imageData.data.buffer];

  const result = await createWorkerTask(
    state.worker.adjust,
    dataToSend,
    transferableObjects
  );

  return result.imageData;
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

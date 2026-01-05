import { state } from "./state.js";
import { createWorkerTask } from "./worker.js";

export async function dither(canvas, onProgress) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const ditherIntensity = state.dither / 100;
  const palette = state.palette.getEnabledColorRgbs();
  const { method } = state;
  const { terrainColor } = state.palette;

  const dataToSend = {
    imageData,
    width,
    height,
    palette,
    ditherIntensity,
    method,
    terrainColor,
  };

  const transferableObjects = [imageData.data.buffer];

  state.workers.dither.isProcessing = true;

  const result = await createWorkerTask(
    state.workers.dither.instance,
    dataToSend,
    transferableObjects,
    onProgress
  );

  state.workers.dither.isProcessing = false;

  return result.imageData;
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

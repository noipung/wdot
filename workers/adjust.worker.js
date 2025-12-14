const getAdjustedImageData = (imageData, brightness, contrast, saturation, onProgress) => {
  const data = imageData.data;
  const totalPixels = data.length / 4;

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

    if (onProgress && (i / 4) % Math.max(1, Math.floor(totalPixels / 100)) === 0) {
      const percentage = Math.round(((i / 4) / totalPixels) * 100);
      onProgress(percentage);
    }
  }
  return imageData;
};

self.onmessage = (e) => {
  const { imageData, brightness, contrast, saturation } = e.data;

  const resultImageData = getAdjustedImageData(
    imageData,
    brightness,
    contrast,
    saturation,
    (percentage) => {
      self.postMessage({ type: 'progress', percentage });
    }
  );

  self.postMessage({ type: 'result', imageData: resultImageData }, [
    resultImageData.data.buffer,
  ]);
};

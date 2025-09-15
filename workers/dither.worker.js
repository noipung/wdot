function rgbToOklab(rgb) {
  const [r, g, b] = rgb.map((c) => c / 255);

  const L = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const a = 0.2119034982 * r - 0.531241887 * g + 0.3193383888 * b;
  const b_ = 0.0933188204 * r + 0.1633534244 * g - 0.2566722448 * b;

  return [L, a, b_];
}

const dist = (a, b) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

const getClosestColor = (color, palette) => {
  const oklabColor = rgbToOklab(color);

  const oklabPalette = palette.map(rgbToOklab);

  let closest = palette[0];
  let minDist = dist(oklabColor, oklabPalette[0]);

  for (let i = 1; i < oklabPalette.length; i++) {
    const d = dist(oklabColor, oklabPalette[i]);
    if (d < minDist) {
      minDist = d;
      closest = palette[i];
    }
  }
  return closest;
};

const getDitherdImageData = (
  imageData,
  width,
  height,
  palette,
  ditherIntensity
) => {
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const newColor = getClosestColor(
        [oldR, oldG, oldB],
        palette.length ? palette : [[0, 0, 0]]
      );
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
};

self.onmessage = (e) => {
  const { imageData, width, height, palette, ditherIntensity } = e.data;

  const resultImageData = getDitherdImageData(
    imageData,
    width,
    height,
    palette,
    ditherIntensity
  );

  self.postMessage({ imageData: resultImageData }, [
    resultImageData.data.buffer,
  ]);
};

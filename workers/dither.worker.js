function rgbToLab(rgb) {
  let r = rgb[0] / 255;
  let g = rgb[1] / 255;
  let b = rgb[2] / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  r *= 100;
  g *= 100;
  b *= 100;

  let x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  x /= 95.047;
  y /= 100.0;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  const l = 116 * y - 16;
  const a = 500 * (x - y);
  const b_ = 200 * (y - z);

  return [l, a, b_];
}

function ciede2000(lab1, lab2) {
  const [l1, a1, b1] = lab1;
  const [l2, a2, b2] = lab2;

  const rad2deg = (rad) => rad * (180 / Math.PI);
  const deg2rad = (deg) => deg * (Math.PI / 180);

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;

  const G =
    0.5 *
    (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = rad2deg(Math.atan2(b1, a1p));
  const h2p = rad2deg(Math.atan2(b2, a2p));

  const dLp = l2 - l1;
  const dCp = C2p - C1p;
  let dhp = 0;

  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp / 2));

  const Lpbar = (l1 + l2) / 2;
  const Cpbar = (C1p + C2p) / 2;
  let Hpbar = 0;

  if (C1p * C2p !== 0) {
    Hpbar = (h1p + h2p) / 2;
    if (Math.abs(h1p - h2p) > 180) {
      Hpbar += 180;
    }
  }

  const T =
    1 -
    0.17 * Math.cos(deg2rad(Hpbar - 30)) +
    0.24 * Math.cos(deg2rad(2 * Hpbar)) +
    0.32 * Math.cos(deg2rad(3 * Hpbar + 6)) -
    0.2 * Math.cos(deg2rad(4 * Hpbar - 63));

  const dTheta = 30 * Math.exp(-Math.pow((Hpbar - 275) / 25, 2));
  const Rc =
    2 * Math.sqrt(Math.pow(Cpbar, 7) / (Math.pow(Cpbar, 7) + Math.pow(25, 7)));
  const Sl =
    1 +
    (0.015 * Math.pow(Lpbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lpbar - 50, 2));
  const Sc = 1 + 0.045 * Cpbar;
  const Sh = 1 + 0.015 * Cpbar * T;
  const Rt = -Math.sin(deg2rad(2 * dTheta)) * Rc;

  const dE00 = Math.sqrt(
    Math.pow(dLp / Sl, 2) +
    Math.pow(dCp / Sc, 2) +
    Math.pow(dHp / Sh, 2) +
    Rt * (dCp / Sc) * (dHp / Sh)
  );

  return dE00;
}

function rgbToOklab(rgb) {
  const [r, g, b] = rgb.map((c) => c / 255);

  const L = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const M = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const S = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l = Math.cbrt(L);
  const m = Math.cbrt(M);
  const s = Math.cbrt(S);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

// RGB 유클리드 거리 계산 함수
function rgbDistance(rgb1, rgb2) {
  const [r1, g1, b1] = rgb1;
  const [r2, g2, b2] = rgb2;

  return Math.sqrt(
    Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2)
  );
}

const oklabDistance = (a, b) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

const getClosestColor = (color, palette, method = "rgb") => {
  switch (method) {
    case "ciede2000":
      const labColor = rgbToLab(color);
      const labPalette = palette.map(rgbToLab);

      let closestCiede = palette[0];
      let minDistCiede = ciede2000(labColor, labPalette[0]);

      for (let i = 1; i < labPalette.length; i++) {
        const d = ciede2000(labColor, labPalette[i]);
        if (d < minDistCiede) {
          minDistCiede = d;
          closestCiede = palette[i];
        }
      }
      return closestCiede;

    case "oklab":
      const oklabColor = rgbToOklab(color);
      const oklabPalette = palette.map(rgbToOklab);

      let closestOklab = palette[0];
      let minDistOklab = oklabDistance(oklabColor, oklabPalette[0]);

      for (let i = 1; i < oklabPalette.length; i++) {
        const d = oklabDistance(oklabColor, oklabPalette[i]);
        if (d < minDistOklab) {
          minDistOklab = d;
          closestOklab = palette[i];
        }
      }
      return closestOklab;

    case "rgb":
    default:
      let closestRgb = palette[0];
      let minDistRgb = rgbDistance(color, palette[0]);

      for (let i = 1; i < palette.length; i++) {
        const d = rgbDistance(color, palette[i]);
        if (d < minDistRgb) {
          minDistRgb = d;
          closestRgb = palette[i];
        }
      }
      return closestRgb;
  }
};

const getDitherdImageData = (
  imageData,
  width,
  height,
  palette,
  ditherIntensity,
  method,
  onProgress
) => {
  const data = imageData.data;
  const totalPixels = width * height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const newColor = getClosestColor(
        [oldR, oldG, oldB],
        palette.length ? palette : [[0, 0, 0]],
        method
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

      if (onProgress && (y * width + x) % Math.max(1, Math.floor(totalPixels / 100)) === 0) {
        const percentage = Math.round(((y * width + x) / totalPixels) * 100);
        onProgress(percentage);
      }
    }
  }

  return imageData;
};

const makeTerrainTransparent = (imageData, rgb, onProgress) => {
  const { data } = imageData;
  const [targetR, targetG, targetB] = rgb;
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r === targetR && g === targetG && b === targetB) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
    }

    if (onProgress && (i / 4) % Math.max(1, Math.floor(totalPixels / 100)) === 0) {
      const percentage = Math.round(((i / 4) / totalPixels) * 100);
      onProgress(percentage);
    }
  }

  return imageData;
};

self.onmessage = (e) => {
  const {
    imageData,
    width,
    height,
    palette,
    ditherIntensity,
    method,
    terrainColor,
  } = e.data;

  const hasTerrain = !!terrainColor;
  const ditherWeight = hasTerrain ? 0.95 : 1.0; // terrain이 있으면 디더링 95%, 없으면 100%

  let resultImageData = getDitherdImageData(
    imageData,
    width,
    height,
    palette,
    ditherIntensity,
    method,
    (percentage) => {
      // 디더링 진행률을 전체의 0-95% (또는 0-100%)로 표시
      self.postMessage({ type: 'progress', percentage: Math.round(percentage * ditherWeight) });
    }
  );

  if (terrainColor) {
    resultImageData = makeTerrainTransparent(
      resultImageData,
      terrainColor,
      (percentage) => {
        // terrain 처리는 95-100%
        self.postMessage({ type: 'progress', percentage: 95 + Math.round(percentage * 0.05) });
      }
    );
  }

  self.postMessage({ type: 'progress', percentage: 100 });

  self.postMessage({ type: 'result', imageData: resultImageData }, [
    resultImageData.data.buffer,
  ]);
};

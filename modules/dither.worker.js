// 워커: 디더링 연산만 담당. state, DOM 접근 불가

// 팔레트에서 가장 가까운 색 찾기
function dist(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function getClosestColor(color, palette) {
  let closest = palette[0];
  let minDist = dist(color, closest);
  for (let i = 1; i < palette.length; i++) {
    const d = dist(color, palette[i]);
    if (d < minDist) {
      minDist = d;
      closest = palette[i];
    }
  }
  return closest;
}

self.onmessage = function (e) {
  const { imageData, width, height, palette, ditherIntensity } = e.data;
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

  // Transfer imageData back
  self.postMessage({ imageData }, [imageData.data.buffer]);
};

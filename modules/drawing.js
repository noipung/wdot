import { state } from "./state.js";
import { DOM } from "./dom.js";
import {
  DPR,
  SHOW_GRID_ZOOM_THRESHOLD,
  SPEECH_BUBBLE_WIDTH,
  SPEECH_BUBBLE_HEIGHT,
  SPEECH_BUBBLE_RADIUS,
  SPEECH_BUBBLE_BORDER,
  GRID_COLOR,
  SPEECH_BUBBLE_BG_COLOR,
  SPEECH_BUBBLE_BORDER_COLOR,
} from "./constants.js";

function drawSpeechBubbleFromTail(
  ctx,
  imageData,
  x,
  y,
  width,
  height,
  radius,
  border
) {
  const tailWidth = border * 2;
  const tailHeight = height;
  const bubbleX = x - width / 2;
  const bubbleY = y - (height + tailHeight);
  const tailPointX = x;
  const bodyBottomY = y - tailHeight;
  const outerRadius = radius + border;

  ctx.beginPath();

  ctx.moveTo(bubbleX + outerRadius, bubbleY);
  ctx.lineTo(bubbleX + width - outerRadius, bubbleY);

  ctx.arc(
    bubbleX + width - outerRadius,
    bubbleY + outerRadius,
    outerRadius,
    Math.PI * 1.5,
    Math.PI * 2
  );
  ctx.lineTo(bubbleX + width, bubbleY + height - outerRadius);

  ctx.arc(
    bubbleX + width - outerRadius,
    bubbleY + height - outerRadius,
    outerRadius,
    0,
    Math.PI * 0.5
  );

  ctx.lineTo(tailPointX + tailWidth / 2, bodyBottomY);

  ctx.lineTo(tailPointX, y); // (x, y)

  ctx.lineTo(tailPointX - tailWidth / 2, bodyBottomY);

  ctx.lineTo(bubbleX + outerRadius, bodyBottomY);
  ctx.arc(
    bubbleX + outerRadius,
    bodyBottomY - outerRadius,
    outerRadius,
    Math.PI * 0.5,
    Math.PI
  );

  ctx.lineTo(bubbleX, bubbleY + outerRadius);
  ctx.arc(
    bubbleX + outerRadius,
    bubbleY + outerRadius,
    outerRadius,
    Math.PI,
    Math.PI * 1.5
  );

  ctx.closePath();

  ctx.closePath();

  ctx.fillStyle = SPEECH_BUBBLE_BG_COLOR;
  ctx.fill();
  ctx.linewidth = 1;
  ctx.lineJoin = "round";
  ctx.strokeStyle = SPEECH_BUBBLE_BORDER_COLOR;
  ctx.stroke();

  const innerX = bubbleX + border;
  const innerY = bubbleY + border;
  const innerWidth = width - border * 2;
  const innerHeight = height - border * 2;

  ctx.save();

  ctx.beginPath();

  ctx.moveTo(innerX + radius, innerY);

  ctx.lineTo(innerX + innerWidth - radius, innerY);
  ctx.arc(
    innerX + innerWidth - radius,
    innerY + radius,
    radius,
    Math.PI * 1.5,
    Math.PI * 2
  );

  ctx.lineTo(innerX + innerWidth, innerY + innerHeight - radius);
  ctx.arc(
    innerX + innerWidth - radius,
    innerY + innerHeight - radius,
    radius,
    0,
    Math.PI * 0.5
  );

  ctx.lineTo(innerX + radius, bodyBottomY - border);
  ctx.arc(
    innerX + radius,
    bodyBottomY - border - radius,
    radius,
    Math.PI * 0.5,
    Math.PI
  );

  ctx.lineTo(innerX, innerY + radius);
  ctx.arc(innerX + radius, innerY + radius, radius, Math.PI, Math.PI * 1.5);

  ctx.closePath();

  ctx.clip();

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(
    tempCanvas,
    innerX - innerWidth / 2,
    innerY - innerHeight / 2,
    (innerWidth * (2 + 2)) / 2,
    (innerHeight * (2 + 2)) / 2
  );

  ctx.restore();
}

const drawMark = () => {
  const { imageData } = state.mark;
  const [rx, ry] = state.mark.r;
  const { x: viewX, y: viewY, width: viewWidth, height: viewHeight } = state.viewport.bounds;
  const x = rx * viewWidth + viewX;
  const y = ry * viewHeight + viewY;

  drawSpeechBubbleFromTail(
    DOM.canvas.ctx,
    imageData,
    x,
    y,
    SPEECH_BUBBLE_WIDTH,
    SPEECH_BUBBLE_HEIGHT,
    SPEECH_BUBBLE_RADIUS,
    SPEECH_BUBBLE_BORDER
  );
};

const drawGrid = () => {
  const { x: viewX, y: viewY, width: viewWidth, height: viewHeight } = state.viewport.bounds;
  const { width, height } = state;

  DOM.canvas.ctx.beginPath();

  for (let ix = 0; ix <= width; ix++) {
    const x = viewX + (viewWidth / width) * ix;
    DOM.canvas.ctx.moveTo(x, viewY);
    DOM.canvas.ctx.lineTo(x, viewY + viewHeight);
  }

  for (let iy = 0; iy <= height; iy++) {
    const y = viewY + (viewHeight / height) * iy;
    DOM.canvas.ctx.moveTo(viewX, y);
    DOM.canvas.ctx.lineTo(viewX + viewWidth, y);
  }

  DOM.canvas.ctx.linewidth = 1;
  DOM.canvas.ctx.strokeStyle = GRID_COLOR;
  DOM.canvas.ctx.stroke();
};

export const draw = () => {
  let { width: cw, height: ch } = DOM.canvas.el;

  DOM.canvas.ctx.clearRect(0, 0, cw, ch);

  if (!state.resized) return;

  const { width: rw, height: rh } = state.resized;
  const zoom = state.viewport.zoom / 100;
  const viewWidth = Math.round(rw * zoom);
  const viewHeight = Math.round(rh * zoom);

  // 캔버스 중심 계산
  const canvasCenterX = (cw / DPR - viewWidth) / 2;
  const canvasCenterY = (ch / DPR - viewHeight) / 2;

  // 오프셋 적용
  const viewX = Math.round(canvasCenterX + state.viewport.tempOffset.x);
  const viewY = Math.round(canvasCenterY + state.viewport.tempOffset.y);

  const resultImage = state.showOriginal ? state.adjusted : state.dithered;

  // bounds를 객체로 저장
  state.viewport.bounds = { x: viewX, y: viewY, width: viewWidth, height: viewHeight };

  DOM.canvas.ctx.imageSmoothingEnabled = zoom < 1;
  DOM.canvas.ctx.drawImage(
    resultImage,
    viewX,
    viewY,
    viewWidth,
    viewHeight
  );

  if (
    state.showOriginal &&
    state.showGrid &&
    state.viewport.zoom >= SHOW_GRID_ZOOM_THRESHOLD
  )
    drawGrid();
  if (state.mark) drawMark();
};

import { state } from "./state.js";
import { canvas, ctx, DPR } from "./constants.js";

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

  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.linewidth = 1;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000";
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
  const [zx, zy, zw, zh] = state.zoomRect;
  const x = rx * zw + zx;
  const y = ry * zh + zy;

  drawSpeechBubbleFromTail(ctx, imageData, x, y, 30, 30, 4, 4);
};

export const draw = () => {
  let { width: cw, height: ch } = canvas;

  ctx.clearRect(0, 0, cw, ch);

  const { width: rw, height: rh } = state.resized;
  const zoom = state.zoom / 100;
  const zw = Math.round(rw * zoom);
  const zh = Math.round(rh * zoom);

  const center = [
    Math.round((cw / DPR - zw) / 2),
    Math.round((ch / DPR - zh) / 2),
  ];
  const [px, py] = state.movedPosition;

  center[0] += px;
  center[1] += py;

  const resultImage = state.showOriginal ? state.adjusted : state.dithered;

  state.zoomRect = [...center, zw, zh];
  ctx.drawImage(resultImage, ...state.zoomRect);

  if (state.mark) drawMark();
};

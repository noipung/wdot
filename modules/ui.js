import { DOM } from "./dom.js";
import { DPR } from "./constants.js";
import { validate } from "./utils.js";
import { draw } from "./drawing.js";

export const resizeCanvas = () => {
  const { el: canvas, ctx } = DOM.canvas;
  const { width, height } = canvas.getBoundingClientRect();

  canvas.width = width * DPR;
  canvas.height = height * DPR;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(DPR, DPR);

  ctx.imageSmoothingEnabled = false;

  if (!validate()) return;

  draw();
};

addEventListener("resize", resizeCanvas);

// 초기 캔버스 크기 설정
resizeCanvas();

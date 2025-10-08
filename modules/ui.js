import { canvas, ctx, DPR } from "./constants.js";
import { validate } from "./utils.js";
import { draw } from "./drawing.js";

export const resizeCanvas = () => {
  const { width, height } = canvas.getBoundingClientRect();

  canvas.width = width * DPR;
  canvas.height = height * DPR;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(DPR, DPR);

  ctx.imageSmoothingEnabled = false;

  if (!validate()) return;

  draw();
};

// 창 크기 변경 시 캔버스 리사이즈
addEventListener("resize", resizeCanvas);

// 초기 캔버스 크기 설정
resizeCanvas();

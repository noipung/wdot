import { state } from "./state.js";
import { canvas, ctx } from "./constants.js";
import { disableImageSmoothing } from "./utils.js";

export const draw = () => {
  const { width: cw, height: ch } = canvas;

  ctx.clearRect(0, 0, cw, ch);

  const { width: rw, height: rh } = state.resized;
  const zoom = state.zoom / 100;
  const zw = rw * zoom;
  const zh = rh * zoom;

  const center = [(cw - zw) / 2, (ch - zh) / 2];
  const [px, py] = state.position;

  center[0] += px;
  center[1] += py;

  ctx.drawImage(state.dithered, ...center, zw, zh);
};

// 이미지 스무딩 비활성화
disableImageSmoothing();

import { state } from "./state.js";
import { canvas, ctx } from "./constants.js";

export const draw = () => {
  const { width: cw, height: ch } = canvas;

  ctx.clearRect(0, 0, cw, ch);

  const { width: rw, height: rh } = state.resized;
  const zoom = state.zoom / 100;
  const zw = Math.round(rw * zoom);
  const zh = Math.round(rh * zoom);

  const center = [Math.round((cw - zw) / 2), Math.round((ch - zh) / 2)];
  const [px, py] = state.movedPosition;

  center[0] += px;
  center[1] += py;

  const resultImage = state.showOriginal ? state.adjusted : state.dithered;

  state.zoomRect = [...center, zw, zh];
  ctx.drawImage(resultImage, ...center, zw, zh);
};

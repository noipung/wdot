import { state } from "./state.js";
import { DOM } from "./dom.js";
import { DPR } from "./constants.js";

/**
 * 좌표계 변환 유틸리티
 * 
 * 좌표계 종류:
 * - Screen: 화면/뷰포트 좌표 (clientX, clientY)
 * - Canvas: 캔버스 내부 좌표 (DPR 적용 전)
 * - Image: 이미지 픽셀 좌표
 */
export class CoordinateSystem {
  static screenToCanvas(screenX, screenY) {
    const canvasRect = DOM.canvas.el.getBoundingClientRect();
    return {
      x: (screenX - canvasRect.left) / DPR,
      y: (screenY - canvasRect.top) / DPR,
    };
  }

  static screenToImage(screenX, screenY) {
    if (!state.viewport.bounds) return { x: 0, y: 0 };
    
    const canvasPos = this.screenToCanvas(screenX, screenY);
    const { x: viewX, y: viewY, width: viewWidth, height: viewHeight } = state.viewport.bounds;
    
    // 캔버스 좌표를 이미지 좌표로 변환
    const relativeX = (canvasPos.x - viewX) / viewWidth;
    const relativeY = (canvasPos.y - viewY) / viewHeight;
    
    const imageWidth = state.showOriginal ? state.adjusted.width : state.dithered.width;
    const imageHeight = state.showOriginal ? state.adjusted.height : state.dithered.height;
    
    return {
      x: Math.floor(relativeX * imageWidth),
      y: Math.floor(relativeY * imageHeight),
    };
  }

  static imageToCanvas(imageX, imageY) {
    if (!state.viewport.bounds) return { x: 0, y: 0 };
    
    const { x: viewX, y: viewY, width: viewWidth, height: viewHeight } = state.viewport.bounds;
    const imageWidth = state.showOriginal ? state.adjusted.width : state.dithered.width;
    const imageHeight = state.showOriginal ? state.adjusted.height : state.dithered.height;
    
    const relativeX = imageX / imageWidth;
    const relativeY = imageY / imageHeight;
    
    return {
      x: viewX + relativeX * viewWidth,
      y: viewY + relativeY * viewHeight,
    };
  }

  static imageToScreen(imageX, imageY) {
    const canvasPos = this.imageToCanvas(imageX, imageY);
    const canvasRect = DOM.canvas.el.getBoundingClientRect();
    
    return {
      x: canvasPos.x * DPR + canvasRect.left,
      y: canvasPos.y * DPR + canvasRect.top,
    };
  }

  static getImageBounds() {
    if (!state.viewport.bounds) return { x: 0, y: 0, width: 0, height: 0 };
    return { ...state.viewport.bounds };
  }

  static getImageCenter() {
    const bounds = this.getImageBounds();
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
  }
}


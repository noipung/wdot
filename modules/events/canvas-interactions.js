import { state } from "../state.js";
import { DOM } from "../dom.js";
import {
    ZOOM_STEP,
    MIN_ZOOM,
    DRAG_THRESHOLD,
} from "../constants.js";
import {
    validate,
    getTouchDistance,
    getMidpoint,
    rgb2Hex,
    getContentColor,
    preventDefaults,
} from "../utils.js";
import { draw } from "../drawing.js";
import { CoordinateSystem } from "../coordinate-system.js";

// 줌 로직 헬퍼 함수
// 줌 중심점(캔버스 좌표)을 기준으로 오프셋을 조정
const getRelativeZoomOffset = (zoomCenterCanvas, zoomFactor) => {
    if (!state.viewport.bounds) return { x: 0, y: 0 };
    
    const imageCenter = CoordinateSystem.getImageCenter();
    
    const offsetX = (zoomCenterCanvas.x - imageCenter.x) * (1 - zoomFactor);
    const offsetY = (zoomCenterCanvas.y - imageCenter.y) * (1 - zoomFactor);

    return { x: offsetX, y: offsetY };
};

// 줌 이벤트
const zoom = (deltaY, screenPoint = null) => {
    const isZoomIn = deltaY < 0;
    const oldZoom = state.viewport.zoom;

    state.viewport.zoom = DOM.ui.zoom.input.value = Math.max(
        ~~(+DOM.ui.zoom.input.value * (1 + (isZoomIn ? ZOOM_STEP : -ZOOM_STEP))),
        MIN_ZOOM
    );

    if (!validate()) return;

    // 커서 중심 줌
    if (screenPoint) {
        const zoomFactor = state.viewport.zoom / oldZoom;
        // 화면 좌표를 캔버스 좌표로 변환
        const zoomCenterCanvas = CoordinateSystem.screenToCanvas(screenPoint[0], screenPoint[1]);
        const offset = getRelativeZoomOffset(zoomCenterCanvas, zoomFactor);

        state.viewport.offset.x += offset.x;
        state.viewport.offset.y += offset.y;
        state.viewport.tempOffset = { ...state.viewport.offset };
    }

    draw();
};

const handlePinchZoom = (e) => {
    if (state.interaction.touches.length < 2) return;

    const touch1 = state.interaction.touches[0];
    const touch2 = state.interaction.touches[1];

    const currentDistance = getTouchDistance(touch1, touch2);

    if (state.interaction.startTouchDistance > 0) {
        const zoomFactor = currentDistance / state.interaction.startTouchDistance;
        const newZoom = Math.max(MIN_ZOOM, ~~(state.interaction.startZoom * zoomFactor));

        state.viewport.zoom = newZoom;
        DOM.ui.zoom.input.value = newZoom;

        if (!validate()) return;

        const midpoint = getMidpoint(touch1, touch2);
        const midpointCanvas = CoordinateSystem.screenToCanvas(midpoint[0], midpoint[1]);
        const startPointCanvas = CoordinateSystem.screenToCanvas(
            state.interaction.startPoint.x,
            state.interaction.startPoint.y
        );

        const deltaX = midpointCanvas.x - startPointCanvas.x;
        const deltaY = midpointCanvas.y - startPointCanvas.y;

        const offset = getRelativeZoomOffset(startPointCanvas, zoomFactor);

        moveTempPosition(offset.x + deltaX, offset.y + deltaY);

        requestAnimationFrame(draw);
    }
};

const startDragging = () => {
    state.interaction.isDragging = true;
    DOM.canvas.overlay.classList.add("dragging");
};

const moveTempPosition = (deltaX, deltaY) => {
    if (
        !state.interaction.isDragging &&
        Math.abs(deltaX) < DRAG_THRESHOLD &&
        Math.abs(deltaY) < DRAG_THRESHOLD
    )
        return;

    startDragging();

    state.viewport.tempOffset = {
        x: state.viewport.offset.x + deltaX,
        y: state.viewport.offset.y + deltaY,
    };
};

const highlightColorAt = (screenX, screenY) => {
    if (!state.dithered || !state.viewport.bounds) return;

    // 화면 좌표를 이미지 좌표로 변환
    const imagePos = CoordinateSystem.screenToImage(screenX, screenY);
    const { x: ix, y: iy } = imagePos;

    if (ix < 0 || ix >= state.width || iy < 0 || iy >= state.height) {
        state.palette.unhighlightAll();
        return;
    }

    // 상대 좌표 계산 (마크 표시용)
    const bounds = state.viewport.bounds;
    const canvasPos = CoordinateSystem.screenToCanvas(screenX, screenY);
    const rx = (canvasPos.x - bounds.x) / bounds.width;
    const ry = (canvasPos.y - bounds.y) / bounds.height;

    const [currentCanvas, currentX, currentY] = state.showOriginal
        ? [state.adjusted, ~~(rx * state.adjusted.width), ~~(ry * state.adjusted.height)]
        : [state.dithered, ix, iy];

    const currentCtx = currentCanvas.getContext("2d");
    const imageData = currentCtx.getImageData(currentX - 1, currentY - 1, 3, 3);
    const { data } = imageData;
    const [r, g, b, a] = data.slice(16, 20);

    if (a === 0) {
        state.palette.unhighlightAll();
        return;
    }

    const colorOnPalette = state.palette.getColorByRgb(r, g, b);

    if (!colorOnPalette) {
        state.palette.unhighlightAll();
        if (state.palette.hasCustomColor) {
            const { addColorBtn } = state.palette;
            addColorBtn.style.background = `rgb(${r}, ${g}, ${b})`;
            addColorBtn.style.color = getContentColor(r, g, b);
            DOM.dialog.addColor.inputR.value = r;
            DOM.dialog.addColor.inputG.value = g;
            DOM.dialog.addColor.inputB.value = b;
            DOM.dialog.addColor.inputHex.value = rgb2Hex(r, g, b);
            DOM.dialog.addColor.tabSingle.checked = true;
        }
    } else {
        state.palette.highlight(colorOnPalette);
    }

    state.mark = {
        r: [rx, ry],
        imageData,
    };
};

const initState = () => {
    // 드래그 시작 시 현재 오프셋을 기준으로 설정
    if (!state.viewport.offset.x && !state.viewport.offset.y) {
        state.viewport.offset = { ...state.viewport.tempOffset };
    }
};

export const initCanvasInteractions = () => {
    // 줌 버튼 이벤트
    DOM.ui.zoom.inBtn.addEventListener("click", () => zoom(-1), false);
    DOM.ui.zoom.outBtn.addEventListener("click", () => zoom(1), false);

    DOM.ui.zoom.input.addEventListener("change", (e) => {
        let value = Math.max(MIN_ZOOM, ~~e.target.value);
        e.target.value = state.viewport.zoom = value;

        if (!validate()) return;

        draw();
    });


    // 휠 줌
    DOM.canvas.controlLayer.addEventListener(
        "wheel",
        (e) => zoom(e.deltaY, [e.clientX, e.clientY]),
        false
    );

    // 터치 이벤트
    DOM.canvas.controlLayer.addEventListener("touchstart", (e) => {
        preventDefaults(e);

        // 모든 터치 포인트 저장
        state.interaction.touches = Array.from(e.touches);

        if (e.touches.length === 1) {
            state.viewport.offset = { ...state.viewport.tempOffset };
            state.interaction.startPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            state.viewport.offset = { ...state.viewport.tempOffset };
            const midpoint = getMidpoint(touch1, touch2);
            state.interaction.startPoint = { x: midpoint[0], y: midpoint[1] };

            state.interaction.startTouchDistance = getTouchDistance(touch1, touch2);
            state.interaction.startZoom = state.viewport.zoom;
        }
    });

    DOM.canvas.controlLayer.addEventListener("touchmove", (e) => {
        preventDefaults(e);

        // 터치 포인트 업데이트
        state.interaction.touches = Array.from(e.touches);

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const startCanvas = CoordinateSystem.screenToCanvas(
                state.interaction.startPoint.x,
                state.interaction.startPoint.y
            );
            const currentCanvas = CoordinateSystem.screenToCanvas(touch.clientX, touch.clientY);
            const deltaX = currentCanvas.x - startCanvas.x;
            const deltaY = currentCanvas.y - startCanvas.y;

            moveTempPosition(deltaX, deltaY);

            if (!validate()) return;
            requestAnimationFrame(draw);
        } else if (e.touches.length === 2) {
            handlePinchZoom(e);
        }
    });

    DOM.canvas.controlLayer.addEventListener("touchend", (e) => {
        preventDefaults(e);
        state.interaction.touches = Array.from(e.touches);
        if (e.touches.length < 2) {
            state.viewport.offset = { ...state.viewport.tempOffset };
            if (e.touches[0])
                state.interaction.startPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            state.interaction.startTouchDistance = 0;
        }

        if (e.touches.length === 0) {
            if (!state.interaction.isDragging) {
                highlightColorAt(
                    e.changedTouches[0].clientX,
                    e.changedTouches[0].clientY
                );
            }
            state.interaction.isDragging = false;
            state.viewport.offset = { ...state.viewport.tempOffset };
            DOM.canvas.overlay.classList.remove("dragging");
            if (!validate()) return;
            draw();
        }
    });

    // 포인터 이벤트
    DOM.canvas.controlLayer.addEventListener("contextmenu", preventDefaults);

    DOM.canvas.controlLayer.addEventListener(
        "pointerdown",
        (e) => {
            if (e.pointerType !== "touch") {
                if (e.button === 0) {
                    initState();
                    state.interaction.startPoint = { x: e.clientX, y: e.clientY };
                    state.interaction.isDragging = false;
                    DOM.canvas.controlLayer.setPointerCapture(e.pointerId);
                }
            }
        },
        false
    );

    DOM.canvas.controlLayer.addEventListener(
        "pointermove",
        (e) => {
            if (
                e.pointerType !== "touch" &&
                DOM.canvas.controlLayer.hasPointerCapture(e.pointerId)
            ) {
                e.preventDefault();

                const startCanvas = CoordinateSystem.screenToCanvas(
                    state.interaction.startPoint.x,
                    state.interaction.startPoint.y
                );
                const currentCanvas = CoordinateSystem.screenToCanvas(e.clientX, e.clientY);
                const deltaX = currentCanvas.x - startCanvas.x;
                const deltaY = currentCanvas.y - startCanvas.y;

                moveTempPosition(deltaX, deltaY);

                if (!validate()) return;

                // 부드러운 애니메이션을 위한 requestAnimationFrame 사용
                requestAnimationFrame(draw);
            }
        },
        false
    );

    DOM.canvas.controlLayer.addEventListener(
        "pointerup",
        (e) => {
            if (e.pointerType === "touch") return;

            if (state.interaction.isDragging) {
                state.viewport.offset = { ...state.viewport.tempOffset };
            }

            if (!state.interaction.isDragging) {
                highlightColorAt(e.clientX, e.clientY);
            }

            state.interaction.isDragging = false;
            DOM.canvas.controlLayer.releasePointerCapture(e.pointerId);
            DOM.canvas.overlay.classList.remove("dragging");

            if (!validate()) return;

            draw();
        },
        false
    );

    DOM.canvas.controlLayer.addEventListener(
        "pointercancel",
        (e) => {
            state.interaction.isDragging = false;
            DOM.canvas.controlLayer.releasePointerCapture(e.pointerId);
            DOM.canvas.overlay.classList.remove("dragging");
        },
        false
    );
};

import { state } from "../state.js";
import { DOM } from "../dom.js";
import {
    ZOOM_STEP,
    MIN_ZOOM,
    DRAG_THRESHOLD,
    DPR,
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

// 줌 이벤트
const zoom = (deltaY, point = null) => {
    const isZoomIn = deltaY < 0;
    const oldZoom = state.zoom;

    state.zoom = DOM.ui.zoom.input.value = Math.max(
        ~~(+DOM.ui.zoom.input.value * (1 + (isZoomIn ? ZOOM_STEP : -ZOOM_STEP))),
        MIN_ZOOM
    );

    if (!validate()) return;

    if (point) {
        const zoomFactor = state.zoom / oldZoom;
        const [mouseX, mouseY] = point;

        const imageCenterX = DOM.canvas.el.width / DPR / 2 + state.position[0];
        const imageCenterY = DOM.canvas.el.height / DPR / 2 + state.position[1];

        const offsetX = (mouseX - imageCenterX) * (1 - zoomFactor);
        const offsetY = (mouseY - imageCenterY) * (1 - zoomFactor);

        state.position[0] += offsetX;
        state.position[1] += offsetY;
        state.movedPosition = [...state.position];
    }

    draw();
};

const handlePinchZoom = (e) => {
    if (state.currentTouches.length < 2) return;

    const touch1 = state.currentTouches[0];
    const touch2 = state.currentTouches[1];

    const currentDistance = getTouchDistance(touch1, touch2);

    if (state.startTouchDistance > 0) {
        const zoomFactor = currentDistance / state.startTouchDistance;
        const newZoom = Math.max(MIN_ZOOM, ~~(state.startZoom * zoomFactor));

        state.zoom = newZoom;
        DOM.ui.zoom.input.value = newZoom;

        if (!validate()) return;

        const midpoint = getMidpoint(touch1, touch2);

        const deltaX = midpoint[0] - state.startPosition[0];
        const deltaY = midpoint[1] - state.startPosition[1];

        const imageCenterX = DOM.canvas.el.width / DPR / 2 + state.position[0];
        const imageCenterY = DOM.canvas.el.height / DPR / 2 + state.position[1];

        const offsetX = (state.startPosition[0] - imageCenterX) * (1 - zoomFactor);
        const offsetY = (state.startPosition[1] - imageCenterY) * (1 - zoomFactor);

        moveTempPosition(offsetX + deltaX, offsetY + deltaY);

        requestAnimationFrame(draw);
    }
};

const startDragging = () => {
    state.dragging = true;
    DOM.canvas.overlay.classList.add("dragging");
};

const moveTempPosition = (deltaX, deltaY) => {
    if (
        !state.dragging &&
        Math.abs(deltaX) < DRAG_THRESHOLD &&
        Math.abs(deltaY) < DRAG_THRESHOLD
    )
        return;

    startDragging();

    state.movedPosition = [
        state.position[0] + deltaX,
        state.position[1] + deltaY,
    ];
};

const highlightColorAt = (x, y) => {
    if (!state.dithered) return;

    const [zx, zy, zw, zh] = state.zoomRect;

    const rx = (x - zx) / zw;
    const ry = (y - zy) / zh;
    const ax = ~~(rx * state.adjusted.width);
    const ay = ~~(ry * state.adjusted.height);
    const ix = ~~(rx * state.width);
    const iy = ~~(ry * state.height);

    if (ix < 0 || ix >= state.width || iy < 0 || iy >= state.height) {
        state.palette.unhighlightAll();
        return;
    }

    const [currentCanvas, currentX, currentY] = state.showOriginal
        ? [state.adjusted, ax, ay]
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
    if (!state.position) {
        state.position = [...state.movedPosition];
    }
};

export const initCanvasInteractions = () => {
    // 줌 버튼 이벤트
    DOM.ui.zoom.inBtn.addEventListener("click", () => zoom(-1), false);
    DOM.ui.zoom.outBtn.addEventListener("click", () => zoom(1), false);

    DOM.ui.zoom.input.addEventListener("change", (e) => {
        let value = Math.max(MIN_ZOOM, ~~e.target.value);
        e.target.value = state.zoom = value;

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
        state.currentTouches = Array.from(e.touches);

        if (e.touches.length === 1) {
            state.position = [...state.movedPosition];
            state.startPosition = [e.touches[0].clientX, e.touches[0].clientY];
        } else if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            state.position = [...state.movedPosition];
            state.startPosition = getMidpoint(touch1, touch2);

            state.startTouchDistance = getTouchDistance(touch1, touch2);
            state.startZoom = state.zoom;
        }
    });

    DOM.canvas.controlLayer.addEventListener("touchmove", (e) => {
        preventDefaults(e);

        // 터치 포인트 업데이트
        state.currentTouches = Array.from(e.touches);

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - state.startPosition[0];
            const deltaY = touch.clientY - state.startPosition[1];

            moveTempPosition(deltaX, deltaY);

            if (!validate()) return;
            requestAnimationFrame(draw);
        } else if (e.touches.length === 2) {
            handlePinchZoom(e);
        }
    });

    DOM.canvas.controlLayer.addEventListener("touchend", (e) => {
        preventDefaults(e);
        state.currentTouches = Array.from(e.touches);
        if (e.touches.length < 2) {
            state.position = [...state.movedPosition];
            if (e.touches[0])
                state.startPosition = [e.touches[0].clientX, e.touches[0].clientY];
            state.startTouchDistance = 0;
        }

        if (e.touches.length === 0) {
            if (!state.dragging) {
                highlightColorAt(
                    e.changedTouches[0].clientX,
                    e.changedTouches[0].clientY
                );
            }
            state.dragging = false;
            state.position = [...state.movedPosition];
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
                    state.startPosition = [e.clientX, e.clientY];
                    state.dragging = false;
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

                const deltaX = e.clientX - state.startPosition[0];
                const deltaY = e.clientY - state.startPosition[1];

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

            if (state.dragging) {
                state.position = [...state.movedPosition];
            }

            if (!state.dragging) {
                highlightColorAt(e.clientX, e.clientY);
            }

            state.dragging = false;
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
            state.dragging = false;
            DOM.canvas.controlLayer.releasePointerCapture(e.pointerId);
            DOM.canvas.overlay.classList.remove("dragging");
        },
        false
    );
};

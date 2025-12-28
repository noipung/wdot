import { state } from "../state.js";
import { DOM } from "../dom.js";
import { drawUpdatedImage, updateZoom } from "../image-processing.js";
import { draw } from "../drawing.js";
import { validate, hex2Rgb, getContentColor } from "../utils.js";
import { setBgOfTerrainColorBtn } from "../palette.js";

export const initSettingsUI = () => {
  // 입력 동기화
  const links = {
    brightness: {
      link: ["#brightness", "#brightness-range"],
      init: { label: ["label[for=brightness]"], fn: () => 50 },
    },
    contrast: {
      link: ["#contrast", "#contrast-range"],
      init: { label: ["label[for=contrast]"], fn: () => 50 },
    },
    saturation: {
      link: ["#saturation", "#saturation-range"],
      init: { label: ["label[for=saturation]"], fn: () => 50 },
    },
    dither: {
      link: ["#dither", "#dither-range"],
      init: { label: ["label[for=dither]"], fn: () => 0 },
    },
    size: {
      link: ["#width", "#height"],
      init: {
        label: ["label[for=width]", "label[for=height]"],
        fn: () => (state.image ? state.image.width : 1),
      },
      logic: (value, name) =>
        ~~(value * state.aspectRatio ** (name === "width" ? -1 : 1)),
      cb: (prevValue, newValue) => {
        if (!validate()) return;

        const newZoom = Math.round(state.zoom * (prevValue / newValue));

        updateZoom(newZoom);
      },
    },
  };

  const resetLink =
    (withDraw = true) =>
    (key) => {
      const { link, init, cb } = links[key];

      if (!init.fn) return;

      const firstInput = document.querySelector(link[0]);
      const newValue = init.fn();

      if (firstInput.value == newValue) return;

      firstInput.value = newValue;
      firstInput.syncInputs();

      if (withDraw) drawUpdatedImage(cb);
    };

  Object.keys(links).forEach((key) => {
    const { link, init, logic, cb } = links[key];
    const $ = (selector) => document.querySelector(selector);
    const inputs = link.map($);
    const labels = init.label.map($);

    inputs.forEach((input) => {
      const eventType = input.type === "range" ? "input" : "change";

      input.syncInputs = () => {
        let numberValue = +input.value;

        if (input.type === "number" && eventType === "change") {
          const min = input.min !== "" ? +input.min : -Infinity;
          const max = input.max !== "" ? +input.max : Infinity;
          numberValue = Math.max(min, Math.min(max, numberValue));
        }

        input.value = state[input.name] = numberValue;

        const restInputs = inputs.filter(
          (currentInput) => currentInput !== input
        );

        if (restInputs.length === 0) return;

        restInputs.forEach((restInput) => {
          restInput.value = state[restInput.name] = logic
            ? logic(numberValue, input.name)
            : numberValue;
        });
      };

      input.addEventListener(eventType, () => {
        input.syncInputs();
        drawUpdatedImage(cb);
      });

      input.syncInputs();
    });

    if (labels.length) {
      labels.forEach((label) => {
        label.addEventListener("click", () => {
          if (!validate()) return;
          resetLink(true)(key);
        });
      });
    }
  });

  DOM.ui.sizeBtns.forEach((button) => {
    button.addEventListener("click", () => {
      const { dimension, delta } = button.dataset;
      const input = DOM.ui.settingsForm[dimension];
      const value = Math.max(1, +input.value + +delta);
      input.value = value;
      input.dispatchEvent(new InputEvent("change"));
    });
  });

  const resetLinks = () => {
    const keys = Object.keys(links);
    keys.forEach(resetLink(false));

    const cbs = () => keys.forEach((key) => links[key].cb?.());

    drawUpdatedImage(cbs);
  };

  DOM.ui.settingsResetBtn.addEventListener("click", resetLinks);

  // 다운로드 이벤트
  DOM.ui.downloadBtn.addEventListener("click", (e) => {
    if (!state.dithered) return;

    DOM.dialog.download.el.showModal();
    DOM.dialog.download.fileName.textContent = state.fileName;
    DOM.dialog.download.imageSize.textContent = `${state.width}×${state.height}`;

    const { width, naturalWidth } = DOM.ui.resultImage;

    DOM.ui.resultImage.classList.toggle("smaller", width > naturalWidth);
  });

  DOM.dialog.download.confirmBtn.addEventListener("click", (e) => {
    const imageURL = state.dataURL;
    const link = document.createElement("a");

    link.href = imageURL;
    link.download = state.fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    DOM.dialog.download.el.close();
  });

  DOM.dialog.download.cancelBtn.addEventListener("click", (e) => {
    DOM.dialog.download.el.close();
  });

  DOM.dialog.terrainColor.showBgCheckbox.addEventListener("change", (e) => {
    const { checked } = e.target;
    state.showTerrainBg = checked;
    DOM.canvas.el.style.background = checked
      ? `rgb(${state.palette.terrainColor})`
      : "#0000";
  });

  DOM.dialog.terrainColor.inputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      const hex = e.target.value;

      state.palette.setTerrainColor(hex);

      setBgOfTerrainColorBtn(hex);

      const color = hex !== "none" ? hex : "#0000";

      DOM.canvas.el.style.background = state.showTerrainBg ? color : "#0000";

      drawUpdatedImage();
    });

    const label = input.nextElementSibling;
    const color = input.value;

    if (color === "none") return;

    label.style.backgroundColor = color;
    label.style.color = getContentColor(...hex2Rgb(color));
  });

  DOM.dialog.terrainColor.cancelBtn.addEventListener("click", (e) => {
    DOM.dialog.terrainColor.el.close();
  });

  DOM.ui.showOriginalInput.addEventListener("change", (e) => {
    state.showOriginal = e.target.checked;
    state.palette.unhighlightAll();

    if (!validate()) return;

    draw();
  });

  DOM.ui.showGridInput.addEventListener("change", (e) => {
    state.showGrid = e.target.checked;

    if (!validate()) return;

    draw();
  });

  DOM.ui.pixelatedModeToggle.addEventListener("change", (e) => {
    state.isPixelMode = e.target.checked;

    drawUpdatedImage();
  });

  DOM.ui.settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
};

import { state } from "../state.js";
import { DOM } from "../dom.js";
import { drawUpdatedImage } from "../image-processing.js";
import { PALETTE_NAME_CUSTOM } from "../constants.js";
import {
  preventDefaults,
  isValidHex,
  hex2Rgb,
  rgb2Hex,
  parseColorText,
  shortenHex,
  formatColorTexts,
  dispatchEventTo,
  updateScrollClass,
  enableAutoResize,
} from "../utils.js";
import {
  getCustomPaletteData,
  removePaletteUI,
  setCustomPaletteData,
  setPaletteUI,
} from "../palette.js";

const createColorPreview = (hex) => {
  const colorPreview = document.createElement("div");

  colorPreview.classList.add("color-preview");
  colorPreview.style.background = hex;

  return colorPreview;
};

const updateAddColorValidationUI = () => {
  const { addColorValidation } = state;

  const messages = {
    invalidHex: "헥스코드가 올바르지 않습니다.",
    colorAlreadyExists: "현재 팔레트에 중복되는 색이 있습니다.",
    nameAlreadyExists: "현재 팔레트에 중복되는 색 이름이 있습니다.",
    valid: "이 색을 추가합니다.",
  };

  const isInvalid = Object.values(addColorValidation).some((error) => error);

  const type =
    Object.keys(messages).find((key) => addColorValidation[key]) || "valid";

  DOM.dialog.addColor.alert.classList.toggle("good", !isInvalid);
  DOM.dialog.addColor.alert.textContent = messages[type];
  DOM.dialog.addColor.confirmBtn.disabled = isInvalid;
};

const confirmAddColor = (e) => {
  preventDefaults(e);

  if (DOM.dialog.addColor.tabSingle.checked) {
    if (!isValidHex(DOM.dialog.addColor.inputHex.value)) {
      DOM.dialog.addColor.alert.classList.remove("hidden");
      DOM.dialog.addColor.alert.textContent = "헥스코드가 올바르지 않습니다.";
      return;
    }

    DOM.dialog.addColor.alert.classList.toggle("hidden", !state.contained);

    if (state.contained) return;

    const r = +DOM.dialog.addColor.inputR.value;
    const g = +DOM.dialog.addColor.inputG.value;
    const b = +DOM.dialog.addColor.inputB.value;
    const colorName =
      DOM.dialog.addColor.inputName.value ||
      shortenHex(DOM.dialog.addColor.inputHex.value).toUpperCase();

    state.palette.addColor([r, g, b], colorName, "added");
  } else {
    if (!state.colorsToAdd.length) return;

    state.colorsToAdd.forEach(([hex, name]) =>
      state.palette.addColor(hex2Rgb(hex), name, "added")
    );
  }

  drawUpdatedImage();

  DOM.ui.palette.saveBtn.disabled = false;

  DOM.dialog.addColor.el.close();
};

const handleInputRgb = (e) => {
  const value = +e.target.value;
  const newValue = Math.max(0, Math.min(255, value));

  e.target.value = newValue;

  const rgb = [
    DOM.dialog.addColor.inputR,
    DOM.dialog.addColor.inputG,
    DOM.dialog.addColor.inputB,
  ].map(({ value }) => +value);

  DOM.dialog.addColor.inputHex.value =
    DOM.dialog.addColor.inputName.placeholder = rgb2Hex(...rgb);

  state.addColorValidation.colorAlreadyExists = !!state.palette.getColorByRgb(
    ...rgb
  );

  DOM.dialog.addColor.previewSingle.style.background =
    DOM.dialog.addColor.inputHex.value;

  updateAddColorValidationUI();
};

const handleInputHex = (e) => {
  const newValue =
    "#" + e.target.value.replace(/[^a-f0-9]/gi, "").toUpperCase();

  e.target.value = DOM.dialog.addColor.inputName.placeholder = newValue;
  const invalidHex = (state.addColorValidation.invalidHex =
    !isValidHex(newValue));

  if (invalidHex) {
    updateAddColorValidationUI();
    return;
  }

  const rgb = hex2Rgb(newValue);

  [
    DOM.dialog.addColor.inputR.value,
    DOM.dialog.addColor.inputG.value,
    DOM.dialog.addColor.inputB.value,
  ] = rgb;

  state.addColorValidation.colorAlreadyExists = !!state.palette.getColorByRgb(
    ...rgb
  );

  DOM.dialog.addColor.previewSingle.style.background = newValue;

  updateAddColorValidationUI();
};

const handleInputColorName = (e) => {
  const colorName = e.target.value.trim();

  state.addColorValidation.nameAlreadyExists = state.palette.colors
    .map(({ name }) => name.toUpperCase())
    .includes(colorName.toUpperCase());

  updateAddColorValidationUI();
};

const handleInputTextarea = (e) => {
  const value = e.target.value;
  const parsedInfos = parseColorText(value);

  DOM.dialog.addColor.previewContainer.innerHTML = "";
  state.colorsToAdd = parsedInfos;

  if (parsedInfos.length) {
    parsedInfos.forEach((info) => {
      const colorPreview = createColorPreview(...info);
      DOM.dialog.addColor.previewContainer.append(colorPreview);
    });

    DOM.dialog.addColor.confirmBtn.disabled = false;
  } else {
    DOM.dialog.addColor.confirmBtn.disabled = true;
  }

  updateScrollClass(DOM.dialog.addColor.previewContainer);
};

export const initPaletteUI = () => {
  enableAutoResize(DOM.dialog.addColor.textarea);

  [
    {
      dropdown: DOM.ui.palette.dropdown,
      init: "paletteName",
      cb: (value) => {
        if (value !== PALETTE_NAME_CUSTOM) {
          localStorage.setItem("palette_name", value);
        }
        state.paletteName = value;
        state.palette.setPalette(value);

        const isCustomPalette = value === PALETTE_NAME_CUSTOM;

        DOM.ui.palette.saveBtn.classList.toggle("hidden", !isCustomPalette);

        const noColorInCustomPalette =
          isCustomPalette && !state.paletteData[value].colors.length;

        DOM.ui.palette.saveBtn.disabled = noColorInCustomPalette;
      },
    },
    {
      dropdown: DOM.ui.methodDropdown,
      init: "method",
      cb: (value) => {
        localStorage.setItem("method", value);
        state.method = value;
      },
    },
  ].forEach(({ dropdown, cb, init }) => {
    const dropdownOpen = dropdown.querySelector(".dropdown-open");
    const dropdownCurrentOption = dropdown.querySelector(
      ".dropdown-current-option"
    );

    if (init) {
      const input = dropdown.querySelector(`input[value="${state[init]}"]`);

      if (input) {
        input.checked = true;
        dropdownCurrentOption.textContent = input.dataset.label;
      }
    }

    dropdown.addEventListener("change", (e) => {
      const target = e.target;

      if (target.matches('.option-item input[type="radio"]')) {
        dropdownCurrentOption.textContent = target.dataset.label;
        dropdownOpen.checked = false;

        cb(target.value);

        drawUpdatedImage();
      }
    });

    dropdown.addEventListener("click", (e) => {
      const target = e.target;

      if (target.matches(".option-remove-btn")) {
        const name = target.previousElementSibling.textContent;
        const colorTextData = localStorage.getItem(
          "custom_palette_color_text_data"
        );
        const colorTextMap = JSON.parse(colorTextData);

        removePaletteUI(name);

        delete state.paletteData[name];
        delete colorTextMap[name];

        const newColorTextData = JSON.stringify(colorTextMap);

        localStorage.setItem(
          "custom_palette_color_text_data",
          newColorTextData
        );
      }
    });
  });

  DOM.ui.palette.saveBtn.addEventListener("click", () => {
    const { colors } = state.palette;
    const colorCount = colors.length;
    const hexes = colors.map(({ rgb }) => rgb2Hex(...rgb));

    if (!colorCount) return;

    DOM.dialog.savePalette.colorCount.textContent = colorCount;

    DOM.dialog.savePalette.el.showModal();
    DOM.dialog.savePalette.nameInput.select();
    DOM.dialog.savePalette.previewContainer.innerHTML = "";

    hexes.forEach((hex) => {
      const colorPreview = createColorPreview(hex);
      DOM.dialog.savePalette.previewContainer.append(colorPreview);
    });

    updateScrollClass(DOM.dialog.savePalette.previewContainer);
    dispatchEventTo(DOM.dialog.savePalette.nameInput, "input");
  });

  const addCustomPalette = (name) => {
    const { colors } = state.palette;

    const alreadyExists = Object.keys(state.paletteData).includes(name);

    if (alreadyExists) return;

    const colorTextData = localStorage.getItem(
      "custom_palette_color_text_data"
    );
    const colorTextMap = colorTextData ? JSON.parse(colorTextData) : {};
    const currentColorTexts = formatColorTexts(colors);

    colorTextMap[name] = currentColorTexts;

    const customPaletteData = getCustomPaletteData(colorTextMap);

    setCustomPaletteData(customPaletteData);

    localStorage.setItem(
      "custom_palette_color_text_data",
      JSON.stringify(colorTextMap)
    );

    setPaletteUI(name, { checked: true, custom: true });
  };

  DOM.dialog.savePalette.nameInput.addEventListener("input", (e) => {
    const paletteName = e.target.value.trim();
    const isEmpty = !paletteName;
    const alreadyExists = Object.keys(state.paletteData).includes(paletteName);
    const isValid = !isEmpty && !alreadyExists;

    DOM.dialog.savePalette.alert.textContent = isValid
      ? "이 팔레트를 저장합니다."
      : isEmpty
      ? "팔레트 이름을 입력해주세요."
      : "이미 사용 중인 팔레트 이름입니다.";
    DOM.dialog.savePalette.alert.classList.toggle("good", isValid);
    DOM.dialog.savePalette.confirmBtn.disabled = !isValid;
  });

  DOM.dialog.savePalette.confirmBtn.addEventListener("click", () => {
    const paletteName = DOM.dialog.savePalette.nameInput.value.trim();

    addCustomPalette(paletteName);

    DOM.dialog.savePalette.el.close();
  });

  DOM.dialog.savePalette.cancelBtn.addEventListener("click", () =>
    DOM.dialog.savePalette.el.close()
  );

  DOM.ui.palette.resetBtn.addEventListener("click", () => {
    if (state.palette.hasCustomColor) {
      state.palette.removeAddedColors();
      DOM.ui.palette.saveBtn.disabled = true;
    }
    state.palette.selectUnlockedColors();

    drawUpdatedImage();
  });

  [
    DOM.dialog.addColor.previewContainer,
    DOM.dialog.savePalette.previewContainer,
  ].forEach((colorPreviewContainer) => {
    colorPreviewContainer.addEventListener("scroll", (e) =>
      updateScrollClass(e.target)
    );
  });

  [
    DOM.dialog.addColor.inputR,
    DOM.dialog.addColor.inputG,
    DOM.dialog.addColor.inputB,
  ].forEach((input) => input.addEventListener("input", handleInputRgb));

  DOM.dialog.addColor.inputHex.addEventListener("input", handleInputHex);

  DOM.dialog.addColor.inputName.addEventListener("input", handleInputColorName);

  [DOM.dialog.addColor.tabSingle, DOM.dialog.addColor.tabList].forEach((tab) =>
    tab.addEventListener("change", (e) => {
      const textField =
        e.target === DOM.dialog.addColor.tabSingle
          ? DOM.dialog.addColor.inputHex
          : DOM.dialog.addColor.textarea;

      dispatchEventTo(textField, "input");

      textField.select();
    })
  );

  DOM.dialog.addColor.textarea.addEventListener("input", handleInputTextarea);

  DOM.dialog.addColor.form.addEventListener("submit", confirmAddColor);
  DOM.dialog.addColor.confirmBtn.addEventListener("click", confirmAddColor);

  DOM.dialog.addColor.cancelBtn.addEventListener("click", () =>
    DOM.dialog.addColor.el.close()
  );

  DOM.ui.aside.addEventListener("pointerdown", (e) => {
    state.palette.unhighlightAll();

    if (e.target.matches(".color-remove-btn")) return;

    const colorsToRemove =
      DOM.ui.palette.customList.querySelectorAll("label.removing");

    if (!colorsToRemove.length) return;

    colorsToRemove.forEach((label) => {
      label.classList.remove("removing");
    });
  });
};

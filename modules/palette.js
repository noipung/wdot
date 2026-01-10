import { state } from "./state.js";
import { DOM } from "./dom.js";
import { t } from "./i18n.js";
import {
  PALETTE_TYPE_BASIC,
  PALETTE_TYPE_LOCKED,
  PALETTE_TYPE_ADDED,
  PALETTE_NAME_CUSTOM,
  UI_LABELS,
} from "./constants.js";
import {
  dispatchEventTo,
  formatColorTexts,
  getContentColor,
  hex2Rgb,
  insertAndSelectText,
  parseColorText,
  preventDefaults,
  rgb2Hex,
  validate,
} from "./utils.js";
import { drawUpdatedImage } from "./image-processing.js";
import { loadPaletteData } from "./palette-loader.js";
import { draw } from "./drawing.js";
import { updateScrollClass } from "./utils.js";

export const setBgOfTerrainColorBtn = (hex) => {
  const color = hex !== "none" ? hex : "#0000";
  const { setTerrainColorBtn } = state.palette;

  if (!setTerrainColorBtn) return;

  setTerrainColorBtn.style.setProperty("--background-color", color);
  setTerrainColorBtn.classList.toggle("applied", hex !== "none");
};

const createAddColorBtn = () => {
  const handleClick = () => {
    DOM.dialog.addColor.el.showModal();

    const onSingleTab = DOM.dialog.addColor.tabSingle.checked;
    const textFields = onSingleTab
      ? [DOM.dialog.addColor.inputHex, DOM.dialog.addColor.inputName]
      : [DOM.dialog.addColor.textarea];

    textFields.forEach((textField) => dispatchEventTo(textField, "input"));

    DOM.dialog.addColor.inputName.value = DOM.dialog.addColor.textarea.value =
      "";
    DOM.dialog.addColor.previewContainer.textContent = "";

    if (onSingleTab) DOM.dialog.addColor.inputHex.select();

    updateScrollClass(DOM.dialog.addColor.previewContainer);
  };

  const li = document.createElement("li");
  const addColorBtn = document.createElement("button");
  addColorBtn.addEventListener("click", handleClick);
  addColorBtn.classList.add("add-color-btn");
  addColorBtn.type = "button";
  addColorBtn.setAttribute("aria-label", t(UI_LABELS.ADD_COLOR));

  li.append(addColorBtn);
  DOM.ui.palette.customList.append(li);

  return addColorBtn;
};

const createSetTerrainColorBtn = () => {
  const handleClick = () => {
    DOM.dialog.terrainColor.el.showModal();
  };

  const li = document.createElement("li");
  const setTerrainColorBtn = document.createElement("button");
  setTerrainColorBtn.addEventListener("click", handleClick);
  setTerrainColorBtn.classList.add("set-terrain-color-btn");
  setTerrainColorBtn.type = "button";
  setTerrainColorBtn.setAttribute("aria-label", t(UI_LABELS.SET_TERRAIN_COLOR));

  li.append(setTerrainColorBtn);
  DOM.ui.palette.basicList.append(li);

  return setTerrainColorBtn;
};

class Palette {
  constructor(paletteName) {
    this.setPalette(paletteName);
    this.enabledColors = [];
    this.allCount = 0;
    this.terrainColor = null;
  }

  setPalette(paletteName) {
    if (!state.paletteData[paletteName]) return;

    state.paletteName = paletteName;

    DOM.ui.palette.basicList.innerHTML = "";
    DOM.ui.palette.lockedList.innerHTML = "";
    DOM.ui.palette.customList.innerHTML = "";

    const paletteData = state.paletteData[paletteName];

    const colors = paletteData.colors.map(
      ({ rgb, name, type }) => new PaletteColor(rgb, name, type, this)
    );

    this.setColors(colors);

    this.hasBasicColor = colors.some(({ type }) => type === PALETTE_TYPE_BASIC);
    this.hasLockedColor = colors.some(
      ({ type }) => type === PALETTE_TYPE_LOCKED
    );
    this.hasCustomColor = paletteData.customColor;
    this.hasTerrainColor = paletteData.terrainColor;

    DOM.ui.palette.basicList.classList.toggle("hidden", !this.hasBasicColor);
    DOM.ui.palette.lockedList.classList.toggle("hidden", !this.hasLockedColor);
    DOM.ui.palette.customList.classList.toggle("hidden", !this.hasCustomColor);

    if (this.hasTerrainColor) {
      this.setTerrainColorBtn = createSetTerrainColorBtn();

      if (this.terrainColor)
        setBgOfTerrainColorBtn(rgb2Hex(...this.terrainColor));
    } else {
      DOM.dialog.terrainColor.noneOption.checked = true;
      dispatchEventTo(DOM.dialog.terrainColor.noneOption, "change");
    }

    if (this.hasCustomColor) this.addColorBtn = createAddColorBtn();
  }

  setColors(colors) {
    if (!colors) return;

    this.colors = this.initColors = colors;
    this.changed = true;
    this.rgbMap = new Map();

    colors.forEach((color) => {
      const key = color.rgb.join(",");
      this.rgbMap.set(key, color);
    });
  }

  addColor(rgb, name, type) {
    const currentPaletteData = state.paletteData[state.paletteName];

    currentPaletteData.colors.push({ rgb, name, type });

    const color = new PaletteColor(rgb, name, type, this);

    this.colors.push(color);
    this.changed = true;

    const key = rgb.join(",");
    this.rgbMap.set(key, color);

    if (type === PALETTE_TYPE_ADDED) {
      saveAddedColorsToStorage(state.paletteName);
    }

    state.colorTexts.set(
      state.paletteName,
      formatColorTexts(currentPaletteData.colors)
    );
  }

  removeColor(color) {
    DOM.ui.palette.customList.removeChild(color.colorListItem);

    const currentPaletteData = state.paletteData[state.paletteName];

    currentPaletteData.colors = currentPaletteData.colors.filter(
      (c) => rgb2Hex(...c.rgb) !== rgb2Hex(...color.rgb)
    );

    const index = this.colors.indexOf(color);

    if (index === -1) return;

    const isAddedType = this.colors[index].type === PALETTE_TYPE_ADDED;

    this.colors.splice(index, 1);
    this.changed = true;

    const key = color.rgb.join(",");
    this.rgbMap.delete(key);

    if (isAddedType) {
      saveAddedColorsToStorage(state.paletteName);
    }

    state.colorTexts.set(
      state.paletteName,
      formatColorTexts(currentPaletteData.colors)
    );
  }

  setTerrainColor(hex) {
    this.terrainColor = hex !== "none" ? hex2Rgb(hex) : null;
  }

  removeAddedColors() {
    DOM.ui.palette.customList.innerHTML = "";

    const currentPaletteData = state.paletteData[state.paletteName];

    currentPaletteData.colors = currentPaletteData.colors.filter(
      ({ type }) => type !== PALETTE_TYPE_ADDED
    );

    this.addColorBtn = createAddColorBtn();

    this.colors
      .filter(({ type }) => type === PALETTE_TYPE_ADDED)
      .forEach(({ rgb }) => {
        const key = rgb.join(",");
        this.rgbMap.delete(key);
      });

    this.colors = this.colors.filter(({ type }) => type !== PALETTE_TYPE_ADDED);
    this.changed = true;

    saveAddedColorsToStorage(state.paletteName);

    state.colorTexts.set(
      state.paletteName,
      formatColorTexts(currentPaletteData.colors)
    );
  }

  getEnabledColorRgbs() {
    if (this.changed) {
      this.enabledColors = this.colors.filter((color) => color.enabled);
      this.changed = false;
    }
    return this.enabledColors
      .map(({ rgb }) => rgb)
      .concat(this.terrainColor ? [this.terrainColor] : []);
  }

  getColorByName(name) {
    return this.colors.find((color) => color.name === name);
  }

  getColorByRgb(r, g, b) {
    return this.rgbMap.get(`${r},${g},${b}`);
  }

  unhighlightAll() {
    this.colors.forEach((color) => color.label.classList.remove("highlighted"));
    state.mark = null;
    if (!validate()) return;
    draw();
  }

  highlight(color) {
    this.unhighlightAll();
    color.label.tooltip.scrollIntoView({ behavior: "smooth" });
    color.label.classList.add("highlighted");
  }

  selectUnlockedColors() {
    this.colors.forEach((color) =>
      color.toggle(color.type !== PALETTE_TYPE_LOCKED)
    );
  }

  selectAllColors() {
    this.colors.forEach((color) => color.toggle(true));
  }

  unselectAllColors() {
    this.colors.forEach((color) => color.toggle(false));
  }

  setAllColorCounts(imageData) {
    const data = imageData.data;
    const counts = new Map();
    let total = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      const key = `${r},${g},${b}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      total++;
    }

    this.colors.forEach((color) => {
      const key = color.rgb.join(",");
      color.setCount(counts.get(key) || 0);
    });

    this.allCount = total;
  }
}

class PaletteColor {
  constructor(rgb, name, type, palette) {
    this.rgb = rgb;
    this.name = name;
    this.type = type;
    this.enabled = type !== "locked";
    this.count = 0;
    this.palette = palette;

    const li = document.createElement("li");
    const check = document.createElement("input");
    const label = document.createElement("label");
    const i = document.createElement("i");
    const colorCount = document.createElement("span");
    const tooltip = document.createElement("div");
    const id = name.toLowerCase().replace(/\s/g, "-");

    check.type = "checkbox";
    check.id = label.htmlFor = id;
    check.checked = this.enabled;
    label.style.setProperty("--background-color", `rgb(${rgb})`);
    label.style.color = getContentColor(...rgb);
    colorCount.classList.add("color-count", "zero");
    colorCount.textContent = "0";
    tooltip.classList.add("tooltip", type);
    tooltip.textContent = name;
    li.classList.toggle("disabled", !this.enabled);

    check.addEventListener("change", () => {
      this.enabled = check.checked;
      this.colorListItem.classList.toggle("disabled", !check.checked);
      this.palette.changed = true;

      drawUpdatedImage();
    });

    label.addEventListener("contextmenu", preventDefaults);

    label.append(i, colorCount);
    label.tooltip = tooltip;
    li.append(check, label, tooltip);

    if (type === PALETTE_TYPE_ADDED) {
      const colorRemoveBtn = document.createElement("button");
      colorRemoveBtn.type = "button";
      colorRemoveBtn.classList.add("color-remove-btn");

      label.append(colorRemoveBtn);

      label.addEventListener("contextmenu", (e) => {
        label.classList.toggle("removing");
      });

      colorRemoveBtn.addEventListener("click", () => {
        this.remove();
        drawUpdatedImage();
      });
    }

    this.colorListItem = li;
    this.check = check;
    this.label = label;
    this.colorCount = colorCount;
    this.check.checked = this.enabled;

    if (this.type === PALETTE_TYPE_BASIC) {
      DOM.ui.palette.basicList.append(this.colorListItem);
    } else if (this.type === PALETTE_TYPE_LOCKED) {
      DOM.ui.palette.lockedList.append(this.colorListItem);
    } else {
      if (!palette.addColorBtn?.parentNode?.parentNode) {
        DOM.ui.palette.customList.append(this.colorListItem);
      } else {
        DOM.ui.palette.customList.insertBefore(
          this.colorListItem,
          palette.addColorBtn.parentNode
        );
      }
    }
  }

  toggle(enabled) {
    this.enabled = enabled !== undefined ? enabled : !this.enabled;
    this.check.checked = this.enabled;
    this.colorListItem.classList.toggle("disabled", !this.enabled);
    if (!this.palette.changed) this.palette.changed = true;
  }

  setCount(count) {
    this.count = count;
    this.colorCount.textContent = count;
    if (count === 0) {
      this.colorCount.classList.add("zero");
    } else {
      this.colorCount.classList.remove("zero");
    }
  }

  remove() {
    this.palette.removeColor(this);
  }
}

const createPaletteOptionItem = (name, settings = {}) => {
  const optionItem = document.createElement("div");
  const input = document.createElement("input");
  const label = document.createElement("label");
  const icon = document.createElement("i");
  const labelInner = document.createElement("span");
  const id = `palette-${name.toLowerCase().replace(/\s/g, "-")}`;
  let removeBtn;

  if (settings.custom) {
    removeBtn = document.createElement("button");
    removeBtn.classList.add("option-remove-btn");
    removeBtn.setAttribute("aria-label", t(UI_LABELS.DELETE));
  }

  optionItem.classList.add("option-item");
  input.type = "radio";
  input.id = id;
  input.name = "palette";
  input.value = input.dataset.label = name;
  input.setAttribute("auto-complete", "off");
  input.checked = !!settings.checked;
  label.htmlFor = id;
  labelInner.classList.add("option-label");
  labelInner.textContent =
    name === PALETTE_NAME_CUSTOM ? t("PALETTE_CUSTOM") : name;
  if (name === PALETTE_NAME_CUSTOM) {
    input.dataset.label = "PALETTE_CUSTOM";
  }

  label.append(icon, labelInner);

  if (removeBtn) label.append(removeBtn);

  optionItem.append(input, label);

  return optionItem;
};

const createColorTextLoader = (name) => {
  const colorTextLoader = document.createElement("button");

  colorTextLoader.textContent = colorTextLoader.dataset.label = name;
  colorTextLoader.type = "button";

  colorTextLoader.addEventListener("click", () => {
    const colorText = state.colorTexts.get(name);

    insertAndSelectText(DOM.dialog.addColor.textarea, colorText);
  });

  return colorTextLoader;
};

export const setPaletteUI = (name, settings = {}) => {
  const optionItem = createPaletteOptionItem(name, settings);

  DOM.ui.palette.optionsContainer.insertBefore(
    optionItem,
    document.querySelector(`.option-item:has([value="${PALETTE_NAME_CUSTOM}"])`)
  );

  const option = optionItem.querySelector("input");

  if (settings.checked && settings.custom) {
    option.checked = true;
    dispatchEventTo(option, "change");
  }

  const { colors } = state.paletteData[name];

  if (!colors.length) return;

  const colorText = formatColorTexts(colors);

  state.colorTexts.set(name, colorText);

  const colorTextLoader = createColorTextLoader(name);

  DOM.dialog.addColor.loaderContainer.append(colorTextLoader);
};

export const removePaletteUI = (name) => {
  const optionItem = DOM.ui.palette.optionsContainer.querySelector(
    `.option-item:has([value="${name}"])`
  );
  if (!optionItem) return;

  const option = optionItem.querySelector("input");
  const fallbackOptionItem =
    optionItem.previousElementSibling || optionItem.nextElementSibling;

  if (option.checked && fallbackOptionItem) {
    const fallbackOption = fallbackOptionItem.querySelector("input");
    if (fallbackOption) {
      fallbackOption.checked = true;
      dispatchEventTo(fallbackOption, "change");
    }
  }

  optionItem.remove();

  state.colorTexts.delete(name);
  const loaderBtn = DOM.dialog.addColor.loaderContainer.querySelector(
    `[data-label="${name}"]`
  );
  if (loaderBtn) loaderBtn.remove();
};

export const saveAddedColorsToStorage = (paletteName) => {
  const currentPaletteData = state.paletteData[paletteName];
  if (!currentPaletteData) return;

  const addedColors = currentPaletteData.colors.filter(
    ({ type }) => type === PALETTE_TYPE_ADDED
  );

  const colorTextData = localStorage.getItem("custom_palette_color_text_data");
  const colorTextMap = colorTextData ? JSON.parse(colorTextData) : {};

  const addedKey = `${paletteName}@added`;

  if (addedColors.length > 0) {
    colorTextMap[addedKey] = formatColorTexts(addedColors);
  } else {
    delete colorTextMap[addedKey];
  }

  localStorage.setItem(
    "custom_palette_color_text_data",
    JSON.stringify(colorTextMap)
  );
};

export const getCustomPaletteData = (colorTextMap) => {
  const customPaletteData = {};

  Object.keys(colorTextMap).forEach((key) => {
    const isAddedEntry = key.endsWith("@added");
    const paletteName = isAddedEntry ? key.slice(0, -6) : key;
    const isBuiltIn = !!state.initPaletteData?.[paletteName];

    const parsedColors = parseColorText(colorTextMap[key], false).map(
      ([hex, name]) => ({
        rgb: hex2Rgb(hex),
        name: name || hex,
        type: isAddedEntry ? PALETTE_TYPE_ADDED : PALETTE_TYPE_BASIC,
      })
    );

    if (!customPaletteData[paletteName]) {
      customPaletteData[paletteName] = {
        customColor: true,
        terrainColor: false,
        isCustomPalette: !isBuiltIn,
        colors: [],
        addedColors: [],
      };
    }

    if (isAddedEntry) {
      customPaletteData[paletteName].addedColors = parsedColors;
    } else {
      customPaletteData[paletteName].colors = parsedColors;
    }
  });

  return customPaletteData;
};

export const setCustomPaletteData = (customPaletteData) => {
  const combinedPaletteData = {};

  // initPaletteData의 각 팔레트 객체를 얕은 복사하여 원본 데이터 오염 방지
  Object.keys(state.initPaletteData).forEach((key) => {
    const originalPalette = state.initPaletteData[key];
    combinedPaletteData[key] = {
      ...originalPalette,
      colors: [...originalPalette.colors],
    };
  });

  combinedPaletteData[PALETTE_NAME_CUSTOM] = {
    customColor: true,
    terrainColor: false,
    colors: [],
  };

  Object.keys(customPaletteData).forEach((paletteName) => {
    const data = customPaletteData[paletteName];

    if (combinedPaletteData[paletteName]) {
      // 빌트인 팔레트일 경우 추가 색상만 병합 (이미 복사된 배열에 concat)
      if (data.addedColors.length > 0) {
        combinedPaletteData[paletteName].colors = combinedPaletteData[
          paletteName
        ].colors.concat(data.addedColors);
      }
    } else {
      // 커스텀 팔레트일 경우 새로 정의하고 추가 색상 병합
      combinedPaletteData[paletteName] = {
        customColor: true,
        terrainColor: false,
        isCustomPalette: true,
        colors: data.colors.concat(data.addedColors),
      };
    }
  });

  state.paletteData = combinedPaletteData;
};

export const initPaletteUI = async () => {
  state.initPaletteData = await loadPaletteData();

  const colorTextData = localStorage.getItem("custom_palette_color_text_data");
  const colorTextMap = JSON.parse(colorTextData);

  setCustomPaletteData(colorTextData ? getCustomPaletteData(colorTextMap) : {});

  state.palette = new Palette(state.paletteName);

  const sortedPaletteNames = Object.keys(state.paletteData).sort((a, b) => {
    if (a === PALETTE_NAME_CUSTOM) return 1;
    if (b === PALETTE_NAME_CUSTOM) return -1;

    const dataA = state.paletteData[a];
    const dataB = state.paletteData[b];

    const isACustom = !!dataA.isCustomPalette;
    const isBCustom = !!dataB.isCustomPalette;

    if (!isACustom && isBCustom) return -1;
    if (isACustom && !isBCustom) return 1;

    return 0;
  });

  sortedPaletteNames.forEach((name, i) => {
    setPaletteUI(name, {
      checked: i === 0,
      custom: state.paletteData[name].isCustomPalette,
    });
  });

  const handleClickSelectAllBtn = () => {
    state.palette.selectAllColors();

    drawUpdatedImage();
  };

  DOM.ui.palette.selectAllBtn.addEventListener(
    "click",
    handleClickSelectAllBtn
  );

  const handleClickUnselectAllBtn = () => {
    state.palette.unselectAllColors();

    drawUpdatedImage();
  };

  DOM.ui.palette.unselectAllBtn.addEventListener(
    "click",
    handleClickUnselectAllBtn
  );
};

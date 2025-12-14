import { state } from "./state.js";
import {
  addColorDialog,
  addColorPreviewContainer,
  addColorTabSingle,
  addColorTextarea,
  basicPaletteList,
  colorTextLoaderContainer,
  customPaletteList,
  inputColorName,
  inputHex,
  lockedPaletteList,
  paletteOptionsContainer,
  selectAllBtn,
  terrainColorDialog,
  terrainNone,
  unselectAllBtn,
  PALETTE_TYPE_BASIC,
  PALETTE_TYPE_LOCKED,
  PALETTE_TYPE_ADDED,
  PALETTE_NAME_CUSTOM,
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
import { setBgOfTerrainColorBtn, updateScrollClass } from "./events.js";

const createAddColorBtn = () => {
  const handleClick = () => {
    addColorDialog.showModal();

    const onSingleTab = addColorTabSingle.checked;
    const textFields = onSingleTab
      ? [inputHex, inputColorName]
      : [addColorTextarea];

    textFields.forEach((textField) => dispatchEventTo(textField, "input"));

    inputColorName.value = addColorTextarea.value = "";
    addColorPreviewContainer.textContent = "";

    if (onSingleTab) inputHex.select();

    updateScrollClass(addColorPreviewContainer);
  };

  const li = document.createElement("li");
  const addColorBtn = document.createElement("button");
  addColorBtn.addEventListener("click", handleClick);
  addColorBtn.classList.add("add-color-btn");
  addColorBtn.type = "button";

  li.append(addColorBtn);
  customPaletteList.append(li);

  return addColorBtn;
};

const createSetTerrainColorBtn = () => {
  const handleClick = () => {
    terrainColorDialog.showModal();
  };

  const li = document.createElement("li");
  const setTerrainColorBtn = document.createElement("button");
  setTerrainColorBtn.addEventListener("click", handleClick);
  setTerrainColorBtn.classList.add("set-terrain-color-btn");
  setTerrainColorBtn.type = "button";

  li.append(setTerrainColorBtn);
  basicPaletteList.append(li);

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

    basicPaletteList.innerHTML = "";
    lockedPaletteList.innerHTML = "";
    customPaletteList.innerHTML = "";

    const paletteData = state.paletteData[paletteName];

    const colors = paletteData.colors.map(
      ({ rgb, name, type }) => new PaletteColor(rgb, name, type, this)
    );

    this.setColors(colors);

    this.hasBasicColor = colors.some(({ type }) => type === PALETTE_TYPE_BASIC);
    this.hasLockedColor = colors.some(({ type }) => type === PALETTE_TYPE_LOCKED);
    this.hasCustomColor = paletteData.customColor;
    this.hasTerrainColor = paletteData.terrainColor;

    basicPaletteList.classList.toggle("hidden", !this.hasBasicColor);
    lockedPaletteList.classList.toggle("hidden", !this.hasLockedColor);
    customPaletteList.classList.toggle("hidden", !this.hasCustomColor);

    if (this.hasTerrainColor) {
      this.setTerrainColorBtn = createSetTerrainColorBtn();

      if (this.terrainColor)
        setBgOfTerrainColorBtn(rgb2Hex(...this.terrainColor));
    } else {
      terrainNone.checked = true;
      dispatchEventTo(terrainNone, "change");
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
  }

  removeColor(color) {
    customPaletteList.removeChild(color.colorListItem);

    const currentPaletteData = state.paletteData[state.paletteName];

    currentPaletteData.colors = currentPaletteData.colors.filter(
      (c) => rgb2Hex(...c.rgb) !== rgb2Hex(...color.rgb)
    );

    const index = this.colors.indexOf(color);

    if (index === -1) return;

    this.colors.splice(index, 1);
    this.changed = true;

    const key = color.rgb.join(",");
    this.rgbMap.delete(key);
  }

  setTerrainColor(hex) {
    this.terrainColor = hex !== "none" ? hex2Rgb(hex) : null;
  }

  removeAddedColors() {
    customPaletteList.innerHTML = "";

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
    this.colors.forEach((color) => color.toggle(color.type !== PALETTE_TYPE_LOCKED));
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
    tooltip.textContent = `${name} ${type === PALETTE_TYPE_LOCKED ? "🔒︎" : ""}`;
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
      basicPaletteList.append(this.colorListItem);
    } else if (this.type === PALETTE_TYPE_LOCKED) {
      lockedPaletteList.append(this.colorListItem);
    } else {
      if (!palette.addColorBtn?.parentNode?.parentNode) {
        customPaletteList.append(this.colorListItem);
      } else {
        customPaletteList.insertBefore(
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
  labelInner.textContent = name;

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

    insertAndSelectText(addColorTextarea, colorText);
  });

  return colorTextLoader;
};

export const setPaletteUI = (name, settings = {}) => {
  const optionItem = createPaletteOptionItem(name, settings);

  paletteOptionsContainer.insertBefore(
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

  colorTextLoaderContainer.append(colorTextLoader);
};

export const removePaletteUI = (name) => {
  const optionItem = paletteOptionsContainer.querySelector(
    `.option-item:has([value="${name}"])`
  );
  const option = optionItem.querySelector("input");
  const previousOptionItem = optionItem.previousElementSibling;
  const previousOption = previousOptionItem.querySelector("input");

  if (option.checked) {
    previousOption.checked = true;
    dispatchEventTo(previousOption, "change");
  }

  optionItem.remove();

  state.colorTexts.delete(name);
  colorTextLoaderContainer.querySelector(`[data-label="${name}"]`).remove();
};

export const getCustomPaletteData = (colorTextMap) => {
  const customPaletteData = {};

  Object.keys(colorTextMap).forEach((key) => {
    customPaletteData[key] = {
      customColor: true,
      terrainColor: false,
      isCustomPalette: true,
      colors: parseColorText(colorTextMap[key], false).map(([hex, name]) => ({
        rgb: hex2Rgb(hex),
        name: name || hex,
        type: PALETTE_TYPE_BASIC,
      })),
    };
  });

  return customPaletteData;
};

export const setCustomPaletteData = (customPaletteData) => {
  state.paletteData = {
    ...state.initPaletteData,
    ...customPaletteData,
    [PALETTE_NAME_CUSTOM]: {
      customColor: true,
      terrainColor: false,
      colors: [],
    },
  };
};

export const initPaletteUI = async () => {
  state.initPaletteData = await loadPaletteData();

  const colorTextData = localStorage.getItem("custom_palette_color_text_data");
  const colorTextMap = JSON.parse(colorTextData);

  setCustomPaletteData(colorTextData ? getCustomPaletteData(colorTextMap) : {});

  state.palette = new Palette(state.paletteName);

  const moveCustomToLast = (a, b) => (a === PALETTE_NAME_CUSTOM) - (b === PALETTE_NAME_CUSTOM);

  Object.keys(state.paletteData)
    .sort(moveCustomToLast)
    .forEach((name, i) => {
      setPaletteUI(name, {
        checked: i === 0,
        custom: state.paletteData[name].isCustomPalette,
      });
    });

  const handleClickSelectAllBtn = () => {
    state.palette.selectAllColors();

    drawUpdatedImage();
  };

  selectAllBtn.addEventListener("click", handleClickSelectAllBtn);

  const handleClickUnselectAllBtn = () => {
    state.palette.unselectAllColors();

    drawUpdatedImage();
  };

  unselectAllBtn.addEventListener("click", handleClickUnselectAllBtn);
};

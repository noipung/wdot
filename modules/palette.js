import { state } from "./state.js";
import {
  addColorDialog,
  basicPaletteList,
  customPaletteList,
  inputHex,
  lockedPaletteList,
  paletteDropdown,
  selectAllBtn,
  terrainColorDialog,
  unselectAllBtn,
} from "./constants.js";
import { getContentColor, hex2Rgb, validate } from "./utils.js";
import { drawUpdatedImage } from "./image-processing.js";
import { loadPaletteData } from "./palette-loader.js";
import { draw } from "./drawing.js";

const createAddColorBtn = () => {
  const handleClick = () => {
    addColorDialog.showModal();
    inputHex.dispatchEvent(
      new Event("change", {
        bubbles: true,
        cancelable: false,
      })
    );
    inputHex.select();
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
      ({ rgb, name, locked }) => new PaletteColor(rgb, name, locked, this)
    );

    this.setColors(colors);

    this.hasBasicColor = colors.some(({ locked }) => !locked);
    this.hasLockedColor = colors.some(({ locked }) => locked);
    this.hasCustomColor = paletteData.customColor;
    this.hasTerrainColor = paletteData.terrainColor;

    basicPaletteList.classList.toggle("hidden", !this.hasBasicColor);
    lockedPaletteList.classList.toggle("hidden", !this.hasLockedColor);
    customPaletteList.classList.toggle("hidden", !this.hasCustomColor);

    if (this.hasTerrainColor)
      this.setTerrainColorBtn = createSetTerrainColorBtn();
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

  addColor(rgb, name, locked = false) {
    const color = new PaletteColor(rgb, name, locked, this, true);

    this.colors.push(color);
    this.changed = true;

    const key = rgb.join(",");
    this.rgbMap.set(key, color);
  }

  setTerrainColor(hex) {
    this.terrainColor = hex !== "none" ? hex2Rgb(hex) : null;
  }

  removeAddedColors() {
    customPaletteList.innerHTML = "";

    this.addColorBtn = createAddColorBtn();

    this.colors
      .filter(({ added }) => added)
      .forEach(({ rgb }) => {
        const key = rgb.join(",");
        this.rgbMap.delete(key);
      });

    this.colors = this.colors.filter(({ added }) => !added);
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

  selectBasicColors() {
    this.colors.forEach((color) => color.toggle(!color.locked));
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
  constructor(rgb, name, locked, palette, added = false) {
    this.rgb = rgb;
    this.name = name;
    this.locked = locked;
    this.enabled = !locked;
    this.count = 0;
    this.palette = palette;
    this.added = added;

    const li = document.createElement("li");
    const check = document.createElement("input");
    const label = document.createElement("label");
    const i = document.createElement("i");
    const colorCount = document.createElement("span");
    const tooltip = document.createElement("div");

    const id = name
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase()
      .replaceAll(" ", "-");

    check.type = "checkbox";
    check.id = label.htmlFor = id;
    check.checked = !locked;
    label.style.setProperty("--background-color", `rgb(${rgb})`);
    label.style.color = getContentColor(...rgb);
    colorCount.classList.add("color-count", "zero");
    colorCount.textContent = "0";
    tooltip.classList.add("tooltip", ...(locked ? ["locked"] : []));
    tooltip.textContent = `${name} ${locked ? "🔒︎" : ""}`;
    li.classList.toggle("disabled", !this.enabled);

    check.addEventListener("change", () => {
      this.enabled = check.checked;
      this.colorListItem.classList.toggle("disabled", !check.checked);
      this.palette.changed = true;

      drawUpdatedImage();
    });

    label.append(i, colorCount);
    label.tooltip = tooltip;
    li.append(check, label, tooltip);

    this.colorListItem = li;
    this.check = check;
    this.label = label;
    this.colorCount = colorCount;
    this.check.checked = this.enabled;
    if (!added) {
      (this.locked ? lockedPaletteList : basicPaletteList).append(
        this.colorListItem
      );
    } else {
      customPaletteList.insertBefore(
        this.colorListItem,
        palette.addColorBtn.parentNode
      );
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
}

const createPaletteOptionItem = (name, checked = false) => {
  const optionItem = document.createElement("div");
  const input = document.createElement("input");
  const label = document.createElement("label");
  const icon = document.createElement("i");
  const labelInner = document.createElement("span");

  const id = `palette-${name.toLowerCase()}`;

  optionItem.classList.add("option-item");
  input.type = "radio";
  input.id = id;
  input.name = "palette";
  input.value = input.dataset.label = name;
  input.setAttribute("auto-complete", "off");
  input.checked = checked;
  label.htmlFor = id;
  labelInner.classList.add("option-label");
  labelInner.textContent = name;

  label.append(icon, labelInner);
  optionItem.append(input, label);

  return optionItem;
};

export const initPaletteUI = async () => {
  state.paletteData = await loadPaletteData();
  state.palette = new Palette(state.paletteName);

  const paletteOptionsContainer = paletteDropdown.querySelector(
    ".dropdown-options-container"
  );

  Object.keys(state.paletteData).forEach((name, i) => {
    const optionItem = createPaletteOptionItem(name, i === 0);
    paletteOptionsContainer.append(optionItem);
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

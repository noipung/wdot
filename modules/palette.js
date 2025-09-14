import { state } from "./state.js";
import {
  basicPaletteList,
  lockedPaletteList,
  selectAllBtn,
  unselectAllBtn,
} from "./constants.js";
import { getContentColor } from "./utils.js";
import { updateImageProcessing } from "./image-processing.js";
import { draw } from "./drawing.js";
import { loadPaletteData } from "./palette-loader.js";
import { validate } from "./utils.js";

class Palette {
  constructor(colors) {
    this.colors = colors;
    this.changed = true;
    this.enabledColors = [];
    this.allCount = 0;
  }

  setColors(colors) {
    this.colors = colors;
    this.changed = true;
  }

  getEnabledColors() {
    if (this.changed) {
      this.enabledColors = this.colors.filter((color) => color.enabled);
      this.changed = false;
    }
    return this.enabledColors;
  }

  getColorByName(name) {
    return this.colors.find((color) => color.name === name);
  }

  selectInitColors() {
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

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      const key = `${r},${g},${b}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    this.colors.forEach((color) => {
      const key = color.rgb.join(",");
      color.setCount(counts.get(key) || 0);
    });

    this.allCount = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  }
}

class PaletteColor {
  constructor(rgb, name, locked, palette) {
    this.rgb = rgb;
    this.name = name;
    this.locked = locked;
    this.enabled = !locked;
    this.count = 0;
    this.palette = palette;

    const li = document.createElement("li");
    const check = document.createElement("input");
    const label = document.createElement("label");
    const i = document.createElement("i");
    const colorCount = document.createElement("span");
    const tooltip = document.createElement("div");

    const id = name.toLowerCase().replaceAll(" ", "-");

    check.type = "checkbox";
    check.id = label.htmlFor = id;
    check.checked = !locked;
    label.style.setProperty("--background-color", `rgb(${rgb})`);
    label.style.color = getContentColor(rgb);
    colorCount.classList.add("color-count", "zero");
    colorCount.textContent = "0";
    tooltip.classList.add("tooltip", ...(locked ? ["locked"] : []));
    tooltip.textContent = `${name} ${locked ? "🔒︎" : ""}`;
    li.classList.toggle("disabled", !this.enabled);

    check.addEventListener("change", () => {
      this.enabled = check.checked;
      this.colorListItem.classList.toggle("disabled", !check.checked);
      this.palette.changed = true;

      if (!validate()) return;

      updateImageProcessing();
      draw();
    });

    label.append(i, colorCount);
    li.append(check, label, tooltip);

    this.colorListItem = li;
    this.check = check;
    this.colorCount = colorCount;
    this.check.checked = this.enabled;
    (this.locked ? lockedPaletteList : basicPaletteList).append(
      this.colorListItem
    );
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

export const initPaletteUI = async () => {
  state.palette = new Palette();

  const paletteData = await loadPaletteData();

  const colors = paletteData.map(
    ({ rgb, name, locked }) =>
      new PaletteColor(rgb, name, locked, state.palette)
  );

  state.palette.setColors(colors);

  const handleClickInitBtn = () => {
    state.palette.selectInitColors();

    if (!validate()) return;

    updateImageProcessing();
    draw();
  };

  const li = document.createElement("li");
  const initBtn = document.createElement("button");
  initBtn.addEventListener("click", handleClickInitBtn);
  initBtn.classList.add("init-btn");
  initBtn.type = "button";

  li.append(initBtn);
  basicPaletteList.append(li);

  const handleClickSelectAllBtn = () => {
    state.palette.selectAllColors();

    if (!validate()) return;

    updateImageProcessing();
    draw();
  };

  selectAllBtn.addEventListener("click", handleClickSelectAllBtn);

  const handleClickUnselectAllBtn = () => {
    state.palette.unselectAllColors();

    if (!validate()) return;

    updateImageProcessing();
    draw();
  };

  unselectAllBtn.addEventListener("click", handleClickUnselectAllBtn);
};

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
    const tooltip = document.createElement("div");

    const id = name.toLowerCase().replaceAll(" ", "-");

    check.type = "checkbox";
    check.id = label.htmlFor = id;
    check.checked = !locked;
    label.style.background = `rgb(${rgb})`;
    label.style.color = getContentColor(rgb);
    tooltip.classList.add(...["tooltip"].concat(locked ? ["locked"] : []));
    tooltip.textContent = `${name} ${locked ? "🔒︎" : ""}`;

    check.addEventListener("change", () => {
      this.enabled = check.checked;
      this.palette.changed = true;

      if (!validate()) return;

      updateImageProcessing();
      draw();
    });

    li.append(check, label, tooltip);
    li.checkBox = check;

    this.colorListItem = li;
    this.check = check;
    this.check.checked = this.enabled;
    (this.locked ? lockedPaletteList : basicPaletteList).append(
      this.colorListItem
    );
  }

  toggle(enabled) {
    this.enabled = enabled !== undefined ? enabled : !this.enabled;
    this.check.checked = this.enabled;
    if (!this.palette.changed) this.palette.changed = true;
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

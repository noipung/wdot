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

const checks = [];
let wplacePalette = [];

export const initPaletteUI = async () => {
  // 팔레트 데이터 로드
  wplacePalette = await loadPaletteData();

  // 기존 코드에서 wplacePalette를 직접 참조하는 부분을 이제 로드된 데이터로 대체
  const initPalette = wplacePalette
    .filter(({ locked }) => !locked)
    .map(({ rgb }) => rgb);

  const wholePalette = wplacePalette.map(({ rgb }) => rgb);

  // 상태 초기화
  state.palette = initPalette;

  // 팔레트 UI 생성
  wplacePalette.forEach(({ rgb, name, locked }) => {
    const colorListItem = createColorListItem(rgb, name, locked);
    (locked ? lockedPaletteList : basicPaletteList).append(colorListItem);
  });

  // 나머지 코드는 동일하게 유지...
  const handleClickInitBtn = () => {
    state.palette = initPalette;
    checks.forEach((check) => {
      check.checked = check.isBasicColor;
    });

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
    state.palette = wholePalette;
    checks.forEach((check) => {
      check.checked = true;
    });

    updateImageProcessing();
    draw();
  };

  selectAllBtn.addEventListener("click", handleClickSelectAllBtn);

  const handleClickUnselectAllBtn = () => {
    state.palette = [];
    checks.forEach((check) => {
      check.checked = false;
    });

    updateImageProcessing();
    draw();
  };

  unselectAllBtn.addEventListener("click", handleClickUnselectAllBtn);
};

export const createColorListItem = (rgb, name, locked) => {
  const li = document.createElement("li");
  const check = document.createElement("input");
  const label = document.createElement("label");
  const tooltip = document.createElement("div");

  const id = name.toLowerCase().replaceAll(" ", "-");

  check.type = "checkbox";
  check.id = label.htmlFor = id;
  check.checked = check.isBasicColor = !locked;
  label.style.background = `rgb(${rgb})`;
  label.style.color = getContentColor(rgb);
  tooltip.classList.add(...["tooltip"].concat(locked ? ["locked"] : []));
  tooltip.textContent = `${name} ${locked ? "🔒︎" : ""}`;

  li.append(check, label, tooltip);
  checks.push(check);

  check.addEventListener("change", () => {
    state.palette = check.checked
      ? state.palette.concat([rgb])
      : state.palette.filter(
          (item) => JSON.stringify(item) !== JSON.stringify(rgb)
        );

    updateImageProcessing();
    draw();
  });

  return li;
};

import { state } from "../state.js";
import { DOM } from "../dom.js";
import { handleImageLoad } from "../image-processing.js";
import { preventDefaults } from "../utils.js";

const handleFile = (file) => {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    console.error("이미지 파일만 업로드할 수 있습니다.");
    return;
  }

  state.fileName = `${file.name.replace(/\.[a-zA-Z0-9]+$/, "")}_wdot.png`;

  const reader = new FileReader();

  reader.onload = ({ target: { result } }) => {
    const image = new Image();

    image.addEventListener("load", () => {
      handleImageLoad(image);
    });
    image.src = result;
  };

  reader.readAsDataURL(file);
};

const handleUpload = (e) => {
  const [file] = e.target.files;
  handleFile(file);
};

const handleDrop = (e) => {
  const [file] = e.dataTransfer.files;
  handleFile(file);
};

export const initFileHandlers = () => {
  // 이미지 드롭 이벤트
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    DOM.canvas.controlLayer.addEventListener(eventName, preventDefaults, false);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    DOM.canvas.controlLayer.addEventListener(
      eventName,
      () => DOM.canvas.overlay.classList.add("active"),
      false
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    DOM.canvas.controlLayer.addEventListener(
      eventName,
      () => DOM.canvas.overlay.classList.remove("active"),
      false
    );
  });

  DOM.canvas.controlLayer.addEventListener("drop", handleDrop, false);
  DOM.ui.uploadBtn.addEventListener("change", handleUpload, false);
};

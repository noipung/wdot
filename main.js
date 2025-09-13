import { initPaletteUI } from "./modules/palette.js";

// 비동기 초기화 함수
const initializeApp = async () => {
  try {
    // 팔레트 UI 초기화 (비동기)
    await initPaletteUI();

    // 다른 초기화 코드들...
    console.log("애플리케이션이 성공적으로 초기화되었습니다.");
  } catch (error) {
    console.error("애플리케이션 초기화 중 오류 발생:", error);
  }
};

// 팔레트 UI 초기화
initializeApp();

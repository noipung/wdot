export const loadPaletteData = async () => {
  try {
    const response = await fetch("data/palette.json");
    if (!response.ok) {
      throw new Error("팔레트 데이터를 불러오지 못했습니다.");
    }
    return await response.json();
  } catch (error) {
    console.error("팔레트 데이터 로딩 에러:", error);

    return {
      WPlace: [
        { rgb: [0, 0, 0], name: "Black", locked: false },
        { rgb: [255, 255, 255], name: "White", locked: true },
      ],
    };
  }
};

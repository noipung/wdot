export const loadPaletteData = async () => {
  try {
    const response = await fetch(new URL("/palette.json", import.meta.url));
    if (!response.ok) {
      throw new Error("팔레트 데이터를 불러오지 못했습니다.");
    }
    return await response.json();
  } catch (error) {
    console.error("팔레트 데이터 로딩 에러:", error);

    return {
      WPlace: {
        customColor: false,
        terrainColor: false,
        colors: [
          { rgb: [0, 0, 0], name: "Black", type: "locked" },
          { rgb: [255, 255, 255], name: "White", type: "locked" },
        ],
      },
    };
  }
};

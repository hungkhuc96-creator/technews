// Trọng số xếp độ nóng báo chí: ƯU TIÊN ĐỘ MỚI.
// - số nguồn tuyến tính (điểm cộng độ phủ vừa phải, không bình phương)
// - phạt thời gian mạnh (mũ 1.5) để feed luôn tươi, tin cũ trôi xuống dù nhiều nguồn
const BREADTH_POWER = 1;
const TIME_GRAVITY = 1.5;

export function pressHeat(nSources: number, ageHours: number): number {
  return Math.pow(nSources, BREADTH_POWER) / Math.pow(ageHours + 2, TIME_GRAVITY);
}

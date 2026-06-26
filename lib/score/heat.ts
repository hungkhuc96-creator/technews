// Trọng số xếp độ nóng báo chí: ƯU TIÊN ĐỘ MỚI.
// - số nguồn tuyến tính (điểm cộng độ phủ vừa phải, không bình phương)
// - phạt thời gian mạnh (mũ 1.5) để feed luôn tươi, tin cũ trôi xuống dù nhiều nguồn
const BREADTH_POWER = 1;
const TIME_GRAVITY = 1.5;

export function pressHeat(nSources: number, ageHours: number): number {
  return Math.pow(nSources, BREADTH_POWER) / Math.pow(ageHours + 2, TIME_GRAVITY);
}

// Nguồn đứng riêng (YouTube/Reddit/TikTok): độ nóng theo engagement tuyệt đối.
export function engagementHeat(metric: number, ageHours: number): number {
  return Math.log10(1 + Math.max(0, metric)) / Math.pow(ageHours + 2, TIME_GRAVITY);
}

// X (và fallback khi thiếu engagement): độ nóng thuần theo độ mới.
export function recencyHeat(ageHours: number): number {
  return 1 / Math.pow(ageHours + 2, TIME_GRAVITY);
}

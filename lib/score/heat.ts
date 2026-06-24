// Trọng số xếp độ nóng báo chí:
// - ưu tiên ĐỘ PHỦ (số nguồn) bằng cách bình phương → 2 nguồn = 4×, 7 nguồn = 49×
// - giảm nhẹ phạt thời gian (1.5 → 1.2) để cụm nhiều nguồn nổi lên dù cũ hơn chút
const BREADTH_POWER = 2;
const TIME_GRAVITY = 1.2;

export function pressHeat(nSources: number, ageHours: number): number {
  return Math.pow(nSources, BREADTH_POWER) / Math.pow(ageHours + 2, TIME_GRAVITY);
}

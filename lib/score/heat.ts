// Trọng số xếp độ nóng báo chí (công thức P1 audit):
//   điểm = (√số_nguồn + 1.5×số_nguồn_mới_12h + uy_tín) / (tuổi + 2)^1.5 × hệ_số
// - √số_nguồn: độ phủ vẫn cộng điểm nhưng không tuyến tính (11 nguồn ≠ nóng ×11)
// - số_nguồn_mới_12h: TỐC ĐỘ lan truyền — tin đang bùng nổ vọt lên ngay
// - uy_tín (+0.5): cụm có ≥1 nguồn tier-1 (tin đồn NotebookCheck ≠ bài The Verge)
// - tuổi TRỘN = 70% tuổi bài mới nhất + 30% tuổi cụm (bài đầu tiên): tin có báo
//   đăng lại muộn không "trẻ lại về 0" được nữa (case thật: tin Sony 2.5 ngày,
//   1 báo đăng lại → chiếm "Nóng nhất"); tin đang diễn biến thật (nhiều nguồn
//   dồn dập) vẫn nóng nhờ điểm tốc độ
// - phạt tuổi mạnh (mũ 1.5) để feed luôn tươi
// - cụm sống >72h nhân 0.5: lưới chặn "hồi máu" tầng hai
// - tin thuần Mỹ (nhà mạng US...) nhân 0.4: đúng nhưng vô nghĩa với người đọc Việt
const TIME_GRAVITY = 1.5;
const VELOCITY_WEIGHT = 1.5;
const TIER1_BONUS = 0.5;
const FRESH_AGE_WEIGHT = 0.7;   // tuổi trộn: 70% bài mới nhất + 30% tuổi cụm
const NECRO_HOURS = 72;
const NECRO_FACTOR = 0.5;
const US_ONLY_FACTOR = 0.4;

export interface PressHeatOpts {
  newSources12h?: number;     // số NGUỒN có bài trong 12h qua (tốc độ lan truyền)
  hasTier1?: boolean;         // cụm có ≥1 nguồn uy tín
  usOnly?: boolean;           // tin thuần Mỹ (giảm điểm, không xóa)
  firstSeenAgeHours?: number; // tuổi cụm theo BÀI ĐẦU TIÊN (chống hồi máu)
}

export function pressHeat(nSources: number, ageHours: number, opts: PressHeatOpts = {}): number {
  // Tốc độ = nguồn THỨ HAI trở đi trong 12h (trừ 1): 1 bài lẻ mới đăng không phải
  // "lan truyền" — độ mới đã được mẫu số lo; không trừ thì listicle 1 nguồn leo top.
  const velocity = Math.max(0, (opts.newSources12h ?? 0) - 1);
  const base =
    Math.sqrt(Math.max(0, nSources)) +
    VELOCITY_WEIGHT * velocity +
    (opts.hasTier1 ? TIER1_BONUS : 0);
  // Tuổi trộn: không có firstSeen (hoặc firstSeen mới hơn bài — không xảy ra
  // trong thực tế) thì dùng nguyên tuổi bài mới nhất như cũ.
  const firstAge = Math.max(opts.firstSeenAgeHours ?? ageHours, ageHours);
  const effAge = FRESH_AGE_WEIGHT * ageHours + (1 - FRESH_AGE_WEIGHT) * firstAge;
  let heat = base / Math.pow(effAge + 2, TIME_GRAVITY);
  if ((opts.firstSeenAgeHours ?? 0) > NECRO_HOURS) heat *= NECRO_FACTOR;
  if (opts.usOnly) heat *= US_ONLY_FACTOR;
  return heat;
}

// Nguồn đứng riêng (YouTube/Reddit/TikTok): độ nóng theo engagement tuyệt đối.
export function engagementHeat(metric: number, ageHours: number): number {
  return Math.log10(1 + Math.max(0, metric)) / Math.pow(ageHours + 2, TIME_GRAVITY);
}

// X (và fallback khi thiếu engagement): độ nóng thuần theo độ mới.
export function recencyHeat(ageHours: number): number {
  return 1 / Math.pow(ageHours + 2, TIME_GRAVITY);
}

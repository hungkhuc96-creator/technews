// Trọng số xếp độ nóng báo chí (công thức P1 audit):
//   điểm = (√số_nguồn + 1.5×số_nguồn_mới_12h + uy_tín) / (tuổi + 2)^1.5 × hệ_số
// - √số_nguồn: độ phủ vẫn cộng điểm nhưng không tuyến tính (11 nguồn ≠ nóng ×11)
// - số_nguồn_mới_12h: TỐC ĐỘ lan truyền — tin đang bùng nổ vọt lên ngay
// - uy_tín (+0.5): cụm có ≥1 nguồn tier-1 (tin đồn NotebookCheck ≠ bài The Verge)
// - tuổi theo bài mới nhất, phạt mạnh (mũ 1.5) để feed luôn tươi
// - cụm sống >72h nhân 0.5: chặn "hồi máu" tin cũ khi 1 báo chậm chân đăng lại
// - tin thuần Mỹ (nhà mạng US...) nhân 0.4: đúng nhưng vô nghĩa với người đọc Việt
const TIME_GRAVITY = 1.5;
const VELOCITY_WEIGHT = 1.5;
const TIER1_BONUS = 0.5;
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
  let heat = base / Math.pow(ageHours + 2, TIME_GRAVITY);
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

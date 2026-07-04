// Trọng số xếp độ nóng báo chí (công thức P1 audit):
//   điểm = (√số_nguồn + 1.5×số_nguồn_mới_12h + uy_tín) / (tuổi + 2)^1.5
//          × xác_nhận_chéo × hệ_số_phạt
// - √số_nguồn: độ phủ vẫn cộng điểm nhưng không tuyến tính (11 nguồn ≠ nóng ×11)
// - xác_nhận_chéo (+40%/nguồn, trần 6): tin nhiều báo cùng đưa đáng tin và đáng
//   nổi hơn tin lẻ — bù lại việc tuổi trộn phạt mọi cụm nhiều nguồn
// - số_nguồn_mới_12h: TỐC ĐỘ lan truyền — tin đang bùng nổ vọt lên ngay
// - uy_tín (+0.5): cụm có ≥1 nguồn tier-1 (tin đồn NotebookCheck ≠ bài The Verge)
// - tuổi TRỘN = 70% tuổi bài mới nhất + 30% tuổi cụm (bài đầu tiên): tin có báo
//   đăng lại muộn không "trẻ lại về 0" được nữa (case thật: tin Sony 2.5 ngày,
//   1 báo đăng lại → chiếm "Nóng nhất"); tin đang diễn biến thật (nhiều nguồn
//   dồn dập) vẫn nóng nhờ điểm tốc độ
// - phạt tuổi mạnh (mũ 1.5) để feed luôn tươi
// - cụm sống >48h nhân 0.5: lưới chặn "hồi máu" tầng hai
// - tin thuần Mỹ (nhà mạng US...) nhân 0.4: đúng nhưng vô nghĩa với người đọc Việt
const TIME_GRAVITY = 1.5;
const VELOCITY_WEIGHT = 1.5;
const TIER1_BONUS = 0.5;
// Tuổi trộn: 80% bài mới nhất + 20% tuổi cụm. Từng để 70/30 nhưng phạt tuổi cụm
// quá nặng: tin đang có DIỄN BIẾN (Anthropic×Samsung, bài mới 1h) thua tin lẻ 3h.
// 20% đủ ghìm tin cũ vì đã có trần necro 48h chặn phía sau.
const FRESH_AGE_WEIGHT = 0.8;
// Hệ số XÁC NHẬN CHÉO: mỗi nguồn thêm nhân +40%, trần 6 nguồn (×3). Cần vì tuổi
// trộn phạt mọi cụm (gom nguồn cần thời gian) — thiếu hệ số này, tin lẻ vừa đăng
// thắng sạch tin gộp (đã xảy ra: top 15 có 11 tin 1-nguồn, cụm 11 nguồn hạng 36).
const CORROBORATION_BOOST = 0.4;
const CORROBORATION_CAP = 6;
const NECRO_HOURS = 48;  // tin sống >2 ngày là "cũ" — 72h từng để lọt tin Sony 64h
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
  heat *= 1 + CORROBORATION_BOOST * (Math.min(Math.max(nSources, 1), CORROBORATION_CAP) - 1);
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

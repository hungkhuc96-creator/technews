-- Giãn nhịp bước pipeline: bảng lưu mốc chạy gần nhất của từng bước (dịch tiêu đề,
-- tóm tắt). Script đọc mốc này để bỏ qua nếu mới chạy < ngưỡng phút — tiết kiệm lượt
-- gọi Claude (gom cụm vẫn 15 phút cho tươi, dịch/tóm tắt giãn ra 30 phút).
create table if not exists pipeline_runs (
  step text primary key,
  last_run_at timestamptz not null default now()
);

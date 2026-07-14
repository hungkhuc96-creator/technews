-- EGRESS FIX #2: feed đang kéo nguyên văn `text` (tới 4.000 ký tự/tin) từ Supabase
-- mỗi lần render/scroll, dù thẻ feed KHÔNG hiển thị text (chỉ ReaderPanel dùng khi
-- bấm mở). ~3–5 GB/tháng. Thêm cột text_preview (500 ký tự đầu) cho feed lấy; trang
-- chi tiết /tin/[id] vẫn lấy `text` đầy đủ. Trigger tự đồng bộ như các cột vector.

alter table posts add column if not exists text_preview text;

create or replace function sync_text_preview() returns trigger language plpgsql as $$
begin
  new.text_preview := left(new.text, 500);
  return new;
end $$;

drop trigger if exists trg_sync_text_preview on posts;
create trigger trg_sync_text_preview before insert or update of text on posts
  for each row execute function sync_text_preview();

update posts set text_preview = left(text, 500)
  where text is not null and text_preview is null;

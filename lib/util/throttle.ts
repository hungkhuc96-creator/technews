import type { SupabaseClient } from '@supabase/supabase-js';

// Giãn nhịp một bước pipeline: chỉ chạy nếu lần chạy trước đã quá `minMinutes` phút.
// Dùng mốc thời gian lưu trong DB (bảng pipeline_runs) thay vì gate theo phút — vì
// pinger cron-job.org kích hoạt không đều (không đúng :00/:30). Giống cơ chế chống
// gửi đúp của digest (sentRecently).

// Thuần (test được): còn trong cửa sổ chặn → true (bỏ qua chạy).
export function isThrottled(lastRunAt: string | null, now: Date, minMinutes: number): boolean {
  if (!lastRunAt) return false; // chưa từng chạy → cho chạy
  const elapsedMin = (now.getTime() - new Date(lastRunAt).getTime()) / 60000;
  return elapsedMin < minMinutes;
}

// Trả true nếu ĐƯỢC chạy (và ghi lại mốc now). Trả false nếu còn trong cửa sổ chặn.
export async function shouldRun(
  client: SupabaseClient,
  step: string,
  minMinutes: number,
  now: Date = new Date(),
): Promise<boolean> {
  const { data } = await client
    .from('pipeline_runs')
    .select('last_run_at')
    .eq('step', step)
    .maybeSingle();
  if (isThrottled((data?.last_run_at as string | undefined) ?? null, now, minMinutes)) return false;
  await client
    .from('pipeline_runs')
    .upsert({ step, last_run_at: now.toISOString() }, { onConflict: 'step' });
  return true;
}

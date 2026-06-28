export const dynamic = 'force-dynamic';

// Cổng để dịch vụ hẹn giờ ngoài (cron-job.org) "bấm nút" chạy nạp báo chí mỗi 15'.
// cron-job.org chỉ cần GỌI: https://<web>/api/cron?key=<CRON_SECRET>
// Route này kiểm tra key rồi gọi GitHub workflow_dispatch bằng GH_DISPATCH_TOKEN.
const REPO = 'hungkhuc96-creator/technews';
const WORKFLOW = 'update-press.yml';

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key');
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return Response.json({ ok: false, error: 'sai hoặc thiếu key' }, { status: 401 });
  }
  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) return Response.json({ ok: false, error: 'thiếu GH_DISPATCH_TOKEN' }, { status: 500 });

  const r = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    },
  );

  if (r.status === 204) return Response.json({ ok: true, triggered: true });
  const detail = (await r.text()).slice(0, 300);
  return Response.json({ ok: false, status: r.status, detail });
}

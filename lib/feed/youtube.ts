// Lấy video ID từ link YouTube (watch?v= / shorts/ / youtu.be / embed).
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|\/shorts\/|youtu\.be\/|\/embed\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

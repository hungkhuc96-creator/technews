import type { RedditSource } from './reddit';

// Subreddit tin công nghệ (theo spec §12.3) — chọn các sub đậm đặc tin, ít meme.
export const REDDIT_SOURCES: RedditSource[] = [
  { name: 'r/technology', subreddit: 'technology' },
  { name: 'r/gadgets', subreddit: 'gadgets' },
  { name: 'r/hardware', subreddit: 'hardware' },
  { name: 'r/apple', subreddit: 'apple' },
  { name: 'r/Android', subreddit: 'Android' },
  { name: 'r/artificial', subreddit: 'artificial' },
  { name: 'r/OpenAI', subreddit: 'OpenAI' },
  { name: 'r/LocalLLaMA', subreddit: 'LocalLLaMA' },
  { name: 'r/MachineLearning', subreddit: 'MachineLearning' },
  { name: 'r/pcgaming', subreddit: 'pcgaming' },
];

/**
 * Random short-slug generator.
 *
 * Format: <adjective>-<noun>-<digits>, e.g. `quick-apple-42`. 2^36-ish
 * entropy which is plenty for "share with friends and family" scale —
 * collisions become ~1% at ~65k concurrent pastes, which we'll never hit.
 */
const ADJ = [
  'quick', 'brave', 'calm', 'cosmic', 'crisp', 'dapper', 'eager', 'fair',
  'gentle', 'happy', 'icy', 'jolly', 'keen', 'lively', 'merry', 'nimble',
  'odd', 'plucky', 'quiet', 'rapid', 'sunny', 'tidy', 'usual', 'vivid',
  'witty', 'young', 'zesty', 'bold', 'tall', 'tiny',
];

const NOUN = [
  'apple', 'badger', 'comet', 'delta', 'ember', 'finch', 'garnet', 'harbor',
  'iris', 'juno', 'koala', 'lark', 'maple', 'nimbus', 'oasis', 'pine',
  'quartz', 'raven', 'spruce', 'tide', 'umbra', 'vortex', 'willow', 'xenon',
  'yarrow', 'zephyr', 'atlas', 'cobalt', 'fjord', 'lynx',
];

/** Random integer in [0, n). Uses crypto for predictability. */
function randInt(n: number): number {
  return Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000) * n);
}

export function newSlug(): string {
  const a = ADJ[randInt(ADJ.length)];
  const n = NOUN[randInt(NOUN.length)];
  const d = randInt(100).toString().padStart(2, '0');
  return `${a}-${n}-${d}`;
}

const SLUG_RE = /^[a-z]+-[a-z]+-\d{2}$/;

/** Slugs are 2-word-2-digit. Reject anything else as either forge or typo. */
export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

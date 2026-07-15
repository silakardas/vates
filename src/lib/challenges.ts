export type ChallengeEntry = {
  id: string;
  daysAgo: number;
  prompt: string;
};

// A large, fixed pool of prompts. The prompt shown "today" is picked from
// this pool deterministically based on the current date (see
// getPromptForOffset below) — nobody has to edit this file day to day.
// Add more lines here whenever you want to grow the rotation; order doesn't
// matter, the date math decides which one shows on which day.
const PROMPT_POOL: string[] = [
  "Describe your favorite object as if it were a person.",
  "Write a scene that takes place entirely in a doorway.",
  "Someone is telling the truth, but no one believes them.",
  "Describe a place that only exists at night.",
  "A character finds something that isn't theirs, and keeps it.",
  "Write the moment right before a goodbye, not the goodbye itself.",
  "Two characters want the same thing for different reasons.",
  "Something small breaks, and it means everything.",
  "Write the last text message a character never sent.",
  "Two strangers wait out a storm under the same awning.",
  "Something ordinary is haunted, and no one else notices.",
  "A letter arrives twenty years late.",
  "Write about a character doing something they're ashamed of enjoying.",
  "Give a minor character a secret the protagonist never learns.",
  "A character is kinder to strangers than to the people who love them.",
  "Describe a room right after someone has left it for good.",
  "Write a place through the eyes of someone seeing it for the last time.",
  "A familiar street looks wrong, and no one can say why.",
  "Write a conversation where neither character says what they mean.",
  "Two characters argue about something small to avoid something large.",
  "Write the exact moment a lie is believed.",
  "An object is passed between three characters. Follow only the object.",
  "Something cheap means more than something expensive ever could.",
  "Write the biography of a single scar.",
  "Write relief that feels almost like grief.",
  "A character is happy and hates that they are.",
  "Describe jealousy without naming it once.",
  "Two people who love each other, disagreeing about something that matters.",
  "A character wins, and it costs them everything they wanted.",
  "Write the quiet part of a fight — after the shouting, before the leaving.",
  "Write a character keeping a promise they wish they hadn't made.",
  "Someone finally says the thing they rehearsed for years.",
  "A character returns somewhere and finds it smaller than they remembered.",
  "Write two characters who are both lying, and both know it.",
  "Describe a home through the objects its owner refuses to throw away.",
  "A character is forgiven for something they never confessed to.",
];

// Days since a fixed epoch, based on the caller's local calendar date, so
// "today" matches what the visitor actually sees on their own clock.
function dayNumber(date: Date = new Date()): number {
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(utcMidnight / 86400000);
}

// offset 0 = today's prompt, offset 1 = yesterday's, offset 2 = the day
// before that, etc. Deterministic: the same date always maps to the same
// prompt, and it wraps back to the start once the pool is exhausted.
export function getPromptForOffset(offset: number, date: Date = new Date()): string {
  const index = dayNumber(date) - offset;
  const normalized = ((index % PROMPT_POOL.length) + PROMPT_POOL.length) % PROMPT_POOL.length;
  return PROMPT_POOL[normalized];
}

export function getTodaysPrompt(date: Date = new Date()): string {
  return getPromptForOffset(0, date);
}

export function getPastChallenges(days: number = 7, date: Date = new Date()): ChallengeEntry[] {
  return Array.from({ length: days }, (_, i) => {
    const daysAgo = i + 1;
    return {
      id: `p${daysAgo}`,
      daysAgo,
      prompt: getPromptForOffset(daysAgo, date),
    };
  });
}

// Kept for the "Try a different prompt" shuffle button — those are shown on
// demand, not tied to a date, so a plain fixed list is fine here.
export const ALTERNATE_PROMPTS = [
  "Write the last text message a character never sent.",
  "Two strangers wait out a storm under the same awning.",
  "Something ordinary is haunted, and no one else notices.",
  "A letter arrives twenty years late.",
];

export type ChallengeTheme = {
  id: string;
  label: string;
  prompts: string[];
};

export const THEMES: ChallengeTheme[] = [
  {
    id: "character",
    label: "Character",
    prompts: [
      "Write about a character doing something they're ashamed of enjoying.",
      "Give a minor character a secret the protagonist never learns.",
      "A character is kinder to strangers than to the people who love them.",
    ],
  },
  {
    id: "setting",
    label: "Setting & atmosphere",
    prompts: [
      "Describe a room right after someone has left it for good.",
      "Write a place through the eyes of someone seeing it for the last time.",
      "A familiar street looks wrong, and no one can say why.",
    ],
  },
  {
    id: "dialogue",
    label: "Dialogue",
    prompts: [
      "Write a conversation where neither character says what they mean.",
      "Two characters argue about something small to avoid something large.",
      "Write the exact moment a lie is believed.",
    ],
  },
  {
    id: "object",
    label: "Object & symbol",
    prompts: [
      "An object is passed between three characters. Follow only the object.",
      "Something cheap means more than something expensive ever could.",
      "Write the biography of a single scar.",
    ],
  },
  {
    id: "emotion",
    label: "Emotion",
    prompts: [
      "Write relief that feels almost like grief.",
      "A character is happy and hates that they are.",
      "Describe jealousy without naming it once.",
    ],
  },
  {
    id: "conflict",
    label: "Conflict",
    prompts: [
      "Two people who love each other, disagreeing about something that matters.",
      "A character wins, and it costs them everything they wanted.",
      "Write the quiet part of a fight — after the shouting, before the leaving.",
    ],
  },
];

export function randomThemePrompt(themeId: string): string | undefined {
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return undefined;
  return theme.prompts[Math.floor(Math.random() * theme.prompts.length)];
}
export type ChallengeEntry = {
  id: string;
  daysAgo: number;
  prompt: string;
};

export const TODAYS_PROMPT =
  "Describe your favorite object as if it were a person.";

export const ALTERNATE_PROMPTS = [
  "Write the last text message a character never sent.",
  "Two strangers wait out a storm under the same awning.",
  "Something ordinary is haunted, and no one else notices.",
  "A letter arrives twenty years late.",
];

export const PAST_CHALLENGES: ChallengeEntry[] = [
  { id: "p1", daysAgo: 1, prompt: "Write a scene that takes place entirely in a doorway." },
  { id: "p2", daysAgo: 2, prompt: "Someone is telling the truth, but no one believes them." },
  { id: "p3", daysAgo: 3, prompt: "Describe a place that only exists at night." },
  { id: "p4", daysAgo: 4, prompt: "A character finds something that isn't theirs, and keeps it." },
  { id: "p5", daysAgo: 5, prompt: "Write the moment right before a goodbye, not the goodbye itself." },
  { id: "p6", daysAgo: 6, prompt: "Two characters want the same thing for different reasons." },
  { id: "p7", daysAgo: 7, prompt: "Something small breaks, and it means everything." },
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

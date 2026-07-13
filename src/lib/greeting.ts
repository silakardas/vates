const LINES = [
  "The page is exactly where you left it.",
  "Somewhere, a sentence is still waiting to be finished.",
  "Your desk remembers you.",
  "Nothing has moved since you were last here. Except, perhaps, the story.",
  "The lamp is still lit.",
  "Come back to the line that wasn't finished.",
  "Your characters have been patient.",
  "The ink hasn't dried. There's still time.",
];

export function randomLine(): string {
  return LINES[Math.floor(Math.random() * LINES.length)];
}

export function timeGreeting(name?: string): string {
  const hour = new Date().getHours();
  const who = name ? `, ${name}` : "";

  if (hour >= 23 || hour < 5) return `Still up${who}?`;
  if (hour < 12) return `Good morning${who}.`;
  if (hour < 18) return `Good afternoon${who}.`;
  return `Good evening${who}.`;
}

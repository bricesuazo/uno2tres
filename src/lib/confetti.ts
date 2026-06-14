import confetti from "canvas-confetti";
import type { GradeTier } from "./grading";

/** Fire a tier-appropriate celebration (or commiseration). */
export function celebrate(tier: GradeTier) {
  switch (tier) {
    case "great":
      bigParty();
      break;
    case "good":
      mediumParty();
      break;
    case "pass":
      cheekyPop();
      break;
    case "conditional":
      nervousSprinkle();
      break;
    case "failed":
      sadRain();
      break;
  }
}

function bigParty() {
  const end = Date.now() + 1400;
  const colors = ["#7c3aed", "#a3e635", "#f59e0b", "#22c55e", "#ec4899"];
  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 60,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 60,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 }, colors });
}

function mediumParty() {
  confetti({
    particleCount: 110,
    spread: 75,
    origin: { y: 0.6 },
    colors: ["#7c3aed", "#a3e635", "#22c55e"],
  });
}

function cheekyPop() {
  confetti({
    particleCount: 70,
    spread: 55,
    startVelocity: 35,
    origin: { y: 0.65 },
    colors: ["#f59e0b", "#a3e635", "#7c3aed"],
  });
}

function nervousSprinkle() {
  confetti({
    particleCount: 24,
    spread: 40,
    startVelocity: 22,
    gravity: 1.4,
    scalar: 0.8,
    origin: { y: 0.6 },
    colors: ["#f59e0b", "#facc15"],
  });
}

function sadRain() {
  // a slow, melancholy drizzle of 💀
  const skull = confetti.shapeFromText
    ? confetti.shapeFromText({ text: "💀", scalar: 2 })
    : undefined;
  confetti({
    particleCount: 30,
    spread: 120,
    startVelocity: 12,
    gravity: 0.7,
    decay: 0.94,
    scalar: 1.6,
    origin: { y: -0.1 },
    shapes: skull ? [skull] : undefined,
    flat: true,
  });
}

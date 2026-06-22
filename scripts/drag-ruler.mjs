import { MODULE_ID } from "./constants.mjs";

Hooks.once("dragRuler.ready", (SpeedProvider) => {
  class SymbaroumSpeedProvider extends SpeedProvider {
    get colors() {
      return [
        { id: "walk", default: 0x00ff00, name: "TENEBRE.Speeds.Walk" },
        { id: "run", default: 0xff8000, name: "TENEBRE.Speeds.Run" }
      ];
    }

    getRanges(token) {
      let baseSpeed = 10;
      try {
        baseSpeed = Number(game.settings.get(MODULE_ID, "symbaroumMovementSpeed")) ?? 10;
      } catch (err) {
        // Fallback if settings are not initialized yet
      }

      const actor = token.actor;
      if (actor) {
        const items = Array.from(actor.items.values());
        const hasFleetFooted = items.some(item => {
          const name = item.name?.toLowerCase() || "";
          return name.includes("pés leves") || name.includes("pes leves") || name.includes("fleet-footed") || name.includes("fleet footed");
        });
        const hasSlow = items.some(item => {
          const name = item.name?.toLowerCase() || "";
          return name.includes("lento") || name.includes("slow");
        });

        if (hasFleetFooted) {
          baseSpeed = 13;
        } else if (hasSlow) {
          baseSpeed = 7;
        }
      }

      return [
        { range: baseSpeed, color: "walk" },
        { range: baseSpeed * 2, color: "run" }
      ];
    }
  }

  if (window.dragRuler) {
    window.dragRuler.registerModule(MODULE_ID, SymbaroumSpeedProvider);
  } else if (typeof dragRuler !== "undefined") {
    dragRuler.registerModule(MODULE_ID, SymbaroumSpeedProvider);
  }
});

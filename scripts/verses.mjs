export const VerseService = {
  async load() {
    const url = "modules/symbaroum-ind-resources/data/aroaleta-verses.json";
    return foundry.utils.fetchJsonWithTimeout(url);
  },

  async roll() {
    const data = await this.load();

    if (!data || typeof data !== "object") return null;

    const keys = Object.keys(data);
    const key = keys[Math.floor(Math.random() * keys.length)];

    const list = data[key];
    const text = list[Math.floor(Math.random() * list.length)];

    return { key, text };
  },

  async speak() {
    const result = await this.roll();
    if (!result) return;

    ChatMessage.create({
      speaker: { alias: "Aroaleta" },
      content: `
        <h3>Assim Falou Aroaleta</h3>
        <blockquote>${result.text}</blockquote>
        <footer>${result.key}</footer>
      `
    });
  }
};

export function appendOriginalChatPreview(card, source, { hasUnadaptedContent = false } = {}) {
  if (!card || !source || !hasUnadaptedContent || !globalThis.game?.user?.isGM) return false;

  const preview = source.cloneNode(true);
  preview.hidden = true;
  preview.classList.add("tenebre-original-chat-preview");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "tenebre-original-chat-info";
  button.title = localize("TENEBRE.ChatOriginal.Show", "Show original message");
  button.setAttribute("aria-label", button.title);
  button.setAttribute("aria-expanded", "false");

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "i";
  button.append(icon);

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    preview.hidden = !preview.hidden;
    const expanded = !preview.hidden;
    button.classList.toggle("is-open", expanded);
    button.setAttribute("aria-expanded", String(expanded));
    button.title = localize(
      expanded ? "TENEBRE.ChatOriginal.Hide" : "TENEBRE.ChatOriginal.Show",
      expanded ? "Hide original message" : "Show original message"
    );
    button.setAttribute("aria-label", button.title);
  });

  card.append(button, preview);
  return true;
}

function localize(key, fallback) {
  const value = globalThis.game?.i18n?.localize?.(key);
  return value && value !== key ? value : fallback;
}

import { render } from "preact";
import "@/styles/globals.css";
import { Popup } from "./Popup";
import { getPreferences } from "@/lib/preferences";
import { applyTheme, watchSystemTheme } from "@/lib/theme";

async function init() {
  const prefs = await getPreferences();
  applyTheme(prefs.theme);

  if (prefs.theme === "system") {
    watchSystemTheme(() => applyTheme("system"));
  }

  const root = document.getElementById("root");
  if (root) render(<Popup />, root);
}

init();

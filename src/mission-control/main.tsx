import { render } from "preact";
import "@/styles/globals.css";
import { MissionControl } from "./MissionControl";

const root = document.getElementById("root");
if (root) render(<MissionControl />, root);

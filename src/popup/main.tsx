import { render } from "preact";
import "@/styles/globals.css";
import { Popup } from "./Popup";

const root = document.getElementById("root");
if (root) render(<Popup />, root);

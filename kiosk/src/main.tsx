import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Pas de StrictMode : en mode borne on évite le double-montage des effets
// (double abonnement aux événements matériels en dev).
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);

// Durcissement borne : neutralise le menu contextuel et le zoom.
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault();
});

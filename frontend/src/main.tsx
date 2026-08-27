import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Note: no <React.StrictMode> — react-leaflet v4's MapContainer throws
// "Map container is already initialized" under StrictMode's double-mount in dev.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

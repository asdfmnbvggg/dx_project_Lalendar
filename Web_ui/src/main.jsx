import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

function lockMobileViewportZoom() {
  let lastTouchEndAt = 0;

  const preventGestureZoom = (event) => event.preventDefault();
  const preventPinchZoom = (event) => {
    if (event.touches.length > 1) event.preventDefault();
  };
  const preventDoubleTapZoom = (event) => {
    const now = Date.now();
    if (now - lastTouchEndAt <= 300) event.preventDefault();
    lastTouchEndAt = now;
  };

  document.addEventListener("gesturestart", preventGestureZoom, { passive: false });
  document.addEventListener("gesturechange", preventGestureZoom, { passive: false });
  document.addEventListener("touchmove", preventPinchZoom, { passive: false });
  document.addEventListener("touchend", preventDoubleTapZoom, { passive: false });
}

lockMobileViewportZoom();

createRoot(document.getElementById("root")).render(<App />);

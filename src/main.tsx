import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import { router } from "./router";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const root = createRoot(document.getElementById("root")!);

if (!convexUrl) {
  root.render(<MissingBackend />);
} else {
  const convex = new ConvexReactClient(convexUrl);
  root.render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <RouterProvider router={router} />
      </ConvexProvider>
    </StrictMode>,
  );
}

function MissingBackend() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        fontFamily: "system-ui, sans-serif",
        padding: "1.5rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "3rem" }}>🔌</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
        Backend not connected
      </h1>
      <p style={{ maxWidth: "28rem", color: "#666" }}>
        <code>VITE_CONVEX_URL</code> is missing. Run{" "}
        <code>npx convex dev</code> in another terminal to start the Convex
        backend — it writes the URL to <code>.env.local</code> for you.
      </p>
    </div>
  );
}

"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            fontFamily: "system-ui, sans-serif",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "2rem" }}>Something went wrong</h1>
          <p style={{ color: "#666", maxWidth: 380 }}>
            A critical error occurred. Please refresh the page or try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "0.5rem",
              background: "#16281F",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

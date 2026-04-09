export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#f8fafc" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "#6366f1", borderTopColor: "transparent" }}
        />
        <p
          style={{
            color: "#94a3b8",
            fontSize: 14,
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Loading…
        </p>
      </div>
    </div>
  );
}

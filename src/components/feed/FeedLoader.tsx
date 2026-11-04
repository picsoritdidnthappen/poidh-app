export default function FeedLoader() {
  return (
    <div
      role="status"
      aria-label="loading"
      className="flex w-full items-center justify-center py-8 font-mono text-white/60 normal-case"
    >
      <span>loading</span>
      <span className="ml-0.5 inline-flex items-end">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="inline-block animate-bounce"
            style={{
              animationDelay: `${i * 150}ms`,
              animationDuration: '900ms',
            }}
          >
            .
          </span>
        ))}
      </span>
    </div>
  );
}

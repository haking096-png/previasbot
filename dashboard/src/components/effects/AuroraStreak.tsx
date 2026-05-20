'use client';

export default function AuroraStreak() {
  return (
    <div className="fixed top-0 left-0 right-0 h-[300px] z-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 w-[200%]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.12) 20%, rgba(59, 130, 246, 0.08) 40%, rgba(99, 102, 241, 0.1) 60%, rgba(6, 182, 212, 0.06) 80%, transparent 100%)',
          filter: 'blur(60px)',
          animation: 'aurora-shift 12s ease-in-out infinite',
        }}
      />
    </div>
  );
}

const FlowerCluster = ({ className = "", mirror = false }: { className?: string; mirror?: boolean }) => (
  <svg
    className={`absolute h-52 w-36 ${className}`}
    viewBox="0 0 140 208"
    fill="none"
    aria-hidden="true"
  >
    <g transform={mirror ? "translate(140 0) scale(-1 1)" : undefined}>
      <path d="M68 198C62 158 66 123 82 84" stroke="hsl(var(--sage-deep) / 0.38)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M64 148C38 137 28 119 28 99C52 102 66 115 70 139" fill="hsl(var(--sage) / 0.18)" stroke="hsl(var(--sage-deep) / 0.28)" strokeWidth="2" />
      <path d="M74 127C103 118 117 98 116 78C91 81 75 98 70 121" fill="hsl(var(--sage) / 0.2)" stroke="hsl(var(--sage-deep) / 0.3)" strokeWidth="2" />
      <path d="M56 184C34 178 20 163 16 143C40 142 56 153 64 174" fill="hsl(var(--sage) / 0.16)" stroke="hsl(var(--sage-deep) / 0.24)" strokeWidth="2" />

      <g transform="translate(82 72)">
        <ellipse cx="0" cy="-24" rx="11" ry="25" fill="hsl(var(--terracotta-light) / 0.56)" transform="rotate(0)" />
        <ellipse cx="0" cy="-24" rx="11" ry="25" fill="hsl(var(--terracotta-light) / 0.5)" transform="rotate(72)" />
        <ellipse cx="0" cy="-24" rx="11" ry="25" fill="hsl(var(--terracotta-light) / 0.5)" transform="rotate(144)" />
        <ellipse cx="0" cy="-24" rx="11" ry="25" fill="hsl(var(--terracotta-light) / 0.48)" transform="rotate(216)" />
        <ellipse cx="0" cy="-24" rx="11" ry="25" fill="hsl(var(--terracotta-light) / 0.52)" transform="rotate(288)" />
        <circle cx="0" cy="0" r="9" fill="hsl(var(--primary-glow) / 0.72)" />
        <circle cx="0" cy="0" r="4" fill="hsl(var(--primary) / 0.62)" />
      </g>

      <g transform="translate(43 105) scale(0.72)">
        <ellipse cx="0" cy="-22" rx="10" ry="22" fill="hsl(var(--accent-soft) / 0.74)" transform="rotate(0)" />
        <ellipse cx="0" cy="-22" rx="10" ry="22" fill="hsl(var(--accent-soft) / 0.65)" transform="rotate(72)" />
        <ellipse cx="0" cy="-22" rx="10" ry="22" fill="hsl(var(--accent-soft) / 0.7)" transform="rotate(144)" />
        <ellipse cx="0" cy="-22" rx="10" ry="22" fill="hsl(var(--accent-soft) / 0.62)" transform="rotate(216)" />
        <ellipse cx="0" cy="-22" rx="10" ry="22" fill="hsl(var(--accent-soft) / 0.7)" transform="rotate(288)" />
        <circle cx="0" cy="0" r="8" fill="hsl(var(--primary-glow) / 0.66)" />
      </g>

      <g transform="translate(96 128) scale(0.52)">
        <ellipse cx="0" cy="-18" rx="9" ry="19" fill="hsl(var(--terracotta-light) / 0.5)" transform="rotate(0)" />
        <ellipse cx="0" cy="-18" rx="9" ry="19" fill="hsl(var(--terracotta-light) / 0.48)" transform="rotate(90)" />
        <ellipse cx="0" cy="-18" rx="9" ry="19" fill="hsl(var(--terracotta-light) / 0.48)" transform="rotate(180)" />
        <ellipse cx="0" cy="-18" rx="9" ry="19" fill="hsl(var(--terracotta-light) / 0.5)" transform="rotate(270)" />
        <circle cx="0" cy="0" r="7" fill="hsl(var(--primary-glow) / 0.7)" />
      </g>

      <path d="M70 121C61 113 53 109 43 105" stroke="hsl(var(--sage-deep) / 0.24)" strokeWidth="2" strokeLinecap="round" />
      <path d="M73 135C83 129 89 128 96 128" stroke="hsl(var(--sage-deep) / 0.22)" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

export const BotanicalEdges = () => (
  <div className="pointer-events-none fixed inset-y-0 left-0 right-0 z-10 overflow-hidden opacity-75 dark:opacity-55" aria-hidden="true">
    <FlowerCluster className="-left-16 top-[8vh] scale-[0.72] sm:-left-12 sm:scale-90 lg:-left-9 lg:top-[12vh]" />
    <FlowerCluster className="-left-20 top-[62vh] hidden scale-[0.82] rotate-[-8deg] sm:block lg:-left-10 lg:scale-105" />
    <FlowerCluster className="-right-20 top-[31vh] scale-[0.76] rotate-[5deg] sm:-right-14 sm:scale-95 lg:-right-10 lg:scale-110" mirror />
    <FlowerCluster className="-right-20 top-[76vh] hidden scale-[0.78] rotate-[11deg] sm:block lg:-right-12 lg:scale-95" mirror />
  </div>
);

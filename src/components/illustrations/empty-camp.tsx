import { cn } from "@/lib/utils/cn";

type Variant = "camp" | "box" | "calendar" | "wallet" | "photo" | "bell" | "people" | "rain";

/** Ilustrasi kecil untuk empty/error state, satu gaya dengan scene basecamp. */
export function EmptyCamp({ variant = "camp", className }: { variant?: Variant; className?: string }) {
  return (
    <svg viewBox="0 0 200 120" className={cn("w-auto", className)} aria-hidden>
      <ellipse cx="100" cy="104" rx="78" ry="10" fill="var(--sc-ground)" opacity="0.55" />
      <ellipse cx="100" cy="106" rx="54" ry="5" fill="var(--sc-shadow)" />
      {variant === "camp" && (
        <g>
          <path d="M52 104 L92 50 L132 104 Z" fill="var(--sc-tent)" />
          <path d="M92 50 L132 104 L112 104 Z" fill="var(--sc-tent-2)" />
          <path d="M82 104 L92 78 L102 104 Z" fill="var(--sc-tent-2)" />
          <rect x="91" y="36" width="2.5" height="16" fill="var(--sc-trunk)" />
          <path d="M93.5 37 L108 41 L93.5 45 Z" fill="var(--gold)" className="anim-flag" />
          <g transform="translate(150 100)">
            <path d="M-12 2 L12 -4 M-12 -4 L12 2" stroke="var(--sc-trunk)" strokeWidth="4" strokeLinecap="round" />
            <path d="M0 -6 Q-8 -16 0 -28 Q2 -18 8 -14 Q6 -8 0 -6 Z" fill="var(--gold)" className="anim-lamp" />
            <path d="M0 -8 Q-3 -13 0 -19 Q4 -13 0 -8 Z" fill="#ef6f5e" />
          </g>
        </g>
      )}
      {variant === "box" && (
        <g>
          <rect x="62" y="58" width="56" height="46" rx="4" fill="var(--sc-wood-light)" />
          <rect x="62" y="58" width="56" height="10" fill="var(--sc-wood)" />
          <rect x="84" y="58" width="12" height="46" fill="var(--sc-wood)" opacity="0.5" />
          <rect x="108" y="74" width="44" height="30" rx="4" fill="var(--sc-wood)" />
          <rect x="108" y="74" width="44" height="8" fill="var(--sc-trunk)" />
          <path d="M72 40 Q90 26 104 44" fill="none" stroke="var(--grass)" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 6" />
        </g>
      )}
      {variant === "calendar" && (
        <g>
          <rect x="62" y="36" width="76" height="68" rx="8" fill="var(--sc-paper)" stroke="var(--border-strong)" strokeWidth="2" />
          <rect x="62" y="36" width="76" height="18" rx="8" fill="var(--grass)" />
          <rect x="62" y="46" width="76" height="8" fill="var(--grass)" />
          <rect x="78" y="30" width="5" height="14" rx="2" fill="var(--sc-trunk)" />
          <rect x="117" y="30" width="5" height="14" rx="2" fill="var(--sc-trunk)" />
          {[0, 1, 2, 3].map((c) =>
            [0, 1, 2].map((r) => (
              <rect key={`${c}-${r}`} x={70 + c * 16} y={62 + r * 13} width="10" height="8" rx="2" fill={c === 2 && r === 1 ? "var(--gold)" : "var(--bg-soft)"} />
            )),
          )}
        </g>
      )}
      {variant === "wallet" && (
        <g>
          <path d="M70 60 Q70 50 80 50 H120 Q130 50 130 60 V98 Q130 104 124 104 H76 Q70 104 70 98 Z" fill="var(--sc-paper)" stroke="var(--border-strong)" strokeWidth="2" />
          <rect x="78" y="42" width="44" height="12" rx="4" fill="var(--sc-wood)" />
          <circle cx="100" cy="80" r="14" fill="var(--gold)" />
          <text x="100" y="85" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--sc-trunk)">Rp</text>
          <circle cx="146" cy="96" r="8" fill="var(--gold)" />
          <circle cx="152" cy="86" r="8" fill="var(--gold-600)" />
        </g>
      )}
      {variant === "photo" && (
        <g>
          <rect x="56" y="40" width="56" height="60" rx="3" fill="var(--sc-paper)" transform="rotate(-8 84 70)" stroke="var(--border-strong)" strokeWidth="2" />
          <rect x="84" y="36" width="60" height="64" rx="3" fill="var(--sc-paper)" stroke="var(--border-strong)" strokeWidth="2" />
          <rect x="90" y="42" width="48" height="40" fill="var(--sc-sky-top)" />
          <path d="M90 82 L106 62 L118 74 L126 66 L138 82 Z" fill="var(--sc-tree)" />
          <circle cx="128" cy="52" r="5" fill="var(--sc-sun)" />
        </g>
      )}
      {variant === "bell" && (
        <g>
          <path d="M100 38 Q76 40 76 70 V84 L68 94 H132 L124 84 V70 Q124 40 100 38 Z" fill="var(--gold)" />
          <circle cx="100" cy="100" r="7" fill="var(--sc-wood)" />
          <path d="M140 52 Q148 60 146 72 M60 52 Q52 60 54 72" stroke="var(--grass)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {variant === "people" && (
        <g>
          {[
            [74, "var(--grass)"],
            [100, "var(--sky)"],
            [126, "var(--gold)"],
          ].map(([x, c], i) => (
            <g key={i} transform={`translate(${x} ${i === 1 ? 100 : 104})`}>
              <path d="M-13 0 Q-13 -30 0 -31 Q13 -30 13 0 Z" fill={c as string} />
              <circle cx="0" cy="-40" r="10" fill="var(--sc-skin)" />
            </g>
          ))}
        </g>
      )}
      {variant === "rain" && (
        <g>
          <path d="M52 104 L92 56 L132 104 Z" fill="var(--sc-tent)" />
          <path d="M92 56 L132 104 L112 104 Z" fill="var(--sc-tent-2)" />
          <g fill="var(--sc-mountain)">
            <ellipse cx="100" cy="30" rx="30" ry="12" />
            <ellipse cx="80" cy="34" rx="18" ry="9" />
            <ellipse cx="122" cy="34" rx="18" ry="9" />
          </g>
          <path d="M84 48 L80 58 M100 50 L96 60 M116 48 L112 58 M140 60 L136 70 M60 60 L56 70" stroke="var(--sky)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

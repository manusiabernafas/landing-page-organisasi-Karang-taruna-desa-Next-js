import { cn } from "@/lib/utils/cn";

/**
 * Ilustrasi original "Basecamp Pemuda RW 05":
 * sekretariat beratap limasan, lapangan, tenda panitia, papan informasi,
 * meja kegiatan dengan kursi plastik merah, bendera merah putih,
 * lampu hias, dan siluet Merapi di kejauhan. Warna mengikuti tema (siang/malam).
 */
export function BasecampScene({ className, title = "Ilustrasi basecamp Pemuda RW 05 Kwarasan" }: { className?: string; title?: string }) {
  const bulbs = Array.from({ length: 13 }, (_, i) => i);
  return (
    <svg viewBox="0 0 800 520" className={cn("h-auto w-full", className)} role="img" aria-labelledby="basecamp-scene-title">
      <title id="basecamp-scene-title">{title}</title>
      <defs>
        <clipPath id="bc-frame">
          <rect width="800" height="520" rx="28" />
        </clipPath>
      </defs>

      <g clipPath="url(#bc-frame)">
        {/* Langit */}
        <rect width="800" height="520" fill="var(--sc-sky-top)" />
        <circle cx="648" cy="92" r="36" fill="var(--sc-sun)" />
        <circle cx="648" cy="92" r="52" fill="var(--sc-sun)" opacity="0.18" />

        {/* Awan */}
        <g className="anim-cloud" fill="var(--sc-cloud)">
          <ellipse cx="150" cy="86" rx="46" ry="15" />
          <ellipse cx="180" cy="74" rx="30" ry="18" />
          <ellipse cx="128" cy="78" rx="22" ry="13" />
        </g>
        <g className="anim-cloud-slow" fill="var(--sc-cloud)" opacity="0.9">
          <ellipse cx="470" cy="58" rx="38" ry="11" />
          <ellipse cx="492" cy="49" rx="24" ry="13" />
          <ellipse cx="740" cy="160" rx="34" ry="10" />
          <ellipse cx="758" cy="152" rx="20" ry="11" />
        </g>

        {/* Merapi di kejauhan */}
        <path d="M-20 318 Q140 262 238 196 L282 166 Q300 156 318 166 L364 196 Q470 262 640 318 Z" fill="var(--sc-mountain)" />
        <path d="M268 176 L282 166 Q300 156 318 166 L334 176 Q318 186 306 178 Q296 190 284 180 Q276 186 268 176 Z" fill="var(--sc-mountain-snow)" />
        <g className="anim-cloud-slow" fill="var(--sc-cloud)" opacity="0.7">
          <ellipse cx="302" cy="146" rx="16" ry="7" />
          <ellipse cx="314" cy="134" rx="11" ry="6" />
        </g>

        {/* Bukit */}
        <path d="M360 318 Q520 250 820 282 V360 H360 Z" fill="var(--sc-hill-far)" />
        <path d="M-10 336 Q190 292 410 326 T820 318 V520 H-10 Z" fill="var(--sc-hill-near)" />
        <path d="M-10 372 Q400 338 820 364 V520 H-10 Z" fill="var(--sc-ground)" />

        {/* Lapangan RW 05 */}
        <g>
          <path d="M408 380 L676 380 L744 452 L352 452 Z" fill="var(--sc-field)" />
          <path d="M416 385 L670 385 L732 447 L366 447 Z" fill="none" stroke="var(--sc-line)" strokeWidth="2.5" opacity="0.9" />
          <path d="M543 385 L549 447" stroke="var(--sc-line)" strokeWidth="2.5" opacity="0.9" />
          <ellipse cx="546" cy="416" rx="30" ry="10" fill="none" stroke="var(--sc-line)" strokeWidth="2.5" opacity="0.9" />
          <path d="M394 400 L394 386 L420 386 L420 400" fill="none" stroke="var(--sc-line)" strokeWidth="3" />
          <path d="M680 400 L680 386 L704 386 L704 400" fill="none" stroke="var(--sc-line)" strokeWidth="3" />
          <circle cx="596" cy="428" r="5" fill="#fff" stroke="var(--sc-wood)" strokeWidth="1.5" />
          {/* Pemain */}
          <Person x={574} y={432} body="var(--sky)" scale={0.7} />
          <Person x={622} y={420} body="var(--gold)" scale={0.66} />
        </g>

        {/* Pohon kiri belakang */}
        <g>
          <rect x="30" y="300" width="10" height="70" rx="4" fill="var(--sc-trunk)" />
          <g className="anim-leaf">
            <circle cx="35" cy="292" r="34" fill="var(--sc-tree-2)" />
            <circle cx="16" cy="306" r="22" fill="var(--sc-tree)" />
            <circle cx="54" cy="304" r="24" fill="var(--sc-tree)" />
            <circle cx="36" cy="276" r="22" fill="var(--sc-tree)" />
          </g>
        </g>

        {/* Sekretariat / Basecamp */}
        <g>
          <ellipse cx="176" cy="404" rx="118" ry="10" fill="var(--sc-shadow)" />
          <rect x="88" y="300" width="176" height="102" fill="var(--sc-wall)" />
          <rect x="88" y="300" width="176" height="12" fill="var(--sc-wall-shade)" />
          <path d="M66 306 L118 252 L234 252 L286 306 Z" fill="var(--sc-roof)" />
          <path d="M128 252 L152 214 L200 214 L224 252 Z" fill="var(--sc-roof-dark)" />
          <path d="M66 306 L286 306 L280 314 L72 314 Z" fill="var(--sc-roof-dark)" />
          <rect x="146" y="208" width="60" height="7" rx="3" fill="var(--sc-roof-dark)" />
          {/* Papan nama */}
          <rect x="116" y="320" width="120" height="22" rx="5" fill="var(--sc-wood)" />
          <text x="176" y="335.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--sc-paper)" letterSpacing="0.6" fontFamily="var(--font-body), sans-serif">
            BASECAMP RW 05
          </text>
          {/* Jendela */}
          <rect x="102" y="352" width="40" height="30" rx="4" fill="var(--sc-window)" className="anim-lamp" />
          <path d="M122 352 V382 M102 367 H142" stroke="var(--sc-wood)" strokeWidth="3" />
          <rect x="210" y="352" width="40" height="30" rx="4" fill="var(--sc-window)" className="anim-lamp" style={{ animationDelay: "-1.2s" }} />
          <path d="M230 352 V382 M210 367 H250" stroke="var(--sc-wood)" strokeWidth="3" />
          {/* Pintu */}
          <rect x="160" y="350" width="32" height="52" rx="3" fill="var(--sc-wood)" />
          <circle cx="185" cy="378" r="2.2" fill="var(--sc-light)" />
          {/* Lampu teras */}
          <circle cx="176" cy="346" r="11" fill="var(--sc-light)" opacity="0.25" className="anim-lamp" />
          <circle cx="176" cy="346" r="4" fill="var(--sc-light)" />
          <rect x="146" y="400" width="60" height="7" rx="2" fill="var(--sc-wall-shade)" />
          {/* Semak */}
          <ellipse cx="96" cy="400" rx="20" ry="11" fill="var(--sc-tree)" />
          <ellipse cx="256" cy="400" rx="22" ry="12" fill="var(--sc-tree)" />
          <ellipse cx="276" cy="404" rx="14" ry="8" fill="var(--sc-tree-2)" />
        </g>

        {/* Jalan setapak */}
        <path d="M162 406 Q170 460 110 530 L214 530 Q206 460 190 406 Z" fill="var(--sc-path)" />

        {/* Tiang bendera merah putih */}
        <g>
          <rect x="316" y="226" width="4" height="176" rx="2" fill="var(--sc-trunk)" />
          <circle cx="318" cy="224" r="4" fill="var(--sc-light)" />
          <g className="anim-flag">
            <rect x="320" y="232" width="44" height="14" fill="#d8352a" />
            <rect x="320" y="246" width="44" height="14" fill="#fbfaf6" />
          </g>
          <ellipse cx="318" cy="403" rx="14" ry="4" fill="var(--sc-shadow)" />
        </g>

        {/* Lampu hias antar tiang */}
        <path id="bc-string" d="M282 306 Q470 372 690 398" fill="none" stroke="var(--sc-trunk)" strokeWidth="1.6" opacity="0.8" />
        {bulbs.map((i) => {
          const t = (i + 0.5) / bulbs.length;
          const x = (1 - t) * (1 - t) * 282 + 2 * (1 - t) * t * 470 + t * t * 690;
          const y = (1 - t) * (1 - t) * 306 + 2 * (1 - t) * t * 372 + t * t * 398 + 5;
          const colors = ["var(--sc-light)", "#ef6f5e", "var(--sky)", "var(--sc-light)", "#7fd08b"];
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4.2"
              fill={colors[i % colors.length]}
              className="anim-lamp"
              style={{ animationDelay: `${-i * 0.35}s` }}
            />
          );
        })}

        {/* Papan informasi */}
        <g>
          <ellipse cx="300" cy="506" rx="54" ry="6" fill="var(--sc-shadow)" />
          <rect x="258" y="440" width="7" height="66" rx="2" fill="var(--sc-trunk)" />
          <rect x="336" y="440" width="7" height="66" rx="2" fill="var(--sc-trunk)" />
          <rect x="248" y="424" width="104" height="62" rx="6" fill="var(--sc-wood)" />
          <rect x="255" y="431" width="90" height="48" rx="3" fill="var(--sc-wood-light)" />
          <rect x="261" y="436" width="30" height="22" rx="2" fill="var(--sc-paper)" transform="rotate(-4 276 447)" />
          <rect x="296" y="436" width="42" height="16" rx="2" fill="var(--gold)" />
          <rect x="298" y="456" width="38" height="18" rx="2" fill="var(--sc-paper)" transform="rotate(3 317 465)" />
          <rect x="263" y="462" width="28" height="12" rx="2" fill="var(--sky)" />
          <path d="M265 443 H285 M265 448 H281 M265 453 H286" stroke="var(--sc-trunk)" strokeWidth="1.4" opacity="0.6" />
          <circle cx="276" cy="437" r="2" fill="#d8352a" />
          <circle cx="317" cy="438" r="2" fill="var(--sc-trunk)" />
          <circle cx="317" cy="458" r="2" fill="#d8352a" />
          <rect x="250" y="418" width="100" height="8" rx="3" fill="var(--sc-roof-dark)" />
          <Person x={236} y={500} body="var(--grass)" scale={1} />
          <Person x={368} y={502} body="var(--sc-roof)" scale={0.95} />
        </g>

        {/* Meja kegiatan & kursi plastik */}
        <g>
          <ellipse cx="492" cy="508" rx="80" ry="7" fill="var(--sc-shadow)" />
          <Chair x={428} y={504} />
          <Chair x={556} y={504} flip />
          <rect x="446" y="470" width="96" height="8" rx="2" fill="var(--sc-wood)" />
          <rect x="452" y="478" width="6" height="28" fill="var(--sc-trunk)" />
          <rect x="530" y="478" width="6" height="28" fill="var(--sc-trunk)" />
          <rect x="446" y="470" width="96" height="20" fill="var(--sc-paper)" opacity="0.85" />
          <rect x="462" y="454" width="22" height="16" rx="2" fill="var(--gold)" />
          <rect x="466" y="450" width="14" height="4" rx="1" fill="var(--sc-wood)" />
          <rect x="494" y="458" width="8" height="12" rx="2" fill="var(--sky)" />
          <rect x="506" y="458" width="8" height="12" rx="2" fill="var(--sc-paper)" stroke="var(--sc-wood)" strokeWidth="1" />
          <path d="M520 470 L528 452 L536 470 Z" fill="var(--grass)" />
          <Person x={492} y={468} body="var(--sc-wood-light)" scale={0.9} />
        </g>

        {/* Tenda panitia */}
        <g>
          <ellipse cx="690" cy="508" rx="92" ry="8" fill="var(--sc-shadow)" />
          <path d="M604 506 L690 412 L776 506 Z" fill="var(--sc-tent)" />
          <path d="M690 412 L776 506 L730 506 Z" fill="var(--sc-tent-2)" />
          <path d="M668 506 L690 452 L712 506 Z" fill="var(--sc-tent-2)" />
          <path d="M673 506 L690 462 L690 506 Z" fill="var(--sc-light)" opacity="0.35" className="anim-lamp" />
          <path d="M616 494 L764 494" stroke="var(--sc-light)" strokeWidth="3" opacity="0.7" />
          <rect x="688" y="384" width="4" height="30" fill="var(--sc-trunk)" />
          <path d="M692 386 L716 393 L692 400 Z" fill="var(--gold)" className="anim-flag" />
          <circle cx="690" cy="398" r="5" fill="var(--sc-light)" opacity="0.4" className="anim-lamp" />
        </g>

        {/* Pohon kanan */}
        <g>
          <rect x="766" y="330" width="9" height="60" rx="4" fill="var(--sc-trunk)" />
          <g className="anim-leaf-2">
            <circle cx="770" cy="320" r="30" fill="var(--sc-tree-2)" />
            <circle cx="752" cy="334" r="19" fill="var(--sc-tree)" />
            <circle cx="786" cy="332" r="20" fill="var(--sc-tree)" />
          </g>
        </g>

        {/* Rumput depan */}
        <g fill="var(--sc-ground-dark)">
          <path d="M20 520 Q26 500 30 520 Z M34 520 Q42 494 46 520 Z M580 520 Q586 502 590 520 Z M592 520 Q600 498 604 520 Z M60 520 Q64 506 70 520 Z" />
        </g>
      </g>
    </svg>
  );
}

function Person({ x, y, body, scale = 1 }: { x: number; y: number; body: string; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="10" ry="3" fill="var(--sc-shadow)" />
      <rect x="-6" y="-16" width="4.5" height="16" rx="2" fill="var(--sc-trunk)" />
      <rect x="1.5" y="-16" width="4.5" height="16" rx="2" fill="var(--sc-trunk)" />
      <path d="M-9 -16 Q-9 -36 0 -37 Q9 -36 9 -16 Z" fill={body} />
      <circle cx="0" cy="-44" r="7.5" fill="var(--sc-skin)" />
      <path d="M-7.5 -46 Q0 -56 7.5 -46 Q4 -49 0 -49 Q-4 -49 -7.5 -46 Z" fill="var(--sc-trunk)" />
    </g>
  );
}

function Chair({ x, y, flip }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})${flip ? " scale(-1 1)" : ""}`}>
      <rect x="-2" y="-18" width="16" height="4" rx="2" fill="var(--sc-chair)" />
      <rect x="-2" y="-30" width="4" height="14" rx="2" fill="var(--sc-chair)" />
      <rect x="0" y="-14" width="3" height="18" fill="var(--sc-chair)" />
      <rect x="10" y="-14" width="3" height="18" fill="var(--sc-chair)" />
    </g>
  );
}

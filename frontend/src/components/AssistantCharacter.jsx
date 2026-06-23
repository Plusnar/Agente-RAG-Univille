import { useEffect, useRef, useState } from "react";
import univilleSymbol from "../assets/univille-symbol.png";

let heartSeq = 0;

export function AssistantCharacter({
  status = "idle",
  emotion = "neutral",
  pizza = false,
  presentation = false,
}) {
  const svgRef = useRef(null);
  const headRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);
  const [blink, setBlink] = useState(false);
  const [clickHappy, setClickHappy] = useState(false);
  const [hearts, setHearts] = useState([]);
  const happyTimer = useRef(null);

  function handleClick() {
    setClickHappy(true);
    clearTimeout(happyTimer.current);
    happyTimer.current = setTimeout(() => setClickHappy(false), 2400);

    const burst = Array.from({ length: 6 }, () => ({
      id: heartSeq++,
      left: 26 + Math.random() * 48,
      size: 16 + Math.random() * 16,
      delay: Math.random() * 0.3,
    }));
    setHearts((prev) => [...prev, ...burst]);
    const ids = new Set(burst.map((h) => h.id));
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !ids.has(h.id)));
    }, 1800);
  }

  useEffect(() => () => clearTimeout(happyTimer.current), []);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame;

    function onMove(event) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.42;
      target.x = Math.max(-1, Math.min(1, (event.clientX - cx) / (rect.width * 0.7)));
      target.y = Math.max(-1, Math.min(1, (event.clientY - cy) / (rect.height * 0.7)));
    }

    function loop() {
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;

      const px = current.x * 9;
      const py = current.y * 7;
      if (leftPupilRef.current)
        leftPupilRef.current.style.transform = `translate(${px}px, ${py}px)`;
      if (rightPupilRef.current)
        rightPupilRef.current.style.transform = `translate(${px}px, ${py}px)`;
      if (headRef.current)
        headRef.current.style.transform = `translate(${current.x * 4}px, ${current.y * 2.5}px)`;

      frame = requestAnimationFrame(loop);
    }

    window.addEventListener("mousemove", onMove);
    frame = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    let timeout;
    function schedule() {
      const delay = 2400 + Math.random() * 3600;
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
        schedule();
      }, delay);
    }
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  const effectiveEmotion = pizza || clickHappy ? "happy" : emotion;
  const className = [
    "char",
    `status-${status}`,
    `emotion-${effectiveEmotion}`,
    blink && !pizza && effectiveEmotion !== "confused" ? "is-blink" : "",
    clickHappy ? "is-dancing" : "",
    pizza ? "is-eating" : "",
    presentation ? "is-presenting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`char-host${clickHappy ? " is-dancing-host" : ""}${presentation ? " is-presenting-host" : ""}`}
      onClick={handleClick}
      role="button"
      aria-label="Fazer carinho no robô"
    >
      <div className="char-hearts" aria-hidden="true">
        {hearts.map((heart) => (
          <span
            key={heart.id}
            className="heart"
            style={{ left: `${heart.left}%`, fontSize: `${heart.size}px`, animationDelay: `${heart.delay}s` }}
          >
            ♥
          </span>
        ))}
      </div>
    <svg
      ref={svgRef}
      className={className}
      viewBox="0 0 420 520"
      role="img"
      aria-label="Robô assistente da Univille"
    >
      <defs>
        <linearGradient id="robotGreen" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#8fe63a" />
          <stop offset="50%" stopColor="#25b53e" />
          <stop offset="100%" stopColor="#00713c" />
        </linearGradient>
        <linearGradient id="robotDark" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#0a8d40" />
          <stop offset="100%" stopColor="#00472a" />
        </linearGradient>
        <linearGradient id="robotPanel" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f2fff6" />
          <stop offset="100%" stopColor="#d4f5e1" />
        </linearGradient>
        <radialGradient id="badgeBg" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e6fbee" />
        </radialGradient>
        <radialGradient id="eyeGlow" cx="42%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#c9fff0" />
          <stop offset="62%" stopColor="#18d04a" />
          <stop offset="100%" stopColor="#02160f" />
        </radialGradient>
        <filter id="charSoftGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="badgeClip">
          <circle cx="210" cy="318" r="47" />
        </clipPath>
      </defs>

      <g className="char-root">
        <g className="char-details">
          <circle className="char-shine s2" cx="332" cy="120" r="5" fill="#b4f6ca" />
          <path className="char-shine s3" d="M86 150l5 11 11 3-11 4-5 11-5-11-11-4 11-3z" fill="#a6e9c7" opacity="0.85" />
        </g>

        <g className="char-legs">
          <g className="char-leg char-leg-left">
            <rect x="166" y="384" width="24" height="40" rx="9" fill="url(#robotDark)" />
            <ellipse cx="172" cy="430" rx="30" ry="16" fill="#0a8d40" stroke="#00482a" strokeWidth="4" />
            <ellipse cx="166" cy="426" rx="11" ry="5" fill="#bdf3cd" opacity="0.7" />
          </g>
          <g className="char-leg char-leg-right">
            <rect x="230" y="384" width="24" height="40" rx="9" fill="url(#robotDark)" />
            <ellipse cx="248" cy="430" rx="30" ry="16" fill="#0a8d40" stroke="#00482a" strokeWidth="4" />
            <ellipse cx="242" cy="426" rx="11" ry="5" fill="#bdf3cd" opacity="0.7" />
          </g>
        </g>

        <g className="char-arms">
          <g className="char-arm char-arm-left">
            <path d="M138 290c-34 4-58 22-70 52" fill="none" stroke="url(#robotDark)" strokeWidth="20" strokeLinecap="round" />
            <circle cx="64" cy="350" r="20" fill="url(#robotGreen)" stroke="#00482a" strokeWidth="4" />
            <ellipse cx="58" cy="344" rx="7" ry="4" fill="#cffbdc" opacity="0.8" />
          </g>
          <g className="char-arm char-arm-right">
            <path d="M282 290c34 4 58 22 70 52" fill="none" stroke="url(#robotDark)" strokeWidth="20" strokeLinecap="round" />
            <circle cx="356" cy="350" r="20" fill="url(#robotGreen)" stroke="#00482a" strokeWidth="4" />
            <ellipse cx="350" cy="344" rx="7" ry="4" fill="#cffbdc" opacity="0.8" />
          </g>
        </g>

        <g className="char-body">
          <rect x="128" y="240" width="164" height="158" rx="46" fill="url(#robotGreen)" stroke="#00592f" strokeWidth="6" />
          <rect x="144" y="256" width="44" height="14" rx="7" fill="#bdf3cd" opacity="0.55" />
          <circle cx="210" cy="318" r="50" fill="#ffffff" stroke="#bfead0" strokeWidth="3" />
          <image
            href={univilleSymbol}
            x="132"
            y="240"
            width="156"
            height="156"
            clipPath="url(#badgeClip)"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>

        <g className="char-head" ref={headRef}>
          <rect x="110" y="78" width="200" height="152" rx="48" fill="url(#robotGreen)" stroke="#00592f" strokeWidth="6" />
          <rect x="122" y="90" width="176" height="60" rx="30" fill="#bdf3cd" opacity="0.28" />
          <rect x="132" y="98" width="156" height="116" rx="36" fill="#0a6b38" stroke="#00482a" strokeWidth="4" />

          <g className="char-eyes">
            <g className="char-eye">
              <ellipse className="char-sclera-white" cx="171" cy="152" rx="25" ry="29" fill="#ffffff" stroke="#1a3d28" strokeWidth="3.5" />
              <g className="char-pupil" ref={leftPupilRef}>
                <ellipse cx="171" cy="153" rx="12" ry="15" fill="#0b0f0d" />
              </g>
              <circle className="char-eye-shine" cx="176" cy="146" r="4" fill="#ffffff" opacity="0.95" />
              <path
                className="char-eye-x"
                d="M157 137 L185 167 M185 137 L157 167"
                fill="none"
                stroke="#ffffff"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>
            <g className="char-eye">
              <ellipse className="char-sclera-white" cx="249" cy="152" rx="25" ry="29" fill="#ffffff" stroke="#1a3d28" strokeWidth="3.5" />
              <g className="char-pupil" ref={rightPupilRef}>
                <ellipse cx="249" cy="153" rx="12" ry="15" fill="#0b0f0d" />
              </g>
              <circle className="char-eye-shine" cx="254" cy="146" r="4" fill="#ffffff" opacity="0.95" />
              <path
                className="char-eye-x"
                d="M235 137 L263 167 M263 137 L235 167"
                fill="none"
                stroke="#ffffff"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>
          </g>

          {presentation && (
            <g className="char-sunglasses" aria-hidden="true">
              <path
                d="M142 139c18-8 48-7 61 3 8 6 8 28-1 39-12 14-45 13-58 1-10-10-11-36-2-43z"
                fill="#050607"
                stroke="#1c2520"
                strokeWidth="5"
              />
              <path
                d="M278 139c-18-8-48-7-61 3-8 6-8 28 1 39 12 14 45 13 58 1 10-10 11-36 2-43z"
                fill="#050607"
                stroke="#1c2520"
                strokeWidth="5"
              />
              <path d="M202 151c6-5 10-5 16 0" fill="none" stroke="#050607" strokeWidth="8" strokeLinecap="round" />
              <path d="M151 146c12-6 28-7 43-2" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.2" />
              <path d="M226 146c12-6 28-7 43-2" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.2" />
            </g>
          )}

          <g className="char-face">
            <ellipse className="char-cheek" cx="132" cy="180" rx="16" ry="8" fill="#ff8fab" opacity="0.55" filter="url(#charSoftGlow)" />
            <ellipse className="char-cheek" cx="288" cy="180" rx="16" ry="8" fill="#ff8fab" opacity="0.55" filter="url(#charSoftGlow)" />
            <g className="char-mouth">
              <path className="char-mouth-cavity" d="M190 188c0-7 40-7 40 0 0 14-9 22-20 22s-20-8-20-22z" fill="#003824" stroke="#4df07a" strokeWidth="3" />
              <ellipse className="char-mouth-tongue" cx="210" cy="200" rx="9" ry="5" fill="#19c24a" />
            </g>
            <path
              className="char-mouth-sad"
              d="M190 210 Q210 190 230 210"
              fill="none"
              stroke="#4df07a"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
        </g>

        <g className="char-pizza" aria-hidden="true">
          <path d="M210 196 L182 252 L238 252 Z" fill="#ffd166" stroke="#e09f1e" strokeWidth="3" strokeLinejoin="round" />
          <path d="M180 250 Q210 266 240 250" fill="none" stroke="#d98324" strokeWidth="11" strokeLinecap="round" />
          <circle cx="205" cy="224" r="5" fill="#d8392e" />
          <circle cx="220" cy="232" r="4.5" fill="#d8392e" />
          <circle cx="208" cy="242" r="4" fill="#d8392e" />
          <circle cx="196" cy="238" r="3.2" fill="#2f7d2f" />
        </g>
      </g>
    </svg>
    </div>
  );
}

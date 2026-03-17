import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "/src/supabase";

// ─── Fizbot Brand Colors ───
const FB = {
  navy: "#1E3A5F",
  navyDark: "#152D4A",
  navyLight: "#4A8BC2",
  coral: "#E8573E",
  coralLight: "#F47B63",
  gold: "#FBBF24",
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#F1F5F9",
  textSec: "#94A3B8",
  textTer: "#64748B",
  textDim: "#475569",
};

const SIZES = ["T1", "T2", "T3"];
const LISTING_PRICES = ["€300k", "€500k", "€800k"];
const BUYER_PRICES = ["€200-400k", "€400-600k", "€600-800k"];
const LOCATIONS = [
  { name: "Lisbon", img: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=200&h=120&fit=crop" },
  { name: "Porto", img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=200&h=120&fit=crop" },
  { name: "Algarve", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=120&fit=crop" },
];
const PRICE_MATCH_MAP = { "€300k": "€200-400k", "€500k": "€400-600k", "€800k": "€600-800k" };
const PRICE_TO_VALUE = { "€300k": 300000, "€500k": 500000, "€800k": 800000 };
const GAME_DURATION = 30;
const CHANNEL_NAME = "deal-rush-game";

// ─── Sound Utility ───
const audioCache = {};
function playSound(name, volume = 0.5) {
  try {
    if (!audioCache[name]) audioCache[name] = new Audio(`/sounds/${name}.mp3`);
    const a = audioCache[name];
    a.volume = volume;
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch (e) {}
}

// ─── Fizbot Logo SVG ───
function FizbotLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" stroke={FB.navyLight} strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="12" stroke={FB.navyLight} strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="6" fill={FB.coral} />
    </svg>
  );
}

// ─── Overlays ───
function MatchOverlay({ show }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      animation: "matchFade 1.6s ease-out forwards", pointerEvents: "none",
    }}>
      <div style={{ animation: "matchPop 1.6s ease-out forwards" }}>
        <div style={{
          fontSize: 64, fontWeight: 900, color: FB.coral,
          textShadow: `0 0 40px rgba(228,87,62,0.6), 0 0 80px rgba(228,87,62,0.3)`,
          letterSpacing: 8, fontFamily: "system-ui", textAlign: "center",
        }}>MATCH!</div>
        <div style={{
          fontSize: 18, color: FB.navyLight, textAlign: "center", marginTop: 8,
          fontFamily: "system-ui", letterSpacing: 2,
        }}>+1 Deal Closed</div>
      </div>
    </div>
  );
}

// ─── Mini Card ───
function MiniCard({ item, isMatched, isNew, side }) {
  const borderColor = isMatched ? FB.navyLight : (side === "listing" ? "#60A5FA" : "#F472B6");
  const bgColor = isMatched ? `rgba(30,58,95,0.2)` : "rgba(30,41,59,0.8)";
  const anim = isNew && isMatched ? "cardMatchIn 0.6s ease-out" : "slideFromLeft 0.3s ease-out";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: bgColor, border: `1.5px solid ${borderColor}`,
      borderRadius: 8, padding: "5px 8px", fontSize: 10, color: "#CBD5E1",
      animation: anim, flexShrink: 0,
      boxShadow: isMatched && isNew ? `0 0 12px rgba(30,58,95,0.5)` : "none",
    }}>
      {isMatched && <span style={{ color: FB.navyLight, fontWeight: 800, fontSize: 11 }}>✓</span>}
      <span style={{ fontWeight: 600, color: isMatched ? FB.navyLight : borderColor }}>{item.propertyType === "Apartment" ? "Apt" : "Villa"}</span>
      <span style={{ color: FB.textTer }}>·</span>
      <span>{item.size}</span>
      <span style={{ color: FB.textTer }}>·</span>
      <span>{item.priceRange}</span>
      <span style={{ color: FB.textTer }}>·</span>
      <span>{item.location}</span>
    </div>
  );
}

// ─── End Screen ───
function EndScreen({ matches, commission, matchedDeals, onReplay, player1, player2, leaderboardData }) {
  const [phase, setPhase] = useState("summary");
  const [displayMatches, setDisplayMatches] = useState(0);
  const [displayCommission, setDisplayCommission] = useState(0);

  // Count-up animation
  useEffect(() => {
    if (phase !== "summary") return;
    const steps = 30, dur = 1200;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplayMatches(Math.min(Math.round((matches / steps) * i), matches));
      setDisplayCommission(Math.min(Math.round((commission / steps) * i), commission));
      if (i >= steps) clearInterval(t);
    }, dur / steps);
    return () => clearInterval(t);
  }, [phase, matches, commission]);

  const colors = [FB.navyLight, "#3B82F6", "#F472B6", FB.gold, "#8B5CF6", "#06B6D4", FB.coral, "#F97316"];
  const particles = useMemo(() => {
    const p = [];
    for (let b = 0; b < 8; b++) {
      const cx = 10 + Math.random() * 80, cy = 5 + Math.random() * 40;
      const c = colors[b % colors.length], d = b * 0.2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, r = 30 + Math.random() * 60;
        p.push({ k: `b${b}${i}`, x: `calc(${cx}% + ${Math.cos(a) * r}px)`, y: `calc(${cy}% + ${Math.sin(a) * r}px)`, c, d, t: "burst" });
      }
    }
    for (let i = 0; i < 40; i++) {
      p.push({ k: `c${i}`, x: `${Math.random() * 100}%`, y: `${-5 - Math.random() * 15}%`, c: colors[Math.floor(Math.random() * 8)], d: Math.random() * 2.5, t: "conf" });
    }
    return p;
  }, []);

  const leaderboard = useMemo(() => {
    const teamName = `${player1?.name || "Player 1"} & ${player2?.name || "Player 2"}`;
    const playerEntry = { team: teamName, matches, commission, isPlayer: true };
    const all = [...(leaderboardData || []), playerEntry];
    all.sort((a, b) => b.commission - a.commission || b.matches - a.matches);
    return all.map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [matches, commission, leaderboardData, player1, player2]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(15,23,42,0.97)", backdropFilter: "blur(10px)", animation: "fadeIn 0.5s", overflow: "auto",
    }}>
      {particles.map(p => (
        <div key={p.k} style={{
          position: "absolute", left: p.x, top: p.y,
          width: p.t === "burst" ? 6 : Math.random() * 8 + 3, height: p.t === "burst" ? 6 : Math.random() * 8 + 3,
          borderRadius: p.t === "burst" ? "50%" : (Math.random() > 0.5 ? "50%" : "2px"), background: p.c,
          boxShadow: p.t === "burst" ? `0 0 6px ${p.c}` : "none",
          animation: `${p.t === "burst" ? "fwPop" : "confDrop"} ${p.t === "burst" ? "1.2s" : `${2 + Math.random() * 2}s`} ${p.d}s ease-out forwards`,
          transform: p.t === "conf" ? `rotate(${Math.random() * 360}deg)` : undefined,
        }} />
      ))}

      <div style={{ zIndex: 10, maxWidth: 520, width: "100%", padding: "24px 20px", animation: "scoreIn 0.8s 0.3s ease-out both" }}>
        {/* ─── SUMMARY ─── */}
        {phase === "summary" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, letterSpacing: 5, color: FB.textSec, fontFamily: "system-ui", marginBottom: 8, textTransform: "uppercase", fontWeight: 600 }}>
              Time's up!
            </div>
            <div style={{
              fontSize: 72, fontWeight: 900, fontFamily: "system-ui",
              background: `linear-gradient(135deg,${FB.navyLight},${FB.coral})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1,
              filter: `drop-shadow(0 4px 20px rgba(30,58,95,0.5))`,
              animation: "numberPop 0.3s ease-out",
            }}>{displayMatches}</div>
            <div style={{ fontSize: 16, color: FB.navyLight, fontFamily: "system-ui", fontWeight: 700, marginTop: 4, letterSpacing: 3, textTransform: "uppercase" }}>
              Deals matched
            </div>
            <div style={{
              marginTop: 20, padding: "14px 20px", background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.25)", borderRadius: 12, display: "inline-block",
            }}>
              <div style={{ fontSize: 11, color: FB.textSec, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Total commission earned</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: FB.gold, fontFamily: "system-ui", animation: "numberPop 0.3s ease-out" }}>€{displayCommission.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: FB.textTer, marginTop: 2 }}>2.5% per agent per deal</div>
            </div>
            {matchedDeals.length > 0 && (
              <div style={{ marginTop: 20, textAlign: "left" }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: FB.textTer, textTransform: "uppercase", fontWeight: 600, marginBottom: 8, textAlign: "center" }}>Closed deals</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {matchedDeals.map((deal, i) => {
                    const price = PRICE_TO_VALUE[deal.listing.priceRange] || 0;
                    const dealCommission = price * 0.025;
                    return (
                      <div key={deal.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: `rgba(30,58,95,0.1)`, border: `1px solid rgba(30,58,95,0.3)`,
                        borderRadius: 10, padding: "10px 14px",
                        animation: `dealReveal 0.5s ${0.3 + i * 0.15}s ease-out both`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, background: `rgba(30,58,95,0.2)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800, color: FB.navyLight,
                          }}>#{i + 1}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: FB.text }}>{deal.listing.propertyType} · {deal.listing.size} · {deal.listing.location}</div>
                            <div style={{ fontSize: 10, color: FB.textTer, marginTop: 1 }}>Listed {deal.listing.priceRange} → Buyer {deal.buyer.priceRange}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: FB.gold }}>€{dealCommission.toLocaleString()}</div>
                          <div style={{ fontSize: 9, color: FB.textTer }}>per agent</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => setPhase("leaderboard")} style={{
              marginTop: 24, padding: "12px 40px", fontSize: 14, fontWeight: 700, fontFamily: "system-ui",
              color: FB.text, background: `linear-gradient(135deg,${FB.navy},${FB.navyLight})`, border: "none",
              borderRadius: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: 2,
              boxShadow: `0 4px 20px rgba(30,58,95,0.5)`, transition: "transform 0.15s",
            }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
            >View leaderboard</button>
          </div>
        )}

        {/* ─── LEADERBOARD ─── */}
        {phase === "leaderboard" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, letterSpacing: 4, color: FB.textSec, fontFamily: "system-ui", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>Leaderboard</div>
            <div style={{ fontSize: 11, color: FB.textTer, marginBottom: 20 }}>Top teams</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {leaderboard.map((entry, i) => {
                const isPlayer = entry.isPlayer;
                const medalColors = { 1: FB.gold, 2: "#94A3B8", 3: "#CD7F32" };
                const medal = medalColors[entry.rank];
                return (
                  <div key={`${entry.team}-${i}`} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: isPlayer ? `rgba(30,58,95,0.15)` : "rgba(30,41,59,0.6)",
                    border: `1.5px solid ${isPlayer ? `rgba(74,139,194,0.5)` : FB.border}`,
                    borderRadius: 12, padding: "12px 16px",
                    animation: isPlayer ? `lbPlayerSlide 0.8s ${0.3 + i * 0.12}s ease-out both` : `lbRowFade 0.4s ${0.1 + i * 0.1}s ease-out both`,
                    boxShadow: isPlayer ? `0 0 20px rgba(30,58,95,0.3)` : "none",
                    position: "relative", overflow: "hidden",
                  }}>
                    {isPlayer && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,transparent,rgba(74,139,194,0.08),transparent)`, animation: "lbShine 2s 1.5s ease-in-out" }} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: medal ? `${medal}22` : FB.card, border: `1.5px solid ${medal || FB.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 900, color: medal || FB.textTer,
                      }}>{entry.rank}</div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 14, fontWeight: isPlayer ? 800 : 600, color: isPlayer ? FB.navyLight : FB.text }}>
                          {entry.team} {isPlayer && "⬅"}
                        </div>
                        <div style={{ fontSize: 10, color: FB.textTer }}>{entry.matches} matches</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: FB.gold, zIndex: 1 }}>€{entry.commission.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setPhase("fizbot")} style={{
              marginTop: 28, padding: "14px 48px", fontSize: 15, fontWeight: 700, fontFamily: "system-ui",
              color: FB.text, background: `linear-gradient(135deg,${FB.navy},${FB.navyLight})`, border: "none",
              borderRadius: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: 2,
              boxShadow: `0 4px 20px rgba(30,58,95,0.5)`, transition: "transform 0.15s",
            }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
            >Continue</button>
          </div>
        )}

        {/* ─── FIZBOT PROMO ─── */}
        {phase === "fizbot" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.8s ease-out" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `linear-gradient(135deg, ${FB.navy}, ${FB.navyLight})`,
              border: `3px solid ${FB.navyLight}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 28px",
              boxShadow: `0 0 40px rgba(30,58,95,0.5)`,
              animation: "pulse4 3s infinite",
            }}>
              <FizbotLogo size={44} />
            </div>

            <div style={{
              fontSize: 16, letterSpacing: 6, color: FB.textSec, fontWeight: 700,
              textTransform: "uppercase", marginBottom: 20,
              animation: "fadeIn 0.5s 0.2s ease-out both",
            }}>fizbot</div>

            <div style={{
              fontSize: 26, fontWeight: 800, color: FB.textSec, marginBottom: 8,
              animation: "fadeIn 0.5s 0.4s ease-out both",
            }}>
              Stop <span style={{ textDecoration: "line-through", color: FB.textTer }}>Search & Scroll</span>
            </div>

            <div style={{
              fontSize: 30, fontWeight: 900, marginBottom: 40,
              animation: "fadeIn 0.5s 0.6s ease-out both",
            }}>
              It's Time to <span style={{ color: FB.navyLight }}>Match</span> &{" "}
              <span style={{ color: FB.coral }}>Close</span>
            </div>

            <a href="https://fizbot.net" target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", padding: "18px 52px",
              fontSize: 17, fontWeight: 800, color: FB.text,
              background: `linear-gradient(135deg, ${FB.navy}, ${FB.navyLight})`,
              border: `2px solid ${FB.navyLight}`, borderRadius: 16,
              textDecoration: "none", letterSpacing: 3,
              boxShadow: `0 4px 30px rgba(30,58,95,0.6)`,
              animation: "pulse4 2.5s infinite, fadeIn 0.5s 0.8s ease-out both",
              transition: "transform 0.15s",
            }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
            >
              fizbot x — early access
            </a>

            <div style={{ marginTop: 40, animation: "fadeIn 0.5s 1s ease-out both" }}>
              <button onClick={onReplay} style={{
                padding: "10px 32px", fontSize: 13, fontWeight: 600, fontFamily: "system-ui",
                color: FB.textTer, background: "transparent", border: `1px solid ${FB.border}`,
                borderRadius: 10, cursor: "pointer", letterSpacing: 1,
                transition: "all 0.2s",
              }}
                onMouseOver={e => { e.currentTarget.style.color = FB.text; e.currentTarget.style.borderColor = FB.textSec; }}
                onMouseOut={e => { e.currentTarget.style.color = FB.textTer; e.currentTarget.style.borderColor = FB.border; }}
              >Play again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Game Panel (full screen on each tablet) ───
function GamePanel({ role, selections, onSelect, matchCount, timeLeft, disabled, commission, pendingItems, matchedDeals, playerName, partnerName, onEndGame }) {
  const isListing = role === "listing";
  const accent = isListing ? "#60A5FA" : "#F472B6";
  const accentBg = isListing ? "rgba(96,165,250,0.15)" : "rgba(244,114,182,0.15)";
  const accentBorder = isListing ? "rgba(96,165,250,0.5)" : "rgba(244,114,182,0.5)";
  const label = isListing ? "Listing Agent" : "Buyer Agent";

  const Chip = ({ label: chipLabel, selected, onClick }) => (
    <div key={selected ? "sel" : "un"} onClick={disabled ? undefined : onClick} style={{
      flex: "1 1 22%", background: selected ? accentBg : FB.card,
      border: `1.5px solid ${selected ? accentBorder : FB.border}`,
      borderRadius: 10, padding: "10px 6px", textAlign: "center",
      cursor: disabled ? "default" : "pointer", transition: "all 0.15s",
      userSelect: "none", WebkitTapHighlightColor: "transparent",
      animation: selected ? "chipBounce 0.3s ease-out" : "none",
    }}>
      <span style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? accent : FB.textSec }}>{chipLabel}</span>
    </div>
  );

  const TypeChip = ({ label: chipLabel, icon, selected, onClick }) => (
    <div onClick={disabled ? undefined : onClick} style={{
      flex: "1 1 45%", background: selected ? accentBg : FB.card,
      border: `1.5px solid ${selected ? accentBorder : FB.border}`,
      borderRadius: 12, padding: "14px 10px", textAlign: "center",
      cursor: disabled ? "default" : "pointer", transition: "all 0.15s",
      userSelect: "none", WebkitTapHighlightColor: "transparent",
      animation: selected ? "chipBounce 0.3s ease-out" : "none",
    }}>
      <div style={{ marginBottom: 6 }}>{icon}</div>
      <span style={{ fontSize: 14, fontWeight: selected ? 700 : 500, color: selected ? accent : FB.textSec }}>{chipLabel}</span>
    </div>
  );

  const houseIcon = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="11" width="16" height="10" rx="1.5" stroke={selections.propertyType === "Apartment" ? accent : FB.textTer} strokeWidth="1.5" />
      <path d="M4 11L12 5L20 11" stroke={selections.propertyType === "Apartment" ? accent : FB.textTer} strokeWidth="1.5" />
      <rect x="9" y="15" width="6" height="6" rx="0.5" stroke={selections.propertyType === "Apartment" ? accent : FB.textTer} strokeWidth="1.5" />
    </svg>
  );
  const villaIcon = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="13" width="8" height="8" rx="1" stroke={selections.propertyType === "Villa" ? accent : FB.textTer} strokeWidth="1.5" />
      <path d="M2 13L6 8.5L10 13" stroke={selections.propertyType === "Villa" ? accent : FB.textTer} strokeWidth="1.5" />
      <rect x="12" y="9" width="10" height="12" rx="1" stroke={selections.propertyType === "Villa" ? accent : FB.textTer} strokeWidth="1.5" />
      <path d="M12 9L17 4L22 9" stroke={selections.propertyType === "Villa" ? accent : FB.textTer} strokeWidth="1.5" />
    </svg>
  );

  const timerAnim = timeLeft <= 5 ? "timerShake 0.3s ease-in-out infinite" : timeLeft <= 10 ? "timerPulse 1s ease-in-out infinite" : "none";

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: FB.bg, padding: "12px 20px 16px",
      overflow: "auto", minHeight: "100vh", maxWidth: 480, margin: "0 auto", width: "100%",
    }}>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: FB.textTer, fontWeight: 600, textTransform: "uppercase" }}>{playerName}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: accent, marginTop: 2 }}>{label}</div>
        <div style={{ fontSize: 10, color: FB.textDim, marginTop: 2 }}>Partner: {partnerName}</div>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: FB.card, borderRadius: 10, padding: "10px 14px", marginBottom: 14,
        border: `1px solid ${FB.border}`, animation: timerAnim,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: "#EF4444",
            boxShadow: "0 0 8px rgba(239,68,68,0.5)",
            animation: timeLeft <= 5 ? "blink 0.5s infinite" : "none",
          }} />
          <span style={{
            fontSize: 26, fontWeight: 800, fontFamily: "monospace",
            color: timeLeft <= 5 ? "#EF4444" : timeLeft <= 10 ? FB.gold : FB.text,
          }}>
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: FB.textSec }}>Matches</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: FB.navyLight }}>{matchCount}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, color: FB.textSec }}>Commission</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: FB.gold }}>€{(commission / 1000).toFixed(1)}k</span>
          </div>
          {!disabled && (
            <div onClick={onEndGame} style={{
              padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "#EF4444",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 6, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1,
              userSelect: "none",
            }}>End</div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {["propertyType", "size", "priceRange", "location"].map(f => (
          <div key={f} style={{ flex: 1, height: 3, borderRadius: 2, background: selections[f] ? FB.navyLight : FB.border, transition: "background 0.3s" }} />
        ))}
      </div>

      {(matchedDeals.length > 0 || pendingItems.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10, maxHeight: 80, overflow: "auto" }}>
          {[...matchedDeals].reverse().map(deal => (
            <MiniCard key={`m${deal.id}`} item={isListing ? deal.listing : deal.buyer} isMatched={true} isNew={deal.isNew} side={role} />
          ))}
          {pendingItems.map(item => (
            <MiniCard key={`p${item.id}`} item={item} isMatched={false} isNew={false} side={role} />
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: FB.textTer, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "1. Property type" : "What are they looking for?"}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TypeChip label="Apartment" icon={houseIcon} selected={selections.propertyType === "Apartment"} onClick={() => onSelect("propertyType", "Apartment")} />
        <TypeChip label="Villa" icon={villaIcon} selected={selections.propertyType === "Villa"} onClick={() => onSelect("propertyType", "Villa")} />
      </div>

      <div style={{ fontSize: 11, color: FB.textTer, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "2. Size" : "Size"}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {SIZES.map(s => <Chip key={s} label={s} selected={selections.size === s} onClick={() => onSelect("size", s)} />)}
      </div>

      <div style={{ fontSize: 11, color: FB.textTer, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "3. Price range" : "Budget range"}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(isListing ? LISTING_PRICES : BUYER_PRICES).map(p => <Chip key={p} label={p} selected={selections.priceRange === p} onClick={() => onSelect("priceRange", p)} />)}
      </div>

      <div style={{ fontSize: 11, color: FB.textTer, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "4. Location" : "Preferred area"}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {LOCATIONS.map(l => (
          <div key={l.name} onClick={disabled ? undefined : () => onSelect("location", l.name)} style={{
            flex: 1, background: selections.location === l.name ? accentBg : FB.card,
            border: `1.5px solid ${selections.location === l.name ? accentBorder : FB.border}`,
            borderRadius: 10, overflow: "hidden",
            cursor: disabled ? "default" : "pointer", transition: "all 0.15s",
            userSelect: "none", WebkitTapHighlightColor: "transparent",
          }}>
            <img src={l.img} alt={l.name} style={{ width: "100%", height: 56, objectFit: "cover", display: "block" }} />
            <div style={{ padding: "6px 4px", textAlign: "center" }}>
              <span style={{ fontSize: 12, fontWeight: selections.location === l.name ? 700 : 500, color: selections.location === l.name ? accent : FB.textSec }}>{l.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lobby Screen ───
function LobbyScreen({ onJoin, onSettings, onLeaderboard }) {
  const [name, setName] = useState("");
  const [office, setOffice] = useState("");
  const [revealed, setRevealed] = useState(0);
  const title = "Deal Rush";

  useEffect(() => {
    const t = setInterval(() => {
      setRevealed(r => { if (r >= title.length) { clearInterval(t); return r; } return r + 1; });
    }, 80);
    return () => clearInterval(t);
  }, []);

  const inputStyle = {
    width: "100%", padding: "14px 16px", fontSize: 15, fontWeight: 500,
    background: FB.card, border: `1.5px solid ${FB.border}`, borderRadius: 12,
    color: FB.text, outline: "none", fontFamily: "system-ui", transition: "border-color 0.2s",
  };
  const canJoin = name.trim() && office.trim();

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: 32, background: FB.bg, position: "relative",
    }}>
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
        <div onClick={onLeaderboard} style={{
          width: 40, height: 40, borderRadius: 10, background: FB.card, border: `1px solid ${FB.border}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="14" width="4" height="7" rx="1" stroke={FB.gold} strokeWidth="1.5" />
            <rect x="10" y="8" width="4" height="13" rx="1" stroke={FB.gold} strokeWidth="1.5" />
            <rect x="17" y="11" width="4" height="10" rx="1" stroke={FB.gold} strokeWidth="1.5" />
          </svg>
        </div>
        <div onClick={onSettings} style={{
          width: 40, height: 40, borderRadius: 10, background: FB.card, border: `1px solid ${FB.border}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={FB.textTer} strokeWidth="1.5" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={FB.textTer} strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: `rgba(30,58,95,0.15)`, border: `1px solid rgba(74,139,194,0.3)`,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
        animation: "pulse4 3s infinite",
      }}>
        <FizbotLogo size={32} />
      </div>

      <div style={{ fontSize: 13, letterSpacing: 5, color: FB.textTer, marginBottom: 10, textTransform: "uppercase", fontWeight: 600 }}>
        Property match
      </div>
      <div style={{
        fontSize: 42, fontWeight: 900, textAlign: "center", lineHeight: 1.1, marginBottom: 32,
        background: `linear-gradient(135deg,${FB.navyLight},${FB.coral})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        minHeight: 46,
      }}>
        {title.slice(0, revealed)}
        <span style={{ borderRight: revealed < title.length ? `3px solid ${FB.navyLight}` : "none", animation: revealed < title.length ? "blink 0.8s infinite" : "none" }}>&nbsp;</span>
      </div>

      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        <input style={inputStyle} placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
          onFocus={e => e.target.style.borderColor = FB.navyLight} onBlur={e => e.target.style.borderColor = FB.border} />
        <input style={inputStyle} placeholder="Office name" value={office} onChange={e => setOffice(e.target.value)}
          onFocus={e => e.target.style.borderColor = FB.navyLight} onBlur={e => e.target.style.borderColor = FB.border} />
      </div>

      <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 340 }}>
        <button onClick={() => canJoin && onJoin(name.trim(), office.trim(), "listing")} style={{
          flex: 1, padding: "16px", fontSize: 14, fontWeight: 800, fontFamily: "system-ui",
          color: canJoin ? FB.bg : FB.textTer, background: canJoin ? "#60A5FA" : FB.card,
          border: canJoin ? "none" : `1px solid ${FB.border}`,
          borderRadius: 14, cursor: canJoin ? "pointer" : "default",
          textTransform: "uppercase", letterSpacing: 2, transition: "all 0.2s",
        }}>Listing Agent</button>
        <button onClick={() => canJoin && onJoin(name.trim(), office.trim(), "buyer")} style={{
          flex: 1, padding: "16px", fontSize: 14, fontWeight: 800, fontFamily: "system-ui",
          color: canJoin ? FB.bg : FB.textTer, background: canJoin ? "#F472B6" : FB.card,
          border: canJoin ? "none" : `1px solid ${FB.border}`,
          borderRadius: 14, cursor: canJoin ? "pointer" : "default",
          textTransform: "uppercase", letterSpacing: 2, transition: "all 0.2s",
        }}>Buyer Agent</button>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: FB.textDim, textAlign: "center" }}>
        Choose your role. First player waits, game starts when both join.
      </div>
    </div>
  );
}

// ─── Waiting Screen ───
function WaitingScreen({ player, role }) {
  const accent = role === "listing" ? "#60A5FA" : "#F472B6";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: 32, background: FB.bg,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%", border: `3px solid ${accent}`,
        borderTopColor: "transparent", animation: "spin 1s linear infinite", marginBottom: 24,
      }} />
      <div style={{ fontSize: 20, fontWeight: 800, color: FB.text, fontFamily: "system-ui", marginBottom: 8 }}>
        Waiting for partner...
      </div>
      <div style={{ fontSize: 14, color: FB.textSec, marginBottom: 4 }}>{player.name} ({player.office})</div>
      <div style={{ fontSize: 13, color: accent, fontWeight: 700 }}>{role === "listing" ? "Listing Agent" : "Buyer Agent"}</div>
      <div style={{ marginTop: 24, fontSize: 12, color: FB.textDim, textAlign: "center", maxWidth: 300 }}>
        Share the website link with your partner. The game will start automatically when both players are connected.
      </div>
    </div>
  );
}

// ─── Settings Page ───
function SettingsPage({ onBack }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => { fetchGames(); }, []);

  async function fetchGames() {
    setLoading(true);
    const { data } = await supabase.from("games").select("*").order("played_at", { ascending: false });
    setGames(data || []);
    setLoading(false);
  }

  async function clearAll() {
    if (!confirm("Are you sure? This will delete ALL game data.")) return;
    setClearing(true);
    await supabase.from("games").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setGames([]);
    setClearing(false);
  }

  const totalMatches = games.reduce((s, g) => s + g.matches, 0);
  const totalComm = games.reduce((s, g) => s + Number(g.total_commission), 0);

  return (
    <div style={{ minHeight: "100vh", background: FB.bg, color: FB.text, fontFamily: "system-ui,-apple-system,sans-serif", padding: "20px 24px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: FB.textSec, fontSize: 14, fontWeight: 600 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke={FB.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Settings</div>
        <div style={{ width: 60 }} />
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[{ label: "Total Games", value: games.length, color: "#60A5FA" }, { label: "Total Matches", value: totalMatches, color: FB.navyLight }, { label: "Total Commission", value: `€${totalComm.toLocaleString()}`, color: FB.gold }].map(s => (
          <div key={s.label} style={{ flex: 1, background: FB.card, border: `1px solid ${FB.border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: FB.textTer, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <button onClick={clearAll} disabled={clearing || games.length === 0} style={{
        width: "100%", padding: "12px", fontSize: 13, fontWeight: 700, color: games.length === 0 ? FB.textDim : "#EF4444",
        background: games.length === 0 ? FB.card : "rgba(239,68,68,0.1)", border: `1px solid ${games.length === 0 ? FB.border : "rgba(239,68,68,0.3)"}`,
        borderRadius: 10, cursor: games.length === 0 ? "default" : "pointer", textTransform: "uppercase", letterSpacing: 2, marginBottom: 20, fontFamily: "system-ui",
      }}>{clearing ? "Clearing..." : "Clear all data"}</button>
      <div style={{ fontSize: 12, color: FB.textTer, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>Game history ({games.length})</div>
      {loading ? <div style={{ textAlign: "center", color: FB.textDim, padding: 40 }}>Loading...</div> : games.length === 0 ? <div style={{ textAlign: "center", color: FB.textDim, padding: 40 }}>No games yet</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {games.map(g => (
            <div key={g.id} style={{ background: FB.card, border: `1px solid ${FB.border}`, borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: FB.text }}>{g.player1_name} & {g.player2_name}</div>
                <div style={{ fontSize: 10, color: FB.textDim }}>{new Date(g.played_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                <div><span style={{ color: FB.textTer }}>Office: </span><span style={{ color: FB.textSec }}>{g.player1_office}</span></div>
                <div><span style={{ color: FB.textTer }}>Matches: </span><span style={{ color: FB.navyLight, fontWeight: 700 }}>{g.matches}</span></div>
                <div><span style={{ color: FB.textTer }}>Commission: </span><span style={{ color: FB.gold, fontWeight: 700 }}>€{Number(g.total_commission).toLocaleString()}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Leaderboard Full Page ───
function LeaderboardPage({ onBack }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchLeaderboard() {
    const { data } = await supabase.from("games").select("*").order("total_commission", { ascending: false }).limit(20);
    if (data) {
      const teamMap = {};
      data.forEach(g => {
        const key = `${g.player1_name} & ${g.player2_name}`;
        if (!teamMap[key]) teamMap[key] = { team: key, office: g.player1_office, matches: 0, commission: 0, gamesPlayed: 0, bestMatch: 0 };
        teamMap[key].matches += g.matches;
        teamMap[key].commission += Number(g.total_commission);
        teamMap[key].gamesPlayed += 1;
        teamMap[key].bestMatch = Math.max(teamMap[key].bestMatch, g.matches);
      });
      setGames(Object.values(teamMap).sort((a, b) => b.commission - a.commission || b.matches - a.matches));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLeaderboard();
    const channel = supabase.channel("leaderboard-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "games" }, () => fetchLeaderboard())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "games" }, () => fetchLeaderboard())
      .subscribe();
    const poll = setInterval(fetchLeaderboard, 10000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, []);

  const medalColors = { 1: FB.gold, 2: "#94A3B8", 3: "#CD7F32" };
  const medalEmojis = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div style={{ minHeight: "100vh", background: FB.bg, color: FB.text, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${FB.card}` }}>
        <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: FB.textSec, fontSize: 14, fontWeight: 600 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke={FB.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="14" width="4" height="7" rx="1" stroke={FB.gold} strokeWidth="1.5" />
            <rect x="10" y="8" width="4" height="13" rx="1" stroke={FB.gold} strokeWidth="1.5" />
            <rect x="17" y="11" width="4" height="10" rx="1" stroke={FB.gold} strokeWidth="1.5" />
          </svg>
          <span style={{ fontSize: 20, fontWeight: 800 }}>Leaderboard</span>
        </div>
        <div style={{
          fontSize: 10, color: FB.navyLight, background: `rgba(30,58,95,0.15)`,
          border: `1px solid rgba(74,139,194,0.3)`, borderRadius: 20,
          padding: "4px 10px", fontWeight: 600, letterSpacing: 1, animation: "pulse4 2s infinite",
        }}>LIVE</div>
      </div>

      {games.length >= 3 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12, padding: "32px 24px 20px" }}>
          {[1, 0, 2].map(idx => {
            const g = games[idx];
            if (!g) return null;
            const actualRank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
            const isFirst = actualRank === 1;
            const height = isFirst ? 120 : actualRank === 2 ? 96 : 80;
            const medal = medalColors[actualRank];
            return (
              <div key={g.team} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: isFirst ? 140 : 110, animation: `lbRowFade 0.5s ${actualRank * 0.15}s ease-out both` }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{medalEmojis[actualRank]}</div>
                <div style={{ fontSize: isFirst ? 14 : 12, fontWeight: 800, color: FB.text, textAlign: "center", marginBottom: 2, lineHeight: 1.2 }}>{g.team}</div>
                <div style={{ fontSize: 10, color: FB.textTer, marginBottom: 8 }}>{g.office}</div>
                <div style={{
                  width: "100%", height, borderRadius: "12px 12px 0 0",
                  background: `linear-gradient(180deg, ${medal}33, ${medal}11)`, border: `1px solid ${medal}44`, borderBottom: "none",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                }}>
                  <div style={{ fontSize: isFirst ? 22 : 18, fontWeight: 900, color: FB.gold }}>€{g.commission.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: FB.textSec }}>{g.matches} matches</div>
                  <div style={{ fontSize: 9, color: FB.textDim }}>{g.gamesPlayed} games</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: "0 24px 40px", maxWidth: 600, margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: FB.textDim, padding: 60 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${FB.border}`, borderTopColor: FB.navyLight, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />Loading...
          </div>
        ) : games.length === 0 ? (
          <div style={{ textAlign: "center", color: FB.textDim, padding: 60 }}>No games played yet. Be the first!</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: games.length >= 3 ? 0 : 20 }}>
            {games.map((g, i) => {
              const rank = i + 1;
              if (rank <= 3 && games.length >= 3) return null;
              return (
                <div key={`${g.team}-${i}`} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(30,41,59,0.6)", border: `1px solid ${FB.border}`, borderRadius: 12, padding: "12px 16px",
                  animation: `lbRowFade 0.4s ${0.1 + i * 0.05}s ease-out both`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: FB.card, border: `1.5px solid ${FB.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: FB.textTer }}>{rank}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: FB.text }}>{g.team}</div>
                      <div style={{ fontSize: 10, color: FB.textDim }}>{g.office} · {g.gamesPlayed} games · {g.matches} matches</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: FB.gold }}>€{g.commission.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ───
export default function DealRushForm() {
  const initialState = window.location.hash === "#leaderboard" ? "leaderboard" : window.location.hash === "#settings" ? "settings" : "lobby";
  const [gameState, setGameState] = useState(initialState);
  const [role, setRole] = useState(null);
  const [player, setPlayer] = useState(null);
  const [partner, setPartner] = useState(null);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [countdown, setCountdown] = useState(3);
  const [matchCount, setMatchCount] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [selections, setSelections] = useState({ propertyType: null, size: null, priceRange: null, location: null });
  const [listings, setListings] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [matchedDeals, setMatchedDeals] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);

  const channelRef = useRef(null);
  const idRef = useRef(0);
  const timerRef = useRef(null);
  const emptySelection = { propertyType: null, size: null, priceRange: null, location: null };
  const listingsRef = useRef([]);
  const buyersRef = useRef([]);
  useEffect(() => { listingsRef.current = listings; }, [listings]);
  useEffect(() => { buyersRef.current = buyers; }, [buyers]);

  // Hash routing
  useEffect(() => {
    if (gameState === "leaderboard") window.location.hash = "leaderboard";
    else if (gameState === "settings") window.location.hash = "settings";
    else if (window.location.hash) window.location.hash = "";
  }, [gameState]);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#leaderboard") setGameState("leaderboard");
      else if (window.location.hash === "#settings") setGameState("settings");
      else if (gameState === "leaderboard" || gameState === "settings") setGameState("lobby");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [gameState]);

  // Auto-submit
  const allSelected = selections.propertyType && selections.size && selections.priceRange && selections.location;
  const prevAllSelected = useRef(false);

  useEffect(() => {
    if (allSelected && !prevAllSelected.current && gameState === "playing") {
      prevAllSelected.current = true;
      const item = { ...selections, id: ++idRef.current };
      channelRef.current?.send({ type: "broadcast", event: role === "listing" ? "listing_submitted" : "buyer_submitted", payload: item });
      if (role === "listing") {
        const matchIdx = buyersRef.current.findIndex(b => item.propertyType === b.propertyType && item.size === b.size && PRICE_MATCH_MAP[item.priceRange] === b.priceRange && item.location === b.location);
        if (matchIdx !== -1) { handleMatch(item, buyersRef.current[matchIdx]); setBuyers(prev => prev.filter((_, i) => i !== matchIdx)); }
        else setListings(prev => [...prev, item]);
      } else {
        const matchIdx = listingsRef.current.findIndex(l => l.propertyType === item.propertyType && l.size === item.size && PRICE_MATCH_MAP[l.priceRange] === item.priceRange && l.location === item.location);
        if (matchIdx !== -1) { handleMatch(listingsRef.current[matchIdx], item); setListings(prev => prev.filter((_, i) => i !== matchIdx)); }
        else setBuyers(prev => [...prev, item]);
      }
      setSelections({ ...emptySelection });
    }
    if (!allSelected) prevAllSelected.current = false;
  }, [allSelected, gameState, role, selections]);

  function handleMatch(listing, buyer) {
    const commission = PRICE_TO_VALUE[listing.priceRange] * 0.025;
    setMatchCount(m => m + 1);
    setTotalCommission(c => c + commission);
    setMatchedDeals(prev => [...prev, { listing, buyer, id: ++idRef.current, isNew: true }]);
    setTimeout(() => setMatchedDeals(prev => prev.map(d => ({ ...d, isNew: false }))), 1500);
    setShowMatch(true);
    setScreenShake(true);
    playSound("match", 0.6);
    setTimeout(() => playSound("commission", 0.5), 300);
    setTimeout(() => { setShowMatch(false); setScreenShake(false); }, 1600);
    channelRef.current?.send({ type: "broadcast", event: "match_found", payload: { listing, buyer, commission } });
  }

  function handlePartnerListing(item) {
    const matchIdx = buyersRef.current.findIndex(b => item.propertyType === b.propertyType && item.size === b.size && PRICE_MATCH_MAP[item.priceRange] === b.priceRange && item.location === b.location);
    if (matchIdx !== -1) { handleMatch(item, buyersRef.current[matchIdx]); setBuyers(prev => prev.filter((_, i) => i !== matchIdx)); }
    else setListings(prev => [...prev, item]);
  }

  function handlePartnerBuyer(item) {
    const matchIdx = listingsRef.current.findIndex(l => l.propertyType === item.propertyType && l.size === item.size && PRICE_MATCH_MAP[l.priceRange] === item.priceRange && l.location === item.location);
    if (matchIdx !== -1) { handleMatch(listingsRef.current[matchIdx], item); setListings(prev => prev.filter((_, i) => i !== matchIdx)); }
    else setBuyers(prev => [...prev, item]);
  }

  const handleJoin = useCallback((name, office, selectedRole) => {
    const playerInfo = { name, office };
    setPlayer(playerInfo);
    setRole(selectedRole);
    setGameState("waiting");
    const channel = supabase.channel(CHANNEL_NAME, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "player_joined" }, ({ payload }) => { setPartner(payload.player); setGameState("countdown"); channel.send({ type: "broadcast", event: "player_ready", payload: { player: playerInfo, role: selectedRole } }); })
      .on("broadcast", { event: "player_ready" }, ({ payload }) => { setPartner(payload.player); setGameState("countdown"); })
      .on("broadcast", { event: "listing_submitted" }, ({ payload }) => { handlePartnerListing(payload); })
      .on("broadcast", { event: "buyer_submitted" }, ({ payload }) => { handlePartnerBuyer(payload); })
      .on("broadcast", { event: "match_found" }, () => {})
      .on("broadcast", { event: "timer_sync" }, ({ payload }) => { setTimeLeft(payload.timeLeft); if (payload.timeLeft <= 0) setGameState("finished"); })
      .on("broadcast", { event: "game_end" }, () => { if (timerRef.current) clearInterval(timerRef.current); setTimeLeft(0); setGameState("finished"); })
      .subscribe((status) => { if (status === "SUBSCRIBED") channel.send({ type: "broadcast", event: "player_joined", payload: { player: playerInfo, role: selectedRole } }); });
    channelRef.current = channel;
  }, []);

  // Countdown
  useEffect(() => {
    if (gameState !== "countdown") return;
    setCountdown(3);
    const t = setInterval(() => {
      setCountdown(prev => {
        playSound("countdown", 0.7);
        if (prev <= 1) { clearInterval(t); setGameState("playing"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [gameState]);

  // Game timer
  useEffect(() => {
    if (gameState !== "playing") return;
    setTimeLeft(GAME_DURATION);
    playSound("gamestart", 0.6);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (role === "listing") channelRef.current?.send({ type: "broadcast", event: "timer_sync", payload: { timeLeft: next } });
        if (next <= 0) { clearInterval(timerRef.current); setGameState("finished"); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState, role]);

  // Save + leaderboard on finish
  useEffect(() => {
    if (gameState !== "finished") return;
    playSound("gameover", 0.7);
    if (role === "listing" && player && partner) {
      supabase.from("games").insert({ player1_name: player.name, player1_office: player.office, player2_name: partner.name, player2_office: partner.office, matches: matchCount, total_commission: totalCommission }).then(() => {});
    }
    supabase.from("games").select("*").order("total_commission", { ascending: false }).limit(10).then(({ data }) => {
      if (data) setLeaderboardData(data.map(g => ({ team: `${g.player1_name} & ${g.player2_name}`, matches: g.matches, commission: Number(g.total_commission) })));
    });
  }, [gameState]);

  const handleEndGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    setGameState("finished");
    channelRef.current?.send({ type: "broadcast", event: "game_end", payload: {} });
  }, []);

  const handleReplay = useCallback(() => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    setGameState("lobby"); setRole(null); setPlayer(null); setPartner(null);
    setTimeLeft(GAME_DURATION); setMatchCount(0); setTotalCommission(0);
    setSelections({ ...emptySelection }); setListings([]); setBuyers([]); setMatchedDeals([]); idRef.current = 0;
  }, []);

  const handleSelect = useCallback((field, value) => {
    if (gameState !== "playing") return;
    playSound("click", 0.3);
    setSelections(p => ({ ...p, [field]: p[field] === value ? null : value }));
  }, [gameState]);

  return (
    <div style={{
      minHeight: "100vh", background: FB.bg, color: FB.text,
      fontFamily: "system-ui,-apple-system,sans-serif",
      display: "flex", flexDirection: "column", position: "relative",
      animation: screenShake ? "screenShake 0.5s ease-out" : "none",
    }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scoreIn{from{opacity:0;transform:scale(0.5) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fwPop{0%{opacity:1;transform:scale(0)}60%{opacity:1}100%{opacity:0;transform:scale(1)}}
        @keyframes confDrop{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(110vh) rotate(720deg)}}
        @keyframes matchFade{0%{opacity:0}10%{opacity:1}80%{opacity:1}100%{opacity:0}}
        @keyframes matchPop{0%{transform:scale(0.3);opacity:0}15%{transform:scale(1.15);opacity:1}30%{transform:scale(0.95)}50%{transform:scale(1.05)}80%{transform:scale(1);opacity:1}100%{transform:scale(1.5);opacity:0}}
        @keyframes pulse4{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes chipBounce{0%{transform:scale(1)}30%{transform:scale(1.12)}60%{transform:scale(0.95)}100%{transform:scale(1)}}
        @keyframes slideFromLeft{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes cardMatchIn{0%{opacity:0;transform:scale(0.5);box-shadow:0 0 0 transparent}50%{opacity:1;transform:scale(1.15);box-shadow:0 0 20px rgba(74,139,194,0.5)}100%{transform:scale(1);box-shadow:0 0 8px rgba(74,139,194,0.2)}}
        @keyframes dealReveal{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes lbRowFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lbPlayerSlide{0%{opacity:0;transform:translateY(60px) scale(0.9)}40%{opacity:1;transform:translateY(-8px) scale(1.04)}70%{transform:translateY(3px) scale(0.99)}100%{transform:translateY(0) scale(1)}}
        @keyframes lbShine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes countDramatic{0%{transform:scale(0);opacity:0;text-shadow:0 0 0 transparent}40%{transform:scale(1.4);opacity:1;text-shadow:0 0 60px rgba(74,139,194,0.8)}70%{transform:scale(0.9);text-shadow:0 0 30px rgba(74,139,194,0.4)}100%{transform:scale(1);text-shadow:0 0 20px rgba(74,139,194,0.2)}}
        @keyframes screenShake{0%,100%{transform:translateX(0)}10%{transform:translateX(-4px)}20%{transform:translateX(4px)}30%{transform:translateX(-3px)}40%{transform:translateX(3px)}50%{transform:translateX(-2px)}60%{transform:translateX(2px)}}
        @keyframes timerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes timerShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
        @keyframes numberPop{from{transform:scale(1.1)}to{transform:scale(1)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:${FB.border};border-radius:2px}
        input::placeholder{color:${FB.textDim}}
      `}</style>

      {gameState === "lobby" && <LobbyScreen onJoin={handleJoin} onSettings={() => setGameState("settings")} onLeaderboard={() => setGameState("leaderboard")} />}
      {gameState === "settings" && <SettingsPage onBack={() => setGameState("lobby")} />}
      {gameState === "leaderboard" && <LeaderboardPage onBack={() => setGameState("lobby")} />}
      {gameState === "waiting" && <WaitingScreen player={player} role={role} />}

      {gameState === "countdown" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: FB.bg }}>
          <div style={{ fontSize: 13, color: FB.textSec, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>Game starts in</div>
          <div key={countdown} style={{
            fontSize: 120, fontWeight: 900, fontFamily: "system-ui",
            background: `linear-gradient(135deg,${FB.navyLight},${FB.coral})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "countDramatic 0.8s ease-out",
          }}>{countdown}</div>
          <div style={{ fontSize: 14, color: FB.textTer, marginTop: 12 }}>{player?.name} & {partner?.name}</div>
        </div>
      )}

      {(gameState === "playing" || gameState === "finished") && role && (
        <GamePanel role={role} selections={selections} onSelect={handleSelect}
          matchCount={matchCount} timeLeft={timeLeft} disabled={gameState === "finished"}
          commission={totalCommission} pendingItems={role === "listing" ? listings : buyers}
          matchedDeals={matchedDeals} playerName={player?.name} partnerName={partner?.name}
          onEndGame={handleEndGame} />
      )}

      <MatchOverlay show={showMatch} />
      {gameState === "finished" && (
        <EndScreen matches={matchCount} commission={totalCommission} matchedDeals={matchedDeals}
          onReplay={handleReplay} player1={player} player2={partner} leaderboardData={leaderboardData} />
      )}
    </div>
  );
}

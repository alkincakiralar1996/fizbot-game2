import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "/src/supabase";

// ─── Fizbot Brand Colors (matching FizbotX app) ───
const FB = {
  primary: "#1C46F5",
  primaryLight: "#EEF1FE",
  primary100: "#D4DBFD",
  primary200: "#A9B7FB",
  primary400: "#536FF7",
  primary700: "#0828A8",
  primary900: "#041246",
  coral: "#E8573E",
  coralLight: "#F47B63",
  gold: "#FBBF24",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  bg: "#F8FAFC",
  bgSec: "#F1F5F9",
  bgTer: "#E2E8F0",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderSec: "#CBD5E1",
  text: "#0F172A",
  textSec: "#64748B",
  textTer: "#94A3B8",
  textDim: "#CBD5E1",
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
const DEFAULT_gameDuration = 300;
const CHANNEL_NAME = "match-it-game";

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
      <circle cx="20" cy="20" r="18" stroke={FB.primary400} strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="12" stroke={FB.primary400} strokeWidth="2" fill="none" />
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
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      animation: "matchFade 1.6s ease-out forwards", pointerEvents: "none",
    }}>
      <div style={{ animation: "matchPop 1.6s ease-out forwards" }}>
        <div style={{
          fontSize: 64, fontWeight: 900, color: FB.coral,
          textShadow: `0 0 40px rgba(228,87,62,0.6), 0 0 80px rgba(228,87,62,0.3)`,
          letterSpacing: 8, fontFamily: "system-ui", textAlign: "center",
        }}>MATCH!</div>
        <div style={{
          fontSize: 18, color: FB.primary400, textAlign: "center", marginTop: 8,
          fontFamily: "system-ui", letterSpacing: 2,
        }}>+1 Deal Closed</div>
      </div>
    </div>
  );
}

// ─── Mini Card ───
function MiniCard({ item, isMatched, isNew, side }) {
  const borderColor = isMatched ? FB.primary400 : (side === "listing" ? "#60A5FA" : "#F472B6");
  const bgColor = isMatched ? `rgba(28,70,245,0.2)` : "rgba(241,245,249,0.9)";
  const anim = isNew && isMatched ? "cardMatchIn 0.6s ease-out" : "slideFromLeft 0.3s ease-out";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: bgColor, border: `1.5px solid ${borderColor}`,
      borderRadius: 8, padding: "5px 8px", fontSize: 10, color: FB.textSec,
      animation: anim, flexShrink: 0,
      boxShadow: isMatched && isNew ? `0 0 12px rgba(28,70,245,0.5)` : "none",
    }}>
      {isMatched && <span style={{ color: FB.primary400, fontWeight: 800, fontSize: 11 }}>✓</span>}
      <span style={{ fontWeight: 600, color: isMatched ? FB.primary400 : borderColor }}>{item.propertyType === "Apartment" ? "Apt" : "Villa"}</span>
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

  const colors = [FB.primary400, "#3B82F6", "#F472B6", FB.gold, "#8B5CF6", "#06B6D4", FB.coral, "#F97316"];
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
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", animation: "fadeIn 0.5s", overflow: "auto",
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
              background: `linear-gradient(135deg,${FB.primary400},${FB.coral})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1,
              filter: `drop-shadow(0 4px 20px rgba(28,70,245,0.5))`,
              animation: "numberPop 0.3s ease-out",
            }}>{displayMatches}</div>
            <div style={{ fontSize: 16, color: FB.primary400, fontFamily: "system-ui", fontWeight: 700, marginTop: 4, letterSpacing: 3, textTransform: "uppercase" }}>
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
                        background: `rgba(28,70,245,0.1)`, border: `1px solid rgba(28,70,245,0.3)`,
                        borderRadius: 10, padding: "10px 14px",
                        animation: `dealReveal 0.5s ${0.3 + i * 0.15}s ease-out both`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, background: `rgba(28,70,245,0.2)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800, color: FB.primary400,
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
              color: "#FFFFFF", background: `linear-gradient(135deg,${FB.primary},${FB.primary400})`, border: "none",
              borderRadius: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: 2,
              boxShadow: `0 4px 20px rgba(28,70,245,0.5)`, transition: "transform 0.15s",
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
                    background: isPlayer ? `rgba(28,70,245,0.15)` : "rgba(241,245,249,0.9)",
                    border: `1.5px solid ${isPlayer ? `rgba(28,70,245,0.5)` : FB.border}`,
                    borderRadius: 12, padding: "12px 16px",
                    animation: isPlayer ? `lbPlayerSlide 0.8s ${0.3 + i * 0.12}s ease-out both` : `lbRowFade 0.4s ${0.1 + i * 0.1}s ease-out both`,
                    boxShadow: isPlayer ? `0 0 20px rgba(28,70,245,0.3)` : "none",
                    position: "relative", overflow: "hidden",
                  }}>
                    {isPlayer && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,transparent,rgba(28,70,245,0.08),transparent)`, animation: "lbShine 2s 1.5s ease-in-out" }} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: medal ? `${medal}22` : FB.card, border: `1.5px solid ${medal || FB.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 900, color: medal || FB.textTer,
                      }}>{entry.rank}</div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 14, fontWeight: isPlayer ? 800 : 600, color: isPlayer ? FB.primary400 : FB.text }}>
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
              color: "#FFFFFF", background: `linear-gradient(135deg,${FB.primary},${FB.primary400})`, border: "none",
              borderRadius: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: 2,
              boxShadow: `0 4px 20px rgba(28,70,245,0.5)`, transition: "transform 0.15s",
            }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
            >Continue</button>
          </div>
        )}

        {/* ─── FIZBOT PROMO ─── */}
        {phase === "fizbot" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.8s ease-out" }}>
            <img src="/fizbot-icon.png" alt="Fizbot" style={{
              width: 80, height: 80, borderRadius: 20, margin: "0 auto 28px",
              boxShadow: "0 4px 24px rgba(28,70,245,0.3)",
              animation: "pulse4 3s infinite",
            }} />

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
              It's Time to <span style={{ color: FB.primary400 }}>Match</span> &{" "}
              <span style={{ color: FB.coral }}>Close</span>
            </div>

            <a href="https://fizbot.net" target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", padding: "18px 52px",
              fontSize: 17, fontWeight: 800, color: "#FFFFFF",
              background: `linear-gradient(135deg, ${FB.primary}, ${FB.primary400})`,
              border: `2px solid ${FB.primary400}`, borderRadius: 16,
              textDecoration: "none", letterSpacing: 3,
              boxShadow: `0 4px 30px rgba(28,70,245,0.6)`,
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
      flex: "1 1 22%", background: selected ? accentBg : "#FFFFFF",
      border: `2px solid ${selected ? accentBorder : FB.border}`,
      borderRadius: 14, padding: "14px 8px", textAlign: "center",
      cursor: disabled ? "default" : "pointer", transition: "all 0.15s",
      userSelect: "none", WebkitTapHighlightColor: "transparent",
      animation: selected ? "chipBounce 0.3s ease-out" : "none",
    }}>
      <span style={{ fontSize: 16, fontWeight: selected ? 700 : 500, color: selected ? accent : FB.textSec }}>{chipLabel}</span>
    </div>
  );

  const TypeChip = ({ label: chipLabel, icon, selected, onClick }) => (
    <div onClick={disabled ? undefined : onClick} style={{
      flex: "1 1 45%", background: selected ? accentBg : "#FFFFFF",
      border: `2px solid ${selected ? accentBorder : FB.border}`,
      borderRadius: 16, padding: "18px 12px", textAlign: "center",
      cursor: disabled ? "default" : "pointer", transition: "all 0.15s",
      userSelect: "none", WebkitTapHighlightColor: "transparent",
      animation: selected ? "chipBounce 0.3s ease-out" : "none",
    }}>
      <div style={{ marginBottom: 8 }}>{icon}</div>
      <span style={{ fontSize: 16, fontWeight: selected ? 700 : 500, color: selected ? accent : FB.textSec }}>{chipLabel}</span>
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

  const accentLight = isListing ? "#EEF1FE" : "#DCFCE7";

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: FB.bg, padding: "0", overflow: "auto", minHeight: "100vh",
    }}>
      {/* Header bar */}
      <div style={{
        background: `linear-gradient(135deg, ${accent}, ${isListing ? FB.primary400 : "#6BCB47"})`,
        padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: `0 4px 16px ${accent}30`,
      }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#FFFFFF" }}>{playerName}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600, marginTop: 2 }}>{label} · Partner: {partnerName}</div>
        </div>
        {!disabled && (
          <div onClick={onEndGame} style={{
            padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#FFFFFF",
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 10, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1,
            userSelect: "none", backdropFilter: "blur(4px)",
          }}>End Game</div>
        )}
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex", justifyContent: "space-around", alignItems: "center",
        background: "#FFFFFF", padding: "14px 20px",
        borderBottom: `1px solid ${FB.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: "#EF4444",
            boxShadow: "0 0 8px rgba(239,68,68,0.5)",
            animation: timeLeft <= 5 ? "blink 0.5s infinite" : "none",
          }} />
          <span style={{
            fontSize: 28, fontWeight: 900, fontFamily: "monospace",
            color: timeLeft <= 5 ? "#EF4444" : timeLeft <= 10 ? FB.gold : FB.text,
            animation: timerAnim,
          }}>
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
        </div>
        <div style={{ width: 1, height: 28, background: FB.border }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: accent }}>{matchCount}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: FB.textTer, textTransform: "uppercase", letterSpacing: 1 }}>Matches</div>
        </div>
        <div style={{ width: 1, height: 28, background: FB.border }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: FB.gold }}>€{(commission / 1000).toFixed(1)}k</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: FB.textTer, textTransform: "uppercase", letterSpacing: 1 }}>Commission</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", gap: 4, padding: "12px 24px 0" }}>
        {["propertyType", "size", "priceRange", "location"].map(f => (
          <div key={f} style={{ flex: 1, height: 4, borderRadius: 2, background: selections[f] ? accent : FB.border, transition: "background 0.3s" }} />
        ))}
      </div>

      {/* Content area */}
      <div style={{ padding: "16px 24px 24px", maxWidth: 520, margin: "0 auto", width: "100%" }}>

        {/* Mini cards */}
        {(matchedDeals.length > 0 || pendingItems.length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16, maxHeight: 90, overflow: "auto" }}>
            {[...matchedDeals].reverse().map(deal => (
              <MiniCard key={`m${deal.id}`} item={isListing ? deal.listing : deal.buyer} isMatched={true} isNew={deal.isNew} side={role} />
            ))}
            {pendingItems.map(item => (
              <MiniCard key={`p${item.id}`} item={item} isMatched={false} isNew={false} side={role} />
            ))}
          </div>
        )}

        {/* Property type */}
        <div style={{ fontSize: 13, color: FB.textSec, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
          {isListing ? "1. Property type" : "What are they looking for?"}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <TypeChip label="Apartment" icon={houseIcon} selected={selections.propertyType === "Apartment"} onClick={() => onSelect("propertyType", "Apartment")} />
          <TypeChip label="Villa" icon={villaIcon} selected={selections.propertyType === "Villa"} onClick={() => onSelect("propertyType", "Villa")} />
        </div>

        {/* Size */}
        <div style={{ fontSize: 13, color: FB.textSec, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
          {isListing ? "2. Size" : "Size"}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {SIZES.map(s => <Chip key={s} label={s} selected={selections.size === s} onClick={() => onSelect("size", s)} />)}
        </div>

        {/* Price */}
        <div style={{ fontSize: 13, color: FB.textSec, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
          {isListing ? "3. Price range" : "Budget range"}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(isListing ? LISTING_PRICES : BUYER_PRICES).map(p => <Chip key={p} label={p} selected={selections.priceRange === p} onClick={() => onSelect("priceRange", p)} />)}
        </div>

        {/* Location */}
        <div style={{ fontSize: 13, color: FB.textSec, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
          {isListing ? "4. Location" : "Preferred area"}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {LOCATIONS.map(l => (
            <div key={l.name} onClick={disabled ? undefined : () => onSelect("location", l.name)} style={{
              flex: 1, background: selections.location === l.name ? accentLight : "#FFFFFF",
              border: `2px solid ${selections.location === l.name ? accent : FB.border}`,
              borderRadius: 14, overflow: "hidden",
              cursor: disabled ? "default" : "pointer", transition: "all 0.2s",
              userSelect: "none", WebkitTapHighlightColor: "transparent",
              boxShadow: selections.location === l.name ? `0 4px 12px ${accent}25` : "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <img src={l.img} alt={l.name} style={{ width: "100%", height: 70, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "10px 4px", textAlign: "center" }}>
                <span style={{ fontSize: 14, fontWeight: selections.location === l.name ? 800 : 600, color: selections.location === l.name ? accent : FB.text }}>{l.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Lobby Screen ───
function LobbyScreen({ onJoin, onSettings, onLeaderboard, takenRole, takenByName }) {
  const [name, setName] = useState("");
  const [office, setOffice] = useState("");
  const [officeSearch, setOfficeSearch] = useState("");
  const [offices, setOffices] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const title = "Match It!";
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetch("/offices.csv").then(r => r.text()).then(csv => {
      const lines = csv.trim().split("\n").slice(1);
      setOffices(lines.map(l => {
        const [id, name] = l.split(",");
        return { id, name };
      }));
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setRevealed(r => { if (r >= title.length) { clearInterval(t); return r; } return r + 1; });
    }, 80);
    return () => clearInterval(t);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredOffices = officeSearch
    ? offices.filter(o => o.name.toLowerCase().includes(officeSearch.toLowerCase()))
    : offices;

  const inputStyle = {
    width: "100%", padding: "18px 20px", fontSize: 18, fontWeight: 500,
    background: "#FFFFFF", border: `1.5px solid ${FB.border}`, borderRadius: 14,
    color: FB.text, outline: "none", fontFamily: "system-ui", transition: "border-color 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };
  const canJoin = name.trim() && office.trim();

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: 32, position: "relative",
      background: `linear-gradient(180deg, #EEF1FE 0%, ${FB.bg} 40%, ${FB.bg} 100%)`,
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

      <img src="/fizbot-icon.png" alt="Fizbot" style={{
        width: 100, height: 100, borderRadius: 24, marginBottom: 28,
        boxShadow: "0 8px 24px rgba(28,70,245,0.2)",
      }} />

      <div style={{
        fontSize: 56, fontWeight: 900, textAlign: "center", lineHeight: 1.1, marginBottom: 40,
        background: `linear-gradient(135deg,${FB.primary400},${FB.coral})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        minHeight: 46,
      }}>
        {title.slice(0, revealed)}
        <span style={{ borderRight: revealed < title.length ? `3px solid ${FB.primary400}` : "none", animation: revealed < title.length ? "blink 0.8s infinite" : "none" }}>&nbsp;</span>
      </div>

      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        <input style={inputStyle} placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
          onFocus={e => e.target.style.borderColor = FB.primary400} onBlur={e => e.target.style.borderColor = FB.border} />
        <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
          <input style={inputStyle} placeholder="Search office..."
            value={showDropdown ? officeSearch : office}
            onChange={e => { setOfficeSearch(e.target.value); setOffice(e.target.value); setShowDropdown(true); }}
            onFocus={e => { e.target.style.borderColor = FB.primary400; setShowDropdown(true); setOfficeSearch(office); }}
            onBlur={e => { e.target.style.borderColor = FB.border; }}
          />
          {showDropdown && filteredOffices.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
              background: "#FFFFFF", border: `1px solid ${FB.border}`, borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 280, overflowY: "auto",
            }}>
              {filteredOffices.map(o => (
                <div key={o.id} onMouseDown={() => { setOffice(o.name); setOfficeSearch(o.name); setShowDropdown(false); }}
                  style={{
                    padding: "10px 16px", fontSize: 14, color: FB.text, cursor: "pointer",
                    background: office === o.name ? FB.primaryLight : "transparent",
                    borderBottom: `1px solid ${FB.border}`,
                  }}
                  onMouseOver={e => e.currentTarget.style.background = FB.bgTer}
                  onMouseOut={e => e.currentTarget.style.background = office === o.name ? FB.primaryLight : "transparent"}
                >{o.name}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divider + Choose your side */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", maxWidth: 440, margin: "6px 0 18px" }}>
        <div style={{ flex: 1, height: 1, background: FB.border }} />
        <span style={{ fontSize: 15, letterSpacing: 4, color: FB.textSec, textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap" }}>Choose your side</span>
        <div style={{ flex: 1, height: 1, background: FB.border }} />
      </div>

      <div style={{ display: "flex", gap: 16, width: "100%", maxWidth: 440 }}>
        {[
          { role: "listing", label: "Listing Agent", color: FB.primary, lightBg: "#EEF1FE", borderLight: "#D4DBFD",
            icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { role: "buyer", label: "Buyer Agent", color: "#54B329", lightBg: "#DCFCE7", borderLight: "#DCFCE7",
            icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map(btn => {
          const isTaken = takenRole === btn.role;
          const canClick = canJoin && !isTaken;
          return (
            <button key={btn.role} onClick={() => canClick && onJoin(name.trim(), office.trim(), btn.role)} style={{
              flex: 1, padding: "24px 20px", fontSize: 15, fontWeight: 800, fontFamily: "system-ui",
              color: isTaken ? FB.textTer : canClick ? "#FFFFFF" : btn.color,
              background: isTaken ? FB.bgSec : canClick ? btn.color : "#FFFFFF",
              border: `2px solid ${isTaken ? FB.border : canClick ? btn.color : btn.borderLight}`,
              borderRadius: 18, cursor: isTaken ? "not-allowed" : canClick ? "pointer" : "default",
              textTransform: "uppercase", letterSpacing: 3, transition: "all 0.25s",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: isTaken ? "none" : canClick ? `0 6px 20px ${btn.color}55` : `0 2px 8px ${btn.color}15`,
              opacity: isTaken ? 0.7 : 1,
            }}
              onMouseOver={e => { if (canClick) e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: isTaken ? FB.border : canClick ? "rgba(255,255,255,0.2)" : btn.lightBg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {React.cloneElement(btn.icon, { stroke: isTaken ? FB.textTer : canClick ? "#FFFFFF" : btn.color })}
              </div>
              {btn.label}
              {isTaken && (
                <div style={{ fontSize: 11, fontWeight: 600, color: FB.textTer, textTransform: "none", letterSpacing: 0, marginTop: -4 }}>
                  {takenByName} joined
                </div>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}

// ─── Waiting Screen ───
function WaitingScreen({ player, role, onExit }) {
  const isListing = role === "listing";
  const accent = isListing ? FB.primary : "#54B329";
  const accentBg = isListing ? "#EEF1FE" : "#DCFCE7";
  const roleName = isListing ? "Listing Agent" : "Buyer Agent";
  const roleIcon = isListing ? (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ) : (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: 32,
      background: `linear-gradient(180deg, ${accentBg} 0%, ${FB.bg} 50%)`,
    }}>
      {/* Icon with spinning ring */}
      <div style={{
        width: 110, height: 110, position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%", background: "#FFFFFF",
          border: `2px solid ${FB.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", zIndex: 1,
          boxShadow: `0 4px 20px rgba(0,0,0,0.06)`,
        }}>
          {roleIcon}
        </div>
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: `2.5px solid ${accent}15`,
          borderTopColor: accent,
          animation: "spin 1.8s cubic-bezier(0.4,0,0.2,1) infinite",
        }} />
      </div>

      {/* Name */}
      <div style={{ fontSize: 40, fontWeight: 900, color: FB.text, fontFamily: "system-ui", marginBottom: 10, textAlign: "center" }}>
        {player.name}
      </div>

      {/* Role badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "8px 20px", borderRadius: 20,
        background: accentBg, border: `1.5px solid ${accent}33`,
        marginBottom: 40,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, animation: "pulse4 2s infinite" }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: accent, letterSpacing: 1 }}>{roleName}</span>
      </div>

      {/* Waiting text */}
      <div style={{ fontSize: 18, fontWeight: 600, color: FB.textSec, marginBottom: 16 }}>
        Waiting for partner...
      </div>

      {/* Animated dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 48 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: "50%", background: accent,
            opacity: 0.3, animation: `dotPulse 1.4s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Exit button */}
      <button onClick={onExit} style={{
        padding: "12px 36px", fontSize: 14, fontWeight: 700, fontFamily: "system-ui",
        color: FB.error, background: "#FFFFFF",
        border: `1.5px solid ${FB.error}33`, borderRadius: 12,
        cursor: "pointer", transition: "all 0.2s",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
        onMouseOver={e => { e.currentTarget.style.background = "#FEE2E2"; }}
        onMouseOut={e => { e.currentTarget.style.background = "#FFFFFF"; }}
      >Exit</button>
    </div>
  );
}

// ─── Settings Page ───
function SettingsPage({ onBack, gameDuration, onDurationChange }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [durationInput, setDurationInput] = useState(String(gameDuration));

  useEffect(() => { fetchGames(); }, []);

  async function fetchGames() {
    setLoading(true);
    const { data } = await supabase.from("games").select("*").order("played_at", { ascending: false });
    setGames(data || []);
    setLoading(false);
  }

  async function deleteGame(id) {
    setGames(prev => prev.filter(g => g.id !== id));
    await supabase.from("games").delete().eq("id", id);
  }

  function handleDurationSave() {
    const val = parseInt(durationInput);
    if (val >= 10 && val <= 600) onDurationChange(val);
  }

  const totalMatches = games.reduce((s, g) => s + g.matches, 0);
  const totalComm = games.reduce((s, g) => s + Number(g.total_commission), 0);

  return (
    <div style={{ minHeight: "100vh", background: FB.bg, color: FB.text, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "#FFFFFF", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${FB.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: FB.textSec, fontSize: 16, fontWeight: 600 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke={FB.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={FB.textSec} strokeWidth="2" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={FB.textSec} strokeWidth="2" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 800 }}>Settings</span>
        </div>
        <div style={{ width: 70 }} />
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 28px" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {[{ label: "Total Games", value: games.length, color: FB.primary }, { label: "Total Matches", value: totalMatches, color: "#54B329" }, { label: "Total Commission", value: `€${totalComm.toLocaleString()}`, color: FB.gold }].map(s => (
            <div key={s.label} style={{ flex: 1, background: "#FFFFFF", border: `2px solid ${FB.border}`, borderRadius: 16, padding: "18px 14px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: FB.textTer, marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Game Duration */}
        <div style={{ background: "#FFFFFF", border: `2px solid ${FB.border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: FB.textSec, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Game Duration</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input value={durationInput} onChange={e => setDurationInput(e.target.value.replace(/\D/g, ""))}
              style={{
                flex: 1, padding: "12px 16px", fontSize: 18, fontWeight: 700, background: FB.bgSec,
                border: `1.5px solid ${FB.border}`, borderRadius: 12, color: FB.text, outline: "none",
                fontFamily: "system-ui", textAlign: "center",
              }}
              onFocus={e => e.target.style.borderColor = FB.primary}
              onBlur={e => e.target.style.borderColor = FB.border}
            />
            <span style={{ fontSize: 16, color: FB.textSec, fontWeight: 600 }}>seconds</span>
            <button onClick={handleDurationSave} style={{
              padding: "12px 24px", fontSize: 14, fontWeight: 700, color: "#FFFFFF",
              background: FB.primary, border: "none", borderRadius: 12, cursor: "pointer",
              fontFamily: "system-ui",
            }}>Save</button>
          </div>
          <div style={{ fontSize: 12, color: FB.textTer, marginTop: 8 }}>Min: 10s · Max: 600s · Current: {gameDuration}s ({Math.floor(gameDuration/60)}m {gameDuration%60}s)</div>
        </div>

        {/* Game history */}
        <div style={{ fontSize: 14, color: FB.textSec, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>Game history ({games.length})</div>
        {loading ? (
          <div style={{ textAlign: "center", color: FB.textTer, padding: 60 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${FB.border}`, borderTopColor: FB.primary, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            Loading...
          </div>
        ) : games.length === 0 ? <div style={{ textAlign: "center", color: FB.textTer, padding: 60, fontSize: 16 }}>No games yet</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {games.map(g => (
              <div key={g.id} style={{ background: "#FFFFFF", border: `1.5px solid ${FB.border}`, borderRadius: 16, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: FB.text }}>{g.player1_name} & {g.player2_name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12, color: FB.textTer }}>{new Date(g.played_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    <div onClick={() => deleteGame(g.id)} style={{
                      width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: FB.textTer, transition: "all 0.15s",
                    }}
                      onMouseOver={e => { e.currentTarget.style.background = "#FEE2E2"; e.currentTarget.style.color = FB.error; }}
                      onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = FB.textTer; }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20, fontSize: 14 }}>
                  <div><span style={{ color: FB.textTer }}>Office: </span><span style={{ color: FB.textSec, fontWeight: 600 }}>{g.player1_office}</span></div>
                  <div><span style={{ color: FB.textTer }}>Matches: </span><span style={{ color: FB.primary, fontWeight: 700 }}>{g.matches}</span></div>
                  <div><span style={{ color: FB.textTer }}>Commission: </span><span style={{ color: FB.gold, fontWeight: 700 }}>€{Number(g.total_commission).toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
      {/* Header */}
      <div style={{
        background: "#FFFFFF", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${FB.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: FB.textSec, fontSize: 16, fontWeight: 600 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke={FB.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="14" width="4" height="7" rx="1" stroke={FB.gold} strokeWidth="1.5" />
            <rect x="10" y="8" width="4" height="13" rx="1" stroke={FB.gold} strokeWidth="1.5" />
            <rect x="17" y="11" width="4" height="10" rx="1" stroke={FB.gold} strokeWidth="1.5" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 800 }}>Leaderboard</span>
        </div>
        <div style={{
          fontSize: 12, color: "#54B329", background: "#DCFCE7",
          border: `1.5px solid #54B32933`, borderRadius: 20,
          padding: "5px 14px", fontWeight: 700, letterSpacing: 1, animation: "pulse4 2s infinite",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#54B329" }} />
          LIVE
        </div>
      </div>

      {/* Podium */}
      {games.length >= 3 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 16, padding: "40px 28px 24px" }}>
          {[1, 0, 2].map(idx => {
            const g = games[idx];
            if (!g) return null;
            const actualRank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
            const isFirst = actualRank === 1;
            const height = isFirst ? 130 : actualRank === 2 ? 100 : 85;
            const medal = medalColors[actualRank];
            return (
              <div key={g.team} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: isFirst ? 160 : 120, animation: `lbRowFade 0.5s ${actualRank * 0.15}s ease-out both` }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>{medalEmojis[actualRank]}</div>
                <div style={{ fontSize: isFirst ? 16 : 14, fontWeight: 800, color: FB.text, textAlign: "center", marginBottom: 4, lineHeight: 1.2 }}>{g.team}</div>
                <div style={{ fontSize: 12, color: FB.textTer, marginBottom: 10 }}>{g.office}</div>
                <div style={{
                  width: "100%", height, borderRadius: "16px 16px 0 0",
                  background: `linear-gradient(180deg, ${medal}33, ${medal}11)`, border: `2px solid ${medal}44`, borderBottom: "none",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <div style={{ fontSize: isFirst ? 24 : 20, fontWeight: 900, color: FB.gold }}>€{g.commission.toLocaleString()}</div>
                  <div style={{ fontSize: 13, color: FB.textSec, fontWeight: 600 }}>{g.matches} matches</div>
                  <div style={{ fontSize: 11, color: FB.textTer }}>{g.gamesPlayed} games</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of list */}
      <div style={{ padding: "0 28px 40px", maxWidth: 640, margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: FB.textTer, padding: 60 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${FB.border}`, borderTopColor: FB.primary, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <span style={{ fontSize: 16 }}>Loading...</span>
          </div>
        ) : games.length === 0 ? (
          <div style={{ textAlign: "center", color: FB.textTer, padding: 60, fontSize: 18 }}>No games played yet. Be the first!</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: games.length >= 3 ? 0 : 20 }}>
            {games.map((g, i) => {
              const rank = i + 1;
              if (rank <= 3 && games.length >= 3) return null;
              return (
                <div key={`${g.team}-${i}`} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#FFFFFF", border: `1.5px solid ${FB.border}`, borderRadius: 16, padding: "16px 20px",
                  animation: `lbRowFade 0.4s ${0.1 + i * 0.05}s ease-out both`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: FB.bgSec, border: `1.5px solid ${FB.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: FB.textSec }}>{rank}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>{g.team}</div>
                      <div style={{ fontSize: 12, color: FB.textTer }}>{g.office} · {g.gamesPlayed} games · {g.matches} matches</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: FB.gold }}>€{g.commission.toLocaleString()}</div>
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
  const [gameDuration, setGameDuration] = useState(DEFAULT_GAME_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_GAME_DURATION);
  const [countdown, setCountdown] = useState(3);
  const [matchCount, setMatchCount] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [selections, setSelections] = useState({ propertyType: null, size: null, priceRange: null, location: null });
  const [listings, setListings] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [matchedDeals, setMatchedDeals] = useState([]);
  const [takenRole, setTakenRole] = useState(null);
  const [takenByName, setTakenByName] = useState("");
  const [leaderboardData, setLeaderboardData] = useState([]);

  const channelRef = useRef(null);
  const idRef = useRef(0);
  const timerRef = useRef(null);
  const emptySelection = { propertyType: null, size: null, priceRange: null, location: null };
  const listingsRef = useRef([]);
  const buyersRef = useRef([]);
  useEffect(() => { listingsRef.current = listings; }, [listings]);
  useEffect(() => { buyersRef.current = buyers; }, [buyers]);

  // Load game duration from DB on mount
  useEffect(() => {
    supabase.from("settings").select("value").eq("key", "game_duration").single().then(({ data }) => {
      if (data) { const v = parseInt(data.value); setGameDuration(v); setTimeLeft(v); }
    });
  }, []);

  // Listen for taken roles while on lobby
  const lobbyChannelRef = useRef(null);
  useEffect(() => {
    if (gameState !== "lobby") {
      if (lobbyChannelRef.current) { supabase.removeChannel(lobbyChannelRef.current); lobbyChannelRef.current = null; }
      return;
    }
    setTakenRole(null);
    setTakenByName("");
    const ch = supabase.channel(CHANNEL_NAME + "-lobby", { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "role_taken" }, ({ payload }) => {
      setTakenRole(payload.role);
      setTakenByName(payload.name);
    })
    .on("broadcast", { event: "role_released" }, () => {
      setTakenRole(null);
      setTakenByName("");
    })
    .subscribe();
    lobbyChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); lobbyChannelRef.current = null; };
  }, [gameState]);

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
    // Broadcast role taken to lobby listeners
    if (lobbyChannelRef.current) {
      lobbyChannelRef.current.send({ type: "broadcast", event: "role_taken", payload: { role: selectedRole, name } });
    }
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
    setTimeLeft(gameDuration);
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
    // Broadcast role released
    const lobbyReleaseCh = supabase.channel(CHANNEL_NAME + "-lobby", { config: { broadcast: { self: false } } });
    lobbyReleaseCh.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        lobbyReleaseCh.send({ type: "broadcast", event: "role_released", payload: {} });
        setTimeout(() => supabase.removeChannel(lobbyReleaseCh), 500);
      }
    });
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    setGameState("lobby"); setRole(null); setPlayer(null); setPartner(null);
    setTimeLeft(gameDuration); setMatchCount(0); setTotalCommission(0);
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
        @keyframes cardMatchIn{0%{opacity:0;transform:scale(0.5);box-shadow:0 0 0 transparent}50%{opacity:1;transform:scale(1.15);box-shadow:0 0 20px rgba(28,70,245,0.5)}100%{transform:scale(1);box-shadow:0 0 8px rgba(28,70,245,0.2)}}
        @keyframes dealReveal{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes lbRowFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lbPlayerSlide{0%{opacity:0;transform:translateY(60px) scale(0.9)}40%{opacity:1;transform:translateY(-8px) scale(1.04)}70%{transform:translateY(3px) scale(0.99)}100%{transform:translateY(0) scale(1)}}
        @keyframes lbShine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes countDramatic{0%{transform:scale(0);opacity:0;text-shadow:0 0 0 transparent}40%{transform:scale(1.4);opacity:1;text-shadow:0 0 60px rgba(28,70,245,0.8)}70%{transform:scale(0.9);text-shadow:0 0 30px rgba(28,70,245,0.4)}100%{transform:scale(1);text-shadow:0 0 20px rgba(28,70,245,0.2)}}
        @keyframes screenShake{0%,100%{transform:translateX(0)}10%{transform:translateX(-4px)}20%{transform:translateX(4px)}30%{transform:translateX(-3px)}40%{transform:translateX(3px)}50%{transform:translateX(-2px)}60%{transform:translateX(2px)}}
        @keyframes timerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes timerShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
        @keyframes dotPulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
        @keyframes numberPop{from{transform:scale(1.1)}to{transform:scale(1)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:${FB.border};border-radius:2px}
        input::placeholder{color:${FB.textDim}}
      `}</style>

      {gameState === "lobby" && <LobbyScreen onJoin={handleJoin} onSettings={() => setGameState("settings")} onLeaderboard={() => setGameState("leaderboard")} takenRole={takenRole} takenByName={takenByName} />}
      {gameState === "settings" && <SettingsPage onBack={() => setGameState("lobby")} gameDuration={gameDuration} onDurationChange={(v) => {
        setGameDuration(v); setTimeLeft(v);
        supabase.from("settings").upsert({ key: "game_duration", value: String(v) });
      }} />}
      {gameState === "leaderboard" && <LeaderboardPage onBack={() => setGameState("lobby")} />}
      {gameState === "waiting" && <WaitingScreen player={player} role={role} onExit={handleReplay} />}

      {gameState === "countdown" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: FB.bg }}>
          {/* Player cards */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 48 }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              padding: "16px 28px", borderRadius: 18, background: "#FFFFFF",
              border: `2px solid ${FB.primary}22`, boxShadow: "0 4px 16px rgba(28,70,245,0.08)",
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#EEF1FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={FB.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: FB.text }}>{role === "listing" ? player?.name : partner?.name}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: FB.primary, letterSpacing: 1, textTransform: "uppercase" }}>Listing</div>
            </div>

            <div style={{ fontSize: 24, fontWeight: 900, color: FB.textTer }}>VS</div>

            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              padding: "16px 28px", borderRadius: 18, background: "#FFFFFF",
              border: `2px solid #54B32922`, boxShadow: "0 4px 16px rgba(84,179,41,0.08)",
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#54B329" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: FB.text }}>{role === "buyer" ? player?.name : partner?.name}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#54B329", letterSpacing: 1, textTransform: "uppercase" }}>Buyer</div>
            </div>
          </div>

          <div style={{ fontSize: 18, color: FB.textTer, letterSpacing: 5, marginBottom: 20, textTransform: "uppercase", fontWeight: 700 }}>Game starts in</div>
          <div key={countdown} style={{
            fontSize: 160, fontWeight: 900, fontFamily: "system-ui", lineHeight: 1,
            background: `linear-gradient(135deg,${FB.primary},${FB.primary400})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "countDramatic 0.8s ease-out",
          }}>{countdown}</div>
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

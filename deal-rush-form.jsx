import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "/src/supabase";

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
          fontSize: 48, fontWeight: 800, color: "#10B981",
          textShadow: "0 0 40px rgba(16,185,129,0.5), 0 0 80px rgba(16,185,129,0.3)",
          letterSpacing: 8, fontFamily: "system-ui", textAlign: "center",
        }}>MATCH!</div>
        <div style={{
          fontSize: 18, color: "#6EE7B7", textAlign: "center", marginTop: 8,
          fontFamily: "system-ui", letterSpacing: 2,
        }}>+1 Deal Closed</div>
      </div>
    </div>
  );
}

// ─── Mini Card ───
function MiniCard({ item, isMatched, isNew, side }) {
  const borderColor = isMatched ? "#10B981" : (side === "listing" ? "#60A5FA" : "#F472B6");
  const bgColor = isMatched ? "rgba(16,185,129,0.1)" : "rgba(30,41,59,0.8)";
  const anim = isNew && isMatched ? "cardMatchIn 0.6s ease-out" : "cardSlideIn 0.3s ease-out";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: bgColor, border: `1.5px solid ${borderColor}`,
      borderRadius: 8, padding: "5px 8px", fontSize: 10, color: "#CBD5E1",
      animation: anim, flexShrink: 0,
      boxShadow: isMatched && isNew ? "0 0 12px rgba(16,185,129,0.4)" : "none",
    }}>
      {isMatched && <span style={{ color: "#10B981", fontWeight: 800, fontSize: 11 }}>✓</span>}
      <span style={{ fontWeight: 600, color: isMatched ? "#10B981" : borderColor }}>{item.propertyType === "Apartment" ? "Apt" : "Villa"}</span>
      <span style={{ color: "#64748B" }}>·</span>
      <span>{item.size}</span>
      <span style={{ color: "#64748B" }}>·</span>
      <span>{item.priceRange}</span>
      <span style={{ color: "#64748B" }}>·</span>
      <span>{item.location}</span>
    </div>
  );
}

// ─── End Screen ───
function EndScreen({ matches, commission, matchedDeals, onReplay, player1, player2, leaderboardData }) {
  const [phase, setPhase] = useState("summary");

  const colors = ["#10B981","#3B82F6","#F472B6","#FBBF24","#8B5CF6","#06B6D4","#EF4444","#F97316"];
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
        {phase === "summary" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, letterSpacing: 5, color: "#94A3B8", fontFamily: "system-ui", marginBottom: 8, textTransform: "uppercase", fontWeight: 600 }}>
              Time's up!
            </div>
            <div style={{
              fontSize: 72, fontWeight: 900, fontFamily: "system-ui",
              background: "linear-gradient(135deg,#10B981,#06B6D4)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1,
              filter: "drop-shadow(0 4px 20px rgba(16,185,129,0.4))",
            }}>{matches}</div>
            <div style={{ fontSize: 16, color: "#10B981", fontFamily: "system-ui", fontWeight: 700, marginTop: 4, letterSpacing: 3, textTransform: "uppercase" }}>
              Deals matched
            </div>

            <div style={{
              marginTop: 20, padding: "14px 20px", background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.25)", borderRadius: 12, display: "inline-block",
            }}>
              <div style={{ fontSize: 11, color: "#94A3B8", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Total commission earned</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#FBBF24", fontFamily: "system-ui" }}>€{commission.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>2.5% per agent per deal</div>
            </div>

            {matchedDeals.length > 0 && (
              <div style={{ marginTop: 20, textAlign: "left" }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: "#64748B", textTransform: "uppercase", fontWeight: 600, marginBottom: 8, textAlign: "center" }}>
                  Closed deals
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {matchedDeals.map((deal, i) => {
                    const price = PRICE_TO_VALUE[deal.listing.priceRange] || 0;
                    const dealCommission = price * 0.025;
                    return (
                      <div key={deal.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
                        borderRadius: 10, padding: "10px 14px",
                        animation: `dealReveal 0.5s ${0.3 + i * 0.15}s ease-out both`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, background: "rgba(16,185,129,0.15)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800, color: "#10B981",
                          }}>#{i + 1}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9" }}>
                              {deal.listing.propertyType} · {deal.listing.size} · {deal.listing.location}
                            </div>
                            <div style={{ fontSize: 10, color: "#64748B", marginTop: 1 }}>
                              Listed {deal.listing.priceRange} → Buyer {deal.buyer.priceRange}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#FBBF24" }}>€{dealCommission.toLocaleString()}</div>
                          <div style={{ fontSize: 9, color: "#64748B" }}>per agent</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={() => setPhase("leaderboard")} style={{
              marginTop: 24, padding: "12px 40px", fontSize: 14, fontWeight: 700, fontFamily: "system-ui",
              color: "#0F172A", background: "linear-gradient(135deg,#10B981,#059669)", border: "none",
              borderRadius: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: 2,
              boxShadow: "0 4px 20px rgba(16,185,129,0.4)", transition: "transform 0.15s",
            }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
            >View leaderboard</button>
          </div>
        )}

        {phase === "leaderboard" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, letterSpacing: 4, color: "#94A3B8", fontFamily: "system-ui", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>Leaderboard</div>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 20 }}>Top teams</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {leaderboard.map((entry, i) => {
                const isPlayer = entry.isPlayer;
                const medalColors = { 1: "#FBBF24", 2: "#94A3B8", 3: "#CD7F32" };
                const medal = medalColors[entry.rank];
                return (
                  <div key={`${entry.team}-${i}`} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: isPlayer ? "rgba(16,185,129,0.1)" : "rgba(30,41,59,0.6)",
                    border: `1.5px solid ${isPlayer ? "rgba(16,185,129,0.5)" : "#334155"}`,
                    borderRadius: 12, padding: "12px 16px",
                    animation: isPlayer ? `lbPlayerSlide 0.8s ${0.3 + i * 0.12}s ease-out both` : `lbRowFade 0.4s ${0.1 + i * 0.1}s ease-out both`,
                    boxShadow: isPlayer ? "0 0 20px rgba(16,185,129,0.15)" : "none",
                    position: "relative", overflow: "hidden",
                  }}>
                    {isPlayer && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(90deg,transparent,rgba(16,185,129,0.05),transparent)",
                        animation: "lbShine 2s 1.5s ease-in-out",
                      }} />
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: medal ? `${medal}22` : "#1E293B",
                        border: `1.5px solid ${medal || "#334155"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 900, color: medal || "#64748B",
                      }}>{entry.rank}</div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 14, fontWeight: isPlayer ? 800 : 600, color: isPlayer ? "#10B981" : "#F1F5F9" }}>
                          {entry.team} {isPlayer && "⬅"}
                        </div>
                        <div style={{ fontSize: 10, color: "#64748B" }}>{entry.matches} matches</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#FBBF24", zIndex: 1 }}>€{entry.commission.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={onReplay} style={{
              marginTop: 28, padding: "14px 48px", fontSize: 15, fontWeight: 700, fontFamily: "system-ui",
              color: "#0F172A", background: "linear-gradient(135deg,#10B981,#059669)", border: "none",
              borderRadius: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: 2,
              boxShadow: "0 4px 20px rgba(16,185,129,0.4)", transition: "transform 0.15s",
            }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
            >Play again</button>
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
    <div onClick={disabled ? undefined : onClick} style={{
      flex: "1 1 22%", background: selected ? accentBg : "#1E293B",
      border: `1.5px solid ${selected ? accentBorder : "#334155"}`,
      borderRadius: 10, padding: "10px 6px", textAlign: "center",
      cursor: disabled ? "default" : "pointer", transition: "all 0.15s",
      userSelect: "none", WebkitTapHighlightColor: "transparent",
    }}>
      <span style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? accent : "#94A3B8" }}>{chipLabel}</span>
    </div>
  );

  const TypeChip = ({ label: chipLabel, icon, selected, onClick }) => (
    <div onClick={disabled ? undefined : onClick} style={{
      flex: "1 1 45%", background: selected ? accentBg : "#1E293B",
      border: `1.5px solid ${selected ? accentBorder : "#334155"}`,
      borderRadius: 12, padding: "14px 10px", textAlign: "center",
      cursor: disabled ? "default" : "pointer", transition: "all 0.15s",
      userSelect: "none", WebkitTapHighlightColor: "transparent",
    }}>
      <div style={{ marginBottom: 6 }}>{icon}</div>
      <span style={{ fontSize: 14, fontWeight: selected ? 700 : 500, color: selected ? accent : "#94A3B8" }}>{chipLabel}</span>
    </div>
  );

  const houseIcon = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="11" width="16" height="10" rx="1.5" stroke={selections.propertyType === "Apartment" ? accent : "#64748B"} strokeWidth="1.5" />
      <path d="M4 11L12 5L20 11" stroke={selections.propertyType === "Apartment" ? accent : "#64748B"} strokeWidth="1.5" />
      <rect x="9" y="15" width="6" height="6" rx="0.5" stroke={selections.propertyType === "Apartment" ? accent : "#64748B"} strokeWidth="1.5" />
    </svg>
  );
  const villaIcon = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="13" width="8" height="8" rx="1" stroke={selections.propertyType === "Villa" ? accent : "#64748B"} strokeWidth="1.5" />
      <path d="M2 13L6 8.5L10 13" stroke={selections.propertyType === "Villa" ? accent : "#64748B"} strokeWidth="1.5" />
      <rect x="12" y="9" width="10" height="12" rx="1" stroke={selections.propertyType === "Villa" ? accent : "#64748B"} strokeWidth="1.5" />
      <path d="M12 9L17 4L22 9" stroke={selections.propertyType === "Villa" ? accent : "#64748B"} strokeWidth="1.5" />
    </svg>
  );

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "#0F172A", padding: "12px 20px 16px",
      overflow: "auto", minHeight: "100vh", maxWidth: 480, margin: "0 auto", width: "100%",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
          {playerName}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: accent, marginTop: 2 }}>{label}</div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>Partner: {partnerName}</div>
      </div>

      {/* Timer + matches + commission */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#1E293B", borderRadius: 10, padding: "10px 14px", marginBottom: 14,
        border: "1px solid #334155",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: "#EF4444",
            boxShadow: "0 0 8px rgba(239,68,68,0.5)",
            animation: timeLeft <= 5 ? "blink 0.5s infinite" : "none",
          }} />
          <span style={{
            fontSize: 26, fontWeight: 800, fontFamily: "monospace",
            color: timeLeft <= 5 ? "#EF4444" : timeLeft <= 10 ? "#FBBF24" : "#F1F5F9",
          }}>
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#94A3B8" }}>Matches</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#10B981" }}>{matchCount}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>Commission</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#FBBF24" }}>€{(commission / 1000).toFixed(1)}k</span>
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

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {["propertyType", "size", "priceRange", "location"].map(f => (
          <div key={f} style={{ flex: 1, height: 3, borderRadius: 2, background: selections[f] ? "#10B981" : "#334155", transition: "background 0.3s" }} />
        ))}
      </div>

      {/* Mini cards */}
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

      {/* Property type */}
      <div style={{ fontSize: 11, color: "#64748B", letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "1. Property type" : "What are they looking for?"}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TypeChip label="Apartment" icon={houseIcon} selected={selections.propertyType === "Apartment"} onClick={() => onSelect("propertyType", "Apartment")} />
        <TypeChip label="Villa" icon={villaIcon} selected={selections.propertyType === "Villa"} onClick={() => onSelect("propertyType", "Villa")} />
      </div>

      {/* Size */}
      <div style={{ fontSize: 11, color: "#64748B", letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "2. Size" : "Size"}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {SIZES.map(s => <Chip key={s} label={s} selected={selections.size === s} onClick={() => onSelect("size", s)} />)}
      </div>

      {/* Price */}
      <div style={{ fontSize: 11, color: "#64748B", letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "3. Price range" : "Budget range"}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(isListing ? LISTING_PRICES : BUYER_PRICES).map(p => <Chip key={p} label={p} selected={selections.priceRange === p} onClick={() => onSelect("priceRange", p)} />)}
      </div>

      {/* Location */}
      <div style={{ fontSize: 11, color: "#64748B", letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "4. Location" : "Preferred area"}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {LOCATIONS.map(l => (
          <div key={l.name} onClick={disabled ? undefined : () => onSelect("location", l.name)} style={{
            flex: 1, background: selections.location === l.name ? accentBg : "#1E293B",
            border: `1.5px solid ${selections.location === l.name ? accentBorder : "#334155"}`,
            borderRadius: 10, overflow: "hidden",
            cursor: disabled ? "default" : "pointer", transition: "all 0.15s",
            userSelect: "none", WebkitTapHighlightColor: "transparent",
          }}>
            <img src={l.img} alt={l.name} style={{ width: "100%", height: 56, objectFit: "cover", display: "block" }} />
            <div style={{ padding: "6px 4px", textAlign: "center" }}>
              <span style={{ fontSize: 12, fontWeight: selections.location === l.name ? 700 : 500, color: selections.location === l.name ? accent : "#94A3B8" }}>{l.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lobby Screen ───
function LobbyScreen({ onJoin, onSettings }) {
  const [name, setName] = useState("");
  const [office, setOffice] = useState("");

  const inputStyle = {
    width: "100%", padding: "14px 16px", fontSize: 15, fontWeight: 500,
    background: "#1E293B", border: "1.5px solid #334155", borderRadius: 12,
    color: "#F1F5F9", outline: "none", fontFamily: "system-ui",
    transition: "border-color 0.2s",
  };

  const canJoin = name.trim() && office.trim();

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: 32, background: "#0F172A", position: "relative",
    }}>
      {/* Settings gear */}
      <div onClick={onSettings} style={{
        position: "absolute", top: 16, right: 16, width: 40, height: 40,
        borderRadius: 10, background: "#1E293B", border: "1px solid #334155",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "border-color 0.2s",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#64748B" strokeWidth="1.5" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#64748B" strokeWidth="1.5" />
        </svg>
      </div>

      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="10" width="18" height="11" rx="2" stroke="#10B981" strokeWidth="2" />
          <path d="M3 10L12 4L21 10" stroke="#10B981" strokeWidth="2" />
          <circle cx="17" cy="7" r="4" stroke="#F472B6" strokeWidth="1.5" fill="rgba(244,114,182,0.15)" />
          <circle cx="17" cy="6" r="1.5" stroke="#F472B6" strokeWidth="1" />
          <path d="M14.5 10c0-1 1-2 2.5-2s2.5 1 2.5 2" stroke="#F472B6" strokeWidth="1" />
        </svg>
      </div>

      <div style={{ fontSize: 13, letterSpacing: 5, color: "#64748B", marginBottom: 10, textTransform: "uppercase", fontWeight: 600 }}>
        Property match
      </div>
      <div style={{
        fontSize: 42, fontWeight: 900, textAlign: "center", lineHeight: 1.1, marginBottom: 32,
        background: "linear-gradient(135deg,#10B981,#06B6D4)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>Deal Rush</div>

      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        <input
          style={inputStyle}
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          onFocus={e => e.target.style.borderColor = "#10B981"}
          onBlur={e => e.target.style.borderColor = "#334155"}
        />
        <input
          style={inputStyle}
          placeholder="Office name"
          value={office}
          onChange={e => setOffice(e.target.value)}
          onFocus={e => e.target.style.borderColor = "#10B981"}
          onBlur={e => e.target.style.borderColor = "#334155"}
        />
      </div>

      <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 340 }}>
        <button onClick={() => canJoin && onJoin(name.trim(), office.trim(), "listing")} style={{
          flex: 1, padding: "16px", fontSize: 14, fontWeight: 800, fontFamily: "system-ui",
          color: canJoin ? "#0F172A" : "#64748B",
          background: canJoin ? "#60A5FA" : "#1E293B",
          border: canJoin ? "none" : "1px solid #334155",
          borderRadius: 14, cursor: canJoin ? "pointer" : "default",
          textTransform: "uppercase", letterSpacing: 2, transition: "all 0.2s",
        }}>
          Listing Agent
        </button>
        <button onClick={() => canJoin && onJoin(name.trim(), office.trim(), "buyer")} style={{
          flex: 1, padding: "16px", fontSize: 14, fontWeight: 800, fontFamily: "system-ui",
          color: canJoin ? "#0F172A" : "#64748B",
          background: canJoin ? "#F472B6" : "#1E293B",
          border: canJoin ? "none" : "1px solid #334155",
          borderRadius: 14, cursor: canJoin ? "pointer" : "default",
          textTransform: "uppercase", letterSpacing: 2, transition: "all 0.2s",
        }}>
          Buyer Agent
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "#475569", textAlign: "center" }}>
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
      minHeight: "100vh", padding: 32, background: "#0F172A",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%", border: `3px solid ${accent}`,
        borderTopColor: "transparent", animation: "spin 1s linear infinite", marginBottom: 24,
      }} />
      <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F5F9", fontFamily: "system-ui", marginBottom: 8 }}>
        Waiting for partner...
      </div>
      <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 4 }}>
        {player.name} ({player.office})
      </div>
      <div style={{ fontSize: 13, color: accent, fontWeight: 700 }}>
        {role === "listing" ? "Listing Agent" : "Buyer Agent"}
      </div>
      <div style={{ marginTop: 24, fontSize: 12, color: "#475569", textAlign: "center", maxWidth: 300 }}>
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

  useEffect(() => {
    fetchGames();
  }, []);

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
    <div style={{
      minHeight: "100vh", background: "#0F172A", color: "#F1F5F9",
      fontFamily: "system-ui,-apple-system,sans-serif", padding: "20px 24px",
      maxWidth: 600, margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#94A3B8",
          fontSize: 14, fontWeight: 600,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Settings</div>
        <div style={{ width: 60 }} />
      </div>

      {/* Stats summary */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Games", value: games.length, color: "#60A5FA" },
          { label: "Total Matches", value: totalMatches, color: "#10B981" },
          { label: "Total Commission", value: `€${totalComm.toLocaleString()}`, color: "#FBBF24" },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: "#1E293B", border: "1px solid #334155", borderRadius: 12,
            padding: "12px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Clear button */}
      <button onClick={clearAll} disabled={clearing || games.length === 0} style={{
        width: "100%", padding: "12px", fontSize: 13, fontWeight: 700,
        color: games.length === 0 ? "#475569" : "#EF4444",
        background: games.length === 0 ? "#1E293B" : "rgba(239,68,68,0.1)",
        border: `1px solid ${games.length === 0 ? "#334155" : "rgba(239,68,68,0.3)"}`,
        borderRadius: 10, cursor: games.length === 0 ? "default" : "pointer",
        textTransform: "uppercase", letterSpacing: 2, marginBottom: 20,
        fontFamily: "system-ui",
      }}>
        {clearing ? "Clearing..." : "Clear all data"}
      </button>

      {/* Games list */}
      <div style={{ fontSize: 12, color: "#64748B", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>
        Game history ({games.length})
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>Loading...</div>
      ) : games.length === 0 ? (
        <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>No games yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {games.map(g => (
            <div key={g.id} style={{
              background: "#1E293B", border: "1px solid #334155", borderRadius: 12,
              padding: "12px 16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>
                  {g.player1_name} & {g.player2_name}
                </div>
                <div style={{ fontSize: 10, color: "#475569" }}>
                  {new Date(g.played_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                <div>
                  <span style={{ color: "#64748B" }}>Office: </span>
                  <span style={{ color: "#94A3B8" }}>{g.player1_office}</span>
                </div>
                <div>
                  <span style={{ color: "#64748B" }}>Matches: </span>
                  <span style={{ color: "#10B981", fontWeight: 700 }}>{g.matches}</span>
                </div>
                <div>
                  <span style={{ color: "#64748B" }}>Commission: </span>
                  <span style={{ color: "#FBBF24", fontWeight: 700 }}>€{Number(g.total_commission).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ───
export default function DealRushForm() {
  const [gameState, setGameState] = useState("lobby"); // lobby, waiting, countdown, playing, finished
  const [role, setRole] = useState(null); // "listing" or "buyer"
  const [player, setPlayer] = useState(null); // { name, office }
  const [partner, setPartner] = useState(null);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [countdown, setCountdown] = useState(3);
  const [matchCount, setMatchCount] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [selections, setSelections] = useState({ propertyType: null, size: null, priceRange: null, location: null });
  const [listings, setListings] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [matchedDeals, setMatchedDeals] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);

  const channelRef = useRef(null);
  const idRef = useRef(0);
  const timerRef = useRef(null);
  const emptySelection = { propertyType: null, size: null, priceRange: null, location: null };

  // Refs for latest state in callbacks
  const listingsRef = useRef([]);
  const buyersRef = useRef([]);
  useEffect(() => { listingsRef.current = listings; }, [listings]);
  useEffect(() => { buyersRef.current = buyers; }, [buyers]);

  // ─── Auto-submit when all selected ───
  const allSelected = selections.propertyType && selections.size && selections.priceRange && selections.location;
  const prevAllSelected = useRef(false);

  useEffect(() => {
    if (allSelected && !prevAllSelected.current && gameState === "playing") {
      prevAllSelected.current = true;
      const item = { ...selections, id: ++idRef.current };

      // Broadcast to partner
      channelRef.current?.send({
        type: "broadcast",
        event: role === "listing" ? "listing_submitted" : "buyer_submitted",
        payload: item,
      });

      // Add to local pending list
      if (role === "listing") {
        // Check against existing buyers
        const matchIdx = buyersRef.current.findIndex(b =>
          item.propertyType === b.propertyType && item.size === b.size &&
          PRICE_MATCH_MAP[item.priceRange] === b.priceRange && item.location === b.location
        );
        if (matchIdx !== -1) {
          handleMatch(item, buyersRef.current[matchIdx]);
          setBuyers(prev => prev.filter((_, i) => i !== matchIdx));
        } else {
          setListings(prev => [...prev, item]);
        }
      } else {
        const matchIdx = listingsRef.current.findIndex(l =>
          l.propertyType === item.propertyType && l.size === item.size &&
          PRICE_MATCH_MAP[l.priceRange] === item.priceRange && l.location === item.location
        );
        if (matchIdx !== -1) {
          handleMatch(listingsRef.current[matchIdx], item);
          setListings(prev => prev.filter((_, i) => i !== matchIdx));
        } else {
          setBuyers(prev => [...prev, item]);
        }
      }

      // Reset selections
      setSelections({ ...emptySelection });
    }
    if (!allSelected) {
      prevAllSelected.current = false;
    }
  }, [allSelected, gameState, role, selections]);

  function handleMatch(listing, buyer) {
    const commission = PRICE_TO_VALUE[listing.priceRange] * 0.025;
    setMatchCount(m => m + 1);
    setTotalCommission(c => c + commission);
    setMatchedDeals(prev => [...prev, { listing, buyer, id: ++idRef.current, isNew: true }]);
    setTimeout(() => setMatchedDeals(prev => prev.map(d => ({ ...d, isNew: false }))), 1500);
    setShowMatch(true);
    setTimeout(() => setShowMatch(false), 1600);

    // Broadcast match
    channelRef.current?.send({
      type: "broadcast",
      event: "match_found",
      payload: { listing, buyer, commission },
    });
  }

  // ─── Handle received submissions from partner ───
  function handlePartnerListing(item) {
    // Partner is listing agent, we are buyer - add to listings
    const matchIdx = buyersRef.current.findIndex(b =>
      item.propertyType === b.propertyType && item.size === b.size &&
      PRICE_MATCH_MAP[item.priceRange] === b.priceRange && item.location === b.location
    );
    if (matchIdx !== -1) {
      handleMatch(item, buyersRef.current[matchIdx]);
      setBuyers(prev => prev.filter((_, i) => i !== matchIdx));
    } else {
      setListings(prev => [...prev, item]);
    }
  }

  function handlePartnerBuyer(item) {
    // Partner is buyer agent, we are listing - add to buyers
    const matchIdx = listingsRef.current.findIndex(l =>
      l.propertyType === item.propertyType && l.size === item.size &&
      PRICE_MATCH_MAP[l.priceRange] === item.priceRange && l.location === item.location
    );
    if (matchIdx !== -1) {
      handleMatch(listingsRef.current[matchIdx], item);
      setListings(prev => prev.filter((_, i) => i !== matchIdx));
    } else {
      setBuyers(prev => [...prev, item]);
    }
  }

  // ─── Join game ───
  const handleJoin = useCallback((name, office, selectedRole) => {
    const playerInfo = { name, office };
    setPlayer(playerInfo);
    setRole(selectedRole);
    setGameState("waiting");

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "player_joined" }, ({ payload }) => {
        setPartner(payload.player);
        // If we were waiting, start countdown
        setGameState("countdown");
        // Tell the joiner about us
        channel.send({
          type: "broadcast",
          event: "player_ready",
          payload: { player: playerInfo, role: selectedRole },
        });
      })
      .on("broadcast", { event: "player_ready" }, ({ payload }) => {
        setPartner(payload.player);
        setGameState("countdown");
      })
      .on("broadcast", { event: "listing_submitted" }, ({ payload }) => {
        handlePartnerListing(payload);
      })
      .on("broadcast", { event: "buyer_submitted" }, ({ payload }) => {
        handlePartnerBuyer(payload);
      })
      .on("broadcast", { event: "match_found" }, ({ payload }) => {
        // Partner found a match - sync our state
        // We already handle match locally, so just show overlay if we missed it
      })
      .on("broadcast", { event: "timer_sync" }, ({ payload }) => {
        setTimeLeft(payload.timeLeft);
        if (payload.timeLeft <= 0) {
          setGameState("finished");
        }
      })
      .on("broadcast", { event: "game_end" }, () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(0);
        setGameState("finished");
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Announce ourselves
          channel.send({
            type: "broadcast",
            event: "player_joined",
            payload: { player: playerInfo, role: selectedRole },
          });
        }
      });

    channelRef.current = channel;
  }, []);

  // ─── Countdown ───
  useEffect(() => {
    if (gameState !== "countdown") return;
    setCountdown(3);
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setGameState("playing");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [gameState]);

  // ─── Game timer (listing agent is timer master) ───
  useEffect(() => {
    if (gameState !== "playing") return;
    setTimeLeft(GAME_DURATION);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        // Listing agent broadcasts timer
        if (role === "listing") {
          channelRef.current?.send({
            type: "broadcast",
            event: "timer_sync",
            payload: { timeLeft: next },
          });
        }
        if (next <= 0) {
          clearInterval(timerRef.current);
          setGameState("finished");
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameState, role]);

  // ─── Save to DB + fetch leaderboard when finished ───
  useEffect(() => {
    if (gameState !== "finished") return;

    // Only listing agent saves to DB to avoid duplicates
    if (role === "listing" && player && partner) {
      supabase.from("games").insert({
        player1_name: player.name,
        player1_office: player.office,
        player2_name: partner.name,
        player2_office: partner.office,
        matches: matchCount,
        total_commission: totalCommission,
      }).then(() => {});
    }

    // Both fetch leaderboard
    supabase.from("games")
      .select("*")
      .order("total_commission", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) {
          setLeaderboardData(data.map(g => ({
            team: `${g.player1_name} & ${g.player2_name}`,
            matches: g.matches,
            commission: Number(g.total_commission),
          })));
        }
      });
  }, [gameState]);

  // ─── Replay ───
  // ─── End game early ───
  const handleEndGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    setGameState("finished");
    channelRef.current?.send({
      type: "broadcast",
      event: "game_end",
      payload: {},
    });
  }, []);

  const handleReplay = useCallback(() => {
    // Cleanup channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setGameState("lobby");
    setRole(null);
    setPlayer(null);
    setPartner(null);
    setTimeLeft(GAME_DURATION);
    setMatchCount(0);
    setTotalCommission(0);
    setSelections({ ...emptySelection });
    setListings([]);
    setBuyers([]);
    setMatchedDeals([]);
    idRef.current = 0;
  }, []);

  const handleSelect = useCallback((field, value) => {
    if (gameState !== "playing") return;
    setSelections(p => ({ ...p, [field]: p[field] === value ? null : value }));
  }, [gameState]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0F172A", color: "#F1F5F9",
      fontFamily: "system-ui,-apple-system,sans-serif",
      display: "flex", flexDirection: "column", position: "relative",
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
        @keyframes cardSlideIn{from{opacity:0;transform:translateY(-8px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes cardMatchIn{0%{opacity:0;transform:scale(0.5);box-shadow:0 0 0 rgba(16,185,129,0)}50%{opacity:1;transform:scale(1.15);box-shadow:0 0 20px rgba(16,185,129,0.6)}100%{transform:scale(1);box-shadow:0 0 8px rgba(16,185,129,0.2)}}
        @keyframes dealReveal{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes lbRowFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lbPlayerSlide{0%{opacity:0;transform:translateY(60px) scale(0.9)}40%{opacity:1;transform:translateY(-8px) scale(1.04)}70%{transform:translateY(3px) scale(0.99)}100%{transform:translateY(0) scale(1)}}
        @keyframes lbShine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes countPop{0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.3);opacity:1}100%{transform:scale(1);opacity:1}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
        input::placeholder{color:#475569}
      `}</style>

      {gameState === "lobby" && <LobbyScreen onJoin={handleJoin} onSettings={() => setGameState("settings")} />}
      {gameState === "settings" && <SettingsPage onBack={() => setGameState("lobby")} />}

      {gameState === "waiting" && <WaitingScreen player={player} role={role} />}

      {gameState === "countdown" && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", background: "#0F172A",
        }}>
          <div style={{ fontSize: 13, color: "#94A3B8", letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>
            Game starts in
          </div>
          <div key={countdown} style={{
            fontSize: 120, fontWeight: 900, fontFamily: "system-ui",
            background: "linear-gradient(135deg,#10B981,#06B6D4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "countPop 0.8s ease-out",
          }}>{countdown}</div>
          <div style={{ fontSize: 14, color: "#64748B", marginTop: 12 }}>
            {player?.name} & {partner?.name}
          </div>
        </div>
      )}

      {(gameState === "playing" || gameState === "finished") && role && (
        <GamePanel
          role={role}
          selections={selections}
          onSelect={handleSelect}
          matchCount={matchCount}
          timeLeft={timeLeft}
          disabled={gameState === "finished"}
          commission={totalCommission}
          pendingItems={role === "listing" ? listings : buyers}
          matchedDeals={matchedDeals}
          playerName={player?.name}
          partnerName={partner?.name}
          onEndGame={handleEndGame}
        />
      )}

      <MatchOverlay show={showMatch} />
      {gameState === "finished" && (
        <EndScreen
          matches={matchCount}
          commission={totalCommission}
          matchedDeals={matchedDeals}
          onReplay={handleReplay}
          player1={player}
          player2={partner}
          leaderboardData={leaderboardData}
        />
      )}
    </div>
  );
}

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
const LISTING_PRICES = ["€300k", "€500k", "€700k"];
const BUYER_PRICES = ["€200-400k", "€400-600k", "€600-800k"];
const LOCATIONS = [
  { name: "Lisbon", img: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=200&h=120&fit=crop" },
  { name: "Porto", img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=200&h=120&fit=crop" },
  { name: "Algarve", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=120&fit=crop" },
];
const LISTING_IMAGES = Array.from({ length: 50 }, (_, i) => `/listing-images/listing-${String(i).padStart(2, "0")}.jpg`);
function randomListingImg() { return LISTING_IMAGES[Math.floor(Math.random() * LISTING_IMAGES.length)]; }

const PRICE_MATCH_MAP = { "€300k": "€200-400k", "€500k": "€400-600k", "€700k": "€600-800k" };
const PRICE_TO_VALUE = { "€300k": 300000, "€500k": 500000, "€700k": 700000 };
const DEFAULT_GAME_DURATION = 300;
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

// ─── i18n ───
const I18N = {
  pt: {
    "Your name": "O seu nome",
    "Search office...": "Pesquisar agência...",
    "Choose your side": "Escolha o seu lado",
    "Listing Agent": "Angariador",
    "Buyer Agent": "Comprador",
    "joined": "entrou",
    "Waiting for partner...": "À espera do parceiro...",
    "Exit": "Sair",
    "EXIT": "SAIR",
    "Listing": "Angariador",
    "Buyer": "Comprador",
    "Game starts in": "O jogo começa em",
    "Create Listing": "Criar Angariação",
    "Create Buyer Demand": "Criar Procura",
    "Category": "Categoria",
    "Room": "Tipologia",
    "Price": "Preço",
    "Budget": "Orçamento",
    "City": "Cidade",
    "COMMISSION": "COMISSÃO",
    "+1 Deal Closed": "+1 Negócio Fechado",
    "Time's up!": "Tempo esgotado!",
    "Deals Matched": "Negócios Fechados",
    "Total Commission Earned": "Comissão Total",
    "2.5% per agent per deal": "2,5% por agente por negócio",
    "Closed Deals": "Negócios Fechados",
    "Listed": "Anúncio",
    "per agent": "por agente",
    "View Leaderboard": "Ver Classificação",
    "Leaderboard": "Classificação",
    "Top teams": "Melhores equipas",
    "Continue": "Continuar",
    "Stop": "Chega de",
    "Search & Scroll": "Pesquisar",
    "It's Time to": "Está na Hora de",
    "Close": "Fechar",
    "Very Soon": "Em Breve",
    "Play again": "Jogar novamente",
    "Back": "Voltar",
    "Settings": "Definições",
    "Loading settings...": "A carregar...",
    "Total Games": "Total de Jogos",
    "Total Matches": "Total de Matches",
    "Total Commission": "Comissão Total",
    "Active Sessions": "Sessões Ativas",
    "No active sessions": "Sem sessões ativas",
    "Playing": "A Jogar",
    "Waiting": "À Espera",
    "Starting": "A Iniciar",
    "Game Duration": "Duração do Jogo",
    "seconds": "segundos",
    "Save": "Guardar",
    "✓ Saved": "✓ Guardado",
    "Game duration updated to": "Duração atualizada para",
    "Game history": "Histórico de jogos",
    "No games yet": "Sem jogos ainda",
    "Office": "Agência",
    "Commission": "Comissão",
    "Loading...": "A carregar...",
    "No games played yet. Be the first!": "Ainda não há jogos. Seja o primeiro!",
    "Games": "Jogos",
    "Default Language": "Idioma Predefinido",
    "Apartment": "Apartamento",
    "Villa": "Moradia",
    "Lisbon": "Lisboa",
  },
};
const LangContext = React.createContext({ lang: "en", setLang: () => {} });
function useT() {
  const { lang } = React.useContext(LangContext);
  return (key) => (lang !== "en" && I18N[lang]?.[key]) || key;
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
  const t = useT();
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
        }}>{t("MATCH!")}</div>
        <div style={{
          fontSize: 18, color: FB.primary400, textAlign: "center", marginTop: 8,
          fontFamily: "system-ui", letterSpacing: 2,
        }}>{t("+1 Deal Closed")}</div>
      </div>
    </div>
  );
}

// ─── Mini Card (grid style) ───
function MiniCard({ item, isMatched, isNew, side }) {
  const t = useT();
  const accent = side === "listing" ? FB.primary : "#54B329";
  return (
    <div style={{
      background: isMatched ? `${accent}08` : "#FFFFFF",
      border: `2px solid ${isMatched ? accent : FB.border}`,
      borderRadius: 16, overflow: "hidden",
      animation: isNew && isMatched ? "cardMatchIn 0.6s ease-out" : "slideFromLeft 0.3s ease-out",
      boxShadow: isMatched ? `0 4px 16px ${accent}20` : "0 2px 6px rgba(0,0,0,0.04)",
      position: "relative", width: 140, flexShrink: 0,
    }}>
      {item.img ? (
        <img src={item.img} alt={item.propertyType} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }}
          onError={e => { e.target.style.display = "none"; }} />
      ) : (
        <div style={{ width: "100%", height: 100, background: FB.bgSec, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={FB.textDim} strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        </div>
      )}
      {isMatched && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none", zIndex: 2,
          background: "rgba(255,255,255,0.55)", backdropFilter: "blur(2px)",
        }}>
          <div style={{
            padding: "6px 18px", borderRadius: 6,
            border: `3px solid ${accent}`, background: "rgba(255,255,255,0.85)",
            transform: "rotate(-12deg)",
            animation: isNew ? "stampSlam 0.5s ease-out forwards" : "none",
            boxShadow: isNew ? `0 4px 20px ${accent}50` : `0 2px 8px ${accent}30`,
          }}>
            <span style={{
              fontSize: 20, fontWeight: 900, letterSpacing: 3,
              color: accent, textTransform: "uppercase", fontFamily: "system-ui",
            }}>MATCH</span>
          </div>
        </div>
      )}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: FB.text }}>{t(item.propertyType)} · {item.size}</div>
        <div style={{ fontSize: 13, color: isMatched ? accent : FB.textSec, fontWeight: 600, marginTop: 2 }}>
          {item.priceRange} · {t(item.location)}
        </div>
      </div>
    </div>
  );
}

function LeaderboardList({ leaderboard }) {
  const playerRef = useRef(null);
  const t = useT();
  const playerIdx = leaderboard.findIndex(e => e.isPlayer);

  useEffect(() => {
    if (playerRef.current) {
      setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
    }
  }, []);

  const displayEntries = useMemo(() => {
    const top10 = leaderboard.slice(0, 10);
    if (playerIdx < 10) return top10;
    const around = leaderboard.slice(Math.max(3, playerIdx - 1), playerIdx + 2);
    return [...leaderboard.slice(0, 3), { separator: true }, ...around];
  }, [leaderboard, playerIdx]);

  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  // Calculate distance from player for zoom effect
  const getDistanceFromPlayer = (entry) => {
    if (!entry.rank || playerIdx < 0) return 99;
    const playerRank = leaderboard[playerIdx]?.rank;
    if (!playerRank) return 99;
    return Math.abs(entry.rank - playerRank);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, perspective: 800, padding: "0 12px" }}>
      {displayEntries.map((entry, i) => {
        if (entry.separator) return (
          <div key="sep" style={{ textAlign: "center", padding: "6px 0", color: FB.textTer, fontSize: 16, letterSpacing: 6, fontWeight: 700 }}>•••</div>
        );
        const isPlayer = entry.isPlayer;
        const isTop3 = entry.rank <= 3;
        const medal = medals[entry.rank];
        const rankBg = entry.rank === 1 ? "linear-gradient(135deg, #FFF7CD, #FFE066)"
          : entry.rank === 2 ? "linear-gradient(135deg, #F0F4FF, #D6E0F5)"
          : entry.rank === 3 ? "linear-gradient(135deg, #FFF0E0, #FBBF7A)" : "none";

        const dist = getDistanceFromPlayer(entry);
        const neighborScale = dist === 0 ? 1.05 : dist === 1 ? 0.97 : dist === 2 ? 0.93 : 0.9;
        const neighborOpacity = dist === 0 ? 1 : dist === 1 ? 0.85 : dist === 2 ? 0.65 : 0.5;
        const neighborZ = dist === 0 ? 10 : dist === 1 ? 5 : 0;

        return (
          <div ref={isPlayer ? playerRef : undefined} key={`${entry.team}-${i}`} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: isPlayer ? `linear-gradient(135deg, ${FB.primary}14, ${FB.primary}08)` : isTop3 ? rankBg : "#FFFFFF",
            border: isPlayer ? `2.5px solid ${FB.primary}` : isTop3 ? `1.5px solid ${entry.rank === 1 ? "#F59E0B" : entry.rank === 2 ? "#CBD5E1" : "#F97316"}44` : `1.5px solid ${FB.border}`,
            borderRadius: isPlayer ? 20 : 16,
            padding: isPlayer ? "18px 22px" : "14px 18px",
            animation: isPlayer ? `lbPlayerSlide 0.8s ${0.3 + i * 0.12}s ease-out both` : `lbRowFade 0.4s ${0.1 + i * 0.1}s ease-out both`,
            boxShadow: isPlayer ? `0 8px 28px rgba(28,70,245,0.22)` : isTop3 ? "0 2px 10px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.03)",
            transform: `scale(${neighborScale})`,
            opacity: neighborOpacity,
            zIndex: neighborZ,
            position: "relative", overflow: "hidden",
            transition: "transform 0.5s ease, opacity 0.5s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
              {medal ? (
                <div style={{ fontSize: 36, lineHeight: 1, width: 44, textAlign: "center", flexShrink: 0 }}>{medal}</div>
              ) : (
                <div style={{
                  width: isPlayer ? 44 : 36, height: isPlayer ? 44 : 36, borderRadius: isPlayer ? 14 : 10,
                  background: isPlayer ? FB.primary : FB.bg,
                  border: `2px solid ${isPlayer ? FB.primary : FB.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isPlayer ? 17 : 14, fontWeight: 900, color: isPlayer ? "#FFFFFF" : FB.textTer,
                  flexShrink: 0,
                }}>{entry.rank}</div>
              )}
              <div style={{ textAlign: "left" }}>
                <div style={{
                  fontSize: isPlayer ? 18 : 15, fontWeight: isPlayer ? 800 : isTop3 ? 700 : 600,
                  color: isPlayer ? FB.primary : FB.text,
                }}>
                  {entry.team}
                </div>
                <div style={{ fontSize: 12, color: FB.textTer, marginTop: 1 }}>{entry.matches} {entry.matches !== 1 ? t("matches") : t("match")}</div>
              </div>
            </div>
            <div style={{
              fontSize: isPlayer ? 20 : 16, fontWeight: 800, zIndex: 1,
              color: isPlayer ? FB.primary : isTop3 ? FB.text : FB.textSec,
            }}>€{entry.commission.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── End Screen ───
function EndScreen({ matches, commission, matchedDeals, onReplay, player1, player2, leaderboardData, gameSessionId }) {
  const [phase, setPhase] = useState("summary");
  const t = useT();
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
    const all = (leaderboardData || []).map(entry => ({
      ...entry,
      isPlayer: gameSessionId ? entry.id === gameSessionId
        : (entry.team === teamName && entry.matches === matches && entry.commission === commission),
    }));
    // If our game wasn't found in DB data (insert not yet committed), add it
    if (!all.find(e => e.isPlayer)) {
      all.push({ team: teamName, matches, commission, isPlayer: true });
    }
    // Stable sort: tie-break by id descending (newer games first)
    all.sort((a, b) => b.commission - a.commission || b.matches - a.matches || (b.id || 0) - (a.id || 0));
    return all.map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [matches, commission, leaderboardData, player1, player2, gameSessionId]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", animation: "fadeIn 0.5s", overflow: "auto",
    }}>
      <div style={{ zIndex: 10, maxWidth: 600, width: "100%", padding: "32px 16px", animation: "scoreIn 0.8s 0.3s ease-out both", boxSizing: "border-box" }}>
        {/* ─── SUMMARY ─── */}
        {phase === "summary" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, letterSpacing: 5, color: FB.textSec, marginBottom: 12, textTransform: "uppercase", fontWeight: 700 }}>
              {t("Time's up!")}
            </div>
            <div style={{
              fontSize: 100, fontWeight: 900, fontFamily: "system-ui",
              background: `linear-gradient(135deg,${FB.primary},${FB.primary400})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1,
            }}>{displayMatches}</div>
            <div style={{ fontSize: 20, color: FB.primary, fontWeight: 800, marginTop: 8, letterSpacing: 4, textTransform: "uppercase" }}>
              {t("Deals Matched")}
            </div>

            <div style={{
              marginTop: 28, padding: "20px 28px", background: "#FFFFFF",
              border: `2px solid ${FB.border}`, borderRadius: 20, display: "inline-block",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize: 13, color: FB.textSec, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>{t("Total Commission Earned")}</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: FB.gold }}>€{displayCommission.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: FB.textTer, marginTop: 4 }}>{t("2.5% per agent per deal")}</div>
            </div>

            {matchedDeals.length > 0 && (
              <div style={{ marginTop: 28, textAlign: "left" }}>
                <div style={{ fontSize: 14, letterSpacing: 2, color: FB.textSec, textTransform: "uppercase", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{t("Closed Deals")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {matchedDeals.map((deal, i) => {
                    const price = PRICE_TO_VALUE[deal.listing.priceRange] || 0;
                    const dealCommission = price * 0.025;
                    return (
                      <div key={deal.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "#FFFFFF", border: `1.5px solid ${FB.border}`,
                        borderRadius: 16, padding: "14px 20px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                        animation: `dealReveal 0.5s ${0.3 + i * 0.15}s ease-out both`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, background: FB.primary,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 15, fontWeight: 800, color: "#FFFFFF",
                          }}>#{i + 1}</div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>{t(deal.listing.propertyType)} · {deal.listing.size} · {t(deal.listing.location)}</div>
                            <div style={{ fontSize: 13, color: FB.textSec, marginTop: 2 }}>{t("Listed")} {deal.listing.priceRange} → {t("Buyer")} {deal.buyer.priceRange}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: FB.gold }}>€{dealCommission.toLocaleString()}</div>
                          <div style={{ fontSize: 11, color: FB.textTer }}>{t("per agent")}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={() => setPhase("leaderboard")} style={{
              marginTop: 32, padding: "16px 48px", fontSize: 16, fontWeight: 800, fontFamily: "system-ui",
              color: "#FFFFFF", background: FB.primary, border: "none",
              borderRadius: 16, cursor: "pointer", textTransform: "uppercase", letterSpacing: 3,
              boxShadow: `0 4px 20px rgba(28,70,245,0.3)`, transition: "transform 0.15s",
            }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
            >{t("View Leaderboard")}</button>
          </div>
        )}

        {/* ─── LEADERBOARD ─── */}
        {phase === "leaderboard" && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", maxHeight: "calc(100vh - 64px)" }}>
            <div style={{ flexShrink: 0, paddingTop: 16 }}>
              <div style={{ fontSize: 18, letterSpacing: 5, color: FB.textSec, marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>{t("Leaderboard")}</div>
              <div style={{ fontSize: 14, color: FB.textTer, marginBottom: 20 }}>{t("Top teams")}</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
              <LeaderboardList leaderboard={leaderboard} />
            </div>
            <div style={{ flexShrink: 0, paddingTop: 20, paddingBottom: 16 }}>
              <button onClick={() => setPhase("fizbot")} style={{
                padding: "16px 56px", fontSize: 16, fontWeight: 800, fontFamily: "system-ui",
                color: "#FFFFFF", background: FB.primary, border: "none",
                borderRadius: 16, cursor: "pointer", textTransform: "uppercase", letterSpacing: 3,
                boxShadow: `0 4px 20px rgba(28,70,245,0.3)`, transition: "transform 0.15s",
              }}
                onMouseOver={e => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
              >{t("Continue")}</button>
            </div>
          </div>
        )}

        {/* ─── FIZBOT PROMO ─── */}
        {phase === "fizbot" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.8s ease-out" }}>
            <img src="/fizbot-icon.png" alt="Fizbot" style={{
              width: 100, height: 100, borderRadius: 24, margin: "0 auto 32px",
              boxShadow: "0 8px 32px rgba(28,70,245,0.2)",
              animation: "pulse4 3s infinite",
            }} />

            <div style={{
              fontSize: 32, fontWeight: 800, color: FB.text, marginBottom: 10,
              animation: "fadeIn 0.5s 0.4s ease-out both",
            }}>
              {t("Stop")} <span style={{ textDecoration: "line-through", color: FB.textTer }}>{t("Search & Scroll")}</span>
            </div>

            <div style={{
              fontSize: 36, fontWeight: 900, color: FB.text, marginBottom: 48,
              animation: "fadeIn 0.5s 0.6s ease-out both",
            }}>
              {t("It's Time to")} <span style={{ color: FB.primary }}>{t("Match")}</span> &{" "}
              <span style={{ color: FB.coral }}>{t("Close")}</span>
            </div>

            <div style={{
              display: "inline-flex", alignItems: "center", gap: 16,
              padding: "18px 48px", borderRadius: 18,
              background: FB.primary,
              boxShadow: `0 6px 24px rgba(28,70,245,0.3)`,
              animation: "fadeIn 0.5s 0.8s ease-out both",
            }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#FFFFFF", letterSpacing: 1 }}>FizbotX</span>
              <span style={{ width: 1.5, height: 20, background: "rgba(255,255,255,0.3)" }} />
              <span style={{
                fontSize: 14, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase",
                background: "linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.6) 100%)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: "shimmer 2.5s ease-in-out infinite",
              }}>{t("Very Soon")}</span>
              <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            </div>

            <div style={{ marginTop: 48, animation: "fadeIn 0.5s 1s ease-out both" }}>
              <button onClick={onReplay} style={{
                padding: "14px 40px", fontSize: 15, fontWeight: 700, fontFamily: "system-ui",
                color: FB.textSec, background: "#FFFFFF", border: `1.5px solid ${FB.border}`,
                borderRadius: 14, cursor: "pointer", letterSpacing: 1,
                transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
                onMouseOver={e => { e.currentTarget.style.borderColor = FB.textSec; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = FB.border; }}
              >{t("Play again")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Game Panel (full screen on each tablet) ───
function OptionCard({ label, selected, onClick, icon, wide, disabled }) {
  return (
    <div onClick={disabled ? undefined : onClick} style={{
      flex: wide ? "1 1 45%" : "1 1 28%", background: "#FFFFFF",
      border: `2.5px solid ${FB.border}`,
      borderRadius: 20, padding: "20px 16px", textAlign: "center",
      cursor: disabled ? "default" : "pointer", transition: "all 0.15s",
      userSelect: "none", WebkitTapHighlightColor: "transparent",
      touchAction: "manipulation",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      minHeight: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      {icon && <div style={{ marginBottom: 14 }}>{icon}</div>}
      <span style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>{label}</span>
    </div>
  );
}

function GamePanel({ role, selections, onSelect, matchCount, timeLeft, disabled, commission, pendingItems, matchedDeals, playerName, partnerName, playerOffice, partnerOffice, onEndGame }) {
  const isListing = role === "listing";
  const t = useT();
  const accent = isListing ? FB.primary : "#54B329";
  const accentBg = isListing ? "#EEF1FE" : "#DCFCE7";
  const accentBorder = isListing ? FB.primary : "#54B329";
  const label = isListing ? t("Listing Agent") : t("Buyer Agent");

  // Wizard step: show current question based on what's not yet selected
  const rawStep = !selections.propertyType ? 1 : !selections.size ? 2 : !selections.priceRange ? 3 : !selections.location ? 4 : 0;
  const [visibleStep, setVisibleStep] = useState(1);
  useEffect(() => { if (rawStep >= 1) setVisibleStep(rawStep); }, [rawStep]);
  const step = rawStep === 0 ? visibleStep : rawStep;

  const timerAnim = timeLeft <= 5 ? "timerShake 0.3s ease-in-out infinite" : timeLeft <= 10 ? "timerPulse 1s ease-in-out infinite" : "none";

  const houseIcon = (sel) => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="11" width="16" height="10" rx="1.5" stroke={sel ? accent : FB.textTer} strokeWidth="1.5" />
      <path d="M4 11L12 5L20 11" stroke={sel ? accent : FB.textTer} strokeWidth="1.5" />
      <rect x="9" y="15" width="6" height="6" rx="0.5" stroke={sel ? accent : FB.textTer} strokeWidth="1.5" />
    </svg>
  );
  const villaIcon = (sel) => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="13" width="8" height="8" rx="1" stroke={sel ? accent : FB.textTer} strokeWidth="1.5" />
      <path d="M2 13L6 8.5L10 13" stroke={sel ? accent : FB.textTer} strokeWidth="1.5" />
      <rect x="12" y="9" width="10" height="12" rx="1" stroke={sel ? accent : FB.textTer} strokeWidth="1.5" />
      <path d="M12 9L17 4L22 9" stroke={sel ? accent : FB.textTer} strokeWidth="1.5" />
    </svg>
  );

  const sectionTitle = isListing ? t("Create Listing") : t("Create Buyer Demand");

  const stepLabel = step === 1 ? t("Category")
    : step === 2 ? t("Room") : step === 3 ? (isListing ? t("Price") : t("Budget"))
    : t("City");

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: FB.bg, overflow: "auto", minHeight: "100vh", padding: "24px 28px",
      width: "100%",
    }}>
    <div style={{ maxWidth: 680, width: "100%" }}>

      {/* Players bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 20,
        marginBottom: 20,
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          padding: "12px 20px", borderRadius: 16,
          background: isListing ? "#EEF1FE" : "#FFFFFF",
          border: `2px solid ${isListing ? FB.primary + "44" : FB.border}`,
          minWidth: 100,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={FB.primary} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span style={{ fontSize: 18, fontWeight: 800, color: isListing ? FB.primary : FB.text }}>{isListing ? playerName : partnerName}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: FB.textTer }}>{isListing ? playerOffice : partnerOffice}</span>
        </div>
        <span style={{ fontSize: 18, fontWeight: 900, color: FB.textTer }}>vs</span>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          padding: "12px 20px", borderRadius: 16,
          background: !isListing ? "#DCFCE7" : "#FFFFFF",
          border: `2px solid ${!isListing ? "#54B32944" : FB.border}`,
          minWidth: 100,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#54B329" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span style={{ fontSize: 18, fontWeight: 800, color: !isListing ? "#54B329" : FB.text }}>{!isListing ? playerName : partnerName}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: FB.textTer }}>{!isListing ? playerOffice : partnerOffice}</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 0,
        width: "100%", background: "#FFFFFF",
        borderRadius: 20, border: `1.5px solid ${FB.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: 24, overflow: "hidden",
      }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 0" }}>
          <div style={{
            width: 12, height: 12, borderRadius: "50%", background: "#EF4444",
            boxShadow: "0 0 8px rgba(239,68,68,0.5)",
            animation: timeLeft <= 5 ? "blink 0.5s infinite" : "none",
          }} />
          <span style={{
            fontSize: 34, fontWeight: 900, fontFamily: "monospace",
            color: timeLeft <= 5 ? "#EF4444" : timeLeft <= 10 ? FB.gold : FB.text,
            animation: timerAnim,
          }}>
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
        </div>
        <div style={{ width: 1, height: 40, background: FB.border }} />
        <div style={{ flex: 1, textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: accent }}>{matchCount}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: FB.textTer, letterSpacing: 1 }}>{t("MATCHES")}</div>
        </div>
        <div style={{ width: 1, height: 40, background: FB.border }} />
        <div style={{ flex: 1, textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: FB.gold }}>€{commission > 0 ? (commission >= 1000 ? (commission / 1000).toFixed(1) + "k" : commission) : "0"}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: FB.textTer, letterSpacing: 1 }}>{t("COMMISSION")}</div>
        </div>
        {!disabled && (
          <>
            <div style={{ width: 1, height: 40, background: FB.border }} />
            <div onClick={onEndGame} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "12px 0", cursor: "pointer", transition: "background 0.15s",
            }}
              onMouseOver={e => e.currentTarget.style.background = "#FEF2F2"}
              onMouseOut={e => e.currentTarget.style.background = "transparent"}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", letterSpacing: 1, marginTop: 2 }}>{t("EXIT")}</div>
            </div>
          </>
        )}
      </div>

      {/* Mini cards */}
      {(matchedDeals.length > 0 || pendingItems.length > 0) && (
        <div style={{ display: "flex", gap: 12, width: "100%", marginBottom: 24, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
          {matchedDeals.filter(d => d.visible !== false).slice().reverse().map(deal => (
            <MiniCard key={`m${deal.id}`} item={isListing ? deal.listing : deal.buyer} isMatched={true} isNew={deal.isNew} side={role} />
          ))}
          {pendingItems.map(item => (
            <MiniCard key={`p${item.id}`} item={item} isMatched={false} isNew={false} side={role} />
          ))}
        </div>
      )}

      {/* Wizard content */}
      <div style={{ width: "100%" }}>

        {(step >= 0 && step <= 4) && (
          <div key={step} style={{ animation: "fadeIn 0.3s ease-out" }}>
            <div style={{
              background: "#FFFFFF", borderRadius: 24, padding: "32px 28px",
              border: `1.5px solid ${FB.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: FB.text }}>{stepLabel}</span>
              </div>
              {step === 1 && (
                <div style={{ display: "flex", gap: 16 }}>
                  <OptionCard label={t("Apartment")} icon={houseIcon(false)} selected={false} onClick={() => onSelect("propertyType", "Apartment")} wide disabled={disabled} />
                  <OptionCard label={t("Villa")} icon={villaIcon(false)} selected={false} onClick={() => onSelect("propertyType", "Villa")} wide disabled={disabled} />
                </div>
              )}
              {step === 2 && (
                <div style={{ display: "flex", gap: 14 }}>
                  {SIZES.map(s => <OptionCard key={s} label={s} selected={false} onClick={() => onSelect("size", s)} disabled={disabled} />)}
                </div>
              )}
              {step === 3 && (
                <div style={{ display: "flex", gap: 14 }}>
                  {(isListing ? LISTING_PRICES : BUYER_PRICES).map(p => <OptionCard key={p} label={p} selected={false} onClick={() => onSelect("priceRange", p)} disabled={disabled} />)}
                </div>
              )}
              {step === 4 && (
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {LOCATIONS.map(l => (
                    <div key={l.name} onClick={disabled ? undefined : () => onSelect("location", l.name)} style={{
                      flex: "1 1 120px", minWidth: 120, background: "#FFFFFF",
                      border: `2.5px solid ${FB.border}`,
                      borderRadius: 18, overflow: "hidden",
                      cursor: disabled ? "default" : "pointer", transition: "all 0.2s",
                      userSelect: "none", WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    }}>
                      <img src={l.img} alt={l.name} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                      <div style={{ padding: "14px 4px", textAlign: "center" }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: FB.text }}>{t(l.name)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
    </div>
  );
}

// ─── Lobby Screen ───
function LobbyScreen({ onJoin, onSettings, onLeaderboard, takenRole, takenByName }) {
  const t = useT();
  const { lang, setLang } = React.useContext(LangContext);
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
    ? offices.filter(o => {
        const hay = o.name.toLowerCase().replace(/[\/\-\s\.]/g, "");
        const needle = officeSearch.toLowerCase().replace(/[\/\-\s\.]/g, "");
        return hay.includes(needle);
      })
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
        <div style={{
          display: "flex", alignItems: "center", height: 40, borderRadius: 10,
          background: FB.card, border: `1px solid ${FB.border}`, overflow: "hidden",
          cursor: "pointer", fontSize: 13, fontWeight: 700,
        }}>
          <div onClick={() => setLang("en")} style={{
            padding: "0 10px", height: "100%", display: "flex", alignItems: "center", gap: 4,
            background: lang === "en" ? FB.primary : "transparent",
            color: lang === "en" ? "#FFFFFF" : FB.textTer, transition: "all 0.2s",
          }}><span style={{ fontSize: 16 }}>🇬🇧</span> EN</div>
          <div onClick={() => setLang("pt")} style={{
            padding: "0 10px", height: "100%", display: "flex", alignItems: "center", gap: 4,
            background: lang === "pt" ? FB.primary : "transparent",
            color: lang === "pt" ? "#FFFFFF" : FB.textTer, transition: "all 0.2s",
          }}><span style={{ fontSize: 16 }}>🇵🇹</span> PT</div>
        </div>
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
        <input style={inputStyle} placeholder={t("Your name")} value={name} onChange={e => setName(e.target.value)}
          onFocus={e => e.target.style.borderColor = FB.primary400} onBlur={e => e.target.style.borderColor = FB.border} />
        <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
          <input style={inputStyle} placeholder={t("Search office...")}
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
        <span style={{ fontSize: 15, letterSpacing: 4, color: FB.textSec, textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap" }}>{t("Choose your side")}</span>
        <div style={{ flex: 1, height: 1, background: FB.border }} />
      </div>

      <div style={{ display: "flex", gap: 16, width: "100%", maxWidth: 440 }}>
        {[
          { role: "listing", label: t("Listing Agent"), color: FB.primary, lightBg: "#EEF1FE", borderLight: "#D4DBFD",
            icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { role: "buyer", label: t("Buyer Agent"), color: "#54B329", lightBg: "#DCFCE7", borderLight: "#DCFCE7",
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
                  {takenByName} {t("joined")}
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
  const t = useT();
  const accent = isListing ? FB.primary : "#54B329";
  const accentBg = isListing ? "#EEF1FE" : "#DCFCE7";
  const roleName = isListing ? t("Listing Agent") : t("Buyer Agent");
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
        {t("Waiting for partner...")}
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
      >{t("Exit")}</button>
    </div>
  );
}

// ─── Settings Page ───
function SettingsPage({ onBack, gameDuration, onDurationChange }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [durationInput, setDurationInput] = useState(String(gameDuration));
  useEffect(() => { setDurationInput(String(gameDuration)); }, [gameDuration]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [defaultLang, setDefaultLang] = useState("en");
  const [langSaved, setLangSaved] = useState(false);
  const t = useT();

  // Subscribe to presence for active sessions
  useEffect(() => {
    const ch = supabase.channel("game-presence");
    function syncPresence() {
      const state = ch.presenceState();
      const users = [];
      Object.values(state).forEach(presences => {
        presences.forEach(p => users.push(p));
      });
      setActiveSessions(users);
    }
    ch.on("presence", { event: "sync" }, syncPresence)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => { fetchGames(); }, []);
  useEffect(() => {
    supabase.from("settings").select("value").eq("key", "default_language").single().then(({ data }) => {
      if (data && (data.value === "en" || data.value === "pt")) setDefaultLang(data.value);
    });
  }, []);

  async function fetchGames() {
    setLoading(true);
    const { data } = await supabase.from("games").select("*").order("played_at", { ascending: false });
    setGames(data || []);
    setLoading(false);
  }

  async function handleDefaultLangSave(code) {
    setDefaultLang(code);
    setLangSaved(false);
    await supabase.from("settings").upsert({ key: "default_language", value: code });
    setLangSaved(true);
    setTimeout(() => setLangSaved(false), 2000);
  }

  async function deleteGame(id) {
    const backup = games;
    setGames(prev => prev.filter(g => g.id !== id));
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) { console.error("Delete failed:", error); setGames(backup); }
  }

  async function handleDurationSave() {
    const val = parseInt(durationInput);
    if (val < 10 || val > 600 || isNaN(val)) return;
    setSaving(true);
    setSaved(false);
    await onDurationChange(val);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          {t("Back")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={FB.textSec} strokeWidth="2" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={FB.textSec} strokeWidth="2" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{t("Settings")}</span>
        </div>
        <div style={{ width: 70 }} />
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 28px" }}>
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div style={{ width: "200px", height: 6, background: FB.bgTer, borderRadius: 3, margin: "0 auto 16px", overflow: "hidden" }}>
              <div style={{ width: "40%", height: "100%", background: FB.primary, borderRadius: 3, animation: "loadingBar 1.2s ease-in-out infinite" }} />
            </div>
            <span style={{ fontSize: 15, color: FB.textTer, fontWeight: 600 }}>{t("Loading settings...")}</span>
            <style>{`@keyframes loadingBar { 0% { width: 0%; margin-left: 0; } 50% { width: 60%; margin-left: 20%; } 100% { width: 0%; margin-left: 100%; } }`}</style>
          </div>
        ) : (<>
        {/* Stats */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {[{ label: t("Total Games"), value: games.length, color: FB.primary }, { label: t("Total Matches"), value: totalMatches, color: "#54B329" }, { label: t("Total Commission"), value: `€${totalComm.toLocaleString()}`, color: FB.gold }].map(s => (
            <div key={s.label} style={{ flex: 1, background: "#FFFFFF", border: `2px solid ${FB.border}`, borderRadius: 16, padding: "18px 14px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: FB.textTer, marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Active Sessions */}
        <div style={{ background: "#FFFFFF", border: `2px solid ${FB.border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: FB.textSec, textTransform: "uppercase", letterSpacing: 1 }}>{t("Active Sessions")}</div>
            <div style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700,
              background: activeSessions.length > 0 ? "#DCFCE7" : FB.bgSec,
              color: activeSessions.length > 0 ? "#16A34A" : FB.textTer,
            }}>{activeSessions.length} {t("online")}</div>
          </div>
          {activeSessions.length === 0 ? (
            <div style={{ textAlign: "center", color: FB.textTer, padding: "20px 0", fontSize: 14 }}>{t("No active sessions")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeSessions.map((s, i) => {
                const stateColor = s.state === "playing" ? "#16A34A" : s.state === "waiting" ? FB.gold : FB.primary;
                const stateLabel = s.state === "playing" ? t("Playing") : s.state === "waiting" ? t("Waiting") : s.state === "countdown" ? t("Starting") : s.state;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderRadius: 12, background: FB.bgSec,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: stateColor, flexShrink: 0, animation: s.state === "playing" ? "pulse4 2s infinite" : "none" }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: FB.text }}>
                          {s.name}{s.partnerName ? ` & ${s.partnerName}` : ""}
                        </div>
                        <div style={{ fontSize: 12, color: FB.textTer, marginTop: 2 }}>
                          {s.office} · {s.role === "listing" ? "Listing" : "Buyer"}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      color: stateColor, background: `${stateColor}15`,
                    }}>{stateLabel}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Game Duration */}
        <div style={{ background: "#FFFFFF", border: `2px solid ${FB.border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: FB.textSec, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>{t("Game Duration")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input value={durationInput} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); setDurationInput(v); }}
              style={{
                flex: 1, padding: "12px 16px", fontSize: 18, fontWeight: 700, background: FB.bgSec,
                border: `1.5px solid ${FB.border}`, borderRadius: 12, color: FB.text, outline: "none",
                fontFamily: "system-ui", textAlign: "center",
              }}
              onFocus={e => e.target.style.borderColor = FB.primary}
              onBlur={e => e.target.style.borderColor = FB.border}
            />
            <span style={{ fontSize: 16, color: FB.textSec, fontWeight: 600 }}>{t("seconds")}</span>
            <button onClick={handleDurationSave} disabled={saving} style={{
              padding: "12px 24px", fontSize: 14, fontWeight: 700,
              color: saved ? "#FFFFFF" : "#FFFFFF",
              background: saved ? "#54B329" : FB.primary,
              border: "none", borderRadius: 12, cursor: saving ? "default" : "pointer",
              fontFamily: "system-ui", transition: "background 0.2s", minWidth: 80,
              opacity: saving ? 0.7 : 1,
            }}>{saving ? "..." : saved ? t("✓ Saved") : t("Save")}</button>
          </div>
          {saved && (
            <div style={{ fontSize: 13, color: "#54B329", fontWeight: 600, marginTop: 8, animation: "fadeIn 0.3s ease-out" }}>
              {t("Game duration updated to")} {gameDuration}s ({Math.floor(gameDuration/60)}m {gameDuration%60}s)
            </div>
          )}
        </div>

        {/* Default Language */}
        <div style={{ background: "#FFFFFF", border: `2px solid ${FB.border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: FB.textSec, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>{t("Default Language")}</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { code: "en", label: "English", flag: "🇬🇧" },
              { code: "pt", label: "Português", flag: "🇵🇹" },
            ].map(opt => (
              <div key={opt.code} onClick={() => handleDefaultLangSave(opt.code)} style={{
                flex: 1, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                background: defaultLang === opt.code ? FB.primary : FB.bgSec,
                color: defaultLang === opt.code ? "#FFFFFF" : FB.text,
                border: `2px solid ${defaultLang === opt.code ? FB.primary : FB.border}`,
                fontWeight: 700, fontSize: 15, transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 22 }}>{opt.flag}</span>
                {opt.label}
              </div>
            ))}
          </div>
          {langSaved && (
            <div style={{ fontSize: 13, color: "#54B329", fontWeight: 600, marginTop: 8, animation: "fadeIn 0.3s ease-out" }}>
              {t("✓ Saved")}
            </div>
          )}
        </div>

        {/* Game history */}
        <div style={{ fontSize: 14, color: FB.textSec, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>{t("Game history")} ({games.length})</div>
        {games.length === 0 ? <div style={{ textAlign: "center", color: FB.textTer, padding: 60, fontSize: 16 }}>{t("No games yet")}</div> : (
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
                  <div><span style={{ color: FB.textTer }}>{t("Office")}: </span><span style={{ color: FB.textSec, fontWeight: 600 }}>{g.player1_office}</span></div>
                  <div><span style={{ color: FB.textTer }}>{t("Matches")}: </span><span style={{ color: FB.primary, fontWeight: 700 }}>{g.matches}</span></div>
                  <div><span style={{ color: FB.textTer }}>{t("Commission")}: </span><span style={{ color: FB.gold, fontWeight: 700 }}>€{Number(g.total_commission).toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}

// ─── Leaderboard Full Page ───
function LeaderboardPage({ onBack }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const t = useT();

  async function fetchLeaderboard() {
    const { data } = await supabase.from("games").select("*").order("total_commission", { ascending: false });
    if (data) {
      setGames(data.map(g => ({
        id: g.id,
        team: `${g.player1_name} & ${g.player2_name}`,
        p1: g.player1_name,
        p2: g.player2_name,
        office1: g.player1_office,
        office2: g.player2_office || g.player1_office,
        matches: g.matches,
        commission: Number(g.total_commission),
      })));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLeaderboard();
    const channel = supabase.channel("leaderboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => fetchLeaderboard())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalComm = games.reduce((s, g) => s + g.commission, 0);
  const totalMatches = games.reduce((s, g) => s + g.matches, 0);
  const totalGames = games.length;
  const medalColors = { 1: FB.gold, 2: "#94A3B8", 3: "#CD7F32" };
  const col1 = games.slice(0, 12);
  const col2 = games.slice(12, 24);

  const medalEmojis = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const RankRow = ({ g, rank }) => {
    const medal = medalEmojis[rank];
    return (
      <div style={{
        background: "#FFFFFF", border: `1.5px solid ${FB.border}`, borderRadius: 16, padding: "16px",
        animation: `lbRowFade 0.4s ${0.05 + rank * 0.03}s ease-out both`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        display: "flex", gap: 14, alignItems: "center",
      }}>
        {/* Rank */}
        {medal ? (
          <div style={{ fontSize: 36, lineHeight: 1, width: 44, textAlign: "center", flexShrink: 0 }}>{medal}</div>
        ) : (
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: FB.bgSec, border: `2px solid ${FB.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900, color: FB.textSec,
          }}>{rank}</div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Names */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: FB.text }}>{g.p1}</span>
            <span style={{ fontSize: 13, color: FB.textTer, fontWeight: 600 }}>&</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: FB.text }}>{g.p2}</span>
          </div>
          {/* Offices stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: FB.textSec }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={FB.primary} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.office1}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: FB.textSec }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#54B329" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.office2}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: FB.gold }}>€{g.commission.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: FB.textTer, marginTop: 2 }}>{g.matches} {t("matches")}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, #EEF1FE 0%, ${FB.bg} 30%)`, color: FB.text, fontFamily: "system-ui,-apple-system,sans-serif", padding: "32px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32, maxWidth: 1200, margin: "0 auto 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
          <img src="/fizbot-icon.png" alt="Fizbot" style={{ width: 40, height: 40, borderRadius: 10 }} />
          <span style={{ fontSize: 28, fontWeight: 900, background: `linear-gradient(135deg,${FB.primary400},${FB.coral})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Match It!</span>
        </div>
        <span style={{ fontSize: 36, fontWeight: 900, color: FB.text }}>🏆 {t("Leaderboard")}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: FB.textTer, padding: 80 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${FB.border}`, borderTopColor: FB.primary, animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <span style={{ fontSize: 18 }}>{t("Loading...")}</span>
        </div>
      ) : games.length === 0 ? (
        <div style={{ textAlign: "center", color: FB.textTer, padding: 80, fontSize: 22 }}>{t("No games played yet. Be the first!")}</div>
      ) : (
        <div style={{ display: "flex", gap: 32, maxWidth: 1200, margin: "0 auto" }}>
          {/* Left: Stats */}
          <div style={{ width: 320, flexShrink: 0 }}>
            <div style={{ position: "sticky", top: 32 }}>
              {/* Total Commission - big hero */}
              <div style={{
                background: `linear-gradient(135deg, ${FB.primary}, ${FB.primary400})`,
                borderRadius: 24, padding: "36px 28px", textAlign: "center", marginBottom: 16,
                boxShadow: "0 8px 32px rgba(28,70,245,0.25)", animation: "pulse4 4s infinite",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{t("Total Commission")}</div>
                <div style={{ fontSize: 48, fontWeight: 900, color: "#FFFFFF" }}>€{totalComm.toLocaleString()}</div>
              </div>

              {/* Games & Matches */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{
                  flex: 1, background: "#FFFFFF", borderRadius: 20, padding: "24px 16px", textAlign: "center",
                  border: `1.5px solid ${FB.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ fontSize: 40, fontWeight: 900, color: FB.primary }}>{totalGames}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: FB.textTer, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 }}>{t("Games")}</div>
                </div>
                <div style={{
                  flex: 1, background: "#FFFFFF", borderRadius: 20, padding: "24px 16px", textAlign: "center",
                  border: `1.5px solid ${FB.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ fontSize: 40, fontWeight: 900, color: "#54B329" }}>{totalMatches}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: FB.textTer, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 }}>{t("Matches")}</div>
                </div>
              </div>

              {/* Top player highlight */}
              {games[0] && (
                <div style={{
                  background: `${FB.gold}10`, border: `2px solid ${FB.gold}44`, borderRadius: 20, padding: "20px 24px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 32, marginBottom: 4 }}>👑</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: FB.text }}>{games[0].team}</div>
                  <div style={{ fontSize: 14, color: FB.textSec, marginTop: 4 }}>{games[0].office1} · {games[0].office2}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: FB.gold, marginTop: 8 }}>€{games[0].commission.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Two columns of rankings */}
          <div style={{ flex: 1, display: "flex", gap: 16 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {col1.map((g, i) => <RankRow key={g.id || i} g={g} rank={i + 1} />)}
            </div>
            {col2.length > 0 && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {col2.map((g, i) => <RankRow key={g.id || i + 12} g={g} rank={i + 13} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ───
export default function DealRushForm() {
  const [lang, setLang] = useState(() => localStorage.getItem("matchit-lang") || "en");
  useEffect(() => { localStorage.setItem("matchit-lang", lang); }, [lang]);
  useEffect(() => {
    if (!localStorage.getItem("matchit-lang")) {
      supabase.from("settings").select("value").eq("key", "default_language").single().then(({ data }) => {
        if (data && (data.value === "en" || data.value === "pt")) setLang(data.value);
      });
    }
  }, []);
  const t = useT();
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
  const [gameSessionId, setGameSessionId] = useState(null);

  const channelRef = useRef(null);
  const idRef = useRef(0);
  const timerRef = useRef(null);
  const emptySelection = { propertyType: null, size: null, priceRange: null, location: null };
  const listingsRef = useRef([]);
  const buyersRef = useRef([]);
  const updateListings = (fn) => { const next = typeof fn === 'function' ? fn(listingsRef.current) : fn; listingsRef.current = next; setListings(next); };
  const updateBuyers = (fn) => { const next = typeof fn === 'function' ? fn(buyersRef.current) : fn; buyersRef.current = next; setBuyers(next); };

  // Presence tracking for admin
  const presenceChannelRef = useRef(null);
  useEffect(() => {
    const activeStates = ["waiting", "countdown", "playing"];
    if (activeStates.includes(gameState) && player) {
      if (!presenceChannelRef.current) {
        const ch = supabase.channel("game-presence", { config: { presence: { key: player.name + "-" + Date.now() } } });
        ch.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await ch.track({ name: player.name, office: player.office, role, state: gameState, partnerName: partner?.name, joinedAt: new Date().toISOString() });
          }
        });
        presenceChannelRef.current = ch;
      } else {
        presenceChannelRef.current.track({ name: player.name, office: player.office, role, state: gameState, partnerName: partner?.name, joinedAt: new Date().toISOString() });
      }
    } else {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack();
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    }
  }, [gameState, player, partner, role]);

  // Load game duration from DB whenever returning to lobby (covers mount + replay)
  useEffect(() => {
    if (gameState !== "lobby" && gameState !== "countdown" && gameState !== "settings") return;
    supabase.from("settings").select("value").eq("key", "game_duration").single().then(({ data }) => {
      if (data) { const v = parseInt(data.value); if (!isNaN(v) && v >= 10 && v <= 600) { setGameDuration(v); if (gameState !== "settings") setTimeLeft(v); } }
    });
  }, [gameState]);

  // Listen for taken roles while on lobby, respond to who_is_here while waiting
  const lobbyChannelRef = useRef(null);
  const roleRef = useRef(null);
  const playerRef = useRef(null);
  const gameStateRef = useRef(gameState);
  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Lobby channel — lives for the entire component lifetime, never destroyed/recreated
  useEffect(() => {
    const ch = supabase.channel(CHANNEL_NAME + "-lobby", { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "role_taken" }, ({ payload }) => {
      setTakenRole(payload.role);
      setTakenByName(payload.name);
    })
    .on("broadcast", { event: "role_released" }, () => {
      setTakenRole(null);
      setTakenByName("");
    })
    .on("broadcast", { event: "who_is_here" }, () => {
      if (gameStateRef.current === "waiting" && roleRef.current && playerRef.current) {
        ch.send({ type: "broadcast", event: "role_taken", payload: { role: roleRef.current, name: playerRef.current.name } });
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Poll once on connect
        ch.send({ type: "broadcast", event: "who_is_here", payload: {} });
      }
    });
    lobbyChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); lobbyChannelRef.current = null; };
  }, []);
  // Reset lobby state on re-entering lobby, broadcast role on entering waiting
  useEffect(() => {
    if (gameState === "lobby") {
      setTakenRole(null);
      setTakenByName("");
      // Ask who's waiting (small delay to ensure channel is ready)
      setTimeout(() => {
        lobbyChannelRef.current?.send({ type: "broadcast", event: "who_is_here", payload: {} });
      }, 300);
    }
    if (gameState === "waiting" && role && player) {
      lobbyChannelRef.current?.send({ type: "broadcast", event: "role_taken", payload: { role, name: player.name } });
    }
  }, [gameState, role, player]);

  // Release role on page close/refresh
  useEffect(() => {
    const onBeforeUnload = () => {
      lobbyChannelRef.current?.send({ type: "broadcast", event: "role_released", payload: {} });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

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

  const submitTimer = useRef(null);
  useEffect(() => {
    if (allSelected && gameState === "playing") {
      submitTimer.current = setTimeout(() => {
      if (gameStateRef.current !== "playing") return;
      const item = { ...selections, id: ++idRef.current, img: randomListingImg() };
      channelRef.current?.send({ type: "broadcast", event: role === "listing" ? "listing_submitted" : "buyer_submitted", payload: item });
      if (role === "listing") {
        const matchIdx = buyersRef.current.findIndex(b => item.propertyType === b.propertyType && item.size === b.size && PRICE_MATCH_MAP[item.priceRange] === b.priceRange && item.location === b.location);
        if (matchIdx !== -1) { handleMatch(item, buyersRef.current[matchIdx]); updateBuyers(prev => prev.filter((_, i) => i !== matchIdx)); }
        else updateListings(prev => [...prev, item]);
      } else {
        const matchIdx = listingsRef.current.findIndex(l => l.propertyType === item.propertyType && l.size === item.size && PRICE_MATCH_MAP[l.priceRange] === item.priceRange && l.location === item.location);
        if (matchIdx !== -1) { handleMatch(listingsRef.current[matchIdx], item); updateListings(prev => prev.filter((_, i) => i !== matchIdx)); }
        else updateBuyers(prev => [...prev, item]);
      }
      setSelections({ ...emptySelection });
      }, 600);
    }
    return () => { if (submitTimer.current) clearTimeout(submitTimer.current); };
  }, [allSelected, gameState, role, selections]);

  function handleMatch(listing, buyer) {
    const commission = PRICE_TO_VALUE[listing.priceRange] * 0.025;
    setMatchCount(m => m + 1);
    setTotalCommission(c => c + commission);
    setShowMatch(true);
    setScreenShake(true);
    playSound("match", 0.6);
    setTimeout(() => playSound("commission", 0.5), 300);
    const dealId = ++idRef.current;
    // Add deal immediately so EndScreen always has complete data; visible:false delays GamePanel card
    setMatchedDeals(prev => [...prev, { listing, buyer, id: dealId, isNew: true, visible: false }]);
    setTimeout(() => {
      setMatchedDeals(prev => prev.map(d => d.id === dealId ? { ...d, visible: true } : d));
      setTimeout(() => setMatchedDeals(prev => prev.map(d => d.id === dealId ? { ...d, isNew: false } : d)), 1500);
    }, 1200);
    setTimeout(() => { setShowMatch(false); setScreenShake(false); }, 1600);
    channelRef.current?.send({ type: "broadcast", event: "match_found", payload: { listing, buyer, commission } });
  }

  function handlePartnerListing(item) {
    if (!item.img) item.img = randomListingImg();
    const matchIdx = buyersRef.current.findIndex(b => item.propertyType === b.propertyType && item.size === b.size && PRICE_MATCH_MAP[item.priceRange] === b.priceRange && item.location === b.location);
    if (matchIdx !== -1) { handleMatch(item, buyersRef.current[matchIdx]); updateBuyers(prev => prev.filter((_, i) => i !== matchIdx)); }
    else updateListings(prev => [...prev, item]);
  }

  function handlePartnerBuyer(item) {
    if (!item.img) item.img = randomListingImg();
    const matchIdx = listingsRef.current.findIndex(l => l.propertyType === item.propertyType && l.size === item.size && PRICE_MATCH_MAP[l.priceRange] === item.priceRange && l.location === item.location);
    if (matchIdx !== -1) { handleMatch(listingsRef.current[matchIdx], item); updateListings(prev => prev.filter((_, i) => i !== matchIdx)); }
    else updateBuyers(prev => [...prev, item]);
  }

  const handleJoin = useCallback((name, office, selectedRole) => {
    const playerInfo = { name, office };
    setPlayer(playerInfo);
    setRole(selectedRole);
    setGameState("waiting");
    const channel = supabase.channel(CHANNEL_NAME, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "player_joined" }, ({ payload }) => { if (gameStateRef.current !== "waiting") return; setPartner(payload.player); setGameState("countdown"); channel.send({ type: "broadcast", event: "player_ready", payload: { player: playerInfo, role: selectedRole } }); })
      .on("broadcast", { event: "player_ready" }, ({ payload }) => { if (gameStateRef.current !== "waiting") return; setPartner(payload.player); setGameState("countdown"); })
      .on("broadcast", { event: "listing_submitted" }, ({ payload }) => { if (gameStateRef.current !== "playing") return; handlePartnerListing(payload); })
      .on("broadcast", { event: "buyer_submitted" }, ({ payload }) => { if (gameStateRef.current !== "playing") return; handlePartnerBuyer(payload); })
      .on("broadcast", { event: "match_found" }, () => { /* Match handled locally by each client */ })
      .on("broadcast", { event: "timer_sync" }, ({ payload }) => { if (gameStateRef.current !== "playing") return; setTimeLeft(Math.max(payload.timeLeft, 0)); if (payload.timeLeft <= 0) { if (timerRef.current) clearInterval(timerRef.current); setGameState("finished"); } })
      .on("broadcast", { event: "game_end" }, () => { if (gameStateRef.current !== "playing") return; if (timerRef.current) clearInterval(timerRef.current); setTimeLeft(0); setGameState("finished"); })
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
        if (prev <= 0) return 0;
        const next = Math.max(prev - 1, 0);
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
    const fetchLeaderboard = () => {
      supabase.from("games").select("*").order("total_commission", { ascending: false }).then(({ data }) => {
        if (data) {
          setLeaderboardData(data.map(g => ({
            id: g.id,
            team: `${g.player1_name} & ${g.player2_name}`,
            matches: g.matches,
            commission: Number(g.total_commission),
          })));
        }
      });
    };
    if (role === "listing" && player && partner) {
      const p1 = player, p2 = partner;
      supabase.from("games").insert({ player1_name: p1.name, player1_office: p1.office, player2_name: p2.name, player2_office: p2.office, matches: matchCount, total_commission: totalCommission }).select().then(({ data, error }) => {
        if (error) console.error("Game insert failed:", error);
        if (data?.[0]) setGameSessionId(data[0].id);
        fetchLeaderboard();
      });
    } else if (role === "buyer" && player && partner) {
      // Buyer waits briefly for listing agent's insert, then fetches
      setTimeout(fetchLeaderboard, 1500);
    } else {
      fetchLeaderboard();
    }
  }, [gameState]);

  // Clean up game channel when game finishes to prevent ghost connections on next game
  useEffect(() => {
    if (gameState === "finished" && channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [gameState]);

  const handleEndGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    setGameState("finished");
    channelRef.current?.send({ type: "broadcast", event: "game_end", payload: {} });
  }, []);

  const handleReplay = useCallback(() => {
    // Broadcast role released via responder channel (already subscribed to lobby)
    if (lobbyChannelRef.current) {
      lobbyChannelRef.current.send({ type: "broadcast", event: "role_released", payload: {} });
    }
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (presenceChannelRef.current) { presenceChannelRef.current.untrack(); supabase.removeChannel(presenceChannelRef.current); presenceChannelRef.current = null; }
    setGameState("lobby"); setRole(null); setPlayer(null); setPartner(null);
    setTimeLeft(gameDuration); setMatchCount(0); setTotalCommission(0);
    setSelections({ ...emptySelection }); updateListings([]); updateBuyers([]); setMatchedDeals([]); setGameSessionId(null); idRef.current = 0;
  }, [gameDuration]);

  const handleSelect = useCallback((field, value) => {
    if (gameState !== "playing") return;
    playSound("click", 0.3);
    setSelections(p => ({ ...p, [field]: value }));
  }, [gameState]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
    <div style={{
      minHeight: "100vh", background: FB.bg, color: FB.text,
      fontFamily: "system-ui,-apple-system,sans-serif",
      display: "flex", flexDirection: "column", position: "relative",
      animation: screenShake ? "screenShake 0.5s ease-out" : "none",
    }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes stepIn{0%{opacity:0;transform:translateX(40px) scale(0.97)}100%{opacity:1;transform:translateX(0) scale(1)}}
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
        @keyframes stampSlam{0%{transform:rotate(-12deg) scale(3);opacity:0}40%{transform:rotate(-12deg) scale(0.85);opacity:1}60%{transform:rotate(-12deg) scale(1.1)}100%{transform:rotate(-12deg) scale(1);opacity:1}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:${FB.border};border-radius:2px}
        input::placeholder{color:${FB.textDim}}
      `}</style>

      {gameState === "lobby" && <LobbyScreen onJoin={handleJoin} onSettings={() => setGameState("settings")} onLeaderboard={() => setGameState("leaderboard")} takenRole={takenRole} takenByName={takenByName} />}
      {gameState === "settings" && <SettingsPage onBack={() => setGameState("lobby")} gameDuration={gameDuration} onDurationChange={async (v) => {
        setGameDuration(v); setTimeLeft(v);
        await supabase.from("settings").upsert({ key: "game_duration", value: String(v) });
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
              <div style={{ fontSize: 12, fontWeight: 700, color: FB.primary, letterSpacing: 1, textTransform: "uppercase" }}>{t("Listing")}</div>
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
              <div style={{ fontSize: 12, fontWeight: 700, color: "#54B329", letterSpacing: 1, textTransform: "uppercase" }}>{t("Buyer")}</div>
            </div>
          </div>

          <div style={{ fontSize: 18, color: FB.textTer, letterSpacing: 5, marginBottom: 20, textTransform: "uppercase", fontWeight: 700 }}>{t("Game starts in")}</div>
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
          playerOffice={player?.office} partnerOffice={partner?.office}
          onEndGame={handleEndGame} />
      )}
      <MatchOverlay show={showMatch} />

      {gameState === "finished" && (
        <EndScreen matches={matchCount} commission={totalCommission} matchedDeals={matchedDeals}
          onReplay={handleReplay} player1={role === "listing" ? player : partner} player2={role === "listing" ? partner : player} leaderboardData={leaderboardData} gameSessionId={gameSessionId} />
      )}
    </div>
    </LangContext.Provider>
  );
}

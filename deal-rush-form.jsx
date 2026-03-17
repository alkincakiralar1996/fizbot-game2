import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const PROPERTY_TYPES = ["Apartment", "Villa"];
const SIZES = ["T1", "T2", "T3", "T4+"];
const PRICES = ["€350k", "€550k", "€850k"];
const LOCATIONS = [
  { name: "Lisbon", img: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=200&h=120&fit=crop" },
  { name: "Porto", img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=200&h=120&fit=crop" },
  { name: "Algarve", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=120&fit=crop" },
];


function MatchOverlay({ show }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      animation: "matchFade 1.6s ease-out forwards", pointerEvents: "none",
    }}>
      <div style={{
        animation: "matchPop 1.6s ease-out forwards",
      }}>
        <div style={{
          fontSize: 48, fontWeight: 800, color: "#10B981",
          textShadow: "0 0 40px rgba(16,185,129,0.5), 0 0 80px rgba(16,185,129,0.3)",
          letterSpacing: 8, fontFamily: "system-ui",
          textAlign: "center",
        }}>
          MATCH!
        </div>
        <div style={{
          fontSize: 18, color: "#6EE7B7", textAlign: "center", marginTop: 8,
          fontFamily: "system-ui", letterSpacing: 2,
        }}>
          +1 Deal Closed
        </div>
      </div>
    </div>
  );
}

function NoMatchOverlay({ show }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)",
      animation: "matchFade 1.2s ease-out forwards", pointerEvents: "none",
    }}>
      <div style={{ animation: "matchPop 1.2s ease-out forwards" }}>
        <div style={{
          fontSize: 36, fontWeight: 800, color: "#EF4444",
          textShadow: "0 0 30px rgba(239,68,68,0.4)",
          letterSpacing: 4, fontFamily: "system-ui", textAlign: "center",
        }}>NO MATCH</div>
        <div style={{
          fontSize: 14, color: "#FCA5A5", textAlign: "center", marginTop: 6,
          fontFamily: "system-ui",
        }}>Try again!</div>
      </div>
    </div>
  );
}

function Fireworks({ matches, onReplay }) {
  const colors = ["#10B981","#3B82F6","#F472B6","#FBBF24","#8B5CF6","#06B6D4","#EF4444","#F97316"];
  const particles = useMemo(() => {
    const p = [];
    for (let b = 0; b < 10; b++) {
      const cx = 8 + Math.random() * 84, cy = 8 + Math.random() * 50;
      const c = colors[b % colors.length], d = b * 0.25;
      for (let i = 0; i < 16; i++) {
        const a = (i/16)*Math.PI*2, r = 35+Math.random()*80;
        p.push({k:`b${b}${i}`,x:`calc(${cx}% + ${Math.cos(a)*r}px)`,y:`calc(${cy}% + ${Math.sin(a)*r}px)`,c,d,t:"burst"});
      }
    }
    for (let i = 0; i < 60; i++) {
      p.push({k:`c${i}`,x:`${Math.random()*100}%`,y:`${-5-Math.random()*15}%`,c:colors[Math.floor(Math.random()*8)],d:Math.random()*2.5,t:"conf"});
    }
    return p;
  }, []);

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",
      background:"rgba(15,23,42,0.95)",backdropFilter:"blur(10px)",animation:"fadeIn 0.5s",overflow:"hidden",
    }}>
      {particles.map(p=>(
        <div key={p.k} style={{
          position:"absolute",left:p.x,top:p.y,
          width:p.t==="burst"?7:Math.random()*10+4,height:p.t==="burst"?7:Math.random()*10+4,
          borderRadius:p.t==="burst"?"50%":(Math.random()>0.5?"50%":"2px"),background:p.c,
          boxShadow:p.t==="burst"?`0 0 8px ${p.c}`:"none",
          animation:`${p.t==="burst"?"fwPop":"confDrop"} ${p.t==="burst"?"1.2s":`${2+Math.random()*2}s`} ${p.d}s ease-out forwards`,
          transform:p.t==="conf"?`rotate(${Math.random()*360}deg)`:undefined,
        }}/>
      ))}
      <div style={{textAlign:"center",zIndex:10,animation:"scoreIn 0.8s 0.4s ease-out both"}}>
        <div style={{fontSize:16,letterSpacing:6,color:"#94A3B8",fontFamily:"system-ui",marginBottom:12,textTransform:"uppercase",fontWeight:600}}>
          Time's up!
        </div>
        <div style={{
          fontSize:90,fontWeight:900,fontFamily:"system-ui",
          background:"linear-gradient(135deg,#10B981,#06B6D4)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1,
          filter:"drop-shadow(0 4px 30px rgba(16,185,129,0.4))",
        }}>{matches}</div>
        <div style={{fontSize:20,color:"#10B981",fontFamily:"system-ui",fontWeight:700,marginTop:6,letterSpacing:4,textTransform:"uppercase"}}>
          Deals matched
        </div>
        <div style={{marginTop:16,fontSize:14,color:"#64748B",fontFamily:"system-ui"}}>
          {matches===0?"Better luck next time!":matches<3?"Good start!":matches<5?"Great teamwork!":"Incredible deal makers!"}
        </div>
        <button onClick={onReplay} style={{
          marginTop:28,padding:"14px 48px",fontSize:15,fontWeight:700,fontFamily:"system-ui",
          color:"#0F172A",background:"linear-gradient(135deg,#10B981,#059669)",border:"none",
          borderRadius:12,cursor:"pointer",textTransform:"uppercase",letterSpacing:2,
          boxShadow:"0 4px 20px rgba(16,185,129,0.4)",transition:"transform 0.15s",
        }}
          onMouseOver={e=>e.currentTarget.style.transform="scale(1.05)"}
          onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}
        >Play again</button>
      </div>
    </div>
  );
}

function SelectionPanel({ side, selections, onSelect, onSubmit, matchCount, timeLeft, disabled }) {
  const isListing = side === "listing";
  const accent = isListing ? "#60A5FA" : "#F472B6";
  const accentBg = isListing ? "rgba(96,165,250,0.15)" : "rgba(244,114,182,0.15)";
  const accentBorder = isListing ? "rgba(96,165,250,0.5)" : "rgba(244,114,182,0.5)";
  const label = isListing ? "Listing agent" : "Buyer agent";
  const tablet = isListing ? "TABLET A" : "TABLET B";
  const btnColor = isListing ? "#10B981" : "#F472B6";
  const btnText = isListing ? "Submit listing" : "Submit buyer request";

  const allSelected = selections.propertyType && selections.size && selections.priceRange && selections.location;

  const Chip = ({ label: chipLabel, selected, onClick, wide }) => (
    <div onClick={disabled ? undefined : onClick} style={{
      flex: wide ? "1 1 48%" : "1 1 22%",
      background: selected ? accentBg : "#1E293B",
      border: `1.5px solid ${selected ? accentBorder : "#334155"}`,
      borderRadius: 10, padding: "10px 6px", textAlign: "center",
      cursor: disabled ? "default" : "pointer", transition: "all 0.15s",
      userSelect: "none", WebkitTapHighlightColor: "transparent",
    }}>
      <span style={{
        fontSize: 13, fontWeight: selected ? 700 : 500,
        color: selected ? accent : "#94A3B8",
      }}>{chipLabel}</span>
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
      <span style={{
        fontSize: 14, fontWeight: selected ? 700 : 500,
        color: selected ? accent : "#94A3B8",
      }}>{chipLabel}</span>
    </div>
  );

  const houseIcon = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="11" width="16" height="10" rx="1.5" stroke={selections.propertyType === "Apartment" ? accent : "#64748B"} strokeWidth="1.5"/>
      <path d="M4 11L12 5L20 11" stroke={selections.propertyType === "Apartment" ? accent : "#64748B"} strokeWidth="1.5"/>
      <rect x="9" y="15" width="6" height="6" rx="0.5" stroke={selections.propertyType === "Apartment" ? accent : "#64748B"} strokeWidth="1.5"/>
    </svg>
  );

  const villaIcon = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="13" width="8" height="8" rx="1" stroke={selections.propertyType === "Villa" ? accent : "#64748B"} strokeWidth="1.5"/>
      <path d="M2 13L6 8.5L10 13" stroke={selections.propertyType === "Villa" ? accent : "#64748B"} strokeWidth="1.5"/>
      <rect x="12" y="9" width="10" height="12" rx="1" stroke={selections.propertyType === "Villa" ? accent : "#64748B"} strokeWidth="1.5"/>
      <path d="M12 9L17 4L22 9" stroke={selections.propertyType === "Villa" ? accent : "#64748B"} strokeWidth="1.5"/>
    </svg>
  );

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      background: "#0F172A", padding: "12px 14px 16px",
      borderRight: isListing ? "1px solid #1E293B" : "none",
      overflow: "auto",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
          {tablet}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#F1F5F9", marginTop: 2 }}>
          {label}
        </div>
      </div>

      {/* Timer + matches */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#1E293B", borderRadius: 10, padding: "10px 14px", marginBottom: 14,
        border: "1px solid #334155",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: timeLeft <= 5 ? "#EF4444" : "#EF4444",
            boxShadow: "0 0 8px rgba(239,68,68,0.5)",
            animation: timeLeft <= 5 ? "blink 0.5s infinite" : "none",
          }}/>
          <span style={{
            fontSize: 26, fontWeight: 800, fontFamily: "monospace",
            color: timeLeft <= 5 ? "#EF4444" : timeLeft <= 10 ? "#FBBF24" : "#F1F5F9",
          }}>
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#94A3B8" }}>Matches</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#10B981" }}>{matchCount}</span>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: selections.propertyType ? "#10B981" : "#334155", transition: "background 0.3s" }}/>
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: selections.size ? "#10B981" : "#334155", transition: "background 0.3s" }}/>
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: selections.priceRange ? "#10B981" : "#334155", transition: "background 0.3s" }}/>
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: selections.location ? "#10B981" : "#334155", transition: "background 0.3s" }}/>
      </div>

      {/* Property type / What are they looking for */}
      <div style={{ fontSize: 11, color: "#64748B", letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "1. Property type" : "What are they looking for?"}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TypeChip label="Apartment" icon={houseIcon} selected={selections.propertyType === "Apartment"}
          onClick={() => onSelect("propertyType", "Apartment")} />
        <TypeChip label="Villa" icon={villaIcon} selected={selections.propertyType === "Villa"}
          onClick={() => onSelect("propertyType", "Villa")} />
      </div>

      {/* Size */}
      <div style={{ fontSize: 11, color: "#64748B", letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "2. Size" : "Size"}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {SIZES.map(s => (
          <Chip key={s} label={s} selected={selections.size === s}
            onClick={() => onSelect("size", s)} />
        ))}
      </div>

      {/* Price range */}
      <div style={{ fontSize: 11, color: "#64748B", letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
        {isListing ? "3. Price range" : "Budget"}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {PRICES.map(p => (
          <Chip key={p} label={p} selected={selections.priceRange === p}
            onClick={() => onSelect("priceRange", p)} />
        ))}
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
            <img src={l.img} alt={l.name} style={{
              width: "100%", height: 56, objectFit: "cover", display: "block",
            }}/>
            <div style={{ padding: "6px 4px", textAlign: "center" }}>
              <span style={{
                fontSize: 12, fontWeight: selections.location === l.name ? 700 : 500,
                color: selections.location === l.name ? accent : "#94A3B8",
              }}>{l.name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={allSelected && !disabled ? onSubmit : undefined}
        style={{
          width: "100%", padding: "14px", fontSize: 15, fontWeight: 700,
          color: allSelected ? "#fff" : "#64748B",
          background: allSelected ? btnColor : "#1E293B",
          border: allSelected ? "none" : "1px solid #334155",
          borderRadius: 12, cursor: allSelected && !disabled ? "pointer" : "default",
          transition: "all 0.2s", textTransform: "none",
          boxShadow: allSelected ? `0 4px 16px ${btnColor}44` : "none",
          opacity: disabled ? 0.5 : 1,
          fontFamily: "system-ui",
          marginTop: "auto",
        }}
      >
        {btnText}
      </button>
    </div>
  );
}

export default function DealRushForm() {
  const [state, setState] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(30);
  const [matchCount, setMatchCount] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [showNoMatch, setShowNoMatch] = useState(false);
  const [listingSel, setListingSel] = useState({ propertyType: null, size: null, priceRange: null, location: null });
  const [buyerSel, setBuyerSel] = useState({ propertyType: null, size: null, priceRange: null, location: null });
  const [listingSubmitted, setListingSubmitted] = useState(false);
  const [buyerSubmitted, setBuyerSubmitted] = useState(false);
  const [submissions, setSubmissions] = useState(0);

  const resetSelections = useCallback(() => {
    setListingSel({ propertyType: null, size: null, priceRange: null, location: null });
    setBuyerSel({ propertyType: null, size: null, priceRange: null, location: null });
    setListingSubmitted(false);
    setBuyerSubmitted(false);
  }, []);

  const startGame = useCallback(() => {
    setState("playing");
    setTimeLeft(30);
    setMatchCount(0);
    setSubmissions(0);
    resetSelections();
  }, [resetSelections]);

  useEffect(() => {
    if (state !== "playing") return;
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(t); setState("finished"); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [state]);

  const checkMatch = useCallback((ls, bs) => {
    setSubmissions(s => s + 1);
    const matched = ls.propertyType === bs.propertyType &&
                    ls.size === bs.size &&
                    ls.priceRange === bs.priceRange &&
                    ls.location === bs.location;
    if (matched) {
      setMatchCount(m => m + 1);
      setShowMatch(true);
      setTimeout(() => { setShowMatch(false); resetSelections(); }, 1600);
    } else {
      setShowNoMatch(true);
      setTimeout(() => { setShowNoMatch(false); resetSelections(); }, 1200);
    }
  }, [resetSelections]);

  useEffect(() => {
    if (listingSubmitted && buyerSubmitted) {
      checkMatch(listingSel, buyerSel);
    }
  }, [listingSubmitted, buyerSubmitted, listingSel, buyerSel, checkMatch]);

  const handleListingSelect = useCallback((field, value) => {
    if (listingSubmitted) return;
    setListingSel(p => ({ ...p, [field]: p[field] === value ? null : value }));
  }, [listingSubmitted]);

  const handleBuyerSelect = useCallback((field, value) => {
    if (buyerSubmitted) return;
    setBuyerSel(p => ({ ...p, [field]: p[field] === value ? null : value }));
  }, [buyerSubmitted]);

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
        @keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(16,185,129,0.2)}50%{box-shadow:0 0 40px rgba(16,185,129,0.5)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
      `}</style>

      {/* IDLE */}
      {state === "idle" && (
        <div style={{
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          minHeight:"100vh",padding:32,
        }}>
          <div style={{
            width:64,height:64,borderRadius:18,
            background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",
            display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="10" width="18" height="11" rx="2" stroke="#10B981" strokeWidth="2"/>
              <path d="M3 10L12 4L21 10" stroke="#10B981" strokeWidth="2"/>
              <circle cx="17" cy="7" r="4" stroke="#F472B6" strokeWidth="1.5" fill="rgba(244,114,182,0.15)"/>
              <circle cx="17" cy="6" r="1.5" stroke="#F472B6" strokeWidth="1"/>
              <path d="M14.5 10c0-1 1-2 2.5-2s2.5 1 2.5 2" stroke="#F472B6" strokeWidth="1"/>
            </svg>
          </div>

          <div style={{fontSize:13,letterSpacing:5,color:"#64748B",marginBottom:10,textTransform:"uppercase",fontWeight:600}}>
            Property match
          </div>
          <div style={{
            fontSize:46,fontWeight:900,textAlign:"center",lineHeight:1.1,marginBottom:28,
            background:"linear-gradient(135deg,#10B981,#06B6D4)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          }}>Deal Rush</div>

          <div style={{ display:"flex",gap:16,marginBottom:28 }}>
            {[
              {icon:"🏠",title:"Listing Agent",sub:"Selects properties",color:"#60A5FA"},
              {icon:"⚡",title:"30 Seconds",sub:"3 rounds of 10s",color:"#FBBF24"},
              {icon:"👤",title:"Buyer Agent",sub:"Selects buyers",color:"#F472B6"},
            ].map((item,i)=>(
              <div key={i} style={{
                background:"#1E293B",border:"1px solid #334155",borderRadius:14,
                padding:"14px 18px",textAlign:"center",minWidth:110,
              }}>
                <div style={{fontSize:24,marginBottom:6}}>{item.icon}</div>
                <div style={{fontSize:12,fontWeight:700,color:item.color}}>{item.title}</div>
                <div style={{fontSize:10,color:"#64748B",marginTop:2}}>{item.sub}</div>
              </div>
            ))}
          </div>

          <div style={{
            maxWidth:440,textAlign:"center",color:"#94A3B8",fontSize:13,lineHeight:1.8,marginBottom:32,
          }}>
            Two agents, two tablets, one goal.<br/>
            <span style={{color:"#60A5FA"}}>Listing agent</span> selects a property,{" "}
            <span style={{color:"#F472B6"}}>buyer agent</span> selects a buyer.<br/>
            If both pick the <span style={{color:"#10B981",fontWeight:700}}>same criteria</span> → MATCH!<br/>
            <span style={{color:"#64748B"}}>Communicate fast. 30 seconds on the clock.</span>
          </div>

          <button onClick={startGame} style={{
            padding:"16px 56px",fontSize:17,fontWeight:800,color:"#0F172A",
            background:"linear-gradient(135deg,#10B981,#059669)",border:"none",
            borderRadius:14,cursor:"pointer",textTransform:"uppercase",letterSpacing:4,
            boxShadow:"0 4px 24px rgba(16,185,129,0.35)",animation:"pulse4 2.5s infinite",
          }}>Start game</button>
        </div>
      )}

      {/* PLAYING */}
      {(state === "playing" || state === "finished") && (
        <div style={{display:"flex",flex:1,minHeight:"100vh"}}>
          <SelectionPanel
            side="listing"
            selections={listingSel}
            onSelect={handleListingSelect}
            onSubmit={() => setListingSubmitted(true)}
            matchCount={matchCount}
            timeLeft={timeLeft}
            disabled={state === "finished" || listingSubmitted}
          />
          <SelectionPanel
            side="buyer"
            selections={buyerSel}
            onSelect={handleBuyerSelect}
            onSubmit={() => setBuyerSubmitted(true)}
            matchCount={matchCount}
            timeLeft={timeLeft}
            disabled={state === "finished" || buyerSubmitted}
          />
        </div>
      )}

      <MatchOverlay show={showMatch} />
      <NoMatchOverlay show={showNoMatch} />
      {state === "finished" && <Fireworks matches={matchCount} onReplay={startGame} />}
    </div>
  );
}

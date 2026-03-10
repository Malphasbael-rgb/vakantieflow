import { useState, useMemo, useEffect, useCallback } from "react";

const WERKNEMERS_INIT = [
  { id: 1,  naam: "Alinda Postma",            afdelingen: [], kleur: "#FF6B6B", contractUren: null },
  { id: 2,  naam: "Anita Dijkstra",            afdelingen: [], kleur: "#4ECDC4", contractUren: null },
  { id: 3,  naam: "Elke Buikstra-bosklopper",  afdelingen: [], kleur: "#FFE66D", contractUren: null },
  { id: 4,  naam: "Ina Betlehem Stevens",       afdelingen: [], kleur: "#A8E6CF", contractUren: null },
  { id: 5,  naam: "Monique Breijmer",           afdelingen: [], kleur: "#FF8B94", contractUren: null },
  { id: 6,  naam: "Erwin Kooistra",             afdelingen: [], kleur: "#B4A7D6", contractUren: null },
  { id: 7,  naam: "Nadia Keuning Hochwald",     afdelingen: [], kleur: "#96CEB4", contractUren: null },
  { id: 8,  naam: "Sjoerd Kaper",               afdelingen: [], kleur: "#FFEAA7", contractUren: null },
  { id: 9,  naam: "Leon Segerink",              afdelingen: [], kleur: "#DDA0DD", contractUren: null },
  { id: 10, naam: "Melanie Schep",              afdelingen: [], kleur: "#98D8C8", contractUren: null },
  { id: 11, naam: "Nick",                       afdelingen: [], kleur: "#F7DC6F", contractUren: null },
  { id: 12, naam: "Bart Reinsma",               afdelingen: [], kleur: "#82E0AA", contractUren: null },
  { id: 13, naam: "Roos Van Wijnen",            afdelingen: [], kleur: "#F1948A", contractUren: null },
  { id: 14, naam: "Suleika Ramdien",            afdelingen: [], kleur: "#AED6F1", contractUren: null },
  { id: 15, naam: "Alwin Speelman",             afdelingen: [], kleur: "#D7BDE2", contractUren: null },
];

const AANVRAGEN_INIT = [];

function dateDiff(van, tot) {
  const a = new Date(van), b = new Date(tot);
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}
function overlapt(a, b) { return a.van <= b.tot && a.tot >= b.van; }

// Minimumbezetting per afdeling
const MIN_BEZETTING = {
  "Micro":     2,
  "Orglab":    2,
  "Chemie":    1,
  "Klachten":  1,
  "Vrijgave":  1,
};

// Hoeveel mensen van afdeling zijn aanwezig op een bepaalde dag (excl. deze aanvraag)
function aanwezigOpDag(dag, afdeling, aanvraag, alleAanvragen, werknemers) {
  // Alle werknemers in deze afdeling
  const leden = werknemers.filter(w => w.afdelingen.includes(afdeling));
  // Hoeveel zijn NIET afwezig op deze dag?
  const afwezig = alleAanvragen.filter(r =>
    r.id !== aanvraag.id &&
    r.status !== "afgewezen" &&
    werknemers.find(w => w.id === r.werknemerId)?.afdelingen.includes(afdeling) &&
    r.van <= dag && r.tot >= dag
  );
  return leden.length - afwezig.length;
}

// Controleer of aanvraag minimumbezetting schendt op enige dag in de periode
function getBezettingConflicten(aanvraag, alleAanvragen, werknemers) {
  if (aanvraag.status === "afgewezen") return [];
  const eigen = werknemers.find(w => w.id === aanvraag.werknemerId);
  if (!eigen) return [];

  const conflicten = [];
  const van = new Date(aanvraag.van);
  const tot = new Date(aanvraag.tot);

  for (const afd of eigen.afdelingen) {
    const minimum = MIN_BEZETTING[afd];
    if (!minimum) continue;

    // Loop door alle dagen van de aanvraag
    for (let d = new Date(van); d <= tot; d.setDate(d.getDate() + 1)) {
      const dag = d.toISOString().split("T")[0];
      const aanwezig = aanwezigOpDag(dag, afd, aanvraag, alleAanvragen, werknemers);
      if (aanwezig < minimum) {
        conflicten.push({ afd, dag, aanwezig, minimum });
        break; // één melding per afdeling is genoeg
      }
    }
  }
  return conflicten;
}

function getConflicts(aanvraag, alleAanvragen, werknemers) {
  if (aanvraag.status === "afgewezen") return [];
  const eigen = werknemers.find(w => w.id === aanvraag.werknemerId);
  if (!eigen || !eigen.afdelingen.length) return [];
  return alleAanvragen.filter(r => {
    if (r.id === aanvraag.id || r.status === "afgewezen" || !overlapt(aanvraag, r)) return false;
    const ander = werknemers.find(w => w.id === r.werknemerId);
    return ander && eigen.afdelingen.some(afd => ander.afdelingen.includes(afd));
  });
}

function isProblem(a, all, w) {
  return getConflicts(a, all, w).length > 0 || getBezettingConflicten(a, all, w).length > 0;
}

function berekenVerlofUren(u) {
  if (!u || u <= 0) return null;
  return Math.round((u / 40) * 25 * (u / 5));
}
function gebruikteVerlofUren(id, aanvragen, u) {
  if (!u) return 0;
  return aanvragen
    .filter(a => a.werknemerId === id && a.status === "goedgekeurd")
    .reduce((s, a) => s + dateDiff(a.van, a.tot) * (u / 5), 0);
}

const statusKleur = { "goedgekeurd": "#2D9B6F", "in behandeling": "#E8A838", "afgewezen": "#E05555" };
const statusBg    = { "goedgekeurd": "#E8FAF3", "in behandeling": "#FEF7E6", "afgewezen": "#FEE9E9" };
const statusIcon  = { "goedgekeurd": "✅", "in behandeling": "⏳", "afgewezen": "❌" };

function AfdTag({ label, onRemove }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(74,158,224,0.15)", border: "1px solid rgba(74,158,224,0.3)", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", color: "#4A9EE0", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>
      {label}
      {onRemove && <span onClick={onRemove} style={{ cursor: "pointer", opacity: 0.6, fontSize: "14px", lineHeight: 1, marginLeft: "2px" }}>×</span>}
    </span>
  );
}

const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#E8EDF2", fontSize: "14px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: "12px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#7A9AB5", marginBottom: "8px" };

// ─── KEUZE SCHERM ───────────────────────────────────────────────────────────
function KeuzeScherm({ onKies }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F1923 0%, #162233 60%, #0F1923 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#E8EDF2", padding: "24px" }}>
      <div style={{ marginBottom: "48px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🌴</div>
        <h1 style={{ fontSize: "36px", fontWeight: "bold", margin: "0 0 8px", letterSpacing: "1px" }}>VakantieFlow</h1>
        <p style={{ color: "#7A9AB5", margin: 0, fontSize: "15px", letterSpacing: "1px" }}>Verlofbeheer systeem</p>
      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: "600px" }}>
        {/* Werknemer knop */}
        <button onClick={() => onKies("werknemer")} style={{
          flex: "1 1 220px", padding: "36px 24px", borderRadius: "20px", border: "1px solid rgba(74,158,224,0.2)",
          background: "linear-gradient(135deg, #1A2C42, #162233)", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "14px",
          transition: "all 0.2s", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(74,158,224,0.5)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(74,158,224,0.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(74,158,224,0.2)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"; }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #4ECDC4, #2D9B8F)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>👤</div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#E8EDF2", marginBottom: "6px" }}>Ik ben werknemer</div>
            <div style={{ fontSize: "13px", color: "#7A9AB5", lineHeight: "1.5" }}>Bekijk je aanvragen of dien een nieuwe in</div>
          </div>
        </button>

        {/* Beheerder knop */}
        <button onClick={() => onKies("admin")} style={{
          flex: "1 1 220px", padding: "36px 24px", borderRadius: "20px", border: "1px solid rgba(74,158,224,0.2)",
          background: "linear-gradient(135deg, #1A2C42, #162233)", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "14px",
          transition: "all 0.2s", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(74,158,224,0.5)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(74,158,224,0.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(74,158,224,0.2)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"; }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #4A9EE0, #2D6FA8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>⚙️</div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#E8EDF2", marginBottom: "6px" }}>Ik ben beheerder</div>
            <div style={{ fontSize: "13px", color: "#7A9AB5", lineHeight: "1.5" }}>Beheer aanvragen en werknemers</div>
          </div>
        </button>
      </div>
    </div>
  );
}


// ─── PIN / WACHTWOORD SCHERM ─────────────────────────────────────────────────
function PinScherm({ titel, subtitel, avatar, kleur, onSuccess, onTerug, isNieuw }) {
  const [pin, setPin] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [fout, setFout] = useState("");
  const [stap, setStap] = useState(isNieuw ? "nieuw" : "invoer"); // "nieuw" | "bevestig" | "invoer"

  function handleCijfer(c) {
    setFout("");
    if (stap === "nieuw" && pin.length < 4) {
      const nieuw = pin + c;
      setPin(nieuw);
      if (nieuw.length === 4) setStap("bevestig");
    } else if (stap === "bevestig" && bevestig.length < 4) {
      const b = bevestig + c;
      setBevestig(b);
      if (b.length === 4) {
        if (b === pin) { onSuccess(pin); }
        else { setFout("Pincodes komen niet overeen. Probeer opnieuw."); setPin(""); setBevestig(""); setStap("nieuw"); }
      }
    } else if (stap === "invoer" && pin.length < 4) {
      const nieuw = pin + c;
      setPin(nieuw);
      if (nieuw.length === 4) onSuccess(nieuw);
    }
  }

  function handleVerwijder() {
    if (stap === "bevestig" && bevestig.length > 0) setBevestig(b => b.slice(0,-1));
    else setPin(p => p.slice(0,-1));
  }

  const huidigPin = stap === "bevestig" ? bevestig : pin;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F1923 0%, #162233 60%, #0F1923 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#E8EDF2", padding: "24px" }}>
      <button onClick={onTerug} style={{ position: "absolute", top: "20px", left: "20px", background: "none", border: "none", color: "#7A9AB5", cursor: "pointer", fontSize: "20px" }}>←</button>

      {avatar && (
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: kleur || "#4A9EE0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold", color: "#0F1923", marginBottom: "16px" }}>
          {avatar}
        </div>
      )}
      <h2 style={{ fontSize: "22px", fontWeight: "bold", margin: "0 0 6px", textAlign: "center" }}>{titel}</h2>
      <p style={{ color: "#7A9AB5", margin: "0 0 32px", fontSize: "14px", textAlign: "center", maxWidth: "280px", lineHeight: "1.5" }}>
        {stap === "nieuw" ? "Kies een 4-cijferige pincode" : stap === "bevestig" ? "Voer de pincode nogmaals in ter bevestiging" : subtitel}
      </p>

      {fout && <div style={{ background: "rgba(224,85,85,0.15)", border: "1px solid rgba(224,85,85,0.3)", borderRadius: "10px", padding: "10px 16px", fontSize: "13px", color: "#E05555", marginBottom: "20px", textAlign: "center" }}>{fout}</div>}

      {/* Pin dots */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "40px" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: "18px", height: "18px", borderRadius: "50%", background: i < huidigPin.length ? (kleur || "#4A9EE0") : "rgba(255,255,255,0.1)", border: `2px solid ${i < huidigPin.length ? (kleur || "#4A9EE0") : "rgba(255,255,255,0.2)"}`, transition: "all 0.15s" }} />
        ))}
      </div>

      {/* Numpad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: "12px" }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((c, i) => (
          <button key={i} onClick={() => c === "⌫" ? handleVerwijder() : c !== "" ? handleCijfer(String(c)) : null}
            style={{ width: "72px", height: "72px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: c === "" ? "transparent" : "rgba(255,255,255,0.06)", color: "#E8EDF2", fontSize: c === "⌫" ? "20px" : "22px", fontFamily: "Georgia, serif", cursor: c === "" ? "default" : "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { if (c !== "") e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
            onMouseLeave={e => { if (c !== "") e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── WERKNEMER KEUZE (welke werknemer ben jij?) ──────────────────────────────
function WerknemerKeuze({ werknemers, onKies, onTerug }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F1923 0%, #162233 60%, #0F1923 100%)", fontFamily: "Georgia, serif", color: "#E8EDF2" }}>
      <div style={{ background: "linear-gradient(90deg, #1A2C42, #1E3A52)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
        <button onClick={onTerug} style={{ background: "none", border: "none", color: "#7A9AB5", cursor: "pointer", fontSize: "20px", padding: "4px 8px" }}>←</button>
        <div style={{ fontSize: "16px", fontWeight: "bold" }}>🌴 VakantieFlow</div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 8px" }}>Wie ben jij?</h2>
        <p style={{ color: "#7A9AB5", margin: "0 0 32px", fontSize: "14px" }}>Selecteer je naam om verder te gaan.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {werknemers.map(w => (
            <button key={w.id} onClick={() => onKies(w)} style={{
              padding: "16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)",
              background: "linear-gradient(135deg, #1A2C42, #162233)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "12px", textAlign: "left",
              transition: "all 0.18s", boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = w.kleur + "80"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: w.kleur, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold", color: "#0F1923", flexShrink: 0 }}>
                {w.naam.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: "14px", color: "#E8EDF2" }}>{w.naam}</div>
                {w.afdelingen.length > 0 && <div style={{ fontSize: "11px", color: "#7A9AB5", marginTop: "2px" }}>{w.afdelingen.join(", ")}</div>}
              </div>
              <div style={{ fontSize: "14px", opacity: 0.5 }}>{w.pin ? "🔒" : "🔓"}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── WERKNEMER PORTAAL (mijn aanvragen + nieuwe indienen) ────────────────────
function WerknemerPortaal({ werknemer, aanvragen, werknemers, onNieuweAanvraag, onTerug }) {
  const [tab, setTab] = useState("aanvragen");
  const [form, setForm] = useState({ type: "Vakantie", van: "", tot: "", opmerking: "" });
  const [ingediend, setIngediend] = useState(false);

  const eigenAanvragen = aanvragen.filter(a => a.werknemerId === werknemer.id)
    .sort((a, b) => b.ingediend.localeCompare(a.ingediend));

  const totaalUren  = berekenVerlofUren(werknemer.contractUren);
  const gebruiktU   = gebruikteVerlofUren(werknemer.id, aanvragen, werknemer.contractUren);
  const resterendU  = totaalUren ? Math.max(0, totaalUren - gebruiktU) : null;

  function submitAanvraag() {
    if (!form.van || !form.tot) return;
    onNieuweAanvraag({ werknemerId: werknemer.id, ...form });
    setForm({ type: "Vakantie", van: "", tot: "", opmerking: "" });
    setIngediend(true);
    setTimeout(() => { setIngediend(false); setTab("aanvragen"); }, 2500);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F1923 0%, #162233 60%, #0F1923 100%)", fontFamily: "Georgia, serif", color: "#E8EDF2" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(90deg, #1A2C42, #1E3A52)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={onTerug} style={{ background: "none", border: "none", color: "#7A9AB5", cursor: "pointer", fontSize: "20px", padding: "4px 8px" }}>←</button>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>🌴 VakantieFlow</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: werknemer.kleur, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "bold", color: "#0F1923" }}>{werknemer.naam.charAt(0)}</div>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>{werknemer.naam}</span>
        </div>
      </div>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Verlofuren samenvatting */}
        {totaalUren && (
          <div style={{ background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "14px", padding: "20px 24px", marginBottom: "28px", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#7A9AB5", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "4px" }}>Verlofuren dit jaar</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: resterendU < totaalUren * 0.15 ? "#E05555" : resterendU < totaalUren * 0.35 ? "#E8A838" : "#2D9B6F" }}>
                  {Math.round(resterendU)}u <span style={{ fontSize: "14px", fontWeight: "normal", color: "#7A9AB5" }}>resterend</span>
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: "13px", color: "#7A9AB5" }}>
                <div>{Math.round(gebruiktU)}u gebruikt</div>
                <div>{totaalUren}u totaal</div>
              </div>
            </div>
            <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, Math.round((gebruiktU / totaalUren) * 100))}%`, background: resterendU < totaalUren * 0.15 ? "#E05555" : resterendU < totaalUren * 0.35 ? "#E8A838" : "#2D9B6F", borderRadius: "4px", transition: "width 0.4s" }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
          {[{ key: "aanvragen", label: "📋 Mijn aanvragen" }, { key: "nieuw", label: "✏️ Nieuwe aanvraag" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "9px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px", fontWeight: tab === t.key ? "bold" : "normal", background: tab === t.key ? "rgba(74,158,224,0.18)" : "rgba(255,255,255,0.04)", color: tab === t.key ? "#4A9EE0" : "#7A9AB5", borderBottom: tab === t.key ? "2px solid #4A9EE0" : "2px solid transparent", transition: "all 0.2s" }}>
              {t.label} {t.key === "aanvragen" && eigenAanvragen.length > 0 && <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "1px 7px", marginLeft: "4px" }}>{eigenAanvragen.length}</span>}
            </button>
          ))}
        </div>

        {/* Mijn aanvragen */}
        {tab === "aanvragen" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {eigenAanvragen.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 24px", color: "#7A9AB5", background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>📭</div>
                <div style={{ fontSize: "15px", marginBottom: "6px", color: "#E8EDF2" }}>Nog geen aanvragen</div>
                <div style={{ fontSize: "13px" }}>Dien je eerste aanvraag in via het tabblad hierboven.</div>
              </div>
            )}
            {eigenAanvragen.map(a => {
              const conflict = isProblem(a, aanvragen, werknemers);
              return (
                <div key={a.id} style={{ background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "14px", padding: "20px", border: conflict ? "1px solid rgba(224,85,85,0.4)" : "1px solid rgba(255,255,255,0.06)", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px" }}>{a.type === "Vakantie" ? "🌴" : "☀️"}</span>
                      <span style={{ fontWeight: "bold", fontSize: "16px" }}>{a.type}</span>
                      {conflict && <span style={{ fontSize: "11px", background: "rgba(224,85,85,0.15)", border: "1px solid rgba(224,85,85,0.3)", borderRadius: "6px", padding: "2px 8px", color: "#E05555" }}>⚠️ Conflict</span>}
                    </div>
                    <span style={{ fontSize: "12px", padding: "5px 14px", borderRadius: "20px", background: statusBg[a.status], color: statusKleur[a.status], fontWeight: "bold" }}>
                      {statusIcon[a.status]} {a.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "14px", color: "#B0BEC8", marginBottom: "4px" }}>
                    📅 {a.van}{a.van !== a.tot ? ` → ${a.tot}` : ""} <span style={{ color: "#7A9AB5" }}>· {dateDiff(a.van, a.tot)} dag{dateDiff(a.van, a.tot) > 1 ? "en" : ""}</span>
                  </div>
                  {a.opmerking && <div style={{ fontSize: "13px", color: "#7A9AB5", fontStyle: "italic" }}>"{a.opmerking}"</div>}
                  {a.beheerderOpmerking && <div style={{ fontSize: "12px", marginTop: "6px", padding: "6px 10px", borderRadius: "6px", background: a.status === "goedgekeurd" ? "rgba(45,155,111,0.1)" : "rgba(224,85,85,0.1)", color: a.status === "goedgekeurd" ? "#2D9B6F" : "#E05555", fontStyle: "italic" }}>💬 Beheerder: "{a.beheerderOpmerking}"</div>}
                  <div style={{ fontSize: "11px", color: "#4A6A82", marginTop: "8px" }}>Ingediend op {a.ingediend}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nieuwe aanvraag */}
        {tab === "nieuw" && (
          <div style={{ background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "16px", padding: "28px", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            {ingediend ? (
              <div style={{ textAlign: "center", padding: "32px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                <div style={{ fontWeight: "bold", fontSize: "18px", color: "#2D9B6F", marginBottom: "6px" }}>Aanvraag ingediend!</div>
                <div style={{ fontSize: "13px", color: "#7A9AB5" }}>Je aanvraag is ter beoordeling doorgestuurd.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={labelStyle}>Type aanvraag</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {["Vakantie", "Vrije dag"].map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "14px", background: form.type === t ? "linear-gradient(135deg, #4A9EE0, #2D6FA8)" : "rgba(255,255,255,0.05)", color: form.type === t ? "#fff" : "#7A9AB5", fontWeight: form.type === t ? "bold" : "normal", transition: "all 0.2s" }}>
                        {t === "Vakantie" ? "🌴 Vakantie" : "☀️ Vrije dag"}
                      </button>
                    ))}
                  </div>
                </div>
                {form.type === "Vakantie" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>Begindatum</label>
                      <input type="date" value={form.van} onChange={e => setForm(f => ({ ...f, van: e.target.value, tot: f.tot < e.target.value ? e.target.value : f.tot }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Einddatum</label>
                      <input type="date" value={form.tot} min={form.van} onChange={e => setForm(f => ({ ...f, tot: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Datum</label>
                    <input type="date" value={form.van} onChange={e => setForm(f => ({ ...f, van: e.target.value, tot: e.target.value }))} style={inputStyle} />
                  </div>
                )}
                {form.van && form.tot && (
                  <div style={{ background: "rgba(74,158,224,0.08)", border: "1px solid rgba(74,158,224,0.2)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", color: "#4A9EE0" }}>
                    📅 {form.type === "Vakantie" ? `${dateDiff(form.van, form.tot)} dag${dateDiff(form.van, form.tot) > 1 ? "en" : ""}` : form.van}
                    {werknemer.contractUren && ` · ${Math.round(dateDiff(form.van, form.tot) * (werknemer.contractUren / 5))}u`}
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Opmerking (optioneel)</label>
                  <textarea value={form.opmerking} onChange={e => setForm(f => ({ ...f, opmerking: e.target.value }))} rows={3} placeholder="Bijv. zomervakantie, medische afspraak..." style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }} />
                </div>
                <button onClick={submitAanvraag} style={{ padding: "14px", borderRadius: "10px", border: "none", cursor: "pointer", background: "linear-gradient(135deg, #4A9EE0, #2D6FA8)", color: "#fff", fontSize: "15px", fontWeight: "bold", fontFamily: "Georgia, serif", boxShadow: "0 4px 16px rgba(74,158,224,0.3)" }}>
                  Aanvraag indienen →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HOOFD APP ───────────────────────────────────────────────────────────────
export default function VakantieApp() {
  const [scherm, setScherm]         = useState("keuze"); // "keuze" | "werknemerKeuze" | "werknemerPin" | "werknemerPortaal" | "adminPin" | "admin"
  const [actiefWerknemer, setActiefWerknemer] = useState(null);
  const ADMIN_PIN_KEY = "vakantieflow:adminpin";
  const [adminPin, setAdminPin] = useState(() => { try { return localStorage.getItem(ADMIN_PIN_KEY) || null; } catch(e) { return null; } });
  const [werknemers, setWerknemers] = useState(WERKNEMERS_INIT);
  const [aanvragen, setAanvragen]   = useState(AANVRAGEN_INIT);
  const [geladen, setGeladen]       = useState(false);
  const [opslagStatus, setOpslagStatus] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const log = (msg) => setDebugLog(prev => [...prev.slice(-6), msg]);

  // Admin state
  const [adminSub, setAdminSub] = useState("aanvragen");
  const [filterStatus, setFilterStatus]       = useState("alle");
  const [filterWerknemer, setFilterWerknemer] = useState("alle");
  const [wModal, setWModal] = useState(false);
  const [nieuweWerknemer, setNieuweWerknemer] = useState({ naam: "", afdelingen: [], invoer: "", contractUren: "" });
  const [bewerkId, setBewerkId]     = useState(null);
  const [afdInvoer, setAfdInvoer]   = useState("");
  const [naamBewerkId, setNaamBewerkId] = useState(null);
  const [naamInvoer, setNaamInvoer]     = useState("");
  const [urenBewerkId, setUrenBewerkId] = useState(null);
  const [urenInvoer, setUrenInvoer]     = useState("");
  const [reactieModal, setReactieModal] = useState(null); // { aanvraagId, nieuweStatus }
  const [reactieTekst, setReactieTekst] = useState("");

  // ── Supabase config ──
  const SUPABASE_URL = "https://pezqrqstakjegzegfxzo.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlenFycXN0YWtqZWd6ZWdmeHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzk4MjYsImV4cCI6MjA4ODY1NTgyNn0.dgFLVz8BtH8T5f1AYzVgyuOHj5OixusfV6CW3e8Fh8A";

  const HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
  };

  // ── Laden uit Supabase bij opstarten ──
  useEffect(() => {
    async function laadData() {
      try {
        log("🔵 Verbinding maken...");
        const [wRes, aRes] = await Promise.all([
          fetch(SUPABASE_URL + "/rest/v1/werknemers?select=id,data&order=id", { headers: HEADERS }),
          fetch(SUPABASE_URL + "/rest/v1/aanvragen?select=id,data&order=id",  { headers: HEADERS }),
        ]);
        log("🔵 W-status: " + wRes.status + " A-status: " + aRes.status);
        const wRows = await wRes.json();
        const aRows = await aRes.json();
        log("🔵 Rijen: W=" + (Array.isArray(wRows) ? wRows.length : JSON.stringify(wRows).slice(0,60)) + " A=" + (Array.isArray(aRows) ? aRows.length : JSON.stringify(aRows).slice(0,60)));
        if (Array.isArray(wRows) && wRows.length > 0)
          setWerknemers(wRows.map(r => ({ ...r.data, id: r.id })));
        if (Array.isArray(aRows) && aRows.length > 0)
          setAanvragen(aRows.map(r => ({ ...r.data, id: r.id })));
      } catch (e) {
        log("❌ Laden mislukt: " + e.message);
      }
      setGeladen(true);
    }
    laadData();
  }, []);

  // ── Opslaan via upsert (insert or update) ──
  const slaOp = useCallback(async (nieuweWerknemers, nieuweAanvragen) => {
    setOpslagStatus("opslaan");
    try {
      const upsertHeaders = { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" };

      log("🟡 Opslaan: " + nieuweWerknemers.length + " werknemers, " + nieuweAanvragen.length + " aanvragen");
      // Sla alle werknemers op via upsert
      for (const w of nieuweWerknemers) {
        const r = await fetch(SUPABASE_URL + "/rest/v1/werknemers", {
          method: "POST",
          headers: upsertHeaders,
          body: JSON.stringify({ id: w.id, data: w }),
        });
        if (!r.ok) { const t = await r.text(); log("❌ W-fout " + r.status + ": " + t.slice(0,80)); }
        else log("✅ W opgeslagen: " + w.naam);
      }

      // Sla alle aanvragen op via upsert
      for (const a of nieuweAanvragen) {
        const r = await fetch(SUPABASE_URL + "/rest/v1/aanvragen", {
          method: "POST",
          headers: upsertHeaders,
          body: JSON.stringify({ id: a.id, data: a }),
        });
        if (!r.ok) { const t = await r.text(); log("❌ A-fout " + r.status + ": " + t.slice(0,80)); }
        else log("✅ Aanvraag opgeslagen");
      }

      // Verwijder werknemers die niet meer bestaan
      const wIds = nieuweWerknemers.map(w => w.id).join(",");
      if (wIds) {
        await fetch(SUPABASE_URL + "/rest/v1/werknemers?id=not.in.(" + wIds + ")", {
          method: "DELETE", headers: HEADERS,
        });
      }

      // Verwijder aanvragen die niet meer bestaan
      const aIds = nieuweAanvragen.map(a => a.id).join(",");
      if (aIds) {
        await fetch(SUPABASE_URL + "/rest/v1/aanvragen?id=not.in.(" + aIds + ")", {
          method: "DELETE", headers: HEADERS,
        });
      }

      setOpslagStatus("opgeslagen");
    } catch (e) {
      log("❌ Algemene fout: " + e.message);
      setOpslagStatus("fout");
    }
    setTimeout(() => setOpslagStatus(null), 2500);
  }, []);

  useEffect(() => { if (geladen) slaOp(werknemers, aanvragen); }, [werknemers, aanvragen, geladen]);

  const gefilterd = useMemo(() => aanvragen.filter(a => {
    if (filterStatus !== "alle" && a.status !== filterStatus) return false;
    if (filterWerknemer !== "alle" && a.werknemerId !== parseInt(filterWerknemer)) return false;
    return true;
  }), [aanvragen, filterStatus, filterWerknemer]);

  const problematisch = useMemo(() => aanvragen.filter(a => isProblem(a, aanvragen, werknemers)), [aanvragen, werknemers]);

  function saveNaam(id) {
    const t = naamInvoer.trim();
    if (t) setWerknemers(prev => prev.map(w => w.id === id ? { ...w, naam: t } : w));
    setNaamBewerkId(null);
  }
  function saveUren(id) {
    const val = parseInt(urenInvoer);
    setWerknemers(prev => prev.map(w => w.id === id ? { ...w, contractUren: (!isNaN(val) && val > 0) ? val : null } : w));
    setUrenBewerkId(null);
  }
  function addAfdeling(id, afd) {
    const t = afd.trim();
    if (!t) return;
    setWerknemers(prev => prev.map(w => w.id === id && !w.afdelingen.includes(t) ? { ...w, afdelingen: [...w.afdelingen, t] } : w));
  }
  function removeAfdeling(id, afd) {
    setWerknemers(prev => prev.map(w => w.id === id ? { ...w, afdelingen: w.afdelingen.filter(a => a !== afd) } : w));
  }
  function handleWerknemerToevoegen() {
    if (!nieuweWerknemer.naam) return;
    const kleuren = ["#FF6B6B","#4ECDC4","#FFE66D","#A8E6CF","#FF8B94","#B4A7D6","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8"];
    setWerknemers(prev => [...prev, { id: Date.now(), naam: nieuweWerknemer.naam, afdelingen: nieuweWerknemer.afdelingen, contractUren: parseInt(nieuweWerknemer.contractUren) || null, kleur: kleuren[Math.floor(Math.random() * kleuren.length)] }]);
    setNieuweWerknemer({ naam: "", afdelingen: [], invoer: "", contractUren: "" });
    setWModal(false);
  }
  function handleStatusChange(id, status, opmerking) {
    setAanvragen(prev => prev.map(a => a.id === id ? { ...a, status, beheerderOpmerking: opmerking || "" } : a));
  }
  function handleNieuweAanvraag(data) {
    setAanvragen(prev => [{ id: Date.now(), ...data, status: "in behandeling", ingediend: new Date().toISOString().split("T")[0] }, ...prev]);
  }

  if (!geladen) return (
    <div style={{ minHeight: "100vh", background: "#0F1923", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#7A9AB5", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "32px" }}>🌴</div>
      <div>VakantieFlow laden...</div>
    </div>
  );

  // ── Keuze scherm ──
  if (scherm === "keuze") return <KeuzeScherm onKies={k => setScherm(k === "werknemer" ? "werknemerKeuze" : "adminPin")} />;

  // ── Werknemer kiezen ──
  if (scherm === "werknemerKeuze") return (
    <WerknemerKeuze
      werknemers={werknemers}
      onKies={w => { setActiefWerknemer(w); setScherm("werknemerPin"); }}
      onTerug={() => setScherm("keuze")}
    />
  );

  // ── Werknemer pin scherm ──
  if (scherm === "werknemerPin" && actiefWerknemer) {
    const w = werknemers.find(x => x.id === actiefWerknemer.id) || actiefWerknemer;
    const heeftPin = !!w.pin;
    return (
      <PinScherm
        titel={w.naam}
        subtitel="Voer je pincode in"
        avatar={w.naam.charAt(0)}
        kleur={w.kleur}
        isNieuw={!heeftPin}
        onTerug={() => setScherm("werknemerKeuze")}
        onSuccess={ingevoerdePin => {
          if (!heeftPin) {
            // Eerste keer: sla pin op
            setWerknemers(prev => prev.map(x => x.id === w.id ? { ...x, pin: ingevoerdePin } : x));
            setActiefWerknemer({ ...w, pin: ingevoerdePin });
            setScherm("werknemerPortaal");
          } else if (ingevoerdePin === w.pin) {
            setScherm("werknemerPortaal");
          } else {
            // Wrong pin — PinScherm handles this via onSuccess only being called with correct value
            // We need to signal failure - we'll handle in PinScherm via a prop
            alert("Onjuiste pincode. Probeer opnieuw.");
            setScherm("werknemerPin");
          }
        }}
      />
    );
  }

  // ── Admin pin scherm ──
  if (scherm === "adminPin") {
    const heeftPin = !!adminPin;
    return (
      <PinScherm
        titel="Beheerder"
        subtitel="Voer de beheerders pincode in"
        avatar="⚙️"
        kleur="#4A9EE0"
        isNieuw={!heeftPin}
        onTerug={() => setScherm("keuze")}
        onSuccess={ingevoerdePin => {
          if (!heeftPin) {
            setAdminPin(ingevoerdePin);
            try { localStorage.setItem(ADMIN_PIN_KEY, ingevoerdePin); } catch(e) {}
            setScherm("admin");
          } else if (ingevoerdePin === adminPin) {
            setScherm("admin");
          } else {
            alert("Onjuiste pincode. Probeer opnieuw.");
            setScherm("adminPin");
          }
        }}
      />
    );
  }

  // ── Werknemer portaal ──
  if (scherm === "werknemerPortaal" && actiefWerknemer) {
    const huidigWerknemer = werknemers.find(w => w.id === actiefWerknemer.id) || actiefWerknemer;
    return (
      <WerknemerPortaal
        werknemer={huidigWerknemer}
        aanvragen={aanvragen}
        werknemers={werknemers}
        onNieuweAanvraag={handleNieuweAanvraag}
        onTerug={() => setScherm("werknemerKeuze")}
      />
    );
  }

  // ── ADMIN SCHERM ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F1923 0%, #162233 50%, #0F1923 100%)", fontFamily: "Georgia, serif", color: "#E8EDF2" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(90deg, #1A2C42, #1E3A52)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => setScherm("keuze")} style={{ background: "none", border: "none", color: "#7A9AB5", cursor: "pointer", fontSize: "20px", padding: "4px 8px" }}>←</button>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #4A9EE0, #2D6FA8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🌴</div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "bold" }}>VakantieFlow</div>
            <div style={{ fontSize: "10px", color: "#7A9AB5", letterSpacing: "2px", textTransform: "uppercase" }}>Beheerder</div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "4px" }}>
          {[{ key: "aanvragen", label: "📋 Aanvragen" }, { key: "werknemers", label: "👥 Werknemers" }, { key: "kalender", label: "📅 Overzicht" }].map(item => (
            <button key={item.key} onClick={() => setAdminSub(item.key)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px", fontWeight: adminSub === item.key ? "bold" : "normal", background: adminSub === item.key ? "rgba(74,158,224,0.18)" : "transparent", color: adminSub === item.key ? "#4A9EE0" : "#7A9AB5", borderBottom: adminSub === item.key ? "2px solid #4A9EE0" : "2px solid transparent", transition: "all 0.2s" }}>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {opslagStatus === "opslaan" && <span style={{ fontSize: "12px", color: "#7A9AB5" }}>● Opslaan...</span>}
          {opslagStatus === "opgeslagen" && <span style={{ fontSize: "12px", color: "#2D9B6F" }}>✓ Opgeslagen</span>}
          {opslagStatus === "fout" && <span style={{ fontSize: "12px", color: "#E05555" }}>❌ Fout!</span>}
          {problematisch.length > 0 && <div style={{ background: "rgba(224,85,85,0.15)", border: "1px solid rgba(224,85,85,0.4)", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", color: "#E05555" }}>⚠️ {problematisch.length} conflict{problematisch.length > 1 ? "en" : ""}</div>}
          <button onClick={() => { if (window.confirm("Beheerders pincode resetten? Je moet dan een nieuwe kiezen.")) { setAdminPin(null); try { localStorage.removeItem(ADMIN_PIN_KEY); } catch(e) {} setScherm("keuze"); } }} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#4A6A82", cursor: "pointer", fontSize: "11px", fontFamily: "Georgia, serif" }} title="Reset beheerders pincode">🔑</button>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "28px" }}>
          {[
            { label: "Totaal aanvragen", val: aanvragen.length, icon: "📋", kleur: "#4A9EE0" },
            { label: "In behandeling",  val: aanvragen.filter(a => a.status === "in behandeling").length, icon: "⏳", kleur: "#E8A838" },
            { label: "Goedgekeurd",     val: aanvragen.filter(a => a.status === "goedgekeurd").length,   icon: "✅", kleur: "#2D9B6F" },
            { label: "Conflicten",      val: problematisch.length, icon: "⚠️", kleur: "#E05555" },
          ].map(s => (
            <div key={s.label} style={{ background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "12px", padding: "20px", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>{s.icon}</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: s.kleur }}>{s.val}</div>
              <div style={{ fontSize: "12px", color: "#7A9AB5", marginTop: "4px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Debug log panel */}
        {debugLog.length > 0 && (
          <div style={{ background: "#0D1A26", border: "1px solid rgba(74,158,224,0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontFamily: "monospace", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#4A9EE0", fontFamily: "Georgia, serif", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>Verbinding log</span>
              <button onClick={() => setDebugLog([])} style={{ background: "none", border: "none", color: "#7A9AB5", cursor: "pointer", fontSize: "11px" }}>wis</button>
            </div>
            {debugLog.map((l, i) => <div key={i} style={{ color: l.startsWith("❌") ? "#E05555" : l.startsWith("✅") ? "#2D9B6F" : "#B0BEC8", marginBottom: "2px" }}>{l}</div>)}
          </div>
        )}

        {/* ── AANVRAGEN ── */}
        {adminSub === "aanvragen" && (
          <div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "8px 16px", fontSize: "13px" }}>
                <option value="alle">Alle statussen</option>
                <option value="in behandeling">In behandeling</option>
                <option value="goedgekeurd">Goedgekeurd</option>
                <option value="afgewezen">Afgewezen</option>
              </select>
              <select value={filterWerknemer} onChange={e => setFilterWerknemer(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "8px 16px", fontSize: "13px" }}>
                <option value="alle">Alle werknemers</option>
                {werknemers.map(w => <option key={w.id} value={w.id}>{w.naam}</option>)}
              </select>
              <span style={{ fontSize: "13px", color: "#7A9AB5", display: "flex", alignItems: "center" }}>{gefilterd.length} aanvra{gefilterd.length === 1 ? "ag" : "gen"}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {gefilterd.map(aanvraag => {
                const werknemer = werknemers.find(w => w.id === aanvraag.werknemerId);
                const conflicts = getConflicts(aanvraag, aanvragen, werknemers);
                const bezettingConflicten = getBezettingConflicten(aanvraag, aanvragen, werknemers);
                const problem = conflicts.length > 0 || bezettingConflicten.length > 0;
                const conflictNamen = conflicts.map(r => werknemers.find(w => w.id === r.werknemerId)?.naam).filter(Boolean);
                return (
                  <div key={aanvraag.id} style={{ background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "12px", padding: "20px", border: problem ? "1px solid rgba(224,85,85,0.4)" : "1px solid rgba(255,255,255,0.06)", boxShadow: problem ? "0 0 16px rgba(224,85,85,0.1)" : "0 4px 16px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", flexShrink: 0, background: werknemer?.kleur || "#4A9EE0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold", color: "#0F1923" }}>{werknemer?.naam?.charAt(0) || "?"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: "bold", fontSize: "15px" }}>{werknemer?.naam || "Onbekend"}</span>
                        {(werknemer?.afdelingen || []).map(afd => <AfdTag key={afd} label={afd} />)}
                        <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.06)", borderRadius: "6px", padding: "2px 8px", color: "#B0BEC8" }}>{aanvraag.type}</span>
                        {conflictNamen.length > 0 && <span style={{ fontSize: "11px", background: "rgba(224,85,85,0.15)", border: "1px solid rgba(224,85,85,0.3)", borderRadius: "6px", padding: "2px 8px", color: "#E05555" }}>⚠️ Conflict met {conflictNamen.join(", ")}</span>}
                        {bezettingConflicten.map((bc, i) => (
                          <span key={i} style={{ fontSize: "11px", background: "rgba(232,168,56,0.15)", border: "1px solid rgba(232,168,56,0.35)", borderRadius: "6px", padding: "2px 8px", color: "#E8A838" }}>
                            ⚠️ {bc.afd}: slechts {bc.aanwezig}/{bc.minimum} aanwezig
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: "13px", color: "#7A9AB5" }}>📅 {aanvraag.van}{aanvraag.van !== aanvraag.tot ? ` → ${aanvraag.tot}` : ""} &nbsp;·&nbsp; {dateDiff(aanvraag.van, aanvraag.tot)} dag{dateDiff(aanvraag.van, aanvraag.tot) > 1 ? "en" : ""}{aanvraag.opmerking && <> &nbsp;·&nbsp; <span style={{ fontStyle: "italic" }}>{aanvraag.opmerking}</span></>}</div>
                      {aanvraag.beheerderOpmerking && <div style={{ fontSize: "12px", marginTop: "4px", padding: "5px 10px", borderRadius: "6px", background: aanvraag.status === "goedgekeurd" ? "rgba(45,155,111,0.1)" : "rgba(224,85,85,0.1)", color: aanvraag.status === "goedgekeurd" ? "#2D9B6F" : "#E05555", fontStyle: "italic" }}>💬 "{aanvraag.beheerderOpmerking}"</div>}
                      <div style={{ fontSize: "11px", color: "#4A6A82", marginTop: "4px" }}>Ingediend op {aanvraag.ingediend}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                      <span style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "20px", background: statusBg[aanvraag.status], color: statusKleur[aanvraag.status], fontWeight: "bold", whiteSpace: "nowrap" }}>{aanvraag.status}</span>
                      {aanvraag.status === "in behandeling" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => { setReactieModal({ aanvraagId: aanvraag.id, nieuweStatus: "goedgekeurd" }); setReactieTekst(""); }} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(45,155,111,0.4)", background: "rgba(45,155,111,0.1)", color: "#2D9B6F", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>✓ Goed</button>
                          <button onClick={() => { setReactieModal({ aanvraagId: aanvraag.id, nieuweStatus: "afgewezen" }); setReactieTekst(""); }} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(224,85,85,0.4)", background: "rgba(224,85,85,0.1)", color: "#E05555", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>✕ Wijs af</button>
                        </div>
                      )}
                      <button onClick={() => { if (window.confirm("Aanvraag verwijderen?")) setAanvragen(prev => prev.filter(a => a.id !== aanvraag.id)); }} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#4A6A82", cursor: "pointer", fontSize: "13px" }} title="Verwijderen">🗑</button>
                    </div>
                  </div>
                );
              })}
              {gefilterd.length === 0 && <div style={{ textAlign: "center", padding: "60px", color: "#7A9AB5" }}>Geen aanvragen gevonden.</div>}
            </div>
          </div>
        )}

        {/* ── WERKNEMERS ── */}
        {adminSub === "werknemers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <button onClick={() => setWModal(true)} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer", background: "linear-gradient(135deg, #4A9EE0, #2D6FA8)", color: "#fff", fontSize: "13px", fontWeight: "bold", fontFamily: "Georgia, serif", boxShadow: "0 4px 12px rgba(74,158,224,0.3)" }}>+ Werknemer toevoegen</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: "16px" }}>
              {werknemers.map(w => {
                const eigen = aanvragen.filter(a => a.werknemerId === w.id);
                const openstaand = eigen.filter(a => a.status === "in behandeling").length;
                const goed = eigen.filter(a => a.status === "goedgekeurd").length;
                const totaalU = berekenVerlofUren(w.contractUren);
                const gebruiktU = gebruikteVerlofUren(w.id, aanvragen, w.contractUren);
                const resterendU = totaalU ? Math.max(0, totaalU - gebruiktU) : null;
                const pct = totaalU ? Math.min(100, Math.round((gebruiktU / totaalU) * 100)) : 0;
                const barKleur = pct > 90 ? "#E05555" : pct > 65 ? "#E8A838" : "#2D9B6F";
                return (
                  <div key={w.id} style={{ background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "12px", padding: "20px", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
                      <div style={{ width: "46px", height: "46px", borderRadius: "50%", flexShrink: 0, background: w.kleur, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold", color: "#0F1923" }}>{w.naam.charAt(0)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Naam bewerken */}
                        {naamBewerkId === w.id ? (
                          <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                            <input autoFocus value={naamInvoer} onChange={e => setNaamInvoer(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveNaam(w.id); if (e.key === "Escape") setNaamBewerkId(null); }} style={{ ...inputStyle, padding: "5px 10px", fontSize: "14px", fontWeight: "bold", flex: 1 }} />
                            <button onClick={() => saveNaam(w.id)} style={{ padding: "5px 10px", borderRadius: "7px", border: "none", background: "#2D9B6F", color: "#fff", cursor: "pointer", fontSize: "13px" }}>✓</button>
                            <button onClick={() => setNaamBewerkId(null)} style={{ padding: "5px 10px", borderRadius: "7px", border: "none", background: "rgba(255,255,255,0.08)", color: "#7A9AB5", cursor: "pointer", fontSize: "13px" }}>✕</button>
                          </div>
                        ) : (
                          <div onClick={() => { setNaamBewerkId(w.id); setNaamInvoer(w.naam); }} title="Klik om naam te bewerken" style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            {w.naam} <span style={{ fontSize: "11px", color: "#4A6A82", fontWeight: "normal" }}>✏️</span>
                          </div>
                        )}
                        {/* Afdelingen */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px" }}>
                          {w.afdelingen.length === 0 && <span style={{ fontSize: "12px", color: "#4A6A82", fontStyle: "italic" }}>Geen afdelingen</span>}
                          {w.afdelingen.map(afd => <AfdTag key={afd} label={afd} onRemove={() => removeAfdeling(w.id, afd)} />)}
                        </div>
                        {bewerkId === w.id ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <input autoFocus value={afdInvoer} onChange={e => setAfdInvoer(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && afdInvoer.trim()) { addAfdeling(w.id, afdInvoer); setAfdInvoer(""); } if (e.key === "Escape") { setBewerkId(null); setAfdInvoer(""); } }} placeholder="Naam afdeling + Enter" style={{ ...inputStyle, padding: "5px 10px", fontSize: "12px", flex: 1 }} />
                            <button onClick={() => { addAfdeling(w.id, afdInvoer); setAfdInvoer(""); }} style={{ padding: "5px 10px", borderRadius: "7px", border: "none", background: "#2D9B6F", color: "#fff", cursor: "pointer" }}>✓</button>
                            <button onClick={() => { setBewerkId(null); setAfdInvoer(""); }} style={{ padding: "5px 10px", borderRadius: "7px", border: "none", background: "rgba(255,255,255,0.08)", color: "#7A9AB5", cursor: "pointer" }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setBewerkId(w.id); setAfdInvoer(""); }} style={{ padding: "4px 12px", borderRadius: "20px", border: "1px dashed rgba(74,158,224,0.35)", background: "transparent", color: "#4A6A82", cursor: "pointer", fontSize: "11px", fontFamily: "Georgia, serif" }}>+ afdeling toevoegen</button>
                        )}
                      </div>
                    </div>
                    {/* Contracturen */}
                    <div style={{ marginBottom: "12px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#7A9AB5", letterSpacing: "1px", textTransform: "uppercase" }}>Contracturen / Verlof</span>
                        {urenBewerkId === w.id ? (
                          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                            <input autoFocus type="number" min="1" max="40" value={urenInvoer} onChange={e => setUrenInvoer(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveUren(w.id); if (e.key === "Escape") setUrenBewerkId(null); }} placeholder="uren/week" style={{ ...inputStyle, padding: "3px 8px", fontSize: "12px", width: "90px" }} />
                            <button onClick={() => saveUren(w.id)} style={{ padding: "3px 8px", borderRadius: "6px", border: "none", background: "#2D9B6F", color: "#fff", cursor: "pointer", fontSize: "12px" }}>✓</button>
                            <button onClick={() => setUrenBewerkId(null)} style={{ padding: "3px 8px", borderRadius: "6px", border: "none", background: "rgba(255,255,255,0.08)", color: "#7A9AB5", cursor: "pointer", fontSize: "12px" }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setUrenBewerkId(w.id); setUrenInvoer(w.contractUren ? String(w.contractUren) : ""); }} style={{ padding: "3px 10px", borderRadius: "20px", border: "1px dashed rgba(74,158,224,0.35)", background: "transparent", color: "#4A6A82", cursor: "pointer", fontSize: "11px", fontFamily: "Georgia, serif" }}>
                            {w.contractUren ? `${w.contractUren}u/week ✏️` : "⚙️ contracturen instellen"}
                          </button>
                        )}
                      </div>
                      {totaalU ? (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px" }}>
                            <span><b style={{ color: barKleur }}>{Math.round(resterendU)}u</b> resterend</span>
                            <span style={{ color: "#7A9AB5" }}>{Math.round(gebruiktU)}u / {totaalU}u</span>
                          </div>
                          <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: barKleur, borderRadius: "3px", transition: "width 0.4s" }} />
                          </div>
                          <div style={{ fontSize: "10px", color: "#4A6A82", marginTop: "4px" }}>Totaal {totaalU}u/jaar · {(w.contractUren / 40 * 25).toFixed(1)} vakantiedagen</div>
                        </div>
                      ) : <div style={{ fontSize: "11px", color: "#4A6A82", fontStyle: "italic" }}>Stel contracturen in om verlofuren te berekenen</div>}
                    </div>
                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                      {[{ label: "Aanvragen", val: eigen.length, kleur: "#4A9EE0" }, { label: "Wachtend", val: openstaand, kleur: "#E8A838" }, { label: "Goedgekeurd", val: goed, kleur: "#2D9B6F" }].map(s => (
                        <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "18px", fontWeight: "bold", color: s.kleur }}>{s.val}</div>
                          <div style={{ fontSize: "10px", color: "#7A9AB5", marginTop: "2px" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {w.pin && <button onClick={() => { if (window.confirm(`Pincode van "${w.naam}" resetten?`)) setWerknemers(prev => prev.map(x => x.id === w.id ? { ...x, pin: null } : x)); }} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "1px solid rgba(232,168,56,0.3)", background: "rgba(232,168,56,0.06)", color: "#E8A838", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>🔑 Reset pin</button>}
                      <button onClick={() => { if (window.confirm(`Werknemer "${w.naam}" verwijderen? Alle aanvragen worden ook verwijderd.`)) { setWerknemers(prev => prev.filter(x => x.id !== w.id)); setAanvragen(prev => prev.filter(a => a.werknemerId !== w.id)); } }} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "1px solid rgba(224,85,85,0.25)", background: "rgba(224,85,85,0.06)", color: "#E05555", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>🗑 Verwijderen</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Modal */}
            {wModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setWModal(false)}>
                <div style={{ background: "#1A2C42", borderRadius: "16px", padding: "32px", width: "420px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "18px" }}>Nieuwe werknemer</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div><label style={labelStyle}>Naam</label><input value={nieuweWerknemer.naam} onChange={e => setNieuweWerknemer(n => ({ ...n, naam: e.target.value }))} placeholder="bijv. Jan de Boer" style={inputStyle} /></div>
                    <div>
                      <label style={labelStyle}>Afdelingen</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", minHeight: "28px", marginBottom: "8px" }}>
                        {nieuweWerknemer.afdelingen.map(afd => <AfdTag key={afd} label={afd} onRemove={() => setNieuweWerknemer(n => ({ ...n, afdelingen: n.afdelingen.filter(a => a !== afd) }))} />)}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input value={nieuweWerknemer.invoer} onChange={e => setNieuweWerknemer(n => ({ ...n, invoer: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") { const afd = nieuweWerknemer.invoer.trim(); if (afd && !nieuweWerknemer.afdelingen.includes(afd)) setNieuweWerknemer(n => ({ ...n, afdelingen: [...n.afdelingen, afd], invoer: "" })); } }} placeholder="Typ afdeling + Enter" style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => { const afd = nieuweWerknemer.invoer.trim(); if (afd && !nieuweWerknemer.afdelingen.includes(afd)) setNieuweWerknemer(n => ({ ...n, afdelingen: [...n.afdelingen, afd], invoer: "" })); }} style={{ padding: "11px 16px", borderRadius: "8px", border: "none", background: "rgba(74,158,224,0.2)", color: "#4A9EE0", cursor: "pointer", fontSize: "16px" }}>+</button>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Contracturen per week</label>
                      <input type="number" min="1" max="40" value={nieuweWerknemer.contractUren} onChange={e => setNieuweWerknemer(n => ({ ...n, contractUren: e.target.value }))} placeholder="bijv. 32 of 40" style={inputStyle} />
                      {nieuweWerknemer.contractUren && parseInt(nieuweWerknemer.contractUren) > 0 && <div style={{ fontSize: "11px", color: "#4A9EE0", marginTop: "5px" }}>→ {berekenVerlofUren(parseInt(nieuweWerknemer.contractUren))}u verlof/jaar · {(parseInt(nieuweWerknemer.contractUren) / 40 * 25).toFixed(1)} vakantiedagen</div>}
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={() => setWModal(false)} style={{ flex: 1, padding: "11px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#7A9AB5", cursor: "pointer", fontFamily: "Georgia, serif" }}>Annuleren</button>
                      <button onClick={handleWerknemerToevoegen} style={{ flex: 2, padding: "11px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #4A9EE0, #2D6FA8)", color: "#fff", cursor: "pointer", fontWeight: "bold", fontFamily: "Georgia, serif" }}>Toevoegen</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── KALENDER OVERZICHT ── */}
        {adminSub === "kalender" && (
          <div>
            <div style={{ marginBottom: "20px", fontSize: "14px", color: "#7A9AB5" }}>Alle goedgekeurde en openstaande verlofperioden per werknemer.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {werknemers.map(w => {
                const actief = aanvragen.filter(a => a.werknemerId === w.id && a.status !== "afgewezen");
                if (!actief.length) return null;
                return (
                  <div key={w.id} style={{ background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "12px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: w.kleur, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "bold", color: "#0F1923" }}>{w.naam.charAt(0)}</div>
                      <span style={{ fontWeight: "bold", fontSize: "14px" }}>{w.naam}</span>
                      {w.afdelingen.map(afd => <AfdTag key={afd} label={afd} />)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {actief.map(a => (
                        <div key={a.id} style={{ background: a.status === "goedgekeurd" ? "rgba(45,155,111,0.12)" : "rgba(232,168,56,0.12)", border: `1px solid ${a.status === "goedgekeurd" ? "rgba(45,155,111,0.35)" : "rgba(232,168,56,0.35)"}`, borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: a.status === "goedgekeurd" ? "#2D9B6F" : "#E8A838" }}>
                          {a.type === "Vrije dag" ? "☀️" : "🌴"} {a.van}{a.van !== a.tot ? ` → ${a.tot}` : ""} <span style={{ opacity: 0.7 }}>({dateDiff(a.van, a.tot)}d)</span>
                          {isProblem(a, aanvragen, werknemers) && <span style={{ marginLeft: "6px", color: "#E05555" }}>⚠️</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reactie modal */}
      {reactieModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setReactieModal(null)}>
          <div style={{ background: "#1A2C42", borderRadius: "16px", padding: "28px", width: "400px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: "8px", fontSize: "17px", color: reactieModal.nieuweStatus === "goedgekeurd" ? "#2D9B6F" : "#E05555" }}>
              {reactieModal.nieuweStatus === "goedgekeurd" ? "✓ Aanvraag goedkeuren" : "✕ Aanvraag afwijzen"}
            </h3>
            <p style={{ color: "#7A9AB5", fontSize: "13px", margin: "0 0 16px" }}>Voeg optioneel een opmerking toe voor de werknemer.</p>
            <textarea
              value={reactieTekst}
              onChange={e => setReactieTekst(e.target.value)}
              placeholder="Bijv. geniet van je vakantie! / Helaas te druk in deze periode..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical", minHeight: "80px", marginBottom: "16px" }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setReactieModal(null)} style={{ flex: 1, padding: "11px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#7A9AB5", cursor: "pointer", fontFamily: "Georgia, serif" }}>Annuleren</button>
              <button onClick={() => { handleStatusChange(reactieModal.aanvraagId, reactieModal.nieuweStatus, reactieTekst); setReactieModal(null); }} style={{ flex: 2, padding: "11px", borderRadius: "8px", border: "none", background: reactieModal.nieuweStatus === "goedgekeurd" ? "linear-gradient(135deg, #2D9B6F, #1E7050)" : "linear-gradient(135deg, #E05555, #B03030)", color: "#fff", cursor: "pointer", fontWeight: "bold", fontFamily: "Georgia, serif" }}>
                {reactieModal.nieuweStatus === "goedgekeurd" ? "✓ Goedkeuren" : "✕ Afwijzen"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        select option { background: #1A2C42; color: #E8EDF2; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
      `}</style>
    </div>
  );
}

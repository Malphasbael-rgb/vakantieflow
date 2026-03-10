import { useState, useMemo, useEffect, useCallback } from "react";

const WERKNEMERS_INIT = [
  { id: 1,  naam: "Alinda Postma",            afdelingen: ["Micro","Orglab"], kleur: "#FF6B6B", contractUren: 36 },
  { id: 2,  naam: "Anita Dijkstra",            afdelingen: ["Chemie"], kleur: "#4ECDC4", contractUren: 40 },
  { id: 3,  naam: "Elke Buikstra-bosklopper",  afdelingen: ["Micro"], kleur: "#FFE66D", contractUren: 32 },
  { id: 4,  naam: "Ina Betlehem Stevens",       afdelingen: [], kleur: "#A8E6CF", contractUren: null },
  { id: 5,  naam: "Monique Breijmer",           afdelingen: ["Vrijgave"], kleur: "#FF8B94", contractUren: 40 },
  { id: 6,  naam: "Erwin Kooistra",             afdelingen: [], kleur: "#B4A7D6", contractUren: null },
  { id: 7,  naam: "Nadia Keuning Hochwald",     afdelingen: ["Klachten"], kleur: "#96CEB4", contractUren: 24 },
  { id: 8,  naam: "Sjoerd Kaper",               afdelingen: [], kleur: "#FFEAA7", contractUren: null },
  { id: 9,  naam: "Leon Segerink",              afdelingen: [], kleur: "#DDA0DD", contractUren: null },
  { id: 10, naam: "Melanie Schep",              afdelingen: [], kleur: "#98D8C8", contractUren: null },
  { id: 11, naam: "Nick",                       afdelingen: [], kleur: "#F7DC6F", contractUren: null },
  { id: 12, naam: "Bart Reinsma",               afdelingen: ["Orglab"], kleur: "#82E0AA", contractUren: 40 },
  { id: 13, naam: "Roos Van Wijnen",            afdelingen: [], kleur: "#F1948A", contractUren: null },
  { id: 14, naam: "Suleika Ramdien",            afdelingen: [], kleur: "#AED6F1", contractUren: null },
  { id: 15, naam: "Alwin Speelman",             afdelingen: [], kleur: "#D7BDE2", contractUren: null },
];

const AANVRAGEN_INIT = [
  { id: 1, werknemerId: 1, type: "Vakantie", van: "2026-07-06", tot: "2026-07-17", opmerking: "Zomervakantie", status: "goedgekeurd", ingediend: "2026-03-01", beheerderOpmerking: "Fijne vakantie!", beslissingsDatum: "2026-03-04" },
  { id: 2, werknemerId: 3, type: "Vakantie", van: "2026-07-13", tot: "2026-07-24", opmerking: "", status: "goedgekeurd", ingediend: "2026-02-28", beheerderOpmerking: "", beslissingsDatum: "2026-03-02" },
  { id: 3, werknemerId: 7, type: "Vakantie", van: "2026-04-27", tot: "2026-05-01", opmerking: "Koningsdagweekend", status: "in behandeling", ingediend: "2026-03-05", beheerderOpmerking: "", beslissingsDatum: null },
  { id: 4, werknemerId: 2, type: "Vrije dag", van: "2026-04-10", tot: "2026-04-10", opmerking: "Tandarts", status: "goedgekeurd", ingediend: "2026-03-08", beheerderOpmerking: "", beslissingsDatum: "2026-03-09" },
  { id: 5, werknemerId: 5, type: "Vakantie", van: "2026-08-03", tot: "2026-08-14", opmerking: "", status: "in behandeling", ingediend: "2026-03-09", beheerderOpmerking: "", beslissingsDatum: null },
  { id: 6, werknemerId: 12, type: "Vakantie", van: "2026-06-15", tot: "2026-06-19", opmerking: "City trip", status: "afgewezen", ingediend: "2026-02-20", beheerderOpmerking: "Te druk die periode", beslissingsDatum: "2026-02-25" },
];

// Nederlandse nationale feestdagen (vast + berekend)
function feestdagenVoorJaar(jaar) {
  // Pasen berekening (Gauss)
  function pasen(j) {
    const a=j%19,b=Math.floor(j/100),c=j%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),maand=Math.floor((h+l-7*m+114)/31),dag=(h+l-7*m+114)%31+1;
    return new Date(j, maand-1, dag);
  }
  const p = pasen(jaar);
  const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
  const fmt = d => d.toISOString().split("T")[0];
  // Returns a Map: datum -> naam
  // Eerste Paasdag = altijd zondag, Tweede Paasdag = maandag
  // Eerste Pinksterdag = altijd zondag
  // Deze zijn al weekend dus tellen niet als extra vrije dag
  // Goede Vrijdag is geen officiële feestdag in NL maar vaak wel vrij
  return new Map([
    [`${jaar}-01-01`, "Nieuwjaarsdag"],
    [fmt(add(p, -2)),  "Goede Vrijdag (geen officiële feestdag)"],
    [fmt(add(p, 1)),   "Tweede Paasdag"],
    [`${jaar}-04-27`,  "Koningsdag"],
    [`${jaar}-05-05`,  "Bevrijdingsdag"],
    [fmt(add(p, 39)),  "Hemelvaartsdag"],
    [fmt(add(p, 50)),  "Tweede Pinksterdag"],
    [`${jaar}-12-25`,  "Eerste Kerstdag"],
    [`${jaar}-12-26`,  "Tweede Kerstdag"],
  ]);
}

// Schoolvakanties regio Noord per jaar (bron: Rijksoverheid)
function schoolvakantiesNoord(jaar) {
  const vakanties = {
    2025: [
      { naam: "Herfstvakantie",    van: "2025-10-18", tot: "2025-10-26" },
      { naam: "Kerstvakantie",     van: "2025-12-20", tot: "2026-01-04" },
    ],
    2026: [
      { naam: "Kerstvakantie",     van: "2025-12-20", tot: "2026-01-04" },
      { naam: "Voorjaarsvakantie", van: "2026-02-21", tot: "2026-03-01" },
      { naam: "Meivakantie",       van: "2026-04-18", tot: "2026-05-03" },
      { naam: "Zomervakantie",     van: "2026-07-04", tot: "2026-08-16" },
      { naam: "Herfstvakantie",    van: "2026-10-10", tot: "2026-10-18" },
      { naam: "Kerstvakantie",     van: "2026-12-19", tot: "2027-01-03" },
    ],
    2027: [
      { naam: "Kerstvakantie",     van: "2026-12-19", tot: "2027-01-03" },
      { naam: "Voorjaarsvakantie", van: "2027-02-20", tot: "2027-02-28" },
      { naam: "Meivakantie",       van: "2027-04-24", tot: "2027-05-09" },
      { naam: "Zomervakantie",     van: "2027-07-03", tot: "2027-08-15" },
    ],
  };
  return vakanties[jaar] || [];
}

// Is een datum een schoolvakantiedag in regio Noord?
function schoolvakantieOpDag(dagStr) {
  const jaar = parseInt(dagStr.split("-")[0]);
  const vakanties = [...schoolvakantiesNoord(jaar - 1), ...schoolvakantiesNoord(jaar)];
  return vakanties.find(v => dagStr >= v.van && dagStr <= v.tot) || null;
}

// Is een datum een werkdag? (ma-vr, geen feestdag)
function isWerkdag(datumStr) {
  const d = new Date(datumStr);
  const dag = d.getDay(); // 0=zo, 6=za
  if (dag === 0 || dag === 6) return false;
  const feestdagen = feestdagenVoorJaar(d.getFullYear());
  return !feestdagen.has(datumStr);
}

// Tel werkdagen tussen twee datums (inclusief)
function werkdagen(van, tot) {
  let tel = 0;
  const d = new Date(van);
  const eind = new Date(tot);
  while (d <= eind) {
    const str = d.toISOString().split("T")[0];
    if (isWerkdag(str)) tel++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(1, tel);
}

function dateDiff(van, tot) {
  return werkdagen(van, tot);
}
function overlapt(a, b) { return a.van <= b.tot && a.tot >= b.van; }

// Formatteer datum van YYYY-MM-DD naar DD/MM/YYYY
function fmtDatum(str) {
  if (!str) return "";
  const [j, m, d] = str.split("-");
  return `${d}/${m}/${j}`;
}


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
    .reduce((s, a) => s + werkdagen(a.van, a.tot) * (u / 5), 0);
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

  // Toetsenbord ondersteuning
  useEffect(() => {
    function handleKey(e) {
      if (e.key >= "0" && e.key <= "9") handleCijfer(e.key);
      else if (e.key === "Backspace") handleVerwijder();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

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
        <p style={{ color: "#E8EDF2", margin: "0 0 28px", fontSize: "18px", fontWeight: "bold", letterSpacing: "0.5px" }}>Selecteer je naam om verder te gaan</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {[...werknemers].sort((a,b) => a.naam.localeCompare(b.naam, 'nl')).map(w => (
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
                    📅 {fmtDatum(a.van)}{a.van !== a.tot ? ` → ${fmtDatum(a.tot)}` : ""} <span style={{ color: "#7A9AB5" }}>· {dateDiff(a.van, a.tot)} dag{dateDiff(a.van, a.tot) > 1 ? "en" : ""}</span>
                  </div>
                  {a.opmerking && <div style={{ fontSize: "13px", color: "#7A9AB5", fontStyle: "italic" }}>"{a.opmerking}"</div>}
                  {a.beheerderOpmerking && <div style={{ fontSize: "12px", marginTop: "6px", padding: "6px 10px", borderRadius: "6px", background: a.status === "goedgekeurd" ? "rgba(45,155,111,0.1)" : "rgba(224,85,85,0.1)", color: a.status === "goedgekeurd" ? "#2D9B6F" : "#E05555", fontStyle: "italic" }}>💬 Beheerder: "{a.beheerderOpmerking}"</div>}
                  {a.beslissingsDatum && a.status !== "in behandeling" && <div style={{ fontSize: "11px", color: "#4A6A82", marginTop: "4px" }}>{a.status === "goedgekeurd" ? "✅ Goedgekeurd op" : "❌ Afgewezen op"} {fmtDatum(a.beslissingsDatum)}</div>}
                  <div style={{ fontSize: "11px", color: "#4A6A82", marginTop: "8px" }}>Ingediend op {fmtDatum(a.ingediend)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nieuwe aanvraag */}
        {tab === "nieuw" && (() => {
          const huidigJaar = new Date().getFullYear();
          const feestdagenDitJaar = feestdagenVoorJaar(huidigJaar);
          const schoolvakDitJaar = schoolvakantiesNoord(huidigJaar);
          const vandaag = new Date().toISOString().split("T")[0];
          const komendFeestdagen = [...feestdagenDitJaar.entries()]
            .sort((a,b) => a[0].localeCompare(b[0]))
            .filter(([d]) => d >= vandaag);
          const komendSchoolVak = schoolvakDitJaar.filter(v => v.tot >= vandaag);

          return (
          <div>
            {/* Feestdagen + schoolvakanties info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              {/* Nationale feestdagen */}
              <div style={{ background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "11px", color: "#7A9AB5", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>🇳🇱 Nationale feestdagen {huidigJaar}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {komendFeestdagen.map(([d, naam]) => {
                    const datum = new Date(d + "T12:00:00");
                    const dagNamen = ["zo","ma","di","wo","do","vr","za"];
                    const isPast = d < vandaag;
                    return (
                      <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: isPast ? 0.4 : 1 }}>
                        <span style={{ fontSize: "12px", color: "#E8EDF2" }}>{naam}</span>
                        <span style={{ fontSize: "11px", color: "#7A9AB5", whiteSpace: "nowrap", marginLeft: "8px" }}>{dagNamen[datum.getDay()]} {fmtDatum(d)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Schoolvakanties */}
              <div style={{ background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "11px", color: "#7A9AB5", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>🏫 Schoolvakanties regio Noord {huidigJaar}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {komendSchoolVak.map(v => {
                    const isPast = v.tot < vandaag;
                    return (
                      <div key={v.naam} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: isPast ? 0.4 : 1 }}>
                        <span style={{ fontSize: "12px", color: "#E8EDF2" }}>{v.naam}</span>
                        <span style={{ fontSize: "11px", color: "#7A9AB5", whiteSpace: "nowrap", marginLeft: "8px" }}>{fmtDatum(v.van)} – {fmtDatum(v.tot)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

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
                      <input type="date" lang="nl" value={form.van} onChange={e => setForm(f => ({ ...f, van: e.target.value, tot: f.tot < e.target.value ? e.target.value : f.tot }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Einddatum</label>
                      <input type="date" lang="nl" value={form.tot} min={form.van} onChange={e => setForm(f => ({ ...f, tot: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Datum</label>
                    <input type="date" lang="nl" value={form.van} onChange={e => setForm(f => ({ ...f, van: e.target.value, tot: e.target.value }))} style={inputStyle} />
                  </div>
                )}
                {form.van && form.tot && (
                  <div style={{ background: "rgba(74,158,224,0.08)", border: "1px solid rgba(74,158,224,0.2)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", color: "#4A9EE0" }}>
                    📅 {form.type === "Vakantie" ? `${dateDiff(form.van, form.tot)} werkdag${dateDiff(form.van, form.tot) > 1 ? "en" : ""} (${fmtDatum(form.van)} → ${fmtDatum(form.tot)})` : fmtDatum(form.van)}
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
          </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── HOOFD APP ───────────────────────────────────────────────────────────────
export default function VakantieApp() {
  const [scherm, setScherm]         = useState("keuze"); // "keuze" | "werknemerKeuze" | "werknemerPin" | "werknemerPortaal" | "adminPin" | "admin"
  const [actiefWerknemer, setActiefWerknemer] = useState(null);
  const ADMIN_PIN_KEY = "vakantieflow:adminpin";
  const [adminPin, setAdminPin] = useState(null);
  const [werknemers, setWerknemers] = useState(WERKNEMERS_INIT);
  const [aanvragen, setAanvragen]   = useState(AANVRAGEN_INIT);
  const [geladen, setGeladen]       = useState(false);
  const [opslagStatus, setOpslagStatus] = useState(null);


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
  const [bevestigingToast, setBevestigingToast] = useState(null); // { status, naam }
  const [jaarKeuze, setJaarKeuze] = useState(new Date().getFullYear());

  // Preview mode: geen Supabase, alles lokaal
  useEffect(() => { setGeladen(true); }, []);
  const slaOp = useCallback(() => {}, []);

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
    const datum = new Date().toISOString().split("T")[0];
    setAanvragen(prev => prev.map(a => a.id === id ? { ...a, status, beheerderOpmerking: opmerking || "", beslissingsDatum: datum } : a));
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
          {[{ key: "aanvragen", label: "📋 Aanvragen" }, { key: "werknemers", label: "👥 Werknemers" }, { key: "kalender", label: "📅 Overzicht" }, { key: "jaar", label: "📊 Jaaroverzicht" }].map(item => (
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
          <button onClick={() => { if (window.confirm("Beheerders pincode resetten? Je moet dan een nieuwe kiezen.")) { setAdminPin(null);  setScherm("keuze"); } }} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#4A6A82", cursor: "pointer", fontSize: "11px", fontFamily: "Georgia, serif" }} title="Reset beheerders pincode">🔑</button>
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
            <div key={s.label} style={{ background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "10px", padding: "12px 16px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ fontSize: "20px", flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: s.kleur, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: "11px", color: "#7A9AB5", marginTop: "3px", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

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
                      <div style={{ fontSize: "13px", color: "#7A9AB5" }}>📅 {fmtDatum(aanvraag.van)}{aanvraag.van !== aanvraag.tot ? ` → ${fmtDatum(aanvraag.tot)}` : ""} &nbsp;·&nbsp; {dateDiff(aanvraag.van, aanvraag.tot)} dag{dateDiff(aanvraag.van, aanvraag.tot) > 1 ? "en" : ""}{aanvraag.opmerking && <> &nbsp;·&nbsp; <span style={{ fontStyle: "italic" }}>{aanvraag.opmerking}</span></>}</div>
                      {aanvraag.beheerderOpmerking && <div style={{ fontSize: "12px", marginTop: "4px", padding: "5px 10px", borderRadius: "6px", background: aanvraag.status === "goedgekeurd" ? "rgba(45,155,111,0.1)" : "rgba(224,85,85,0.1)", color: aanvraag.status === "goedgekeurd" ? "#2D9B6F" : "#E05555", fontStyle: "italic" }}>💬 "{aanvraag.beheerderOpmerking}"</div>}
                      <div style={{ fontSize: "11px", color: "#4A6A82", marginTop: "4px" }}>Ingediend op {fmtDatum(aanvraag.ingediend)}</div>
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
                          {a.type === "Vrije dag" ? "☀️" : "🌴"} {fmtDatum(a.van)}{a.van !== a.tot ? ` → ${fmtDatum(a.tot)}` : ""} <span style={{ opacity: 0.7 }}>({dateDiff(a.van, a.tot)}d)</span>
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
              <button onClick={() => {
                const aanvraag = aanvragen.find(a => a.id === reactieModal.aanvraagId);
                const wn = werknemers.find(w => w.id === aanvraag?.werknemerId);
                handleStatusChange(reactieModal.aanvraagId, reactieModal.nieuweStatus, reactieTekst);
                setReactieModal(null);
                setBevestigingToast({ status: reactieModal.nieuweStatus, naam: wn?.naam || "Werknemer" });
                setTimeout(() => setBevestigingToast(null), 3500);
              }} style={{ flex: 2, padding: "11px", borderRadius: "8px", border: "none", background: reactieModal.nieuweStatus === "goedgekeurd" ? "linear-gradient(135deg, #2D9B6F, #1E7050)" : "linear-gradient(135deg, #E05555, #B03030)", color: "#fff", cursor: "pointer", fontWeight: "bold", fontFamily: "Georgia, serif" }}>
                {reactieModal.nieuweStatus === "goedgekeurd" ? "✓ Goedkeuren" : "✕ Afwijzen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BEVESTIGING TOAST ── */}
      {bevestigingToast && (
        <div style={{ position: "fixed", bottom: "32px", left: "50%", transform: "translateX(-50%)", zIndex: 2000, animation: "fadeInUp 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 24px", borderRadius: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", border: `1px solid ${bevestigingToast.status === "goedgekeurd" ? "rgba(45,155,111,0.5)" : "rgba(224,85,85,0.5)"}`, background: bevestigingToast.status === "goedgekeurd" ? "linear-gradient(135deg, #1A3A2A, #162233)" : "linear-gradient(135deg, #3A1A1A, #231616)", fontFamily: "Georgia, serif" }}>
            <div style={{ fontSize: "28px" }}>{bevestigingToast.status === "goedgekeurd" ? "✅" : "❌"}</div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "bold", color: bevestigingToast.status === "goedgekeurd" ? "#2D9B6F" : "#E05555" }}>
                Aanvraag {bevestigingToast.status === "goedgekeurd" ? "goedgekeurd" : "afgewezen"}
              </div>
              <div style={{ fontSize: "13px", color: "#B0BEC8", marginTop: "2px" }}>
                {bevestigingToast.naam} is op de hoogte gesteld.
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ── JAAROVERZICHT ── */}
        {adminSub === "jaar" && (() => {
          const maanden = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
          const feestdagen = feestdagenVoorJaar(jaarKeuze);

          // Alle dagen van het jaar als matrix: maand -> dagen
          function dagenInMaand(jaar, maand) {
            return new Date(jaar, maand + 1, 0).getDate();
          }

          // Welke werknemers zijn vrij op dag (yyyy-mm-dd)?
          function vrijOpDag(dag) {
            return aanvragen
              .filter(a => a.status !== "afgewezen" && a.van <= dag && a.tot >= dag)
              .map(a => werknemers.find(w => w.id === a.werknemerId))
              .filter(Boolean);
          }

          const dagBreedte = 22;

          // Excel export: aanvragenlijst
          function exportExcel() {
            const rows = [["Werknemer", "Afdeling(en)", "Type", "Van", "Tot", "Werkdagen", "Status", "Ingediend", "Opmerking werknemer", "Opmerking beheerder"]];
            aanvragen
              .filter(a => a.van.startsWith(String(jaarKeuze)) || a.tot.startsWith(String(jaarKeuze)))
              .sort((a,b) => a.van.localeCompare(b.van))
              .forEach(a => {
                const w = werknemers.find(x => x.id === a.werknemerId);
                rows.push([
                  w ? w.naam : "?",
                  w ? w.afdelingen.join(", ") : "",
                  a.type,
                  fmtDatum(a.van),
                  fmtDatum(a.tot),
                  werkdagen(a.van, a.tot),
                  a.status,
                  fmtDatum(a.ingediend),
                  a.opmerking || "",
                  a.beheerderOpmerking || "",
                ]);
              });
            // Build CSV
            const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n");
            const bom = "﻿";
            const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `vakantieflow-aanvragen-${jaarKeuze}.csv`; a.click();
            URL.revokeObjectURL(url);
          }

          // PDF export: print jaaroverzicht
          function exportPDF() {
            window.print();
          }

          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
                <button onClick={() => setJaarKeuze(y => y - 1)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF2", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "16px" }}>‹</button>
                <span style={{ fontSize: "22px", fontWeight: "bold" }}>{jaarKeuze}</span>
                <button onClick={() => setJaarKeuze(y => y + 1)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF2", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "16px" }}>›</button>
                <div style={{ display: "flex", gap: "12px", marginLeft: "16px", fontSize: "12px", color: "#7A9AB5", flexWrap: "wrap", flex: 1 }}>
                  <span><span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", background: "#4A9EE0", marginRight: "5px", verticalAlign: "middle" }}/>Verlof</span>
                  <span><span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", background: "#E05555", marginRight: "5px", verticalAlign: "middle" }}/>Feestdag</span>
                  <span><span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", background: "rgba(100,180,100,0.4)", marginRight: "5px", verticalAlign: "middle" }}/>Schoolvakantie</span>
                  <span><span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", marginRight: "5px", verticalAlign: "middle" }}/>Weekend</span>
                </div>
                {/* Export knoppen */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={exportExcel} title="Download aanvragenlijst als CSV/Excel" style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(45,155,111,0.15)", border: "1px solid rgba(45,155,111,0.3)", color: "#2D9B6F", borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif", fontWeight: "bold" }}>
                    📊 Excel
                  </button>
                  <button onClick={exportPDF} title="Print / sla op als PDF" style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(224,85,85,0.15)", border: "1px solid rgba(224,85,85,0.3)", color: "#E05555", borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif", fontWeight: "bold" }}>
                    🖨️ PDF
                  </button>
                </div>
              </div>

              {/* Eén scrollbare container voor alle rijen inclusief maandlabels */}
              <div style={{ overflowX: "auto", paddingBottom: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: "max-content" }}>

                  {/* Maandlabels bovenaan, scrollt mee */}
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ width: "160px", flexShrink: 0 }} />
                    <div style={{ display: "flex", gap: "0" }}>
                      {maanden.map((mNaam, mIdx) => {
                        const aantalDagen = dagenInMaand(jaarKeuze, mIdx);
                        const breedte = aantalDagen * (dagBreedte/3.5 + 1) + 4; // +4 for border+padding
                        const isEvenMaand = mIdx % 2 === 0;
                        return (
                          <div key={mIdx} style={{ width: `${breedte}px`, flexShrink: 0, fontSize: "11px", color: isEvenMaand ? "#4A9EE0" : "#7A9AB5", textAlign: "center", overflow: "hidden", fontWeight: "bold", borderLeft: "2px solid rgba(255,255,255,0.12)", paddingLeft: "2px" }}>
                            {mNaam}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {[...werknemers].sort((a,b) => a.naam.localeCompare(b.naam, 'nl')).map(w => {
                    return (
                      <div key={w.id} style={{ display: "flex", alignItems: "center", gap: "0" }}>
                        {/* Naam kolom */}
                        <div style={{ width: "160px", flexShrink: 0, display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px" }}>
                          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: w.kleur, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", color: "#0F1923", flexShrink: 0 }}>{w.naam.charAt(0)}</div>
                          <span style={{ fontSize: "12px", color: "#B0BEC8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.naam.split(" ")[0]}</span>
                        </div>
                        {/* Dagen per maand met zichtbare scheiding */}
                        <div style={{ display: "flex", gap: "0" }}>
                          {maanden.map((mNaam, mIdx) => {
                            const aantalDagen = dagenInMaand(jaarKeuze, mIdx);
                            const isEvenMaand = mIdx % 2 === 0;
                            return (
                              <div key={mIdx} style={{ display: "flex", gap: "1px", borderLeft: "2px solid rgba(255,255,255,0.12)", paddingLeft: "2px", paddingRight: "2px", background: isEvenMaand ? "rgba(255,255,255,0.015)" : "transparent" }}>
                                {Array.from({ length: aantalDagen }, (_, dIdx) => {
                                  const dagNum = dIdx + 1;
                                  const dagStr = `${jaarKeuze}-${String(mIdx+1).padStart(2,"0")}-${String(dagNum).padStart(2,"0")}`;
                                  const dagObj = new Date(jaarKeuze, mIdx, dagNum);
                                  const isWeekend = dagObj.getDay() === 0 || dagObj.getDay() === 6;
                                  const isFeest = feestdagen.has(dagStr);
                                  const aanvraagOpDag = aanvragen.find(a => a.werknemerId === w.id && a.status !== "afgewezen" && a.van <= dagStr && a.tot >= dagStr);
                                  const schoolvak = schoolvakantieOpDag(dagStr);
                                  let bg = "rgba(255,255,255,0.15)"; // werkdag: wit
                                  const dagNamen = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
                                  const dagNaam = dagNamen[dagObj.getDay()];
                                  let title = `${dagNaam} ${fmtDatum(dagStr)}`;
                                  if (isFeest) { bg = "rgba(224,85,85,0.25)"; title = `${dagNaam} ${fmtDatum(dagStr)} · ${feestdagen.get(dagStr) || "Feestdag"}`; }
                                  else if (isWeekend) bg = "rgba(255,255,255,0.03)"; // weekend: grijs
                                  else if (schoolvak && !aanvraagOpDag) { bg = "rgba(100,180,100,0.2)"; title = `${dagNaam} ${fmtDatum(dagStr)} · 🏫 ${schoolvak.naam}`; }
                                  else if (aanvraagOpDag) {
                                    bg = aanvraagOpDag.status === "goedgekeurd" ? w.kleur + "CC" : "rgba(232,168,56,0.6)";
                                    title = `${dagNaam} ${fmtDatum(dagStr)} · ${aanvraagOpDag.type} (${aanvraagOpDag.status})${schoolvak ? " · 🏫 " + schoolvak.naam : ""}`;
                                  }
                                  return (
                                    <div key={dIdx} title={title} style={{ width: `${dagBreedte/3.5}px`, height: "24px", borderRadius: "2px", background: bg, flexShrink: 0 }} />
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legenda werknemers zonder verlof */}
              <div style={{ marginTop: "20px", fontSize: "12px", color: "#4A6A82" }}>
                Werknemers zonder verlof tonen een lege rij.
              </div>

              {/* Feestdagen lijst */}
              <div style={{ marginTop: "24px", background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "12px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "12px", color: "#7A9AB5", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Nationale feestdagen {jaarKeuze}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {[...feestdagen.entries()].sort((a,b) => a[0].localeCompare(b[0])).map(([d, naam]) => {
                    // Parse timezone-safe: add T12:00 to avoid UTC offset shifting the date
                    const datum = new Date(d + "T12:00:00");
                    return (
                      <div key={d} style={{ background: "rgba(224,85,85,0.1)", border: "1px solid rgba(224,85,85,0.2)", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", color: "#E05555" }}>
                        <span style={{ fontWeight: "bold" }}>{naam}</span>
                        <span style={{ opacity: 0.7, marginLeft: "8px" }}>{datum.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

      <style>{`
        select option { background: #1A2C42; color: #E8EDF2; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
        input[type="date"]::-webkit-datetime-edit { font-family: Georgia, serif; }
        @media print {
          body { background: white !important; color: black !important; }
          button, nav, .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

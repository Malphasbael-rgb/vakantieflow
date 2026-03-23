import { useState, useMemo, useEffect, useCallback, useRef } from "react";

const WERKNEMERS_INIT = [
  { id: 1,  naam: "Alinda Postma",            afdelingen: ["Micro","Orglab"], kleur: "#FF6B6B", contractUren: 36,   roosterVolgorde: 6,  stagiair: null },
  { id: 2,  naam: "Anita Dijkstra",            afdelingen: ["Chemie"],        kleur: "#4ECDC4", contractUren: 40,   roosterVolgorde: 8,  stagiair: null },
  { id: 3,  naam: "Elke Buikstra-bosklopper",  afdelingen: ["Micro"],         kleur: "#FFE66D", contractUren: 32,   roosterVolgorde: 2,  stagiair: null },
  { id: 4,  naam: "Ina Betlehem Stevens",       afdelingen: [],                kleur: "#A8E6CF", contractUren: null, roosterVolgorde: 13, stagiair: null },
  { id: 5,  naam: "Monique Breijmer",           afdelingen: ["Vrijgave"],      kleur: "#FF8B94", contractUren: 40,   roosterVolgorde: 5,  stagiair: null },
  { id: 6,  naam: "Erwin Kooistra",             afdelingen: [],                kleur: "#B4A7D6", contractUren: null, roosterVolgorde: 9,  stagiair: null },
  { id: 7,  naam: "Nadia Keuning",     afdelingen: ["Klachten"],      kleur: "#96CEB4", contractUren: 24,   roosterVolgorde: 15, stagiair: null },
  { id: 8,  naam: "Sjoerd Kaper",               afdelingen: [],                kleur: "#FFEAA7", contractUren: null, roosterVolgorde: 10, stagiair: null },
  { id: 9,  naam: "Leon Segerink",              afdelingen: [],                kleur: "#DDA0DD", contractUren: null, roosterVolgorde: 1,  stagiair: null },
  { id: 10, naam: "Melanie Schep",              afdelingen: [],                kleur: "#98D8C8", contractUren: null, roosterVolgorde: 17, stagiair: null },
  { id: 11, naam: "Nick Roskam",                       afdelingen: [],                kleur: "#F7DC6F", contractUren: null, roosterVolgorde: 25, stagiair: null },
  { id: 12, naam: "Bart Reinsma",               afdelingen: ["Orglab"],        kleur: "#82E0AA", contractUren: 40,   roosterVolgorde: 24, stagiair: null },
  { id: 13, naam: "Roos Van Wijnen",            afdelingen: [],                kleur: "#F1948A", contractUren: null, roosterVolgorde: 3,  stagiair: null },
  { id: 14, naam: "Suleika Ramdien",            afdelingen: [],                kleur: "#AED6F1", contractUren: null, roosterVolgorde: 18, stagiair: null },
  { id: 15, naam: "Alwin Speelman",             afdelingen: [],                kleur: "#D7BDE2", contractUren: null, roosterVolgorde: 11, stagiair: null },
  { id: 16, naam: "Niels De Vries",               afdelingen: [],                kleur: "#FD79A8", contractUren: null, roosterVolgorde: 4,  stagiair: null },
  { id: 17, naam: "Diana Wijbenga",                      afdelingen: [],                kleur: "#E17055", contractUren: null, roosterVolgorde: 20, stagiair: null },
  { id: 18, naam: "Xamira De Haan",                     afdelingen: [],                kleur: "#00B894", contractUren: null, roosterVolgorde: 21, stagiair: null },
  { id: 19, naam: "Ylva",                       afdelingen: [],                kleur: "#6C5CE7", contractUren: null, roosterVolgorde: 22, stagiair: null },
  { id: 20, naam: "Niels Rosenau",                    afdelingen: [],                kleur: "#FDCB6E", contractUren: null, roosterVolgorde: 23, stagiair: null },
  { id: 21, naam: "Dylan Breebaard",                      afdelingen: [],                kleur: "#74B9FF", contractUren: null, roosterVolgorde: 19, stagiair: null },
];

const AANVRAGEN_INIT = [];

// Nederlandse nationale feestdagen (vast + berekend)
function feestdagenVoorJaar(jaar) {
  // Pasen berekening (Gauss) — tijdzone-veilig met lokale datumformattering
  function pasen(j) {
    const a=j%19,b=Math.floor(j/100),c=j%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),maand=Math.floor((h+l-7*m+114)/31),dag=(h+l-7*m+114)%31+1;
    return new Date(j, maand-1, dag);
  }
  const p = pasen(jaar);
  const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
  // Tijdzone-veilig: gebruik lokale datum ipv UTC (toISOString geeft UTC terug)
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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
    // Gebruik lokale datum ipv UTC (toISOString geeft UTC terug, kan dag verschuiven in NL)
    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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
      const dag = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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
  // Wettelijk minimum: 4× contracturen per week = 4 × u uur/jaar
  // Gebruikelijk: 25 vakantiedagen op basis van 40u/week, naar rato voor parttimers
  // Formule: (contractUren / 5) dagen/week × 25 dagen/jaar × (contractUren / 5) uur/dag
  // Correct: vakantiedagen naar rato × uren per dag = (25 × u/40) × (u/5)
  return Math.round((25 * u / 40) * (u / 5));
}
function gebruikteVerlofUren(id, aanvragen, u) {
  if (!u) return 0;
  return aanvragen
    .filter(a => a.werknemerId === id && a.status === "goedgekeurd" && a.type !== "Dienstreis")
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
        <h1 style={{ fontSize: "36px", fontWeight: "bold", margin: "0 0 8px", letterSpacing: "1px" }}>Verlof Aanvraag</h1>
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
  }, [pin, bevestig, stap, onSuccess]); // deps zodat handler altijd actuele state ziet

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
        <div style={{ fontSize: "16px", fontWeight: "bold" }}>🌴 Verlof Aanvraag</div>
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
function WerknemerPortaal({ werknemer, aanvragen, werknemers, weekTemplate, audits, onAuditsUpdate, onNieuweAanvraag, onTerug, onUpdateStagiair, onArchiveerAanvraag }) {
  const [tab, setTab] = useState("aanvragen");
  const [form, setForm] = useState({ type: "Vakantie", van: "", tot: "", opmerking: "" });
  const [ingediend, setIngediend] = useState(false);
  const [stagiairPaneel, setStagiairPaneel] = useState(null); // stagiair id
  const [weekOffset, setWeekOffset] = useState(0);
  const [auditForm, setAuditForm] = useState({ bedrijf: "", van: "", tot: "", labDatum: "", labTijd: "", opmerking: "" });
  const [auditFout, setAuditFout] = useState("");
  const [bewerkAuditId, setBewerkAuditId] = useState(null);

  // Vind stagiairs waar deze werknemer begeleider van is
  const mijnStagiairs = werknemers.filter(w => w.stagiair && parseInt(w.stageBegeleider) === werknemer.id);

  const eigenAanvragen = aanvragen.filter(a => a.werknemerId === werknemer.id && !a.gearchiveerdDoorWerknemer)
    .sort((a, b) => a.van.localeCompare(b.van));

  const totaalUren  = berekenVerlofUren(werknemer.contractUren);
  const gebruiktU   = gebruikteVerlofUren(werknemer.id, aanvragen, werknemer.contractUren);
  const resterendU  = totaalUren ? Math.max(0, totaalUren - gebruiktU) : null;

  function submitAanvraag() {
    console.log("submitAanvraag:", form, "wId:", werknemer?.id);
    if (!form.van || !form.tot) { console.log("BLOCKED: dates empty"); return; }
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
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>🌴 Verlof Aanvraag</div>
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
          {[{ key: "aanvragen", label: "📋 Mijn aanvragen" }, { key: "archief", label: "📦 Archief" }, { key: "nieuw", label: "✏️ Nieuwe aanvraag" }, { key: "rooster", label: "📅 Mijn rooster" }, ...(werknemer.naam === "Roos Van Wijnen" ? [{ key: "audits", label: "🔍 Audits" }] : [])].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "9px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px", fontWeight: tab === t.key ? "bold" : "normal", background: tab === t.key ? "rgba(74,158,224,0.18)" : "rgba(255,255,255,0.04)", color: tab === t.key ? "#4A9EE0" : "#7A9AB5", borderBottom: tab === t.key ? "2px solid #4A9EE0" : "2px solid transparent", transition: "all 0.2s" }}>
              {t.label} {t.key === "aanvragen" && eigenAanvragen.length > 0 && <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "1px 7px", marginLeft: "4px" }}>{eigenAanvragen.length}</span>}
            </button>
          ))}
        </div>

        {/* Stagiair knoppen */}
        {mijnStagiairs.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", color: "#7A9AB5", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Mijn stagiair{mijnStagiairs.length > 1 ? "s" : ""}</div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {mijnStagiairs.map(s => (
                <button key={s.id} onClick={() => setStagiairPaneel(stagiairPaneel === s.id ? null : s.id)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderRadius: "12px", border: stagiairPaneel === s.id ? "1px solid #E67E22" : "1px solid rgba(230,126,34,0.3)", background: stagiairPaneel === s.id ? "rgba(230,126,34,0.12)" : "rgba(230,126,34,0.05)", color: "#E67E22", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px", fontWeight: "bold", transition: "all 0.2s" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#E67E22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#fff", fontWeight: "bold" }}>{s.naam.charAt(0)}</div>
                  🎓 {s.naam}
                  <span style={{ fontSize: "10px", opacity: 0.7 }}>{stagiairPaneel === s.id ? "▲" : "▼"}</span>
                </button>
              ))}
            </div>

            {/* Stagiair paneel */}
            {mijnStagiairs.filter(s => s.id === stagiairPaneel).map(s => {
              const ONBOARDING_ITEMS = [
                "Rondleiding lab gegeven",
                "Veiligheidsprotocol besproken",
                "Toegang systemen geregeld",
                "Werkkleding/PBM uitgereikt",
                "Kennisgemaakt met team",
                "Eerste werkdag ingepland",
              ];
              return (
                <div key={s.id} style={{ marginTop: "12px", background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "14px", border: "1px solid rgba(230,126,34,0.25)", overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#E67E22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold", color: "#fff" }}>{s.naam.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "15px", color: "#C8D8E8" }}>{s.naam}</div>
                      <div style={{ fontSize: "11px", color: "#E67E22" }}>Stagiair {s.stagiair}{s.stageSchool ? ` · ${s.stageSchool}` : ""}</div>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                      <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", fontWeight: "bold",
                        background: s.stageInOpleiding ? "rgba(232,168,56,0.15)" : s.stageZelfstandig ? "rgba(45,155,111,0.15)" : "rgba(255,255,255,0.06)",
                        color: s.stageInOpleiding ? "#E8A838" : s.stageZelfstandig ? "#2D9B6F" : "#7A9AB5" }}>
                        {s.stageInOpleiding ? "📚 In opleiding" : s.stageZelfstandig ? "✅ Zelfstandig" : "❓ Geen status"}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const onboardingAfgerond = ONBOARDING_ITEMS.length > 0 && ONBOARDING_ITEMS.every((_, idx) => !!(s.onboarding && s.onboarding[idx]));
                    return (
                    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>

                      {/* Huidige status badge */}
                      <div style={{ padding: "12px 16px", borderRadius: "10px", background: s.stageInOpleiding ? "rgba(232,168,56,0.1)" : s.stageZelfstandig ? "rgba(45,155,111,0.1)" : "rgba(255,255,255,0.04)", border: s.stageInOpleiding ? "1px solid rgba(232,168,56,0.3)" : s.stageZelfstandig ? "1px solid rgba(45,155,111,0.3)" : "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>{s.stageInOpleiding ? "📚" : s.stageZelfstandig ? "✅" : "⏳"}</span>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: "bold", color: s.stageInOpleiding ? "#E8A838" : s.stageZelfstandig ? "#2D9B6F" : "#C8D8E8" }}>
                            {s.stageInOpleiding ? "In opleiding" : s.stageZelfstandig ? "Zelfstandig" : "Onboarding bezig"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#7A9AB5", marginTop: "2px" }}>
                            {s.stageInOpleiding ? "Beheerder kan na voltooiing status op zelfstandig zetten" : s.stageZelfstandig ? "Stagiair mag zelfstandig werken" : "Rond de onboarding af om opleiding te starten"}
                          </div>
                        </div>
                      </div>

                      {/* Onboarding checklist */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <div style={{ fontSize: "11px", color: "#7A9AB5", letterSpacing: "1px", textTransform: "uppercase" }}>Onboarding</div>
                          <div style={{ fontSize: "11px", color: onboardingAfgerond ? "#2D9B6F" : "#7A9AB5" }}>
                            {Object.values(s.onboarding || {}).filter(Boolean).length} / {ONBOARDING_ITEMS.length} afgerond
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {ONBOARDING_ITEMS.map((item, idx) => {
                            const checked = !!(s.onboarding && s.onboarding[idx]);
                            const disabled = s.stageInOpleiding || s.stageZelfstandig;
                            return (
                              <div key={idx} onClick={() => {
                                if (disabled) return;
                                const ob = { ...(s.onboarding || {}) };
                                ob[idx] = !ob[idx];
                                onUpdateStagiair(s.id, { onboarding: ob });
                              }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "8px", background: checked ? "rgba(45,155,111,0.08)" : "rgba(255,255,255,0.03)", border: checked ? "1px solid rgba(45,155,111,0.2)" : "1px solid rgba(255,255,255,0.05)", cursor: disabled ? "default" : "pointer", transition: "all 0.15s", opacity: disabled ? 0.6 : 1 }}>
                                <div style={{ width: "18px", height: "18px", borderRadius: "4px", border: checked ? "none" : "1px solid rgba(255,255,255,0.2)", background: checked ? "#2D9B6F" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "12px", color: "#fff" }}>{checked ? "✓" : ""}</div>
                                <span style={{ fontSize: "13px", color: checked ? "#2D9B6F" : "#C8D8E8", textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.75 : 1 }}>{item}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Onboarding afgerond → melding + knop voor beheerder beschikbaar */}
                        {onboardingAfgerond && !s.stageInOpleiding && !s.stageZelfstandig && (
                          <div style={{ marginTop: "12px", padding: "12px 16px", borderRadius: "10px", background: "rgba(74,158,224,0.1)", border: "1px solid rgba(74,158,224,0.35)", display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "18px" }}>🎉</span>
                            <div style={{ fontSize: "13px", color: "#4A9EE0" }}>
                              <strong>Onboarding afgerond!</strong> De beheerder kan nu de opleiding starten.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Voortgang notities */}
                      <div>
                        <div style={{ fontSize: "11px", color: "#7A9AB5", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "10px" }}>Voortgang / notities</div>
                        <textarea
                          value={s.voortgangNotities || ""}
                          onChange={e => onUpdateStagiair(s.id, { voortgangNotities: e.target.value })}
                          rows={4}
                          placeholder="Noteer hier de voortgang van de stagiair..."
                          style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#C8D8E8", fontFamily: "Georgia, serif", fontSize: "13px", padding: "12px", resize: "vertical", outline: "none" }}
                        />
                      </div>

                      {/* Opleiding voltooid knop — alleen zichtbaar als in opleiding */}
                      {s.stageInOpleiding && (
                        <div>
                          <button
                            disabled={!!s.opleidingVoltooidMelding}
                            onClick={() => onUpdateStagiair(s.id, { opleidingVoltooidMelding: true })}
                            style={{ width: "100%", padding: "13px", borderRadius: "10px", border: s.opleidingVoltooidMelding ? "1px solid rgba(45,155,111,0.4)" : "none", background: s.opleidingVoltooidMelding ? "rgba(45,155,111,0.15)" : "linear-gradient(135deg, #2D9B6F, #1E7050)", color: s.opleidingVoltooidMelding ? "#2D9B6F" : "#fff", cursor: s.opleidingVoltooidMelding ? "default" : "pointer", fontFamily: "Georgia, serif", fontSize: "14px", fontWeight: "bold" }}>
                            {s.opleidingVoltooidMelding ? "✅ Opleiding voltooid gemeld — wacht op beheerder" : "🎓 Opleiding voltooid melden"}
                          </button>
                        </div>
                      )}

                    </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

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
                      <span style={{ fontSize: "18px" }}>{a.type === "Vakantie" ? "🌴" : a.type === "Dienstreis" ? "✈️" : "☀️"}</span>
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
                  {a.status !== "in behandeling" && a.tot < new Date().toISOString().slice(0,10) && (
                    <div style={{ marginTop: "10px" }}>
                      <button onClick={() => onArchiveerAanvraag(a.id)}
                        style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#7A9AB5", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>📦 Archiveren</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Archief tab werknemer */}
        {tab === "archief" && (() => {
          const gearchiveerd = aanvragen
            .filter(a => a.werknemerId === werknemer.id && !!a.gearchiveerdDoorWerknemer)
            .sort((a, b) => b.ingediend.localeCompare(a.ingediend));
          return (
            <div>
              {gearchiveerd.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px", color:"#7A9AB5" }}>
                  <div style={{ fontSize:"32px", marginBottom:"10px" }}>📦</div>
                  <div>Geen gearchiveerde aanvragen.</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  {gearchiveerd.map(a => (
                    <div key={a.id} style={{ background:"linear-gradient(135deg, #1A2C42, #162233)", borderRadius:"12px", padding:"16px 20px", border:"1px solid rgba(255,255,255,0.05)", opacity:0.8 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                          <span style={{ fontSize:"16px" }}>{a.type === "Vakantie" ? "🌴" : a.type === "Dienstreis" ? "✈️" : "☀️"}</span>
                          <span style={{ fontWeight:"bold" }}>{a.type}</span>
                        </div>
                        <span style={{ fontSize:"12px", padding:"4px 12px", borderRadius:"20px", background: statusBg[a.status], color: statusKleur[a.status], fontWeight:"bold" }}>{statusIcon[a.status]} {a.status}</span>
                      </div>
                      <div style={{ fontSize:"13px", color:"#7A9AB5", marginTop:"6px" }}>📅 {fmtDatum(a.van)}{a.van !== a.tot ? ` → ${fmtDatum(a.tot)}` : ""}</div>
                      {a.beheerderOpmerking && <div style={{ fontSize:"12px", marginTop:"5px", color:"#4A9EE0", fontStyle:"italic" }}>💬 {a.beheerderOpmerking}</div>}
                      <div style={{ marginTop:"10px", display:"flex", gap:"8px" }}>
                        <button onClick={() => setAanvragen(prev => prev.map(x => x.id === a.id ? { ...x, gearchiveerdDoorWerknemer: false } : x))}
                          style={{ padding:"5px 12px", borderRadius:"7px", border:"1px solid rgba(74,158,224,0.3)", background:"rgba(74,158,224,0.06)", color:"#4A9EE0", cursor:"pointer", fontSize:"12px", fontFamily:"Georgia, serif" }}>↩ Terugzetten</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

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
                    {["Vakantie", "Vrije dag", "Dienstreis"].map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px", background: form.type === t ? "linear-gradient(135deg, #4A9EE0, #2D6FA8)" : "rgba(255,255,255,0.05)", color: form.type === t ? "#fff" : "#7A9AB5", fontWeight: form.type === t ? "bold" : "normal", transition: "all 0.2s" }}>
                        {t === "Vakantie" ? "🌴 Vakantie" : t === "Vrije dag" ? "☀️ Vrije dag" : "✈️ Dienstreis"}
                      </button>
                    ))}
                  </div>
                </div>
                {(form.type === "Vakantie" || form.type === "Dienstreis") ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>Begindatum</label>
                      <input type="date" lang="nl" value={form.van} onChange={e => setForm(f => ({ ...f, van: e.target.value, tot: f.tot < e.target.value ? e.target.value : f.tot }))} onInput={e => setForm(f => ({ ...f, van: e.target.value, tot: f.tot < e.target.value ? e.target.value : f.tot }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Einddatum</label>
                      <input type="date" lang="nl" value={form.tot} min={form.van} onChange={e => setForm(f => ({ ...f, tot: e.target.value }))} onInput={e => setForm(f => ({ ...f, tot: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Datum</label>
                    <input type="date" lang="nl" value={form.van} onChange={e => setForm(f => ({ ...f, van: e.target.value, tot: e.target.value }))} onInput={e => setForm(f => ({ ...f, van: e.target.value, tot: e.target.value }))} style={inputStyle} />
                  </div>
                )}
                {form.van && form.tot && (
                  <div style={{ background: "rgba(74,158,224,0.08)", border: "1px solid rgba(74,158,224,0.2)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", color: "#4A9EE0" }}>
                    📅 {(form.type === "Vakantie" || form.type === "Dienstreis") ? `${dateDiff(form.van, form.tot)} werkdag${dateDiff(form.van, form.tot) > 1 ? "en" : ""} (${fmtDatum(form.van)} → ${fmtDatum(form.tot)})` : fmtDatum(form.van)}
                    {form.type === "Vakantie" && werknemer.contractUren && ` · ${Math.round(dateDiff(form.van, form.tot) * (werknemer.contractUren / 5))}u`}
                    {form.type === "Dienstreis" && <span style={{ marginLeft:"6px", color:"#B0BEC8", fontSize:"11px" }}>· telt niet mee als verlof</span>}
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

        {/* Mijn rooster */}
        {tab === "rooster" && (() => {
          const vandaag = new Date();
          // Bepaal maandag van huidige week
          const getMaandag = (d) => {
            const dag = new Date(d);
            const dow = dag.getDay();
            const diff = dow === 0 ? -6 : 1 - dow;
            dag.setDate(dag.getDate() + diff);
            dag.setHours(0,0,0,0);
            return dag;
          };
          const maandag = getMaandag(vandaag);
          maandag.setDate(maandag.getDate() + weekOffset * 7);

          const dagNamen = ["zo","ma","di","wo","do","vr","za"];
          const dagNamenVol = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
          const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          const fmtKort = d => `${d.getDate()} ${["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"][d.getMonth()]} ${d.getFullYear()}`;

          const feestdagen = feestdagenVoorJaar(maandag.getFullYear());

          const afdKleuren = {
            "Hoofd FQA": "#E05555", "Ass. Hoofd FQA": "#E05555",
            "Micro": "#C39BD3", "Orglab": "#85C1E9", "Chemie": "#F9E547",
            "Vrijgave": "#2E86C1", "FQA": "#1ABC9C", "Blik": "#FF9F43",
          };

          const werkdagen = [];
          for (let i = 0; i < 5; i++) {
            const d = new Date(maandag);
            d.setDate(d.getDate() + i);
            werkdagen.push(d);
          }

          const isVandaag = (d) => fmt(d) === fmt(vandaag);

          return (
            <div>
              {/* Week navigatie */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px", background:"linear-gradient(135deg,#1A2C42,#162233)", borderRadius:"12px", padding:"14px 20px", border:"1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => setWeekOffset(w => w-1)} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:"8px", color:"#C8D8E8", cursor:"pointer", padding:"8px 14px", fontSize:"16px", fontFamily:"Georgia,serif" }}>←</button>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"15px", fontWeight:"bold", color:"#E8EDF2" }}>
                    {fmtKort(maandag)} – {fmtKort(werkdagen[4])}
                  </div>
                  <div style={{ fontSize:"11px", color:"#7A9AB5", marginTop:"2px" }}>
                    {weekOffset === 0 ? "Huidige week" : weekOffset === 1 ? "Volgende week" : weekOffset === -1 ? "Vorige week" : `Week ${weekOffset > 0 ? "+" : ""}${weekOffset}`}
                  </div>
                </div>
                <button onClick={() => setWeekOffset(w => w+1)} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:"8px", color:"#C8D8E8", cursor:"pointer", padding:"8px 14px", fontSize:"16px", fontFamily:"Georgia,serif" }}>→</button>
              </div>

              {/* Dag kaartjes */}
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {werkdagen.map(dag => {
                  const dagStr = fmt(dag);
                  const isFeest = feestdagen.has(dagStr);
                  const feestNaam = feestdagen.get(dagStr);
                  // weekTemplate keys kunnen number of string zijn afhankelijk van JSON round-trip
                  const dagData = weekTemplate?.[dagStr] || {};
                  const slotData = dagData[werknemer.id] || dagData[String(werknemer.id)] || {};
                  const ochtendRaw = slotData["O"] ?? null;
                  const middagRaw  = slotData["M"] ?? null;
                  const ochtend = typeof ochtendRaw === "object" ? ochtendRaw?.afd : ochtendRaw;
                  const middag  = typeof middagRaw  === "object" ? middagRaw?.afd  : middagRaw;
                  const verlof  = aanvragen.some(a => a.werknemerId === werknemer.id && a.status === "goedgekeurd" && a.type !== "Dienstreis" && dagStr >= a.van && dagStr <= a.tot);
                  const dienstreis = aanvragen.some(a => a.werknemerId === werknemer.id && a.status === "goedgekeurd" && a.type === "Dienstreis" && dagStr >= a.van && dagStr <= a.tot);
                  const dagAudits = (audits||[]).filter(a => dagStr >= a.van && dagStr <= a.tot);
                  const labBezoek = (audits||[]).filter(a => a.labDatum === dagStr);

                  const kleurVoor = (afd) => afdKleuren[afd] || "#4A9EE0";

                  const dagVoluit = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
                  const maanden = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
                  return (
                    <div key={dagStr} style={{
                      background: isVandaag(dag) ? "linear-gradient(135deg,#1E3A52,#1A2C42)" : "linear-gradient(135deg,#151F2A,#111822)",
                      borderRadius:"14px",
                      border: isVandaag(dag) ? "2px solid rgba(74,158,224,0.5)" : isFeest ? "1px solid rgba(224,85,85,0.3)" : "1px solid rgba(255,255,255,0.05)",
                      padding:"16px 20px",
                      display:"flex",
                      alignItems:"center",
                      gap:"20px",
                      opacity: isFeest ? 0.75 : 1
                    }}>
                      {/* Datum kolom */}
                      <div style={{ minWidth:"90px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background: isVandaag(dag) ? "rgba(74,158,224,0.12)" : "rgba(255,255,255,0.04)", borderRadius:"10px", padding:"10px 8px", border: isVandaag(dag) ? "1px solid rgba(74,158,224,0.25)" : "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize:"11px", fontWeight:"bold", color: isVandaag(dag) ? "#4A9EE0" : "#7A9AB5", textTransform:"uppercase", letterSpacing:"2px", marginBottom:"4px" }}>{dagVoluit[dag.getDay()]}</div>
                        <div style={{ fontSize:"32px", fontWeight:"bold", color: isVandaag(dag) ? "#4A9EE0" : isFeest ? "#E05555" : "#E8EDF2", lineHeight:"1" }}>{dag.getDate()}</div>
                        <div style={{ fontSize:"11px", color: isVandaag(dag) ? "rgba(74,158,224,0.7)" : "#7A9AB5", marginTop:"3px" }}>{maanden[dag.getMonth()]}</div>
                      </div>

                      {/* Inhoud */}
                      <div style={{ flex:1 }}>
                        {isFeest && <div style={{ fontSize:"11px", color:"#E05555", marginBottom:"4px" }}>🇳🇱 {feestNaam}</div>}
                        {verlof && <div style={{ fontSize:"13px", color:"#7A9AB5", fontStyle:"italic" }}>🌴 Verlof</div>}
                        {dienstreis && <div style={{ fontSize:"13px", color:"#7A9AB5", fontStyle:"italic" }}>✈️ Dienstreis</div>}
                        {!isFeest && !verlof && !dienstreis && (
                          <div style={{ display:"flex", gap:"8px" }}>
                            <div style={{ flex:1, borderRadius:"8px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ background:"rgba(255,255,255,0.05)", padding:"3px 8px", fontSize:"9px", color:"#7A9AB5", letterSpacing:"1px", textTransform:"uppercase" }}>Ochtend</div>
                              <div style={{ padding:"6px 8px", background: ochtend ? kleurVoor(ochtend) : "rgba(255,255,255,0.02)", minHeight:"34px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                {ochtend ? <span style={{ fontSize:"13px", fontWeight:"bold", color:"rgba(0,0,0,0.75)" }}>{ochtend}</span> : <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.2)", fontStyle:"italic" }}>–</span>}
                              </div>
                            </div>
                            <div style={{ flex:1, borderRadius:"8px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ background:"rgba(255,255,255,0.05)", padding:"3px 8px", fontSize:"9px", color:"#7A9AB5", letterSpacing:"1px", textTransform:"uppercase" }}>Middag</div>
                              <div style={{ padding:"6px 8px", background: middag ? kleurVoor(middag) : "rgba(255,255,255,0.02)", minHeight:"34px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                {middag ? <span style={{ fontSize:"13px", fontWeight:"bold", color:"rgba(0,0,0,0.75)" }}>{middag}</span> : <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.2)", fontStyle:"italic" }}>–</span>}
                              </div>
                            </div>
                          </div>
                        )}
                        {!isFeest && !verlof && !dienstreis && !ochtend && !middag && (
                          <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.2)", fontStyle:"italic", marginTop:"4px" }}>Nog niet ingepland</div>
                        )}
                        {(dagAudits.length > 0 || labBezoek.length > 0) && (
                          <div style={{ marginTop:"8px", paddingTop:"8px", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", flexWrap:"wrap", gap:"6px" }}>
                            {dagAudits.map(a => (
                              <span key={a.id} style={{ fontSize:"10px", background:"rgba(230,126,34,0.12)", border:"1px solid rgba(230,126,34,0.25)", borderRadius:"6px", padding:"2px 8px", color:"#E67E22" }}>🔍 Audit: {a.bedrijf}</span>
                            ))}
                            {labBezoek.map(a => (
                              <span key={"lab-"+a.id} style={{ fontSize:"10px", background:"rgba(74,158,224,0.12)", border:"1px solid rgba(74,158,224,0.25)", borderRadius:"6px", padding:"2px 8px", color:"#4A9EE0" }}>🏭 Auditbezoek lab{a.labTijd ? ` · ${a.labTijd}` : ""}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Vandaag badge */}
                      {isVandaag(dag) && <div style={{ fontSize:"10px", background:"rgba(74,158,224,0.15)", border:"1px solid rgba(74,158,224,0.3)", borderRadius:"6px", padding:"3px 8px", color:"#4A9EE0", whiteSpace:"nowrap" }}>Vandaag</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}


        {/* Audits tab - alleen voor Roos */}
        {tab === "audits" && werknemer.naam === "Roos Van Wijnen" && (() => {
          function slaAuditOp() {
            if (!auditForm.bedrijf.trim()) { setAuditFout("Vul een bedrijfsnaam in."); return; }
            if (!auditForm.van || !auditForm.tot) { setAuditFout("Vul een begin- en einddatum in."); return; }
            if (auditForm.tot < auditForm.van) { setAuditFout("Einddatum mag niet voor begindatum liggen."); return; }
            if (bewerkAuditId) {
              onAuditsUpdate(prev => (prev||[]).map(a => a.id === bewerkAuditId ? { ...a, bedrijf: auditForm.bedrijf.trim(), van: auditForm.van, tot: auditForm.tot, labDatum: auditForm.labDatum, labTijd: auditForm.labTijd, opmerking: auditForm.opmerking.trim() } : a));
              setBewerkAuditId(null);
            } else {
              const nieuw = { id: Date.now(), bedrijf: auditForm.bedrijf.trim(), van: auditForm.van, tot: auditForm.tot, labDatum: auditForm.labDatum, labTijd: auditForm.labTijd, opmerking: auditForm.opmerking.trim() };
              onAuditsUpdate(prev => [...(prev||[]), nieuw].sort((a,b) => a.van.localeCompare(b.van)));
            }
            setAuditForm({ bedrijf: "", van: "", tot: "", labDatum: "", labTijd: "", opmerking: "" });
            setAuditFout("");
          }

          function bewerkAudit(audit) {
            setBewerkAuditId(audit.id);
            setAuditForm({ bedrijf: audit.bedrijf, van: audit.van, tot: audit.tot, labDatum: audit.labDatum || "", labTijd: audit.labTijd || "", opmerking: audit.opmerking || "" });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }

          function annuleerBewerken() {
            setBewerkAuditId(null);
            setAuditForm({ bedrijf: "", van: "", tot: "", labDatum: "", labTijd: "", opmerking: "" });
            setAuditFout("");
          }

          function verwijderAudit(id) {
            onAuditsUpdate(prev => (prev||[]).filter(a => a.id !== id));
            if (bewerkAuditId === id) annuleerBewerken();
          }

          const maanden = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
          const fmtD = d => { if (!d) return "–"; const dt = new Date(d+"T12:00:00"); return `${dt.getDate()} ${maanden[dt.getMonth()]} ${dt.getFullYear()}`; };

          return (
            <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
              {/* Nieuwe / bewerken audit invoeren */}
              <div style={{ background:"linear-gradient(135deg,#1A2C42,#162233)", borderRadius:"16px", padding:"24px", border: bewerkAuditId ? "1px solid rgba(74,158,224,0.3)" : "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize:"13px", color: bewerkAuditId ? "#4A9EE0" : "#7A9AB5", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:"18px" }}>{bewerkAuditId ? "✏️ Audit bewerken" : "🔍 Nieuwe audit toevoegen"}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                  <div>
                    <label style={labelStyle}>Bedrijfsnaam</label>
                    <input value={auditForm.bedrijf} onChange={e => setAuditForm(f=>({...f,bedrijf:e.target.value}))} placeholder="Bijv. NVWA, BRC, IFS..." style={inputStyle} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                    <div>
                      <label style={labelStyle}>Auditperiode van</label>
                      <input type="date" value={auditForm.van} onChange={e => setAuditForm(f=>({...f,van:e.target.value,tot:f.tot<e.target.value?e.target.value:f.tot}))} onInput={e => setAuditForm(f=>({...f,van:e.target.value,tot:f.tot<e.target.value?e.target.value:f.tot}))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Auditperiode tot</label>
                      <input type="date" value={auditForm.tot} min={auditForm.van} onChange={e => setAuditForm(f=>({...f,tot:e.target.value}))} onInput={e => setAuditForm(f=>({...f,tot:e.target.value}))} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ background:"rgba(74,158,224,0.06)", borderRadius:"10px", padding:"14px", border:"1px solid rgba(74,158,224,0.12)" }}>
                    <div style={{ fontSize:"11px", color:"#4A9EE0", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"10px" }}>🏭 Verwacht laboratoriumbezoek</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                      <div>
                        <label style={labelStyle}>Datum labbezoek</label>
                        <input type="date" value={auditForm.labDatum} onChange={e => setAuditForm(f=>({...f,labDatum:e.target.value}))} onInput={e => setAuditForm(f=>({...f,labDatum:e.target.value}))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Verwachte tijd</label>
                        <input type="time" value={auditForm.labTijd} onChange={e => setAuditForm(f=>({...f,labTijd:e.target.value}))} onInput={e => setAuditForm(f=>({...f,labTijd:e.target.value}))} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Opmerking (optioneel)</label>
                    <textarea value={auditForm.opmerking} onChange={e => setAuditForm(f=>({...f,opmerking:e.target.value}))} rows={2} placeholder="Extra info..." style={{...inputStyle, resize:"vertical"}} />
                  </div>
                  {auditFout && <div style={{ color:"#E05555", fontSize:"12px" }}>⚠️ {auditFout}</div>}
                  <div style={{ display:"flex", gap:"10px" }}>
                    {bewerkAuditId && (
                      <button onClick={annuleerBewerken} style={{ flex:1, padding:"13px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.1)", cursor:"pointer", background:"rgba(255,255,255,0.05)", color:"#7A9AB5", fontSize:"14px", fontFamily:"Georgia,serif" }}>
                        Annuleren
                      </button>
                    )}
                    <button onClick={slaAuditOp} style={{ flex:1, padding:"13px", borderRadius:"10px", border:"none", cursor:"pointer", background:"linear-gradient(135deg,#4A9EE0,#2D6FA8)", color:"#fff", fontSize:"14px", fontWeight:"bold", fontFamily:"Georgia,serif" }}>
                      {bewerkAuditId ? "Wijzigingen opslaan ✓" : "Audit toevoegen →"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Overzicht ingevoerde audits */}
              <div>
                <div style={{ fontSize:"11px", color:"#7A9AB5", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:"12px" }}>Ingevoerde audits</div>
                {(!audits || audits.length === 0) ? (
                  <div style={{ textAlign:"center", padding:"32px", color:"rgba(255,255,255,0.2)", fontSize:"13px", fontStyle:"italic" }}>Nog geen audits ingevoerd</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                    {(audits||[]).sort((a,b)=>a.van.localeCompare(b.van)).map(audit => (
                      <div key={audit.id} style={{ background:"linear-gradient(135deg,#151F2A,#111822)", borderRadius:"12px", padding:"16px 18px", border:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"12px" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"15px", fontWeight:"bold", color:"#E8EDF2", marginBottom:"4px" }}>🔍 {audit.bedrijf}</div>
                          <div style={{ fontSize:"12px", color:"#7A9AB5", marginBottom:"2px" }}>📅 {fmtD(audit.van)} – {fmtD(audit.tot)}</div>
                          {audit.labDatum && <div style={{ fontSize:"12px", color:"#4A9EE0", marginBottom:"2px" }}>🏭 Labbezoek: {fmtD(audit.labDatum)}{audit.labTijd ? ` om ${audit.labTijd}` : ""}</div>}
                          {audit.opmerking && <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", marginTop:"4px", fontStyle:"italic" }}>{audit.opmerking}</div>}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                          <button onClick={() => bewerkAudit(audit)} style={{ background:"rgba(74,158,224,0.1)", border:"1px solid rgba(74,158,224,0.25)", borderRadius:"8px", color:"#4A9EE0", cursor:"pointer", padding:"6px 12px", fontSize:"12px", fontFamily:"Georgia,serif", whiteSpace:"nowrap" }}>
                            ✏️ Bewerken
                          </button>
                          <button onClick={() => verwijderAudit(audit.id)} style={{ background:"rgba(224,85,85,0.12)", border:"1px solid rgba(224,85,85,0.25)", borderRadius:"8px", color:"#E05555", cursor:"pointer", padding:"6px 12px", fontSize:"12px", fontFamily:"Georgia,serif", whiteSpace:"nowrap" }}>
                            🗑 Verwijderen
                          </button>
                        </div>
                      </div>
                    ))}
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
  const [adminPin, setAdminPin] = useState(() => { try { return localStorage.getItem(ADMIN_PIN_KEY) || null; } catch(e) { return null; } });
  const [werknemers, setWerknemers] = useState(WERKNEMERS_INIT);
  const [aanvragen, setAanvragen]   = useState(AANVRAGEN_INIT);
  const [geladen, setGeladen]       = useState(false);
  const opslaanRef = useRef(false); // voorkomt opslaan vóór laden klaar is
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
  const [confirmModal, setConfirmModal] = useState(null); // { vraag, onJa }
  const [jaarKeuze, setJaarKeuze] = useState(new Date().getFullYear());
  const [stagiairModal, setStagiairModal] = useState(false);
  const [nieuweStagiair, setNieuweStagiair] = useState({ naam: "", afdeling: "", school: "", begeleider: "", van: "", tot: "" });
  const [toonArchief, setToonArchief] = useState(false);

  const [audits, setAudits] = useState([]);

  // Rooster state
  // weekTemplate structuur: { [dagKey]: { [afdeling]: { ochtend: [wId,...], middag: [wId,...] } } }
  const [weekTemplate, setWeekTemplate] = useState({});
  const [roosterMaand, setRoosterMaand] = useState(new Date().getMonth());
  const [roosterJaar, setRoosterJaar] = useState(new Date().getFullYear());
  const [pickerOpen, setPickerOpen] = useState(null); // { dag, afd, deel }

  // Sluit rooster picker bij klik buiten
  useEffect(() => {
    if (!pickerOpen) return;
    const close = () => setPickerOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [pickerOpen]);

  // ── Supabase config ──
  const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
  const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
  const HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
  };

  // ── Laden uit Supabase bij opstarten ──
  useEffect(() => {
    async function laadData() {
      try {
        const [wRes, aRes, rRes, audRes] = await Promise.all([
          fetch(SUPABASE_URL + "/rest/v1/werknemers?select=id,data&order=id", { headers: HEADERS }),
          fetch(SUPABASE_URL + "/rest/v1/aanvragen?select=id,data&order=id",  { headers: HEADERS }),
          fetch(SUPABASE_URL + "/rest/v1/instellingen?sleutel=eq.rooster&select=waarde", { headers: HEADERS }),
          fetch(SUPABASE_URL + "/rest/v1/instellingen?sleutel=eq.audits&select=waarde", { headers: HEADERS }),
        ]);
        const wRows = await wRes.json();
        const aRows = await aRes.json();
        const rRows = await rRes.json();
        const audRows = await audRes.json();
        if (Array.isArray(wRows) && wRows.length > 0)
          setWerknemers(wRows.map(r => ({ ...r.data, id: r.id })));
        if (Array.isArray(aRows) && aRows.length > 0)
          setAanvragen(aRows.map(r => ({ ...r.data, id: r.id })));
        if (Array.isArray(rRows) && rRows.length > 0 && rRows[0].waarde)
          setWeekTemplate(rRows[0].waarde);
        if (Array.isArray(audRows) && audRows.length > 0 && audRows[0].waarde)
          setAudits(audRows[0].waarde);
      } catch (e) {
        console.error("Laden mislukt:", e);
      }
      setGeladen(true);
      setTimeout(() => { opslaanRef.current = true; }, 100); // kleine vertraging zodat setState renders klaar zijn
    }
    laadData();
  }, []);

  // ── Opslaan via upsert ──
  const slaOp = useCallback(async (nieuweWerknemers, nieuweAanvragen) => {
    setOpslagStatus("opslaan");
    try {
      const upsertHeaders = { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" };
      for (const w of nieuweWerknemers) {
        await fetch(SUPABASE_URL + "/rest/v1/werknemers", {
          method: "POST", headers: upsertHeaders,
          body: JSON.stringify({ id: w.id, data: w }),
        });
      }
      for (const a of nieuweAanvragen) {
        await fetch(SUPABASE_URL + "/rest/v1/aanvragen", {
          method: "POST", headers: upsertHeaders,
          body: JSON.stringify({ id: a.id, data: a }),
        });
      }
      const wIds = nieuweWerknemers.map(w => w.id).join(",");
      if (wIds) await fetch(SUPABASE_URL + "/rest/v1/werknemers?id=not.in.(" + wIds + ")", { method: "DELETE", headers: HEADERS });
      const aIds = nieuweAanvragen.map(a => a.id).join(",");
      if (aIds) await fetch(SUPABASE_URL + "/rest/v1/aanvragen?id=not.in.(" + aIds + ")", { method: "DELETE", headers: HEADERS });
      setOpslagStatus("opgeslagen");
    } catch (e) {
      console.error("Opslaan fout:", e);
      setOpslagStatus("fout");
    }
    setTimeout(() => setOpslagStatus(null), 2500);
  }, []);

  useEffect(() => { if (opslaanRef.current) slaOp(werknemers, aanvragen); }, [werknemers, aanvragen]);

  // ── Rooster opslaan in Supabase ──
  useEffect(() => {
    if (!opslaanRef.current) return;
    const upsertHeaders = { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" };
    fetch(SUPABASE_URL + "/rest/v1/instellingen", {
      method: "POST", headers: upsertHeaders,
      body: JSON.stringify({ sleutel: "rooster", waarde: weekTemplate }),
    }).catch(e => console.error("Rooster opslaan fout:", e));
  }, [weekTemplate]);

  // ── Audits opslaan in Supabase ──
  useEffect(() => {
    if (!opslaanRef.current) return;
    const upsertHeaders = { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" };
    fetch(SUPABASE_URL + "/rest/v1/instellingen", {
      method: "POST", headers: upsertHeaders,
      body: JSON.stringify({ sleutel: "audits", waarde: audits }),
    }).catch(e => console.error("Audits opslaan fout:", e));
  }, [audits]);

  const gefilterd = useMemo(() => aanvragen.filter(a => !a.gearchiveerdDoorBeheerder).filter(a => {
    if (filterStatus !== "alle" && a.status !== filterStatus) return false;
    if (filterWerknemer !== "alle" && a.werknemerId !== parseInt(filterWerknemer)) return false;
    return true;
  }).sort((a, b) => a.van.localeCompare(b.van)), [aanvragen, filterStatus, filterWerknemer]);

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
    setWerknemers(prev => [...prev, { id: Date.now(), naam: nieuweWerknemer.naam, afdelingen: nieuweWerknemer.afdelingen, contractUren: parseInt(nieuweWerknemer.contractUren) || null, kleur: kleuren[Math.floor(Math.random() * kleuren.length)], stagiair: nieuweWerknemer.stagiair || null, inOpleiding: false, roosterVolgorde: 99 }]);
    setNieuweWerknemer({ naam: "", afdelingen: [], invoer: "", contractUren: "", isStage: false, stagiair: null });
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
      <div>Verlof Aanvraag laden...</div>
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
        weekTemplate={weekTemplate}
        audits={audits}
        onAuditsUpdate={setAudits}
        onNieuweAanvraag={handleNieuweAanvraag}
        onTerug={() => setScherm("werknemerKeuze")}
        onUpdateStagiair={(id, updates) => setWerknemers(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))}
        onArchiveerAanvraag={(id) => setConfirmModal({ vraag: "Aanvraag archiveren? De aanvraag blijft bewaard maar verdwijnt uit je overzicht.", onJa: () => setAanvragen(prev => prev.map(x => x.id === id ? { ...x, gearchiveerdDoorWerknemer: true } : x)) })}
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
            <div style={{ fontSize: "15px", fontWeight: "bold" }}>Verlof Aanvraag</div>
            <div style={{ fontSize: "10px", color: "#7A9AB5", letterSpacing: "2px", textTransform: "uppercase" }}>Beheerder</div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "4px" }}>
          {(() => {
              const ONBOARDING_COUNT = 6;
              const stagiairAlerts = werknemers.filter(w => w.stagiair && (
                (Object.values(w.onboarding || {}).filter(Boolean).length >= ONBOARDING_COUNT && !w.stageInOpleiding && !w.stageZelfstandig) ||
                (!!w.opleidingVoltooidMelding && !w.stageZelfstandig)
              )).length;
              return [{ key: "aanvragen", label: "📋 Aanvragen" }, { key: "aanvragen-archief", label: "📦 Archief" }, { key: "werknemers", label: "👥 Werknemers" }, { key: "stagiairs", label: "🎓 Stagiairs" }, { key: "kalender", label: "📅 Overzicht" }, { key: "rooster", label: "🗓️ Rooster" }, { key: "jaar", label: "📊 Jaaroverzicht" }].map(item => (
                <button key={item.key} onClick={() => setAdminSub(item.key)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px", fontWeight: adminSub === item.key ? "bold" : "normal", background: adminSub === item.key ? "rgba(74,158,224,0.18)" : "transparent", color: adminSub === item.key ? "#4A9EE0" : "#7A9AB5", borderBottom: adminSub === item.key ? "2px solid #4A9EE0" : "2px solid transparent", transition: "all 0.2s", position: "relative" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    {item.label}
                    {item.key === "stagiairs" && stagiairAlerts > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", background: "#E05555", color: "#fff", fontSize: "10px", fontWeight: "bold", lineHeight: 1, flexShrink: 0 }}>
                        {stagiairAlerts}
                      </span>
                    )}
                  </span>
                </button>
              ));
            })()}
        </nav>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {opslagStatus === "opslaan" && <span style={{ fontSize: "12px", color: "#7A9AB5" }}>● Opslaan...</span>}
          {opslagStatus === "opgeslagen" && <span style={{ fontSize: "12px", color: "#2D9B6F" }}>✓ Opgeslagen</span>}
          {opslagStatus === "fout" && <span style={{ fontSize: "12px", color: "#E05555" }}>❌ Fout!</span>}
          {problematisch.length > 0 && <div style={{ background: "rgba(224,85,85,0.15)", border: "1px solid rgba(224,85,85,0.4)", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", color: "#E05555" }}>⚠️ {problematisch.length} conflict{problematisch.length > 1 ? "en" : ""}</div>}
          <button onClick={() => setConfirmModal({ vraag: "Beheerders pincode resetten? Je moet dan een nieuwe kiezen.", onJa: () => { setAdminPin(null); try { localStorage.removeItem(ADMIN_PIN_KEY); } catch(e) {} setScherm("keuze"); } })} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#4A6A82", cursor: "pointer", fontSize: "11px", fontFamily: "Georgia, serif" }} title="Reset beheerders pincode">🔑</button>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats */}
        <div style={{ display: adminSub === "rooster" ? "none" : "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "28px" }}>
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
              <div style={{ marginLeft: "auto" }}>
                <button onClick={() => setConfirmModal({ vraag: `Weet je zeker dat je ALLE ${aanvragen.length} aanvragen wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`, onJa: async () => { setAanvragen([]); try { await fetch(SUPABASE_URL + "/rest/v1/aanvragen?id=gte.0", { method: "DELETE", headers: HEADERS }); } catch(e) { console.error("Verwijderen mislukt:", e); } } })} style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid rgba(224,85,85,0.35)", background: "rgba(224,85,85,0.08)", color: "#E05555", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>🗑 Alle aanvragen verwijderen</button>
              </div>
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
                      {aanvraag.tot < new Date().toISOString().slice(0,10) && (
                        <button onClick={() => setConfirmModal({ vraag: "Aanvraag archiveren? De aanvraag blijft bewaard maar verdwijnt uit het overzicht.", onJa: () => setAanvragen(prev => prev.map(a => a.id === aanvraag.id ? { ...a, gearchiveerdDoorBeheerder: true } : a)) })} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#4A6A82", cursor: "pointer", fontSize: "13px" }} title="Archiveren">📦</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {gefilterd.length === 0 && <div style={{ textAlign: "center", padding: "60px", color: "#7A9AB5" }}>Geen aanvragen gevonden.</div>}
            </div>
          </div>
        )}

        {/* ── AANVRAGEN ARCHIEF ── */}
        {adminSub === "aanvragen-archief" && (() => {
          const archief = aanvragen
            .filter(a => !!a.gearchiveerdDoorBeheerder)
            .sort((a, b) => b.ingediend.localeCompare(a.ingediend));
          return (
            <div>
              <h2 style={{ margin:"0 0 20px", fontSize:"20px", color:"#C8D8E8" }}>📦 Gearchiveerde aanvragen</h2>
              {archief.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px", color:"#7A9AB5" }}>
                  <div style={{ fontSize:"32px", marginBottom:"10px" }}>📦</div>
                  <div>Geen gearchiveerde aanvragen.</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {archief.map(aanvraag => {
                    const werknemer = werknemers.find(w => w.id === aanvraag.werknemerId);
                    return (
                      <div key={aanvraag.id} style={{ background:"linear-gradient(135deg, #1A2C42, #162233)", borderRadius:"12px", padding:"16px 20px", border:"1px solid rgba(255,255,255,0.05)", opacity:0.85, display:"flex", alignItems:"center", gap:"16px" }}>
                        <div style={{ width:"38px", height:"38px", borderRadius:"50%", flexShrink:0, background:werknemer?.kleur||"#4A9EE0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:"bold", color:"#0F1923" }}>{werknemer?.naam?.charAt(0)||"?"}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:"bold", fontSize:"14px", color:"#9AB0C2" }}>{werknemer?.naam||"Onbekend"} · <span style={{ fontWeight:"normal", color:"#7A9AB5" }}>{aanvraag.type}</span></div>
                          <div style={{ fontSize:"12px", color:"#4A6A82", marginTop:"3px" }}>📅 {fmtDatum(aanvraag.van)}{aanvraag.van !== aanvraag.tot ? ` → ${fmtDatum(aanvraag.tot)}` : ""}</div>
                          {aanvraag.beheerderOpmerking && <div style={{ fontSize:"11px", color:"#4A9EE0", fontStyle:"italic", marginTop:"3px" }}>💬 {aanvraag.beheerderOpmerking}</div>}
                        </div>
                        <span style={{ fontSize:"11px", padding:"3px 10px", borderRadius:"20px", background:statusBg[aanvraag.status], color:statusKleur[aanvraag.status], fontWeight:"bold", whiteSpace:"nowrap" }}>{statusIcon[aanvraag.status]} {aanvraag.status}</span>
                        <button onClick={() => setAanvragen(prev => prev.map(a => a.id === aanvraag.id ? { ...a, gearchiveerdDoorBeheerder: false } : a))}
                          style={{ padding:"5px 12px", borderRadius:"7px", border:"1px solid rgba(74,158,224,0.3)", background:"rgba(74,158,224,0.06)", color:"#4A9EE0", cursor:"pointer", fontSize:"12px", fontFamily:"Georgia, serif" }}>↩ Terugzetten</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── WERKNEMERS ── */}
        {adminSub === "werknemers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <button onClick={() => setWModal(true)} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer", background: "linear-gradient(135deg, #4A9EE0, #2D6FA8)", color: "#fff", fontSize: "13px", fontWeight: "bold", fontFamily: "Georgia, serif", boxShadow: "0 4px 12px rgba(74,158,224,0.3)" }}>+ Werknemer toevoegen</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: "16px" }}>
              {werknemers.filter(w => !w.stagiair).map(w => {
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
                    {/* In opleiding */}
                    <div style={{ marginBottom: "8px", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom: w.inOpleiding ? "8px" : "0" }}>
                        <input type="checkbox" id={`opl-${w.id}`} checked={!!w.inOpleiding} onChange={e => setWerknemers(prev => prev.map(x => x.id === w.id ? { ...x, inOpleiding: e.target.checked, opleidingAfd: e.target.checked ? x.opleidingAfd : null } : x))} style={{ width:"14px", height:"14px", cursor:"pointer" }} />
                        <label htmlFor={`opl-${w.id}`} style={{ fontSize:"12px", color:"#C8D8E8", cursor:"pointer", fontWeight:"bold" }}>In opleiding</label>
                      </div>
                      {w.inOpleiding && (
                        <div>
                          <label style={{ fontSize:"10px", color:"#7A9AB5", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:"4px" }}>Opleidingsafdeling</label>
                          <select value={w.opleidingAfd || ""} onChange={e => setWerknemers(prev => prev.map(x => x.id === w.id ? { ...x, opleidingAfd: e.target.value || null } : x))} style={{ ...inputStyle, padding: "5px 8px", fontSize: "12px", width: "100%" }}>
                            <option value="">Kies afdeling...</option>
                            <option value="Micro">Micro</option>
                            <option value="Orglab">Orglab</option>
                            <option value="Chemie">Chemie</option>
                            <option value="Vrijgave">Vrijgave</option>
                            <option value="Klachten">Klachten</option>
                            <option value="Blik">Blik</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {w.pin && <button onClick={() => setConfirmModal({ vraag: `Pincode van "${w.naam}" resetten?`, onJa: () => setWerknemers(prev => prev.map(x => x.id === w.id ? { ...x, pin: null } : x)) })} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "1px solid rgba(232,168,56,0.3)", background: "rgba(232,168,56,0.06)", color: "#E8A838", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>🔑 Reset pin</button>}
                      <button onClick={() => setConfirmModal({ vraag: `Werknemer "${w.naam}" verwijderen? Alle aanvragen worden ook verwijderd.`, onJa: () => { setWerknemers(prev => prev.filter(x => x.id !== w.id)); setAanvragen(prev => prev.filter(a => a.werknemerId !== w.id)); } })} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "1px solid rgba(224,85,85,0.25)", background: "rgba(224,85,85,0.06)", color: "#E05555", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>🗑 Verwijderen</button>
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
                        <select value={nieuweWerknemer.invoer} onChange={e => setNieuweWerknemer(n => ({ ...n, invoer: e.target.value }))} style={{ ...inputStyle, flex: 1, padding: "8px 10px" }}>
                          <option value="">Kies afdeling...</option>
                          {["Micro","Orglab","Chemie","Vrijgave","Klachten","Blik","FQA","Hoofd FQA","Ass. Hoofd FQA"].filter(a => !nieuweWerknemer.afdelingen.includes(a)).map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <button onClick={() => { const afd = nieuweWerknemer.invoer.trim(); if (afd && !nieuweWerknemer.afdelingen.includes(afd)) setNieuweWerknemer(n => ({ ...n, afdelingen: [...n.afdelingen, afd], invoer: "" })); }} style={{ padding: "11px 16px", borderRadius: "8px", border: "none", background: "rgba(74,158,224,0.2)", color: "#4A9EE0", cursor: "pointer", fontSize: "16px" }}>+</button>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Contracturen per week</label>
                      <input type="number" min="1" max="40" value={nieuweWerknemer.contractUren} onChange={e => setNieuweWerknemer(n => ({ ...n, contractUren: e.target.value }))} placeholder="bijv. 32 of 40" style={inputStyle} />
                      {nieuweWerknemer.contractUren && parseInt(nieuweWerknemer.contractUren) > 0 && <div style={{ fontSize: "11px", color: "#4A9EE0", marginTop: "5px" }}>→ {berekenVerlofUren(parseInt(nieuweWerknemer.contractUren))}u verlof/jaar · {(parseInt(nieuweWerknemer.contractUren) / 40 * 25).toFixed(1)} vakantiedagen</div>}
                    </div>
                    <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                        <input type="checkbox" id="nieuw-stagiair-check" checked={!!nieuweWerknemer.isStage} onChange={e => setNieuweWerknemer(n => ({ ...n, isStage: e.target.checked, stagiair: e.target.checked ? n.stagiair : null }))} style={{ width:"14px", height:"14px", cursor:"pointer" }} />
                        <label htmlFor="nieuw-stagiair-check" style={{ fontSize:"13px", color:"#C8D8E8", cursor:"pointer", fontWeight:"bold" }}>Dit is een stagiair</label>
                      </div>
                      {nieuweWerknemer.isStage && (
                        <div>
                          <label style={labelStyle}>Stage afdeling</label>
                          <select value={nieuweWerknemer.stagiair || ""} onChange={e => setNieuweWerknemer(n => ({ ...n, stagiair: e.target.value || null }))} style={{ ...inputStyle, padding: "8px 10px", fontSize: "12px", width: "100%" }}>
                            <option value="">Kies afdeling...</option>
                            <option value="Chemie">Chemie</option>
                            <option value="Orglab">Orglab</option>
                            <option value="Micro">Micro</option>
                            <option value="Blik">Blik</option>
                          </select>
                        </div>
                      )}
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


        {/* ── STAGIAIRS ── */}
        {adminSub === "stagiairs" && (() => {
          const STAGE_AFDELINGEN = ["Micro","Orglab","Chemie","Blik"];
          const today = new Date().toISOString().slice(0,10);
          const actieveStagiairs = werknemers.filter(w => !!w.stagiair && !(w.stageGearchiveerd));
          const gearchiveerdeStagiairs = werknemers.filter(w => !!w.stagiair && !!w.stageGearchiveerd);
          const stagiairs = actieveStagiairs;

          function handleStagiairToevoegen() {
            if (!nieuweStagiair.naam.trim() || !nieuweStagiair.afdeling) return;
            const kleuren = ["#FF6B6B","#4ECDC4","#FFE66D","#A8E6CF","#FF8B94","#B4A7D6","#96CEB4","#FFEAA7","#DDA0DD","#F7DC6F","#82E0AA","#F1948A","#AED6F1","#D7BDE2","#FD79A8","#E17055","#00B894","#6C5CE7","#FDCB6E","#74B9FF"];
            setWerknemers(prev => [...prev, {
              id: Date.now(),
              naam: nieuweStagiair.naam.trim(),
              afdelingen: [nieuweStagiair.afdeling],
              contractUren: null,
              kleur: kleuren[Math.floor(Math.random() * kleuren.length)],
              stagiair: nieuweStagiair.afdeling,
              inOpleiding: false,
              roosterVolgorde: 99,
              stageSchool: nieuweStagiair.school.trim() || null,
              stageBegeleider: nieuweStagiair.begeleider || null,
              stageVan: nieuweStagiair.van || null,
              stageTot: nieuweStagiair.tot || null,
            }]);
            setNieuweStagiair({ naam: "", afdeling: "", school: "", begeleider: "", van: "", tot: "" });
            setStagiairModal(false);
          }

          function stageStatus(w) {
            const todayStr = new Date().toISOString().slice(0,10);
            if (!w.stageVan && !w.stageTot) return "onbekend";
            if (w.stageTot && w.stageTot < todayStr) return "afgelopen";
            if (w.stageVan && w.stageVan > todayStr) return "gepland";
            return "actief";
          }

          return (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px", flexWrap:"wrap", gap:"12px" }}>
                <div>
                  <h2 style={{ margin:0, fontSize:"20px", color:"#C8D8E8" }}>🎓 Stagiairs</h2>
                  <p style={{ margin:"4px 0 0", fontSize:"13px", color:"#7A9AB5" }}>{stagiairs.length} stagiair{stagiairs.length !== 1 ? "s" : ""} geregistreerd</p>
                </div>
                <button onClick={() => setStagiairModal(true)} style={{ padding:"10px 20px", borderRadius:"10px", border:"none", background:"linear-gradient(135deg, #4A9EE0, #2D6FA8)", color:"#fff", cursor:"pointer", fontFamily:"Georgia, serif", fontSize:"14px", fontWeight:"bold" }}>+ Stagiair toevoegen</button>
              </div>

              {stagiairs.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 24px", color:"#7A9AB5", background:"linear-gradient(135deg, #1A2C42, #162233)", borderRadius:"14px", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize:"40px", marginBottom:"12px" }}>🎓</div>
                  <div style={{ fontSize:"16px", marginBottom:"6px" }}>Geen stagiairs geregistreerd</div>
                  <div style={{ fontSize:"13px" }}>Klik op "+ Stagiair toevoegen" om te beginnen</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))", gap:"16px" }}>
                  {stagiairs.map(w => {
                    const status = stageStatus(w);
                    const statusKleurMap = { actief: "#2D9B6F", gepland: "#4A9EE0", afgelopen: "#7A9AB5", onbekend: "#E8A838" };
                    const statusLabelMap = { actief: "✅ Actief", gepland: "📅 Gepland", afgelopen: "🏁 Afgelopen", onbekend: "❓ Onbekend" };
                    const begeleider = werknemers.find(x => x.id === parseInt(w.stageBegeleider));
                    return (
                      <div key={w.id} style={{ background:"linear-gradient(135deg, #1A2C42, #162233)", borderRadius:"14px", padding:"20px", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 4px 16px rgba(0,0,0,0.2)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"14px" }}>
                          <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:"#E67E22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", fontWeight:"bold", color:"#fff", flexShrink:0 }}>
                            {w.naam.charAt(0)}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:"bold", fontSize:"15px", color:"#C8D8E8" }}>{w.naam}</div>
                            <div style={{ fontSize:"11px", color:"#E67E22", fontWeight:"bold", marginTop:"2px" }}>Stagiair {w.stagiair}</div>
                          </div>
                          <span style={{ fontSize:"11px", color:statusKleurMap[status], background:`${statusKleurMap[status]}22`, padding:"3px 10px", borderRadius:"20px", fontWeight:"bold" }}>{statusLabelMap[status]}</span>
                        </div>

                        <div style={{ display:"flex", flexDirection:"column", gap:"8px", fontSize:"12px" }}>
                          {(w.stageVan || w.stageTot) && (
                            <div style={{ display:"flex", gap:"6px", alignItems:"center", color:"#C8D8E8" }}>
                              <span style={{ color:"#7A9AB5", minWidth:"70px" }}>📅 Periode:</span>
                              <span>{w.stageVan ? new Date(w.stageVan+"T12:00").toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"}) : "?"} → {w.stageTot ? new Date(w.stageTot+"T12:00").toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"}) : "?"}</span>
                            </div>
                          )}
                          {w.stageSchool && (
                            <div style={{ display:"flex", gap:"6px", alignItems:"center", color:"#C8D8E8" }}>
                              <span style={{ color:"#7A9AB5", minWidth:"70px" }}>🏫 School:</span>
                              <span>{w.stageSchool}</span>
                            </div>
                          )}
                          {begeleider && (
                            <div style={{ display:"flex", gap:"6px", alignItems:"center", color:"#C8D8E8" }}>
                              <span style={{ color:"#7A9AB5", minWidth:"70px" }}>👤 Begeleider:</span>
                              <span>{begeleider.naam}</span>
                            </div>
                          )}
                        </div>

                        {/* Opleidingsstatus — beheerder beslist */}
                        {(() => {
                          const ONBOARDING_ITEMS_COUNT = 6;
                          const onbCount = Object.values(w.onboarding || {}).filter(Boolean).length;
                          const onboardingAfgerond = onbCount >= ONBOARDING_ITEMS_COUNT;
                          const kanOpleidingStarten = onboardingAfgerond && !w.stageInOpleiding && !w.stageZelfstandig;
                          const opleidingVoltooid = !!w.opleidingVoltooidMelding;
                          return (
                            <div style={{ marginTop:"14px", display:"flex", flexDirection:"column", gap:"8px" }}>

                              {/* Melding: onboarding afgerond → opleiding kan starten */}
                              {kanOpleidingStarten && (
                                <div style={{ padding:"10px 14px", borderRadius:"10px", background:"rgba(74,158,224,0.12)", border:"2px solid rgba(74,158,224,0.5)", display:"flex", alignItems:"center", gap:"10px" }}>
                                  <span style={{ fontSize:"18px" }}>🔔</span>
                                  <div style={{ flex:1 }}>
                                    <div style={{ fontSize:"12px", fontWeight:"bold", color:"#4A9EE0" }}>Onboarding afgerond</div>
                                    <div style={{ fontSize:"11px", color:"#7A9AB5" }}>{onbCount}/{ONBOARDING_ITEMS_COUNT} items · Opleiding kan starten</div>
                                  </div>
                                  <button onClick={() => setWerknemers(prev => prev.map(x => x.id === w.id ? { ...x, stageInOpleiding: true, stageZelfstandig: false } : x))}
                                    style={{ padding:"6px 12px", borderRadius:"8px", border:"none", background:"linear-gradient(135deg, #E8A838, #C47D10)", color:"#fff", cursor:"pointer", fontSize:"11px", fontFamily:"Georgia, serif", fontWeight:"bold", whiteSpace:"nowrap" }}>
                                    📚 Start opleiding
                                  </button>
                                </div>
                              )}

                              {/* Melding: opleiding voltooid → zelfstandig zetten */}
                              {opleidingVoltooid && !w.stageZelfstandig && (
                                <div style={{ padding:"10px 14px", borderRadius:"10px", background:"rgba(45,155,111,0.12)", border:"2px solid rgba(45,155,111,0.5)", display:"flex", alignItems:"center", gap:"10px" }}>
                                  <span style={{ fontSize:"18px" }}>🔔</span>
                                  <div style={{ flex:1 }}>
                                    <div style={{ fontSize:"12px", fontWeight:"bold", color:"#2D9B6F" }}>Opleiding voltooid gemeld</div>
                                    <div style={{ fontSize:"11px", color:"#7A9AB5" }}>Begeleider heeft opleiding als voltooid gemeld</div>
                                  </div>
                                  <button onClick={() => setWerknemers(prev => prev.map(x => x.id === w.id ? { ...x, stageZelfstandig: true, stageInOpleiding: false, opleidingVoltooidMelding: false } : x))}
                                    style={{ padding:"6px 12px", borderRadius:"8px", border:"none", background:"linear-gradient(135deg, #2D9B6F, #1E7050)", color:"#fff", cursor:"pointer", fontSize:"11px", fontFamily:"Georgia, serif", fontWeight:"bold", whiteSpace:"nowrap" }}>
                                    ✅ Zelfstandig
                                  </button>
                                </div>
                              )}

                              {/* Huidige status weergave */}
                              <div style={{ padding:"8px 12px", borderRadius:"8px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:"8px", fontSize:"12px" }}>
                                <span>{w.stageInOpleiding ? "📚" : w.stageZelfstandig ? "✅" : "⏳"}</span>
                                <span style={{ color: w.stageInOpleiding ? "#E8A838" : w.stageZelfstandig ? "#2D9B6F" : "#7A9AB5" }}>
                                  {w.stageInOpleiding ? "In opleiding" : w.stageZelfstandig ? "Zelfstandig" : `Onboarding: ${onbCount}/${ONBOARDING_ITEMS_COUNT}`}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Stagetermijn voortgangsbalk */}
                        {w.stageVan && w.stageTot && (() => {
                          const van = new Date(w.stageVan+"T12:00");
                          const tot = new Date(w.stageTot+"T12:00");
                          const nu  = new Date();
                          const totaal = tot - van;
                          const verstreken = Math.min(Math.max(nu - van, 0), totaal);
                          const pct = Math.round((verstreken / totaal) * 100);
                          const dagenRest = Math.max(0, Math.ceil((tot - nu) / 86400000));
                          const isVoorbij = nu > tot;
                          return (
                            <div style={{ marginTop:"12px" }}>
                              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10px", color:"#7A9AB5", marginBottom:"4px" }}>
                                <span>📅 Stagetermijn</span>
                                <span style={{ color: isVoorbij ? "#E05555" : dagenRest <= 14 ? "#E8A838" : "#7A9AB5" }}>
                                  {isVoorbij ? "Stage afgelopen" : `nog ${dagenRest} dag${dagenRest !== 1 ? "en" : ""}`}
                                </span>
                              </div>
                              <div style={{ height:"6px", borderRadius:"3px", background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${pct}%`, borderRadius:"3px", background: isVoorbij ? "#E05555" : dagenRest <= 14 ? "#E8A838" : "#2D9B6F", transition:"width 0.4s" }} />
                              </div>
                              <div style={{ fontSize:"10px", color:"#4A6A82", marginTop:"3px" }}>{pct}% verstreken</div>
                            </div>
                          );
                        })()}

                        <div style={{ marginTop:"10px", display:"flex", gap:"8px" }}>
                          {stageStatus(w) === "afgelopen" && (
                            <button onClick={() => setWerknemers(prev => prev.map(x => x.id === w.id ? { ...x, stageGearchiveerd: true } : x))}
                              style={{ flex:1, padding:"7px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)", color:"#7A9AB5", cursor:"pointer", fontSize:"12px", fontFamily:"Georgia, serif" }}>📦 Archiveren</button>
                          )}
                          <button onClick={() => setConfirmModal({ vraag: `Stagiair "${w.naam}" verwijderen?`, onJa: () => setWerknemers(prev => prev.filter(x => x.id !== w.id)) })} style={{ flex:1, padding:"7px", borderRadius:"8px", border:"1px solid rgba(224,85,85,0.25)", background:"rgba(224,85,85,0.06)", color:"#E05555", cursor:"pointer", fontSize:"12px", fontFamily:"Georgia, serif" }}>🗑 Verwijderen</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stagiair toevoegen modal */}
              {stagiairModal && (
                <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
                  <div style={{ background:"#1A2C42", borderRadius:"16px", padding:"28px", width:"100%", maxWidth:"460px", border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
                    <h3 style={{ margin:"0 0 20px", fontSize:"18px", color:"#C8D8E8" }}>🎓 Stagiair toevoegen</h3>
                    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                      <div>
                        <label style={{ fontSize:"11px", color:"#7A9AB5", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Naam *</label>
                        <input value={nieuweStagiair.naam} onChange={e => setNieuweStagiair(n => ({...n, naam: e.target.value}))} placeholder="Volledige naam" style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
                      </div>
                      <div>
                        <label style={{ fontSize:"11px", color:"#7A9AB5", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Stageafdeling *</label>
                        <select value={nieuweStagiair.afdeling} onChange={e => setNieuweStagiair(n => ({...n, afdeling: e.target.value}))} style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }}>
                          <option value="">Kies afdeling...</option>
                          {STAGE_AFDELINGEN.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:"11px", color:"#7A9AB5", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>School / opleiding</label>
                        <input value={nieuweStagiair.school} onChange={e => setNieuweStagiair(n => ({...n, school: e.target.value}))} placeholder="Bijv. Noorderpoort, Alfa-college..." style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
                      </div>
                      <div>
                        <label style={{ fontSize:"11px", color:"#7A9AB5", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Begeleider</label>
                        <select value={nieuweStagiair.begeleider} onChange={e => setNieuweStagiair(n => ({...n, begeleider: e.target.value}))} style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }}>
                          <option value="">Kies begeleider...</option>
                          {werknemers.filter(w => !w.stagiair).sort((a,b) => a.naam.localeCompare(b.naam)).map(w => <option key={w.id} value={w.id}>{w.naam}</option>)}
                        </select>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                        <div>
                          <label style={{ fontSize:"11px", color:"#7A9AB5", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Startdatum</label>
                          <input type="date" value={nieuweStagiair.van} onChange={e => setNieuweStagiair(n => ({...n, van: e.target.value}))} style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize:"11px", color:"#7A9AB5", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:"6px" }}>Einddatum</label>
                          <input type="date" value={nieuweStagiair.tot} min={nieuweStagiair.van} onChange={e => setNieuweStagiair(n => ({...n, tot: e.target.value}))} style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:"10px", marginTop:"6px" }}>
                        <button onClick={() => { setStagiairModal(false); setNieuweStagiair({ naam:"", afdeling:"", school:"", begeleider:"", van:"", tot:"" }); }} style={{ flex:1, padding:"11px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#7A9AB5", cursor:"pointer", fontFamily:"Georgia, serif" }}>Annuleren</button>
                        <button onClick={handleStagiairToevoegen} style={{ flex:2, padding:"11px", borderRadius:"8px", border:"none", background:"linear-gradient(135deg, #4A9EE0, #2D6FA8)", color:"#fff", cursor:"pointer", fontWeight:"bold", fontFamily:"Georgia, serif" }}>🎓 Toevoegen</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Archief sectie */}
              {gearchiveerdeStagiairs.length > 0 && (
                <div style={{ marginTop:"32px" }}>
                  <button onClick={() => setToonArchief(v => !v)}
                    style={{ display:"flex", alignItems:"center", gap:"8px", background:"none", border:"none", cursor:"pointer", color:"#7A9AB5", fontFamily:"Georgia, serif", fontSize:"14px", fontWeight:"bold", marginBottom:"16px", padding:0 }}>
                    <span style={{ fontSize:"16px" }}>📦</span>
                    Archief ({gearchiveerdeStagiairs.length} afgelopen stage{gearchiveerdeStagiairs.length !== 1 ? "s" : ""})
                    <span style={{ fontSize:"11px" }}>{toonArchief ? "▲ verbergen" : "▼ tonen"}</span>
                  </button>

                  {toonArchief && (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:"12px" }}>
                      {gearchiveerdeStagiairs.map(w => {
                        const begeleider = werknemers.find(x => x.id === parseInt(w.stageBegeleider));
                        return (
                          <div key={w.id} style={{ background:"rgba(255,255,255,0.02)", borderRadius:"12px", padding:"16px", border:"1px solid rgba(255,255,255,0.05)", opacity:0.85 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
                              <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"#555", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:"bold", color:"#fff", flexShrink:0 }}>{w.naam.charAt(0)}</div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:"bold", fontSize:"14px", color:"#9AB0C2" }}>{w.naam}</div>
                                <div style={{ fontSize:"11px", color:"#5A7A8A" }}>Stagiair {w.stagiair}{w.stageSchool ? ` · ${w.stageSchool}` : ""}</div>
                              </div>
                              <span style={{ fontSize:"10px", color:"#7A9AB5", background:"rgba(255,255,255,0.06)", padding:"2px 8px", borderRadius:"20px" }}>
                                {w.stageZelfstandig ? "✅ Zelfstandig" : "🏁 Afgerond"}
                              </span>
                            </div>
                            <div style={{ fontSize:"11px", color:"#4A6A82", display:"flex", flexDirection:"column", gap:"3px" }}>
                              {w.stageVan && w.stageTot && <span>📅 {new Date(w.stageVan+"T12:00").toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"})} → {new Date(w.stageTot+"T12:00").toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"})}</span>}
                              {begeleider && <span>👤 {begeleider.naam}</span>}
                            </div>
                            <div style={{ marginTop:"10px", display:"flex", gap:"8px" }}>
                              <button onClick={() => setWerknemers(prev => prev.map(x => x.id === w.id ? { ...x, stageGearchiveerd: false } : x))}
                                style={{ flex:1, padding:"6px", borderRadius:"7px", border:"1px solid rgba(74,158,224,0.2)", background:"rgba(74,158,224,0.05)", color:"#4A9EE0", cursor:"pointer", fontSize:"11px", fontFamily:"Georgia, serif" }}>↩ Terugzetten</button>
                              <button onClick={() => setConfirmModal({ vraag: `Stagiair "${w.naam}" definitief verwijderen?`, onJa: () => setWerknemers(prev => prev.filter(x => x.id !== w.id)) })}
                                style={{ flex:1, padding:"6px", borderRadius:"7px", border:"1px solid rgba(224,85,85,0.2)", background:"rgba(224,85,85,0.05)", color:"#E05555", cursor:"pointer", fontSize:"11px", fontFamily:"Georgia, serif" }}>🗑 Verwijderen</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })()}

        {/* ── KALENDER OVERZICHT ── */}
        {adminSub === "kalender" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", color: "#7A9AB5" }}>Verlofperioden per werknemer — afgewezen aanvragen worden niet getoond.</span>
              <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                <span><span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#4A9EE0", marginRight: "5px", verticalAlign: "middle" }}/>In behandeling</span>
                <span><span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#E8C838", marginRight: "5px", verticalAlign: "middle" }}/>Goedgekeurd</span>
              </div>
            </div>
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
                      {actief.map(a => {
                        const isGoed = a.status === "goedgekeurd";
                        const bg   = isGoed ? "rgba(232,200,56,0.15)"  : "rgba(74,158,224,0.15)";
                        const bord = isGoed ? "rgba(232,200,56,0.45)"  : "rgba(74,158,224,0.45)";
                        const klr  = isGoed ? "#D4B800"                : "#4A9EE0";
                        return (
                          <div key={a.id} style={{ background: bg, border: `1px solid ${bord}`, borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: klr }}>
                            {a.type === "Vrije dag" ? "☀️" : a.type === "Dienstreis" ? "✈️" : "🌴"} {fmtDatum(a.van)}{a.van !== a.tot ? ` → ${fmtDatum(a.tot)}` : ""} <span style={{ opacity: 0.7 }}>({dateDiff(a.van, a.tot)}d)</span>
                            {isProblem(a, aanvragen, werknemers) && <span style={{ marginLeft: "6px", color: "#E05555" }}>⚠️</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ROOSTER ── */}
        {adminSub === "rooster" && (() => {
          const maandNamen = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
          const AFDELINGEN_ROOSTER = ["Hoofd FQA","Ass. Hoofd FQA","Micro","Orglab","Chemie","Vrijgave","FQA","Blik"];
          const dn = ["zo","ma","di","wo","do","vr","za"];

          function getDagenVanMaand(jaar, maand) {
            const dagen = [];
            const n = new Date(jaar, maand + 1, 0).getDate();
            for (let d = 1; d <= n; d++) {
              const datum = new Date(jaar, maand, d);
              const dow = datum.getDay();
              if (dow >= 1 && dow <= 5) {
                const dagStr = `${jaar}-${String(maand+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                dagen.push({ datum, dagStr, dag: d, dow });
              }
            }
            return dagen;
          }

          const werkdagen = getDagenVanMaand(roosterJaar, roosterMaand);
          const feestdagenMaand = feestdagenVoorJaar(roosterJaar);
          // Bouw roostervolgorde op: vaste volgorde + stagiairs op juiste plek
          // Volgorde: 1=Leon,2=Elke,3=Roos,4=NielsDeVr,5=Monique,6=Alinda,7=StageChemie,8=Anita,9=Erwin,10=Sjoerd,
          //           11=Alwin,12=LeegOrglab,13=Ina,14=LeegOrglab2,15=Nadia,16=LeegOrglab3,17=Melanie,18=Suleika,
          //           19=LeegMicro,20=Diana,21=Xamira,22=Ylva,23=NielsR,24=Dylan,25=Bart,26=Nick
          function buildRoosterVolgorde(wns) {
            // Volgorde op naam — onafhankelijk van Supabase ID
            const NAAM_POS = {
              "Leon Segerink": 0,
              "Elke Buikstra-bosklopper": 1,
              "Roos Van Wijnen": 2,
              "Nick Roskam": 3,
              "Niels De Vries": 4,
              "Niels de Vries": 4,
              "Monique Breijmer": 5,
              "Alinda Postma": 6,
              "Anita Dijkstra": 7,
              "Erwin Kooistra": 8,
              "Sjoerd Kaper": 9,
              "Alwin Speelman": 10,
              "Ina Betlehem Stevens": 11,
              "Nadia Keuning": 12,
              "Melanie Schep": 13,
              "Suleika Ramdien": 14,
              "Diana Wijbenga": 15,
              "Xamira De Haan": 16,
              "Xamira de Haan": 16,
              "Ylva": 17,
              "Niels Rosenau": 18,
              "Bart Reinsma": 19,
              "Dylan Breebaard": 20,
            };
            const stagChemie = wns.filter(w => w.stagiair === "Chemie");
            const stagOrglab = wns.filter(w => w.stagiair === "Orglab");
            const stagMicro  = wns.filter(w => w.stagiair === "Micro");
            const stagBlik   = wns.filter(w => w.stagiair === "Blik");
            const overigStagiairs = wns.filter(w => w.stagiair && !["Chemie","Orglab","Micro","Blik"].includes(w.stagiair));
            const vast = wns.filter(w => !w.stagiair).sort((a, b) => {
              // Probeer exacte naam, dan lowercase variant
              const posA = NAAM_POS[a.naam] ?? NAAM_POS[a.naam?.trim()] ?? 99;
              const posB = NAAM_POS[b.naam] ?? NAAM_POS[b.naam?.trim()] ?? 99;
              return posA - posB;
            });
            const result = [];
            for (const w of vast) {
              result.push(w);
              if (w.naam === "Alwin Speelman")      stagChemie.forEach(s => result.push(s));
              if (w.naam === "Ina Betlehem Stevens") stagOrglab.forEach(s => result.push(s));
              if (w.naam === "Melanie Schep")        stagMicro.forEach(s => result.push(s));
              if (w.naam === "Dylan Breebaard")      stagBlik.forEach(s => result.push(s));
            }
            overigStagiairs.forEach(s => result.push(s));
            return result;
          }
          const gesorteerdeWerknemers = buildRoosterVolgorde(werknemers);

          // roosterData: { [dagStr]: { [wId]: { O: "afd"|null, M: "afd"|null } } }
          function getSlot(dagStr, wId, deel) {
            const val = weekTemplate?.[dagStr]?.[wId]?.[deel];
            if (!val) return null;
            // Support old string format and new object format
            return typeof val === "object" ? val.afd : val;
          }
          function getSlotSnapshot(dagStr, wId, deel) {
            const val = weekTemplate?.[dagStr]?.[wId]?.[deel];
            if (!val || typeof val === "string") return null;
            return val; // { afd, inOpleiding, zelfstandig }
          }

          function setSlot(dagStr, wId, deel, afd, snapshot) {
            // snapshot = { inOpleiding, zelfstandig } op moment van slepen
            setWeekTemplate(prev => ({
              ...prev,
              [dagStr]: {
                ...(prev[dagStr] || {}),
                [wId]: {
                  ...((prev[dagStr] || {})[wId] || {}),
                  [deel]: afd ? { afd, ...snapshot } : null
                }
              }
            }));
          }

          function clearSlot(dagStr, wId, deel) {
            setSlot(dagStr, wId, deel, null, {});
          }

          function heeftVerlof(wId, dagStr) {
            return aanvragen.some(a => a.werknemerId === wId && a.type !== "Dienstreis" && a.status !== "afgewezen" && a.van <= dagStr && a.tot >= dagStr);
          }
          function heeftDienstreis(wId, dagStr) {
            return aanvragen.some(a => a.werknemerId === wId && a.type === "Dienstreis" && a.status !== "afgewezen" && a.van <= dagStr && a.tot >= dagStr);
          }

          function onDragStart(e, afd) {
            e.dataTransfer.setData("afd", afd);
          }

          function onDrop(e, dagStr, wId, deel) {
            e.preventDefault();
            const afd = e.dataTransfer.getData("afd");
            if (!afd) return;
            const w = werknemers.find(x => x.id === wId);
            // Alleen inplannen als werknemer afdelingen heeft én de afdeling overeenkomt
            if (!w || !w.afdelingen || w.afdelingen.length === 0) return;
            if (!w.afdelingen.includes(afd)) return;
            // Snapshot van huidige opleidingsstatus opslaan in het vakje
            const snapshot = { inOpleiding: !!w.stageInOpleiding, zelfstandig: !!w.stageZelfstandig };
            setSlot(dagStr, wId, deel, afd, snapshot);
          }

          function onDragOver(e) { e.preventDefault(); }

          const afdKleuren = {
            "Hoofd FQA":     "#E05555",
            "Ass. Hoofd FQA":"#E05555",
            "Micro":         "#C39BD3",
            "Orglab":        "#85C1E9",
            "Chemie":        "#F9E547",
            "Vrijgave":      "#2E86C1",
            "FQA":           "#1ABC9C",
            "Blik":          "#FF9F43",
          };
          // Letter per afdeling
          const afdLetter = {
            "Chemie":     "C",
            "Micro":      "M",
            "Orglab":     "O",
            "Blik":       "B",
            "Vrijgave":   "V",
            "FQA":        "F",
            "Hoofd FQA":  "HF",
            "Ass. Hoofd FQA": "AH",
          };
          const STAGIAIR_KLEUR = "#E67E22";

          return (
            <div style={{ fontFamily:"Georgia, serif" }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"14px", flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <button onClick={() => { let m=roosterMaand-1,j=roosterJaar; if(m<0){m=11;j--;} setRoosterMaand(m);setRoosterJaar(j); }} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#E8EDF2", borderRadius:"8px", padding:"5px 12px", cursor:"pointer", fontSize:"15px" }}>&#8249;</button>
                  <span style={{ fontSize:"16px", fontWeight:"bold", minWidth:"165px", textAlign:"center" }}>{maandNamen[roosterMaand]} {roosterJaar}</span>
                  <button onClick={() => { let m=roosterMaand+1,j=roosterJaar; if(m>11){m=0;j++;} setRoosterMaand(m);setRoosterJaar(j); }} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#E8EDF2", borderRadius:"8px", padding:"5px 12px", cursor:"pointer", fontSize:"15px" }}>&#8250;</button>
                </div>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                  {AFDELINGEN_ROOSTER.map(afd => (
                    <div key={afd} draggable onDragStart={e => onDragStart(e, afd)} style={{ padding:"4px 10px", borderRadius:"20px", border:`1px solid ${afdKleuren[afd]}66`, background:afdKleuren[afd]+"22", color:afdKleuren[afd], fontSize:"11px", cursor:"grab", userSelect:"none", fontWeight:"bold" }}>
                      {afd}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize:"10px", color:"#4A6A82", marginLeft:"4px" }}>← sleep afdeling naar vakje</span>
                <button onClick={() => {
                    // Zoek de eerste 5 werkdagen in de huidige maand die data bevatten
                    const werkdagenMetData = werkdagen.filter(({ dagStr }) =>
                      weekTemplate?.[dagStr] && Object.keys(weekTemplate[dagStr]).length > 0
                    );
                    if (werkdagenMetData.length < 5) {
                      alert("Vul eerst minimaal 5 werkdagen in om te kopiëren.");
                      return;
                    }
                    // Neem de eerste 5 werkdagen met data als bronweek
                    const bronDagen = werkdagenMetData.slice(0, 5);
                    // Zoek de 5 werkdagen direct erna (niet per se in dezelfde maand)
                    const bronDagStrs = bronDagen.map(d => d.dagStr);
                    const laatsteBronDag = new Date(bronDagStrs[4]);
                    // Bouw lijst van volgende 5 werkdagen na de bronweek
                    const doelDagen = [];
                    const cursor = new Date(laatsteBronDag);
                    while (doelDagen.length < 5) {
                      cursor.setDate(cursor.getDate() + 1);
                      const str = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`;
                      if (isWerkdag(str)) doelDagen.push(str);
                    }
                    // Kopieer bronweek naar doelweek
                    setWeekTemplate(prev => {
                      const nieuw = { ...prev };
                      bronDagStrs.forEach((bron, i) => {
                        const doel = doelDagen[i];
                        nieuw[doel] = JSON.parse(JSON.stringify(prev[bron] || {}));
                      });
                      return nieuw;
                    });
                    alert(`Week gekopieerd naar ${doelDagen[0]} t/m ${doelDagen[4]}!`);
                  }} style={{ background:"rgba(74,158,224,0.12)", border:"1px solid rgba(74,158,224,0.3)", color:"#4A9EE0", borderRadius:"8px", padding:"6px 14px", cursor:"pointer", fontSize:"12px", fontFamily:"Georgia, serif", fontWeight:"bold" }}>📋 Kopieer week →</button>
                <button onClick={() => {
                    document.body.classList.add("rooster-print-active");
                    window.print();
                    setTimeout(() => {
                      document.body.classList.remove("rooster-print-active");
                    }, 2000);
                  }} style={{ marginLeft:"auto", background:"rgba(224,85,85,0.15)", border:"1px solid rgba(224,85,85,0.3)", color:"#E05555", borderRadius:"8px", padding:"6px 14px", cursor:"pointer", fontSize:"12px", fontFamily:"Georgia, serif", fontWeight:"bold" }}>&#128424; Afdrukken</button>
              </div>

              {/* Grid */}
              <div className="rooster-print-container" style={{ overflowX:"auto" }}>
                <table style={{ borderCollapse:"collapse", fontSize:"10px" }}>
                  <colgroup>
                    <col style={{ width:"60px" }} />
                    {gesorteerdeWerknemers.flatMap(w => [
                      <col key={w.id+"O"} style={{ width:"56px" }} />,
                      <col key={w.id+"M"} style={{ width:"56px" }} />
                    ])}
                  </colgroup>
                  <thead>
                    {/* Namen */}
                    <tr>
                      <th style={{ background:"#0D1820", border:"1px solid rgba(255,255,255,0.08)", padding:"4px 6px" }}></th>
                      {gesorteerdeWerknemers.map(w => (
                        <th key={w.id} colSpan={2} style={{ background:"#0D1820", border:"1px solid rgba(255,255,255,0.08)", borderLeft:"2px solid rgba(255,255,255,0.35)", padding:"4px 3px", textAlign:"center", whiteSpace:"nowrap" }}>
                          <span style={{ color:"#C8D8E8", fontSize:"10px", fontWeight:"bold" }}>{w.naam === "Niels De Vries" ? "Niels V" : w.naam === "Niels Rosenau" ? "Niels R" : w.naam.split(" ")[0]}</span>
                        </th>
                      ))}
                    </tr>
                    {/* O/M */}
                    <tr>
                      <th style={{ background:"#0D1820", border:"1px solid rgba(255,255,255,0.08)", padding:"3px 5px", color:"#4A6A82", fontSize:"9px" }}>Datum</th>
                      {gesorteerdeWerknemers.flatMap(w => ["O","M"].map(deel => (
                        <th key={w.id+deel} style={{ background: deel==="O" ? "rgba(74,158,224,0.1)" : "rgba(45,155,111,0.1)", border:"1px solid rgba(255,255,255,0.07)", padding:"3px 2px", textAlign:"center", color: deel==="O" ? "#4A9EE0" : "#2D9B6F", fontSize:"9px", fontWeight:"bold", borderLeft: deel==="O" ? "2px solid rgba(255,255,255,0.35)" : "none" }}>
                          {deel==="O" ? "Och" : "Mid"}
                        </th>
                      )))}
                    </tr>
                  </thead>
                  <tbody>
                    {werkdagen.map(({ datum, dagStr, dag, dow }) => {
                      const isFeest = feestdagenMaand.has(dagStr);
                      const feestNaam = feestdagenMaand.get(dagStr);
                      const isMa = dow === 1;
                      return (
                        <tr key={dagStr} style={{ borderTop: isMa ? "2px solid rgba(74,158,224,0.3)" : "none", borderBottom: "1px solid rgba(255,255,255,0.12)" }} className={isMa ? "rooster-week-start" : ""}>
                          <td style={{ background: isFeest ? "rgba(224,85,85,0.1)" : "rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.12)", padding:"3px 5px", whiteSpace:"nowrap", verticalAlign:"middle" }}>
                            <div style={{ fontWeight:"bold", color: isFeest ? "#E05555" : "#C8D8E8", fontSize:"10px" }}>{dn[dow]} {dag}</div>
                            {feestNaam && <div style={{ fontSize:"8px", color:"#E05555" }}>{feestNaam}</div>}
                          </td>
                          {gesorteerdeWerknemers.flatMap(w => {
                            const verlof = heeftVerlof(w.id, dagStr);
                            const dienstreis = heeftDienstreis(w.id, dagStr);
                            return ["O","M"].map(deel => {
                              const afd = getSlot(dagStr, w.id, deel);
                              const isStagiair = !!w.stagiair;
                              const heeftAfdelingen = w.afdelingen && w.afdelingen.length > 0;
                              const isOpleiding = !!w.inOpleiding;
                              const isOplAfd = isOpleiding && w.opleidingAfd && afd === w.opleidingAfd;
                              // Stagiair in opleiding: afdeling kleur + O
                              // Stagiair zelfstandig: afdeling kleur + gewone letter
                              // Stagiair zonder status: oranje + letter
                              // Werknemer in opleiding op juiste afd: afdeling kleur + OPL
                              // Anders: gewone afdeling kleur + gewone letter
                              const snap = isStagiair && afd ? getSlotSnapshot(dagStr, w.id, deel) : null;
                              const stagInOpleiding = isStagiair && afd ? (snap ? snap.inOpleiding : !!w.stageInOpleiding) : false;
                              const stagZelfstandig = isStagiair && afd ? (snap ? snap.zelfstandig : !!w.stageZelfstandig) : false;
                              const celKleur = afd ? (
                                isStagiair ? (stagZelfstandig ? afdKleuren[w.stagiair] : stagInOpleiding ? afdKleuren[w.stagiair] : STAGIAIR_KLEUR)
                                : afdKleuren[afd]
                              ) : null;
                              const letter = afd ? (
                                isStagiair
                                  ? (stagInOpleiding ? "OPL" : stagZelfstandig ? (afdLetter[w.stagiair] || w.stagiair[0]) : (afdLetter[w.stagiair] || w.stagiair[0]))
                                  : isOplAfd ? "OPL" : (afdLetter[afd] || "")
                              ) : "";
                              // Verlof: licht groen als geen afdeling ingevuld, anders afdeling kleur met 🌴
                              const VERLOF_KLEUR = "#27AE60";
                              const bg = afd ? celKleur : verlof ? VERLOF_KLEUR : dienstreis ? VERLOF_KLEUR : isFeest ? "rgba(224,85,85,0.08)" : "rgba(255,255,255,0.01)";
                              return (
                                <td key={w.id+deel}
                                  onDrop={e => onDrop(e, dagStr, w.id, deel)}
                                  onDragOver={e => { e.preventDefault(); }}
                                  onClick={afd ? () => clearSlot(dagStr, w.id, deel) : undefined}
                                  title={afd ? `${afd} — klik om te verwijderen` : dienstreis ? "Dienstreis" : verlof ? "Verlof" : heeftAfdelingen ? `Alleen: ${w.afdelingen.join(", ")}` : "Sleep een afdeling hierheen"}
                                  style={{ border: afd && stagInOpleiding ? "2px solid #E67E22" : "1px solid rgba(255,255,255,0.05)", borderLeft: deel==="O" ? "2px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.04)", padding:"0", verticalAlign:"middle", textAlign:"center", height:"26px", width:"28px", position:"relative", cursor: afd ? "pointer" : "default" }}>
                                  {(afd || dienstreis || verlof) ? (
                                    <svg width="100%" height="26" style={{ display:"block", position:"absolute", top:0, left:0 }} xmlns="http://www.w3.org/2000/svg">
                                      <rect x="0" y="0" width="100%" height="26" fill={bg || "transparent"} />
                                      <text x="50%" y="17" textAnchor="middle" fontSize={letter==="OPL"?"7":"11"} fontWeight="bold" fill="#000000" fontFamily="Georgia,serif">
                                        {afd ? letter : dienstreis ? "DR" : "🌴"}
                                      </text>
                                      {verlof && afd && <text x="90%" y="10" textAnchor="middle" fontSize="7">🌴</text>}
                                    </svg>
                                  ) : null}
                                </td>
                              );
                            });
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

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
      {/* Bevestiging modal */}
      {confirmModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
          <div style={{ background:"#1A2C42", borderRadius:"16px", padding:"28px 32px", width:"100%", maxWidth:"380px", border:"1px solid rgba(255,255,255,0.12)", boxShadow:"0 20px 60px rgba(0,0,0,0.6)", fontFamily:"Georgia, serif" }}>
            <div style={{ fontSize:"22px", marginBottom:"14px", textAlign:"center" }}>⚠️</div>
            <p style={{ color:"#C8D8E8", fontSize:"15px", textAlign:"center", margin:"0 0 24px", lineHeight:1.5 }}>{confirmModal.vraag}</p>
            <div style={{ display:"flex", gap:"12px" }}>
              <button onClick={() => setConfirmModal(null)} style={{ flex:1, padding:"11px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.12)", background:"transparent", color:"#7A9AB5", cursor:"pointer", fontFamily:"Georgia, serif", fontSize:"14px" }}>Annuleren</button>
              <button onClick={() => { confirmModal.onJa(); setConfirmModal(null); }} style={{ flex:1, padding:"11px", borderRadius:"10px", border:"none", background:"linear-gradient(135deg, #E05555, #B03030)", color:"#fff", cursor:"pointer", fontFamily:"Georgia, serif", fontSize:"14px", fontWeight:"bold" }}>Ja, doorgaan</button>
            </div>
          </div>
        </div>
      )}

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

          const dagBreedte = 22;       // scherm: breedte van elk dagblokje in px
          const dagGap = 1;             // gap tussen dagblokjes
          const maandPadding = 4;       // borderLeft(2) + paddingLeft(2) per maand
          // Print constanten (moeten overeenkomen met print CSS [data-type] width)
          const dagBreedtePrint = 3;

          // Bereken maandbreedte exact op basis van dagbreedte + gap + padding
          function maandBreedte(aantalDagen, isPrint = false) {
            const dw = isPrint ? dagBreedtePrint : (dagBreedte / 3.5);
            return aantalDagen * (dw + dagGap) + maandPadding;
          }

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
          const aantalWerknemers = [...werknemers].sort((a,b) => a.naam.localeCompare(b.naam, 'nl')).length;

          function exportPDF() {
            const beschikbaarMM = 189;
            const rijHoogteMM = beschikbaarMM / aantalWerknemers;
            const rijHoogtePx = rijHoogteMM * 3.7796;
            const dagHoogte = Math.max(6, Math.round(rijHoogtePx - 3));
            const avatarSize = Math.max(10, Math.min(18, Math.round(rijHoogtePx - 2)));

            // Bereken correcte maandlabel breedtes voor print via data-dagen attribuut
            const maandStijlen = Array.from({length: 12}, (_, mIdx) => {
              const n = dagenInMaand(jaarKeuze, mIdx);
              const w = maandBreedte(n, true);
              return `.maand-label:nth-child(${mIdx + 1}) { width: ${w}px !important; min-width: ${w}px !important; }`;
            }).join("\n");

            const stijl = document.createElement("style");
            stijl.id = "print-dynamic";
            stijl.textContent = `
              @media print {
                @page { size: A4 landscape; margin: 5mm 5mm; }
                .jaar-rij { height: ${Math.round(rijHoogtePx)}px !important; }
                [data-type] { height: ${dagHoogte}px !important; width: ${dagBreedtePrint}px !important; }
                .naam-avatar { width: ${avatarSize}px !important; height: ${avatarSize}px !important; min-width: ${avatarSize}px !important; font-size: ${Math.max(7, avatarSize - 8)}px !important; }
                ${maandStijlen}
              }
            `;
            document.head.appendChild(stijl);
            window.print();
            setTimeout(() => { const s = document.getElementById("print-dynamic"); if (s) s.remove(); }, 1500);
          }

          return (
            <div className="jaaroverzicht-print">
              <div className="no-print" style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
                <button onClick={() => setJaarKeuze(y => y - 1)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF2", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "16px" }}>‹</button>
                <span style={{ fontSize: "22px", fontWeight: "bold" }}>{jaarKeuze}</span>
                <button onClick={() => setJaarKeuze(y => y + 1)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF2", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "16px" }}>›</button>
                <div style={{ display: "flex", gap: "12px", marginLeft: "16px", fontSize: "12px", color: "#7A9AB5", flexWrap: "wrap", flex: 1 }}>
                  <span><span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", background: "rgba(74,158,224,0.6)", marginRight: "5px", verticalAlign: "middle" }}/>In behandeling</span>
                  <span><span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", background: "rgba(232,200,56,0.75)", marginRight: "5px", verticalAlign: "middle" }}/>Goedgekeurd verlof</span>
                  <span><span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", background: "rgba(39,174,96,0.85)", marginRight: "5px", verticalAlign: "middle" }}/>✈️ Dienstreis</span>
                  <span><span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", background: "rgba(224,85,85,0.25)", marginRight: "5px", verticalAlign: "middle" }}/>Feestdag</span>
                  <span><span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", background: "rgba(100,180,100,0.2)", marginRight: "5px", verticalAlign: "middle" }}/>Schoolvakantie</span>
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

              {/* Printtitel - alleen zichtbaar bij afdrukken */}
              <div className="print-only-title" style={{ display: "none" }}>
                <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px", color: "#000" }}>
                  🌴 Verlof Aanvraag — Jaaroverzicht {jaarKeuze}
                </div>
              </div>

              {/* Eén scrollbare container voor alle rijen inclusief maandlabels */}
              <div className="jaar-scroll" style={{ overflowX: "auto", paddingBottom: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: "max-content" }}>

                  {/* Maandlabels bovenaan, scrollt mee */}
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                    <div className="maand-spacer" style={{ width: "160px", flexShrink: 0 }} />
                    <div style={{ display: "flex", gap: "0" }}>
                      {maanden.map((mNaam, mIdx) => {
                        const aantalDagen = dagenInMaand(jaarKeuze, mIdx);
                        const breedte = maandBreedte(aantalDagen);
                        const isEvenMaand = mIdx % 2 === 0;
                        return (
                          <div key={mIdx} className="maand-label" data-dagen={aantalDagen} style={{ width: `${breedte}px`, flexShrink: 0, fontSize: "11px", color: isEvenMaand ? "#4A9EE0" : "#7A9AB5", textAlign: "center", overflow: "hidden", fontWeight: "bold", borderLeft: "2px solid rgba(255,255,255,0.12)", paddingLeft: "2px" }}>
                            {mNaam}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {[...werknemers].sort((a,b) => a.naam.localeCompare(b.naam, 'nl')).map(w => {
                    return (
                      <div key={w.id} className="jaar-rij" style={{ display: "flex", alignItems: "center", gap: "0" }}>
                        {/* Naam kolom */}
                        <div className="naam-kolom" style={{ width: "160px", flexShrink: 0, display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px" }}>
                          <div className="naam-avatar" style={{ width: "26px", height: "26px", borderRadius: "50%", background: w.kleur, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", color: "#0F1923", flexShrink: 0 }}>{w.naam.charAt(0)}</div>
                          <span className="naam-label" style={{ fontSize: "12px", color: "#B0BEC8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.naam === "Niels De Vries" ? "Niels V" : w.naam === "Niels Rosenau" ? "Niels R" : w.naam.split(" ")[0]}</span>
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
                                  let bg = "rgba(255,255,255,0.15)";
                                  let dagType = "werkdag";
                                  const dagNamen = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
                                  const dagNaam = dagNamen[dagObj.getDay()];
                                  let title = `${dagNaam} ${fmtDatum(dagStr)}`;
                                  if (isFeest) { bg = "rgba(224,85,85,0.25)"; dagType = "feestdag"; title = `${dagNaam} ${fmtDatum(dagStr)} · ${feestdagen.get(dagStr) || "Feestdag"}`; }
                                  else if (isWeekend) { bg = "rgba(255,255,255,0.03)"; dagType = "weekend"; }
                                  else if (schoolvak && !aanvraagOpDag) { bg = "rgba(100,180,100,0.2)"; dagType = "schoolvak"; title = `${dagNaam} ${fmtDatum(dagStr)} · 🏫 ${schoolvak.naam}`; }
                                  else if (aanvraagOpDag) {
                                    if (aanvraagOpDag.type === "Dienstreis") {
                                      bg = aanvraagOpDag.status === "goedgekeurd" ? "rgba(39,174,96,0.85)" : "rgba(39,174,96,0.45)"; dagType = "dienstreis";
                                    } else if (aanvraagOpDag.status === "goedgekeurd") {
                                      bg = "rgba(232,200,56,0.75)"; dagType = "verlof";
                                    } else {
                                      bg = "rgba(74,158,224,0.6)"; dagType = "wacht";
                                    }
                                    title = `${dagNaam} ${fmtDatum(dagStr)} · ${aanvraagOpDag.type} (${aanvraagOpDag.status})${schoolvak ? " · 🏫 " + schoolvak.naam : ""}`;
                                  }
                                  return (
                                    <div key={dIdx} title={title} data-type={dagType} style={{ width: `${dagBreedte/3.5}px`, height: "24px", borderRadius: "2px", background: bg, flexShrink: 0 }} />
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
              <div className="no-print" style={{ marginTop: "20px", fontSize: "12px", color: "#4A6A82" }}>
                Werknemers zonder verlof tonen een lege rij.
              </div>

              {/* Feestdagen lijst */}
              <div className="no-print" style={{ marginTop: "24px", background: "linear-gradient(135deg, #1A2C42, #162233)", borderRadius: "12px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.06)" }}>
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
          @page { size: landscape; margin: 4mm; }

          /* ── ROOSTER PRINT ── */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body.rooster-print-active * {
            visibility: hidden !important;
            box-shadow: none !important;
          }
          body.rooster-print-active .rooster-print-container,
          body.rooster-print-active .rooster-print-container * {
            visibility: visible !important;
          }
          body.rooster-print-active .rooster-print-container {
            position: fixed !important;
            inset: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          body.rooster-print-active .rooster-print-container table {
            table-layout: auto !important;
            border-collapse: collapse !important;
            font-size: 6px !important;
            background: white !important;
            color: #111 !important;
            width: auto !important;
            height: auto !important;
          }
          body.rooster-print-active .rooster-print-container th,
          body.rooster-print-active .rooster-print-container td {
            border: 0.5px solid #999 !important;
            padding: 0 !important;
            white-space: nowrap !important;
          }
          body.rooster-print-active .rooster-print-container th {
            background: #e8e8e8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000 !important;
            font-weight: bold !important;
            padding: 1px 2px !important;
          }
          body.rooster-print-active .rooster-print-container tr {
            border-bottom: 0.5px solid #bbb !important;
          }
          body.rooster-print-active .rooster-print-container tr.rooster-week-start {
            border-top: 2px solid #666 !important;
          }
          body.rooster-print-active .rooster-print-container td:first-child {
            background: #f5f5f5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000 !important;
            font-weight: bold !important;
            padding: 1px 4px !important;
          }
          body.rooster-print-active .rooster-print-container svg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body.rooster-print-active .rooster-print-container colgroup { display: none !important; }

          /* ── JAAROVERZICHT PRINT ── */
          /* Hele pagina wit (jaaroverzicht) */
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Verberg alles via visibility, toon alleen jaaroverzicht */
          body * {
            visibility: hidden !important;
            background: transparent !important;
            box-shadow: none !important;
          }

          .jaaroverzicht-print,
          .jaaroverzicht-print * {
            visibility: visible !important;
          }

          .jaaroverzicht-print {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 287mm !important;
            background: white !important;
          }

          .jaaroverzicht-print {
            display: block !important;
            position: static !important;
            width: 287mm !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* Scroll container: geen scroll */
          .jaar-scroll {
            overflow: visible !important;
            width: 287mm !important;
            max-width: 287mm !important;
            padding: 0 !important;
          }

          /* Naam kolom smaller - moet exact matchen met spacer in maandrij */
          .naam-kolom {
            width: 65px !important;
            min-width: 65px !important;
            max-width: 65px !important;
            padding-right: 4px !important;
          }

          /* Spacer boven maandlabels moet ook 65px zijn */
          .maand-spacer {
            width: 65px !important;
            min-width: 65px !important;
          }

          /* Avatar bolletjes licht */
          .naam-avatar {
            background: #ddd !important;
            color: #333 !important;
            width: 16px !important;
            height: 16px !important;
            min-width: 16px !important;
            font-size: 8px !important;
          }

          /* Namen zwart en kleiner */
          .naam-label {
            color: #111 !important;
            font-size: 8px !important;
          }

          /* Dagblokjes smaller zodat heel het jaar past */
          [data-type] {
            width: 3px !important;
            /* hoogte wordt dynamisch ingesteld via exportPDF */
          }

          /* Lichte kleuren per dagtype */
          [data-type="werkdag"]  { background: #eeeeee !important; }
          [data-type="weekend"]  { background: #d5d5d5 !important; }
          [data-type="feestdag"] { background: #ffaaaa !important; }
          [data-type="schoolvak"]{ background: #aaddaa !important; }
          [data-type="verlof"]   { background: #ffd700 !important; }
          [data-type="wacht"]    { background: #7ab8e8 !important; }

          /* Maandlabels smaller */
          .maand-label {
            font-size: 7px !important;
            color: #555 !important;
          }

          /* Rijen: hoogte dynamisch via exportPDF */
          .jaar-rij {
            min-height: 0 !important;
            align-items: center !important;
          }

          /* Toon printtitel */
          .print-only-title {
            display: block !important;
            margin-bottom: 4px !important;
          }
          .print-only-title div {
            font-size: 13px !important;
            color: #111 !important;
          }

          .no-print { display: none !important; }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "src", "App.jsx");
const source = fs.readFileSync(appPath, "utf8");
const marker = "application/x-vakantieflow-afdeling";

// Idempotent: once App.jsx is patched, subsequent builds leave it unchanged.
if (source.includes(marker)) {
  console.log("VakantieFlow drag-and-drop patch is already applied.");
  process.exit(0);
}

const oldHandlers = `          function onDragStart(e, afd) {
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

          function onDragOver(e) { e.preventDefault(); }`;

const newHandlers = `          function onDragStart(e, afd) {
            // Gebruik zowel een eigen MIME-type als text/plain. Dit werkt betrouwbaar
            // in Edge, Chrome en Firefox en voorkomt dat de sleepdata leeg aankomt.
            e.dataTransfer.effectAllowed = "copy";
            e.dataTransfer.setData("application/x-vakantieflow-afdeling", afd);
            e.dataTransfer.setData("text/plain", afd);
          }

          function onDrop(e, dagStr, wId, deel) {
            e.preventDefault();
            e.stopPropagation();
            const afd =
              e.dataTransfer.getData("application/x-vakantieflow-afdeling") ||
              e.dataTransfer.getData("text/plain") ||
              e.dataTransfer.getData("afd");
            if (!afd) return;

            const w = werknemers.find(x => x.id === wId);
            if (!w) return;

            // Het rooster is een handmatige planning. Een lege of afwijkende
            // afdelingenlijst mag daarom de beheerder niet blokkeren.
            const snapshot = {
              inOpleiding: !!w.stageInOpleiding,
              zelfstandig: !!w.stageZelfstandig,
            };
            setSlot(dagStr, wId, deel, afd, snapshot);
          }

          function onDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }`;

if (!source.includes(oldHandlers)) {
  throw new Error(
    "De verwachte drag-and-dropcode is niet gevonden in src/App.jsx. " +
    "De patch is niet toegepast om onbedoelde wijzigingen te voorkomen."
  );
}

let updated = source.replace(oldHandlers, newHandlers);
updated = updated.replace(
  'onDragOver={e => { e.preventDefault(); }}',
  'onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}'
);

fs.writeFileSync(appPath, updated, "utf8");
console.log("VakantieFlow drag-and-drop is hersteld.");

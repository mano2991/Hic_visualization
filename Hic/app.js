const DATASETS = {
  P0: {
    hic:         "https://dl.dropboxusercontent.com/scl/fi/fuca4a37myzd76wdks0j9/P0.hic?rlkey=61nqb29hdtzjqnpochufauudz&raw=1",
    loop:        "Loop/P0_Loop.bed",
    tad:         "TAD/P0_TAD.bed",
    compartment: "Compartment/P0_Compartment.bedGraph"
  },
  Adult: {
    hic:         "https://dl.dropboxusercontent.com/scl/fi/8sweyswfmdyt5jfk4jsla/Adult.hic?rlkey=vog9o3w9t2l3hrwky1hmop40a&raw=1",
    loop:        "Loop/Adult_Loop.bed",
    tad:         "TAD/Adult_TAD.bed",
    compartment: "Compartment/Adult_Compartment.bedGraph"
  },
  Injured: {
    hic:         "https://dl.dropboxusercontent.com/scl/fi/hnhf9g4mh1db6havr454b/Injured.hic?rlkey=ft94vmd7msnjv3o5r5upi1b8i&raw=1",
    loop:        "Loop/Injured_Loop.bed",
    tad:         "TAD/Injured_TAD.bed",
    compartment: "Compartment/Injured_Compartment.bedGraph"
  }
};

// dark = A compartment (active/positive), light = B compartment (inactive/negative)
const SAMPLE_COLORS = {
  P0:      { hex: "#7B2D8B", dark: "#4A0E5C", light: "#C9A0DC" },
  Adult:   { hex: "#2E8B57", dark: "#1A5C35", light: "#90C9A8" },
  Injured: { hex: "#C0392B", dark: "#8B1A10", light: "#E8A09A" }
};

const state = { loops: {}, tads: {}, compartments: {}, igvBrowser: null };

const toAbsoluteUrl = (path) => {
  try { return new URL(path, window.location.href).href; } catch(e) { return path; }
};

const colorSwatch = (sample) =>
  `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${SAMPLE_COLORS[sample].hex};vertical-align:middle;margin:0 4px 1px 0;"></span>`;

// Track order per sample: Hi-C → Compartment → TADs (bars) → Loops (arcs)
// All tracks use the sample color so they are visually grouped
const buildAllTracks = () => {
  const tracks = [];
  const samples = Object.keys(DATASETS);
  samples.forEach((s, si) => {
    const d   = DATASETS[s];
    const c   = SAMPLE_COLORS[s];
    const base = si * 10; // spread order values: P0=0-3, Adult=10-13, Injured=20-23
    tracks.push(
      // 1. Hi-C arcs (igv.js only supports arc view; triangle view requires Juicebox)
      { type: "interact", format: "hic",      url: d.hic,                         name: `${s} Hi-C`,        color: c.hex,  order: base + 1 },
      // 2. Compartment — dark = A (active), light = B (inactive)
      { type: "wig",      format: "bedgraph", url: toAbsoluteUrl(d.compartment),  name: `${s} Compartment`, color: c.dark, altColor: c.light, autoscale: true, order: base + 2 },
      // 3. TADs — solid bars
      { type: "annotation", format: "bed",    url: toAbsoluteUrl(d.tad),          name: `${s} TADs`,        color: c.hex,  displayMode: "COLLAPSED", order: base + 3 },
      // 4. Loops — arcs connecting anchor pairs
      { type: "interact", format: "bedpe",    url: toAbsoluteUrl(d.loop),         name: `${s} Loops`,       color: c.hex,  order: base + 4 }
    );
  });
  return tracks;
};

// ---------- Gene search ----------

const searchGene = async () => {
  const input  = document.querySelector("#geneSearchInput");
  const status = document.querySelector("#geneSearchStatus");
  const gene   = input?.value.trim();
  if (!gene) return;

  status.textContent = `Searching "${gene}" …`;
  try {
    const res  = await fetch(`https://mygene.info/v3/query?q=symbol:${encodeURIComponent(gene)}&species=mouse&fields=genomic_pos,symbol`);
    const data = await res.json();
    const hit  = data.hits?.[0];

    if (!hit?.genomic_pos) {
      status.textContent = `"${gene}" not found in mm10.`;
      return;
    }
    const gp    = Array.isArray(hit.genomic_pos) ? hit.genomic_pos[0] : hit.genomic_pos;
    const locus = `chr${gp.chr}:${gp.start}-${gp.end}`;
    status.textContent = `${hit.symbol || gene}  →  ${locus}`;
    state.igvBrowser?.search(locus);
  } catch(err) {
    status.textContent = `Error: ${err.message}`;
  }
};

// ---------- Load IGV ----------

const loadIGV = async () => {
  const container = document.querySelector("#igvContainer");
  const status    = document.querySelector("#igvStatus");
  if (!container) return;

  status.textContent = "Loading …";

  try {
    state.igvBrowser = await igv.createBrowser(container, {
      genome: "mm10",
      locus:  "chr6:53,115,348-55,226,396",
      tracks: buildAllTracks()
    });
    status.textContent = "All 3 samples loaded. Use the track panel to show/hide individual tracks.";
  } catch(err) {
    console.error("IGV Error:", err);
    status.textContent = `Error: ${err.message}`;
  }
};

// ---------- Summary + boot ----------

const parseDelimited = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { header: [], rows: [] };
  const splitRow = (line) => line.trim().split(/\t| +/).filter(Boolean);
  const hasHeader = /[A-Za-z]/.test(lines[0].trim());
  return {
    header: hasHeader ? splitRow(lines[0]) : splitRow(lines[0]).map((_, i) => `col_${i+1}`),
    rows:   lines.slice(hasHeader ? 1 : 0).map(splitRow)
  };
};

const boot = async () => {
  const tasks = [];
  for (const [s, f] of Object.entries(DATASETS)) {
    const load = async (type, path) => {
      try { const r = await fetch(path); if (r.ok) state[`${type}s`][s] = parseDelimited(await r.text()); } catch(e) {}
    };
    tasks.push(load("loop", f.loop), load("tad", f.tad), load("compartment", f.compartment));
  }
  await Promise.all(tasks);

  const sumRoot = document.querySelector("#summaryCards");
  if (sumRoot) {
    sumRoot.innerHTML = Object.keys(DATASETS).map(s => `
      <article class="card" style="border-top:4px solid ${SAMPLE_COLORS[s].hex}">
        <h3>${colorSwatch(s)}${s}</h3>
        <p class="stat" style="color:${SAMPLE_COLORS[s].hex}">${(state.loops[s]?.rows?.length || 0).toLocaleString()}</p>
        <p class="meta">Loops</p>
        <p class="stat" style="color:${SAMPLE_COLORS[s].hex}">${(state.tads[s]?.rows?.length || 0).toLocaleString()}</p>
        <p class="meta">TADs</p>
        <p class="stat" style="color:${SAMPLE_COLORS[s].hex}">${(state.compartments[s]?.rows?.length || 0).toLocaleString()}</p>
        <p class="meta">Compartment bins</p>
      </article>`).join("");
  }

  document.querySelector("#geneSearchBtn")?.addEventListener("click", searchGene);
  document.querySelector("#geneSearchInput")?.addEventListener("keydown", e => { if (e.key === "Enter") searchGene(); });

  loadIGV();
};

boot();

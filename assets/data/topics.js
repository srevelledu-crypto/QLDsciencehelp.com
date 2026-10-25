// QLDsciencehelp.com — topic data (single source of truth)
//
// Every page on the site reads this file: navigation, the home page, subject
// pages, search, progress tracking, prev/next buttons and the sitemap tool.
// Adding or launching a topic means editing ONE line below (or running
// `node tools/add-topic.mjs`, which does it for you).
//
// Keep each topic on a single line — tools/add-topic.mjs edits these lines.
//
// Topic fields
//   id          unique id, also used by the "continue where you left off" card
//   code        syllabus code shown on cards, e.g. "3.1.2"
//   title       subtopic title as worded in the QCE syllabus
//   subtitle    (optional) the revision page's own heading
//   status      "live" | "coming-soon"
//   url         clean URL of the revision page (folder with an index.html)
//   progressKey the localStorage step-key PREFIX the revision page uses.
//               The page stores `<progressKey>` (current step) and
//               `<progressKey>_v` (JSON array of visited steps).
//   workKey     (optional) localStorage key where the page saves answers;
//               cleared by "Reset my progress" on the About page.
//   keywords    (optional) extra words for search

export const STEPS = ["Recall", "Worked examples", "Consolidate", "Exam questions", "Wrap-up"];

export const SUBJECTS = [
  {
    id: "chemistry",
    name: "Chemistry",
    status: "live",
    url: "/chemistry/",
    blurb: "Equilibrium, acids and bases, redox, and organic chemistry for Units 3 and 4.",
    units: [
      {
        id: "chem-unit-3",
        number: 3,
        title: "Equilibrium, acids and redox reactions",
        groups: [
          {
            number: 1,
            title: "Chemical equilibrium systems",
            topics: [
              { id: "chem-3-1-1", code: "3.1.1", title: "Chemical equilibrium", subtitle: "Equilibrium Systems", status: "live", url: "/chemistry/unit-3/3-1-1/", progressKey: "chem311_step", workKey: "chem311_student_work_v1", keywords: ["open system", "closed system", "reversible reaction", "dynamic equilibrium", "rate", "concentration-time graph"] },
              { id: "chem-3-1-2", code: "3.1.2", title: "Factors that affect equilibrium", subtitle: "Le Châtelier's Principle", status: "live", url: "/chemistry/unit-3/3-1-2/", progressKey: "chem312_step_trial", workKey: "undefined", keywords: ["Le Chatelier", "temperature", "pressure", "volume", "catalyst", "collision theory", "Haber process"] }, // page declares WORKc but saves under this.WORK (undefined)
              { id: "chem-3-1-3", code: "3.1.3", title: "Equilibrium constants", subtitle: "Equilibrium Constants", status: "live", url: "/chemistry/unit-3/3-1-3/", progressKey: "chem313_step", workKey: "chem313_student_work_v1", keywords: ["Kc", "reaction quotient", "Q", "equilibrium expression", "ICE table", "extent of reaction"] },
              { id: "chem-3-1-4", code: "3.1.4", title: "Properties of acids and bases", subtitle: "Properties of Acids and Bases", status: "live", url: "/chemistry/unit-3/3-1-4/", progressKey: "chem314_step", workKey: "chem314_student_work_v1", keywords: ["acid", "base", "strong", "weak", "concentrated", "dilute"] },
              { id: "chem-3-1-5", code: "3.1.5", title: "pH", status: "coming-soon", url: "/chemistry/unit-3/3-1-5/", progressKey: "chem315_step", keywords: ["pOH", "Kw", "hydronium", "hydroxide"] },
              { id: "chem-3-1-6", code: "3.1.6", title: "Brønsted–Lowry model", status: "coming-soon", url: "/chemistry/unit-3/3-1-6/", progressKey: "chem316_step", keywords: ["Bronsted Lowry", "conjugate acid", "conjugate base", "amphiprotic", "proton donor"] },
              { id: "chem-3-1-7", code: "3.1.7", title: "Dissociation constants", status: "coming-soon", url: "/chemistry/unit-3/3-1-7/", progressKey: "chem317_step", keywords: ["Ka", "Kb", "pKa", "buffer"] },
              { id: "chem-3-1-8", code: "3.1.8", title: "Acid–base indicators", status: "coming-soon", url: "/chemistry/unit-3/3-1-8/", progressKey: "chem318_step", keywords: ["acid base indicator", "endpoint", "colour change", "phenolphthalein", "methyl orange"] },
              { id: "chem-3-1-9", code: "3.1.9", title: "Volumetric analysis", status: "coming-soon", url: "/chemistry/unit-3/3-1-9/", progressKey: "chem319_step", keywords: ["titration", "titration curve", "equivalence point", "standard solution", "burette"] },
            ],
          },
          {
            number: 2,
            title: "Oxidation and reduction",
            topics: [
              { id: "chem-3-2-1", code: "3.2.1", title: "Redox reactions", status: "coming-soon", url: "/chemistry/unit-3/3-2-1/", progressKey: "chem321_step", keywords: ["oxidation", "reduction", "oxidation number", "half-equation", "oxidising agent", "reducing agent"] },
              { id: "chem-3-2-2", code: "3.2.2", title: "Electrochemical cells", status: "coming-soon", url: "/chemistry/unit-3/3-2-2/", progressKey: "chem322_step", keywords: ["anode", "cathode", "electrolyte", "salt bridge"] },
              { id: "chem-3-2-3", code: "3.2.3", title: "Galvanic cells", status: "coming-soon", url: "/chemistry/unit-3/3-2-3/", progressKey: "chem323_step", keywords: ["voltaic cell", "battery", "electron flow"] },
              { id: "chem-3-2-4", code: "3.2.4", title: "Standard electrode potential", status: "coming-soon", url: "/chemistry/unit-3/3-2-4/", progressKey: "chem324_step", keywords: ["E0", "standard reduction potential", "standard hydrogen electrode", "cell potential"] },
              { id: "chem-3-2-5", code: "3.2.5", title: "Electrolytic cells", status: "coming-soon", url: "/chemistry/unit-3/3-2-5/", progressKey: "chem325_step", keywords: ["electrolysis", "electroplating"] },
            ],
          },
        ],
      },
      {
        id: "chem-unit-4",
        number: 4,
        title: "Structure, synthesis and design",
        groups: [
          {
            number: 1,
            title: "Properties and structure of organic materials",
            topics: [
              { id: "chem-4-1-1", code: "4.1.1", title: "Structure of organic compounds", status: "coming-soon", url: "/chemistry/unit-4/4-1-1/", progressKey: "chem411_step", keywords: ["IUPAC naming", "functional group", "isomer", "homologous series", "hydrocarbon"] },
              { id: "chem-4-1-2", code: "4.1.2", title: "Physical properties and trends", status: "coming-soon", url: "/chemistry/unit-4/4-1-2/", progressKey: "chem412_step", keywords: ["boiling point", "solubility", "intermolecular forces", "hydrogen bonding"] },
              { id: "chem-4-1-3", code: "4.1.3", title: "Organic reactions and reaction pathways", status: "coming-soon", url: "/chemistry/unit-4/4-1-3/", progressKey: "chem413_step", keywords: ["addition", "substitution", "oxidation", "esterification", "condensation"] },
              { id: "chem-4-1-4", code: "4.1.4", title: "Organic materials: structure and function", status: "coming-soon", url: "/chemistry/unit-4/4-1-4/", progressKey: "chem414_step", keywords: ["polymer", "protein", "carbohydrate"] },
              { id: "chem-4-1-5", code: "4.1.5", title: "Analytical techniques", status: "coming-soon", url: "/chemistry/unit-4/4-1-5/", progressKey: "chem415_step", keywords: ["spectroscopy", "mass spectrometry", "infrared", "IR", "NMR", "chromatography"] },
            ],
          },
          {
            number: 2,
            title: "Chemical synthesis and design",
            topics: [
              { id: "chem-4-2-1", code: "4.2.1", title: "Chemical synthesis", status: "coming-soon", url: "/chemistry/unit-4/4-2-1/", progressKey: "chem421_step", keywords: ["yield", "atom economy", "green chemistry"] },
              { id: "chem-4-2-2", code: "4.2.2", title: "Macromolecules: polymers, proteins and carbohydrates", status: "coming-soon", url: "/chemistry/unit-4/4-2-2/", progressKey: "chem422_step", keywords: ["polymer", "amino acid", "protein", "carbohydrate", "polysaccharide"] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "physics",
    name: "Physics",
    status: "coming-soon",
    url: "/physics/",
    blurb: "Gravity, electromagnetism and modern physics for Units 3 and 4.",
    // Add numbered subtopics to each group's `topics` array, e.g.
    // { id: "phys-3-1-1", code: "3.1.1", title: "…", status: "coming-soon", url: "/physics/unit-3/3-1-1/", progressKey: "phys311_step" },
    units: [
      {
        id: "phys-unit-3",
        number: 3,
        title: "Gravity and electromagnetism",
        groups: [
          { number: 1, title: "Gravity and motion", topics: [] },
          { number: 2, title: "Electromagnetism", topics: [] },
        ],
      },
      {
        id: "phys-unit-4",
        number: 4,
        title: "Revolutions in modern physics",
        groups: [
          { number: 1, title: "Special relativity", topics: [] },
          { number: 2, title: "Quantum theory", topics: [] },
          { number: 3, title: "The Standard Model", topics: [] },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers (derived data — no need to edit below this line)

/** Every topic, in syllabus order, with its subject/unit/group attached. */
export function allTopics() {
  const out = [];
  for (const subject of SUBJECTS) {
    for (const unit of subject.units) {
      for (const group of unit.groups) {
        for (const topic of group.topics) out.push({ ...topic, subject, unit, group });
      }
    }
  }
  return out;
}

export function unitTopics(unit) {
  return unit.groups.flatMap((g) => g.topics);
}

export function subjectTopics(subject) {
  return subject.units.flatMap(unitTopics);
}

export function findTopic(id) {
  return allTopics().find((t) => t.id === id) || null;
}

/** Normalise a path so "/a/b", "/a/b/" and "/a/b/index.html" all match. */
export function normalisePath(path) {
  let p = String(path || "/").replace(/index\.html?$/i, "");
  if (!p.endsWith("/")) p += "/";
  return p;
}

export function findTopicByPath(path) {
  const p = normalisePath(path);
  return allTopics().find((t) => normalisePath(t.url) === p) || null;
}

/** Previous/next LIVE topics within the same subject. */
export function liveNeighbours(id) {
  const topic = findTopic(id);
  if (!topic) return { prev: null, next: null };
  const live = allTopics().filter((t) => t.subject.id === topic.subject.id && (t.status === "live" || t.id === id));
  const i = live.findIndex((t) => t.id === id);
  return { prev: live[i - 1] || null, next: live[i + 1] || null };
}

// Grammatik-Landkarte: 10 Hauptsektionen → Untergruppen → einzelne Themen.
// Jedes Thema hat einen `style`, der dem Übungs-Generator sagt, welche Übungsart passt:
//   'form'     → überwiegend Lückentext (richtige Form einsetzen)
//   'contrast' → überwiegend Auswahl (welche Variante/Zeit passt hier? – Unterschied erkennen)
//   'mixed'    → gemischt (Generator wählt das Lehrreichste)
// `id` ist stabil (für Cache/Keys), `name` wird angezeigt und ist Teil des LLM-Prompts.

export const GRAMMAR = [
  {
    id: 'verben', name: 'Verben', icon: '🔧', accent: '#3b6ef0',
    intro: 'Zeitformen, Modi, Partizipien – das Herz der französischen Grammatik.',
    groups: [
      {
        id: 'zeiten-indikativ', name: 'Zeitformen (Indikativ)',
        topics: [
          { id: 'present', name: 'Présent', style: 'form' },
          { id: 'passe-compose', name: 'Passé composé', style: 'form' },
          { id: 'imparfait', name: 'Imparfait', style: 'form' },
          { id: 'plus-que-parfait', name: 'Plus-que-parfait', style: 'form' },
          { id: 'futur-simple', name: 'Futur simple', style: 'form' },
          { id: 'futur-proche', name: 'Futur proche (aller + Infinitiv)', style: 'form' },
          { id: 'futur-anterieur', name: 'Futur antérieur', style: 'form' },
          { id: 'passe-simple', name: 'Passé simple (literarisch)', style: 'form' },
          { id: 'pc-vs-imparfait', name: 'Passé composé vs. Imparfait', style: 'contrast' },
          { id: 'futur-simple-vs-proche', name: 'Futur simple vs. Futur proche', style: 'contrast' },
        ],
      },
      {
        id: 'modi', name: 'Modi (Subjonctif, Conditionnel, Impératif)',
        topics: [
          { id: 'subjonctif-present', name: 'Subjonctif présent', style: 'form' },
          { id: 'subjonctif-passe', name: 'Subjonctif passé', style: 'form' },
          { id: 'conditionnel-present', name: 'Conditionnel présent', style: 'form' },
          { id: 'conditionnel-passe', name: 'Conditionnel passé', style: 'form' },
          { id: 'imperatif', name: 'Impératif', style: 'form' },
          { id: 'indicatif-vs-subjonctif', name: 'Indicatif vs. Subjonctif (wann welcher?)', style: 'contrast' },
        ],
      },
      {
        id: 'partizip-gerondif', name: 'Partizip & Gérondif',
        topics: [
          { id: 'participe-present', name: 'Participe présent', style: 'form' },
          { id: 'gerondif', name: 'Gérondif (en + -ant)', style: 'form' },
          { id: 'accord-participe', name: 'Accord du participe passé (Übereinstimmung)', style: 'mixed' },
        ],
      },
      {
        id: 'verb-sonder', name: 'Sonderformen',
        topics: [
          { id: 'voix-passive', name: 'Passiv (voix passive)', style: 'mixed' },
          { id: 'verbes-pronominaux', name: 'Pronominale/Reflexive Verben (se laver …)', style: 'form' },
          { id: 'si-satze', name: 'Si-Sätze (Konditionalsätze, 3 Typen)', style: 'contrast' },
          { id: 'faire-causatif', name: 'Faire causatif (faire faire qc.)', style: 'mixed' },
        ],
      },
    ],
  },
  {
    id: 'nomen', name: 'Nomen & Artikel', icon: '📦', accent: '#12a45a',
    intro: 'Geschlecht, Mehrzahl und die Artikel – inkl. Teilungsartikel (du / de la).',
    groups: [
      {
        id: 'nomen-basis', name: 'Nomen',
        topics: [
          { id: 'genus', name: 'Genus (männlich / weiblich)', style: 'mixed' },
          { id: 'plural', name: 'Plural (-s, -x, -aux …)', style: 'form' },
        ],
      },
      {
        id: 'artikel', name: 'Artikel',
        topics: [
          { id: 'artikel-bestimmt', name: 'Bestimmter Artikel (le / la / les)', style: 'form' },
          { id: 'artikel-unbestimmt', name: 'Unbestimmter Artikel (un / une / des)', style: 'form' },
          { id: 'artikel-partitif', name: 'Teilungsartikel (du / de la / des)', style: 'form' },
          { id: 'contractions', name: 'Verschmelzungen (au, aux, du, des)', style: 'form' },
          { id: 'partitif-vs-defini', name: 'Teilungsartikel vs. bestimmter Artikel (du vs. le)', style: 'contrast' },
        ],
      },
    ],
  },
  {
    id: 'adjektive', name: 'Adjektive', icon: '🎨', accent: '#a855f7',
    intro: 'Angleichung, Stellung und Steigerung der Eigenschaftswörter.',
    groups: [
      {
        id: 'adj-basis', name: 'Grundlagen',
        topics: [
          { id: 'adj-accord', name: 'Übereinstimmung (Genus / Numerus)', style: 'form' },
          { id: 'adj-stellung', name: 'Stellung (vor / nach dem Nomen)', style: 'contrast' },
          { id: 'adj-steigerung', name: 'Steigerung (Komparativ / Superlativ)', style: 'mixed' },
        ],
      },
      {
        id: 'adj-begleiter', name: 'Begleitende Adjektive',
        topics: [
          { id: 'adj-possessiv', name: 'Possessivadjektive (mon / ma / mes …)', style: 'form' },
          { id: 'adj-demonstrativ', name: 'Demonstrativadjektive (ce / cet / cette / ces)', style: 'form' },
        ],
      },
    ],
  },
  {
    id: 'pronomen', name: 'Pronomen', icon: '👥', accent: '#ec4899',
    intro: 'Das große Feld: Personal-, Relativ-, y/en, betonte und mehr.',
    groups: [
      {
        id: 'pron-personal', name: 'Personalpronomen',
        topics: [
          { id: 'pron-sujet', name: 'Subjektpronomen (je, tu, il …)', style: 'form' },
          { id: 'pron-cod', name: 'Direktes Objektpronomen (me, te, le, la …)', style: 'form' },
          { id: 'pron-coi', name: 'Indirektes Objektpronomen (lui, leur …)', style: 'form' },
          { id: 'pron-y-en', name: 'Die Pronomen y und en', style: 'mixed' },
          { id: 'pron-ordre', name: 'Reihenfolge mehrerer Pronomen', style: 'mixed' },
          { id: 'pron-toniques', name: 'Betonte Pronomen (moi, toi, lui …)', style: 'form' },
        ],
      },
      {
        id: 'pron-weitere', name: 'Weitere Pronomen',
        topics: [
          { id: 'pron-relatifs', name: 'Relativpronomen (qui, que, dont, où)', style: 'contrast' },
          { id: 'pron-relatifs-composes', name: 'Zusammengesetzte Relativpronomen (lequel …)', style: 'mixed' },
          { id: 'pron-demonstratifs', name: 'Demonstrativpronomen (celui, celle …)', style: 'form' },
          { id: 'pron-possessifs', name: 'Possessivpronomen (le mien, la tienne …)', style: 'form' },
          { id: 'pron-interrogatifs', name: 'Interrogativpronomen (qui, que, lequel)', style: 'mixed' },
          { id: 'pron-indefinis', name: 'Indefinitpronomen (tout, chacun, quelqu’un …)', style: 'mixed' },
        ],
      },
    ],
  },
  {
    id: 'adverbien', name: 'Adverbien', icon: '⚡', accent: '#f59e0b',
    intro: 'Bildung, Arten und Stellung der Umstandswörter.',
    groups: [
      {
        id: 'adv-basis', name: 'Adverbien',
        topics: [
          { id: 'adv-formation', name: 'Bildung (-ment)', style: 'form' },
          { id: 'adv-types', name: 'Arten (Ort, Zeit, Art & Weise, Menge)', style: 'mixed' },
          { id: 'adv-position', name: 'Stellung im Satz', style: 'mixed' },
          { id: 'adv-comparatif', name: 'Steigerung (bien → mieux …)', style: 'form' },
        ],
      },
    ],
  },
  {
    id: 'praepositionen', name: 'Präpositionen', icon: '📍', accent: '#0ea5e9',
    intro: 'à, de, en, dans … und ihre festen Verbindungen.',
    groups: [
      {
        id: 'prep-basis', name: 'Präpositionen',
        topics: [
          { id: 'prep-common', name: 'à, de, en, dans, sur, sous, chez …', style: 'mixed' },
          { id: 'prep-lieux', name: 'Länder & Städte (en France, au Japon, à Paris)', style: 'form' },
          { id: 'prep-temps', name: 'Präpositionen bei Zeit (à, en, dans, depuis, pendant)', style: 'contrast' },
          { id: 'prep-verbes', name: 'Feste Verb-Präposition-Verbindungen (penser à, rêver de …)', style: 'form' },
        ],
      },
    ],
  },
  {
    id: 'satzbau', name: 'Satzbau & Konjunktionen', icon: '🔗', accent: '#6366f1',
    intro: 'Wortstellung, Verbindungswörter zwischen Sätzen, Nebensätze.',
    groups: [
      {
        id: 'satz-basis', name: 'Satzbau',
        topics: [
          { id: 'ordre-mots', name: 'Grundwortstellung (S-V-O)', style: 'mixed' },
          { id: 'mise-en-relief', name: 'Hervorhebung (c’est … qui / que)', style: 'mixed' },
          { id: 'discours-indirect', name: 'Indirekte Rede (discours indirect)', style: 'mixed' },
        ],
      },
      {
        id: 'konjunktionen', name: 'Konjunktionen',
        topics: [
          { id: 'conj-coord', name: 'Koordinierende Konjunktionen (et, ou, mais, donc, car …)', style: 'form' },
          { id: 'conj-subord', name: 'Subordinierende Konjunktionen (parce que, quand, si …)', style: 'mixed' },
          { id: 'conj-subjonctif', name: 'Konjunktionen mit Subjonctif (bien que, pour que, avant que …)', style: 'contrast' },
          { id: 'relatives', name: 'Relativsätze', style: 'mixed' },
        ],
      },
    ],
  },
  {
    id: 'negation-frage', name: 'Negation & Frage', icon: '❓', accent: '#ef4444',
    intro: 'Verneinen und Fragen stellen – alle Formen.',
    groups: [
      {
        id: 'negation', name: 'Negation',
        topics: [
          { id: 'neg-base', name: 'ne … pas / plus / jamais / rien / personne', style: 'form' },
          { id: 'neg-complexe', name: 'Mehrfache & besondere Verneinung', style: 'mixed' },
        ],
      },
      {
        id: 'frage', name: 'Frage',
        topics: [
          { id: 'question-formes', name: 'Fragebildung (Intonation, est-ce que, Inversion)', style: 'contrast' },
          { id: 'question-mots', name: 'Frageadverbien & -pronomen (où, quand, combien, quel …)', style: 'form' },
        ],
      },
    ],
  },
  {
    id: 'zahlen', name: 'Zahlen, Datum & Zeit', icon: '🔢', accent: '#14b8a6',
    intro: 'Zahlen (inkl. 70/80/90), Datum, Uhrzeit und Mengen.',
    groups: [
      {
        id: 'zahlen-basis', name: 'Zahlen & Mengen',
        topics: [
          { id: 'nombres-cardinaux', name: 'Grundzahlen (inkl. soixante-dix, quatre-vingts …)', style: 'form' },
          { id: 'nombres-ordinaux', name: 'Ordnungszahlen (premier, deuxième …)', style: 'form' },
          { id: 'date-heure', name: 'Datum & Uhrzeit', style: 'mixed' },
          { id: 'quantites', name: 'Mengenangaben (beaucoup de, un peu de, assez de …)', style: 'form' },
        ],
      },
    ],
  },
  {
    id: 'rechtschreibung', name: 'Rechtschreibung', icon: '✍️', accent: '#8b5cf6',
    intro: 'Élision, Liaison, Akzente – die Feinheiten der Schreibung.',
    groups: [
      {
        id: 'ortho-basis', name: 'Rechtschreibung & Aussprache',
        topics: [
          { id: 'elision', name: 'Élision (l’ami, j’ai)', style: 'form' },
          { id: 'liaison', name: 'Liaison', style: 'mixed' },
          { id: 'accents', name: 'Akzente (é, è, ê, ç) & ihre Bedeutung', style: 'mixed' },
          { id: 'majuscules', name: 'Groß-/Kleinschreibung (anders als im Deutschen)', style: 'mixed' },
        ],
      },
    ],
  },
]

// ---- Grammatik üben: konjugierte Formen ----

// Pädagogische Lern-Reihenfolge der 13 konjugierten Zeitformen/Modi (topic-id).
// Jede Form baut auf den vorherigen auf (einfache Zeiten vor zusammengesetzten):
// die zusammengesetzten Zeiten brauchen eine schon gelernte einfache Zeit des
// Hilfsverbs. So wird nie eine Form geübt, deren Bausteine noch fehlen.
export const FORM_ORDER = [
  'present',              // 1  Fundament – Basis für fast alles
  'imperatif',            // 2  direkt aus dem Présent
  'passe-compose',        // 3  Présent (avoir/être) + Partizip
  'imparfait',            // 4  nous-Form des Présent
  'plus-que-parfait',     // 5  Imparfait (Hilfsverb) + Partizip
  'futur-proche',         // 6  aller + Infinitiv
  'futur-simple',         // 7  Infinitiv-Stamm + Endungen
  'futur-anterieur',      // 8  Futur (Hilfsverb) + Partizip
  'conditionnel-present', // 9  Futur-Stamm + Imparfait-Endungen
  'conditionnel-passe',   // 10 Conditionnel (Hilfsverb) + Partizip
  'subjonctif-present',   // 11 ils-Form des Présent
  'subjonctif-passe',     // 12 Subjonctif (Hilfsverb) + Partizip
  'passe-simple',         // 13 literarisch – nur erkennen, zuletzt
]

// Drill-Pool: die 30 häufigsten unregelmäßigen französischen Verben.
// Pro Übungsrunde werden 3 davon zufällig gezogen, komplett durchkonjugiert
// und tauchen zusätzlich im Lückentext auf.
export const IRREGULAR_VERBS = [
  { french: 'être', german: 'sein' },
  { french: 'avoir', german: 'haben' },
  { french: 'aller', german: 'gehen' },
  { french: 'faire', german: 'machen' },
  { french: 'dire', german: 'sagen' },
  { french: 'pouvoir', german: 'können' },
  { french: 'vouloir', german: 'wollen' },
  { french: 'devoir', german: 'müssen' },
  { french: 'savoir', german: 'wissen' },
  { french: 'venir', german: 'kommen' },
  { french: 'prendre', german: 'nehmen' },
  { french: 'voir', german: 'sehen' },
  { french: 'mettre', german: 'legen/setzen' },
  { french: 'tenir', german: 'halten' },
  { french: 'falloir', german: 'müssen (il faut)' },
  { french: 'connaître', german: 'kennen' },
  { french: 'partir', german: 'abfahren' },
  { french: 'sortir', german: 'hinausgehen' },
  { french: 'dormir', german: 'schlafen' },
  { french: 'boire', german: 'trinken' },
  { french: 'croire', german: 'glauben' },
  { french: 'lire', german: 'lesen' },
  { french: 'écrire', german: 'schreiben' },
  { french: 'vivre', german: 'leben' },
  { french: 'suivre', german: 'folgen' },
  { french: 'recevoir', german: 'bekommen' },
  { french: 'devenir', german: 'werden' },
  { french: 'ouvrir', german: 'öffnen' },
  { french: 'courir', german: 'rennen' },
  { french: 'mourir', german: 'sterben' },
]

// Alle konjugierten Verb-Formen (style 'form' aus den Gruppen Zeiten + Modi),
// als { key, id, name }.
export function verbFormList() {
  const sec = GRAMMAR.find(s => s.id === 'verben')
  if (!sec) return []
  const out = []
  for (const g of sec.groups) {
    if (g.id !== 'zeiten-indikativ' && g.id !== 'modi') continue
    for (const t of g.topics) {
      if (t.style === 'form') out.push({ key: `${sec.id}/${g.id}/${t.id}`, id: t.id, name: t.name })
    }
  }
  return out
}

// Dieselben Formen, aber in der pädagogischen Lern-Reihenfolge (FORM_ORDER).
export function orderedForms() {
  const byId = new Map(verbFormList().map(f => [f.id, f]))
  return FORM_ORDER.map(id => byId.get(id)).filter(Boolean)
}

// Flache Liste aller Themen mit ihrem Pfad (für Cache-Keys & Prompt-Kontext).
export function topicPath(sectionId, groupId, topicId) {
  const s = GRAMMAR.find(x => x.id === sectionId)
  const g = s?.groups.find(x => x.id === groupId)
  const t = g?.topics.find(x => x.id === topicId)
  if (!s || !g || !t) return null
  return { section: s, group: g, topic: t, key: `${sectionId}/${groupId}/${topicId}` }
}

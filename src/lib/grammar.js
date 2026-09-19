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

// Kontext-Hinweise pro Zeitform/Modus. Ziel: JEDER erzeugte Übungssatz soll die
// Zeitform am Satz erkennbar machen (Signalwort/Auslöser/Begleitsatz) – statt eines
// nackten Satzes, der auch in einer anderen Zeit stehen könnte. Wird in den
// Satz-Generator (generateGrammarStory) eingespeist.
//   signals : typische französische Signalwörter/Auslöser
//   rule    : kurze deutsche Regel, welcher Kontext die Form ERZWINGT
//   example : Beispiel-Satz (Ziel-Verb im Klartext) – zeigt den nötigen Kontext
//   anchor  : true = braucht einen Begleitsatz/Auslöser im Klartext (Vorzeitigkeit,
//             si-Satz, que-Auslöser …), sonst ist die Form nicht eindeutig erkennbar
export const TENSE_CONTEXT = {
  'present': {
    signals: ["maintenant", "en ce moment", "aujourd'hui", "tous les jours", "souvent", "chaque matin"],
    rule: "Gegenwart: was jetzt gerade passiert, eine Gewohnheit oder eine allgemeine Wahrheit.",
    example: "En ce moment, je travaille dans le jardin.",
    anchor: false,
  },
  'imperatif': {
    signals: ["s'il te plaît", "tout de suite", "vite", "maintenant", "(Ausrufezeichen)"],
    rule: "Direkte Aufforderung/Befehl an tu, nous oder vous – OHNE Subjektpronomen, oft mit Ausrufezeichen.",
    example: "Ferme la porte, s'il te plaît !",
    anchor: false,
  },
  'passe-compose': {
    signals: ["hier", "ce matin", "hier soir", "la semaine dernière", "soudain", "tout à coup", "une fois"],
    rule: "Eine einmalige, abgeschlossene Handlung in der Vergangenheit (etwas ist passiert).",
    example: "Hier soir, Marie a fermé la fenêtre.",
    anchor: false,
  },
  'imparfait': {
    signals: ["autrefois", "à l'époque", "quand j'étais petit", "tous les jours (früher)", "souvent", "chaque été", "pendant que"],
    rule: "Beschreibung, Zustand oder wiederholte Gewohnheit in der Vergangenheit (Hintergrund, „damals immer/oft“).",
    example: "Quand j'étais petit, je jouais dans ce parc.",
    anchor: false,
  },
  'plus-que-parfait': {
    signals: ["quand (+ Passé composé)", "déjà", "avant", "ne … pas encore", "une fois que"],
    rule: "Vorzeitigkeit in der Vergangenheit: die Handlung war schon abgeschlossen, BEVOR etwas anderes Vergangenes geschah.",
    example: "Quand je suis arrivé à la gare, le train était parti.",
    anchor: true,
  },
  'futur-proche': {
    signals: ["bientôt", "tout de suite", "dans un instant", "ce soir", "demain", "là", "dans cinq minutes"],
    rule: "Unmittelbare oder fest geplante Zukunft (aller + Infinitiv), oft gesprochen.",
    example: "Attention, tu vas tomber !",
    anchor: false,
  },
  'futur-simple': {
    signals: ["demain", "l'année prochaine", "dans deux ans", "un jour", "plus tard", "bientôt"],
    rule: "Zukunft: Vorhersage, Plan oder Versprechen (etwas wird geschehen).",
    example: "L'année prochaine, nous voyagerons en Italie.",
    anchor: false,
  },
  'futur-anterieur': {
    signals: ["quand", "dès que", "une fois que", "lorsque", "après que", "avant demain", "d'ici là"],
    rule: "Vollendete Zukunft: bis zu einem Zukunftspunkt schon abgeschlossen. Braucht einen zweiten Zukunftssatz (Futur simple) oder „avant/d'ici …“ als Bezug.",
    example: "Quand tu arriveras, j'aurai fini le repas.",
    anchor: true,
  },
  'conditionnel-present': {
    signals: ["si (+ Imparfait)", "à ta place", "volontiers", "peut-être", "pourrais-tu"],
    rule: "Höflichkeit, Wunsch oder Hypothese; typische Folge eines si-Satzes mit Imparfait.",
    example: "Si j'avais le temps, je viendrais avec toi.",
    anchor: true,
  },
  'conditionnel-passe': {
    signals: ["si (+ Plus-que-parfait)", "à ta place", "sinon", "j'aurais dû"],
    rule: "Irreale Vergangenheit: was WÄRE geschehen (aber nicht geschah); Folge eines si-Satzes mit Plus-que-parfait, oft Bedauern/Vorwurf.",
    example: "Si tu étais venu, tu aurais vu le spectacle.",
    anchor: true,
  },
  'subjonctif-present': {
    signals: ["il faut que", "je veux que", "bien que", "pour que", "avant que", "il est important que", "je doute que"],
    rule: "Nach einem Auslöser mit „que“ (Wunsch, Gefühl, Zweifel, Notwendigkeit). Der Auslöser-Hauptsatz muss dastehen.",
    example: "Il faut que tu finisses tes devoirs.",
    anchor: true,
  },
  'subjonctif-passe': {
    signals: ["bien que", "je doute que", "je suis content que", "avant que", "quoique"],
    rule: "Wie Subjonctif, aber die Handlung ist schon abgeschlossen (Vorzeitigkeit) – nach demselben Auslöser mit „que“.",
    example: "Je suis content que tu sois venu.",
    anchor: true,
  },
  'passe-simple': {
    signals: ["(literarischer Erzähltext)", "soudain", "ce jour-là", "il y a bien longtemps", "alors"],
    rule: "Literarische/erzählende Vergangenheit (Buch, Märchen), meist 3. Person – ersetzt im Erzähltext das Passé composé.",
    example: "Ce jour-là, le roi entra dans la salle.",
    anchor: false,
  },
}

// Baut aus TENSE_CONTEXT den Prompt-Block für die aktuell geübte(n) Zeitform(en).
// Rückgabe: { block, needAnchor, signals }.
export function tenseGuidance(forms = []) {
  const items = forms
    .map(f => ({ f, h: TENSE_CONTEXT[f.id] }))
    .filter(x => x.h)
  const block = items.map(({ f, h }) => {
    const anchor = h.anchor ? ' Diese Zeit braucht einen Begleitsatz/Auslöser im Klartext (nur das Ziel-Verb wird zur Lücke).' : ''
    const sig = h.signals?.length ? ` Signalwörter/Auslöser: ${h.signals.join(', ')}.` : ''
    const ex = h.example ? ` Beispiel (Ziel-Verb im Klartext, im Übungssatz wird genau dieses Verb zur Lücke): „${h.example}“` : ''
    return `• ${f.name}: ${h.rule}${anchor}${sig}${ex}`
  }).join('\n')
  return {
    block,
    needAnchor: items.some(x => x.h.anchor),
    signals: items.flatMap(x => x.h.signals || []),
  }
}

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

// Regelmäßige Verben zum Endungen-Üben, nach Endungs-Gruppe.
// Pro Runde wird je 1 Verb pro Gruppe gezogen (zusätzlich zu den 3 Unregelmäßigen).
// 1. Gruppe: -er (regelmäßig, ohne Stamm-Wechsel)
export const REGULAR_ER = [
  { french: 'parler', german: 'sprechen' },
  { french: 'aimer', german: 'lieben/mögen' },
  { french: 'regarder', german: 'anschauen' },
  { french: 'habiter', german: 'wohnen' },
  { french: 'travailler', german: 'arbeiten' },
  { french: 'chercher', german: 'suchen' },
  { french: 'donner', german: 'geben' },
  { french: 'écouter', german: 'zuhören' },
  { french: 'jouer', german: 'spielen' },
  { french: 'chanter', german: 'singen' },
  { french: 'danser', german: 'tanzen' },
  { french: 'trouver', german: 'finden' },
  { french: 'demander', german: 'fragen' },
  { french: 'rester', german: 'bleiben' },
  { french: 'penser', german: 'denken' },
]
// 2. Gruppe: -ir (regelmäßig, mit -iss- wie finir)
export const REGULAR_IR = [
  { french: 'finir', german: 'beenden' },
  { french: 'choisir', german: 'wählen' },
  { french: 'réussir', german: 'schaffen/gelingen' },
  { french: 'grandir', german: 'wachsen' },
  { french: 'réfléchir', german: 'nachdenken' },
  { french: 'remplir', german: 'füllen' },
  { french: 'obéir', german: 'gehorchen' },
  { french: 'applaudir', german: 'applaudieren' },
  { french: 'guérir', german: 'heilen' },
  { french: 'punir', german: 'bestrafen' },
]
// 3. Gruppe: -re (regelmäßiges Muster wie vendre) – „andere Endung"
export const REGULAR_RE = [
  { french: 'vendre', german: 'verkaufen' },
  { french: 'attendre', german: 'warten' },
  { french: 'répondre', german: 'antworten' },
  { french: 'perdre', german: 'verlieren' },
  { french: 'entendre', german: 'hören' },
  { french: 'descendre', german: 'hinuntergehen' },
  { french: 'rendre', german: 'zurückgeben' },
  { french: 'défendre', german: 'verteidigen' },
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

// ---- „Welche Zeit passt?" – Zeitform-Unterscheidung (Auswahl statt Formbildung) ----
//
// Anders als „Grammatik üben" (dort ist die Zeitform vorgegeben und man bildet die
// FORM) trainiert diese Übung die ENTSCHEIDUNG: Welche Zeit/welcher Modus passt in
// diesen Satz – und warum? Verwechselt werden Zeiten immer nur INNERHALB ihrer
// „Familie", deshalb sind die Antwort-Optionen pro Familie genau die verwechselbaren
// Zeiten (nicht zufällig). Der SRS-Fortschritt läuft über dieselbe Tabelle wie bei
// den Formen (form_progress), aber mit dem Schlüssel `contrast:<id>`.
//
// Jede Familie:
//   id, name, icon, short   – Anzeige im Menü
//   options[]               – exakte Antwort-Buttons (Zeitform-Namen)
//   hints[{name,rule}]      – deutsche Kurzregel je Option (füttert den Generator)
//   promptExtra             – familienspezifische Bau-Anweisung an den Generator
export const CONTRAST_FAMILIES = [
  {
    id: 'past', name: 'Vergangenheit', icon: '🕐',
    short: 'Passé composé · Imparfait · Plus-que-parfait',
    options: ['Passé composé', 'Imparfait', 'Plus-que-parfait'],
    hints: [
      { name: 'Passé composé', rule: 'Einmalige, abgeschlossene Handlung in der Vergangenheit (etwas ist passiert). Signale: hier, soudain, tout à coup, une fois, ce matin, hier soir.' },
      { name: 'Imparfait', rule: 'Beschreibung, Zustand oder Gewohnheit/Wiederholung in der Vergangenheit (Hintergrund, „damals immer/oft"). Signale: autrefois, tous les jours, souvent, quand j\'étais petit, pendant que, chaque été.' },
      { name: 'Plus-que-parfait', rule: 'Vorzeitig: schon abgeschlossen, BEVOR etwas anderes Vergangenes geschah. Signale: déjà, avant, quand + Passé composé, une fois que, ne … pas encore.' },
    ],
    promptExtra: 'Baue einen klaren Vergangenheits-Kontext. Für Plus-que-parfait MUSS ein zweiter Vergangenheitsbezug im Klartext im Satz stehen (z. B. „Quand je suis arrivé, …" oder „déjà"), sonst wäre es nicht eindeutig.',
  },
  {
    id: 'future', name: 'Zukunft', icon: '🔮',
    short: 'Futur proche · Futur simple · Futur antérieur',
    options: ['Futur proche', 'Futur simple', 'Futur antérieur'],
    hints: [
      { name: 'Futur proche', rule: 'Unmittelbare oder fest geplante Zukunft (aller + Infinitiv), oft gesprochen. Signale: bientôt, tout de suite, dans un instant, là, attention, regarde, dans cinq minutes.' },
      { name: 'Futur simple', rule: 'Vorhersage, Plan oder Versprechen (entferntere Zukunft). Signale: demain, l\'année prochaine, dans deux ans, un jour, plus tard.' },
      { name: 'Futur antérieur', rule: 'Vollendete Zukunft: bis zu einem Zukunftspunkt schon abgeschlossen. Braucht einen zweiten Zukunftssatz. Signale: quand/dès que/une fois que/lorsque + Futur, avant demain, d\'ici là.' },
    ],
    promptExtra: 'Für Futur antérieur MUSS ein zweiter Zukunftsbezug im Klartext im Satz stehen (z. B. „Quand tu arriveras, …" oder „d\'ici demain"), sonst wäre es nicht eindeutig.',
  },
  {
    id: 'mood', name: 'Modus (Indicatif / Subjonctif)', icon: '🎭',
    short: 'Indicatif vs. Subjonctif',
    options: ['Indicatif', 'Subjonctif'],
    hints: [
      { name: 'Indicatif', rule: 'Tatsache, Sicherheit oder Meinung im bejahten Satz. Auslöser vor „que": je pense que, je sais que, j\'espère que, il est certain que, je crois que, parce que.' },
      { name: 'Subjonctif', rule: 'Wunsch, Gefühl, Zweifel, Notwendigkeit oder bestimmte Konjunktionen. Auslöser vor „que": il faut que, je veux que, bien que, pour que, avant que, je doute que, je suis content que, il est important que.' },
    ],
    promptExtra: 'Jeder Satz hat einen Auslöser-Hauptsatz + „que", danach folgt die Lücke (das Verb im Nebensatz). Der Auslöser entscheidet eindeutig zwischen Indicatif und Subjonctif und steht im Klartext.',
  },
  {
    id: 'si', name: 'Si-Sätze (Bedingung)', icon: '❓',
    short: 'Welche Zeit im Hauptsatz?',
    options: ['Futur simple', 'Conditionnel présent', 'Conditionnel passé'],
    hints: [
      { name: 'Futur simple', rule: 'Typ 1 (real/möglich): „Si + présent" → Hauptsatz im Futur simple. Bsp: Si tu viens, je serai content.' },
      { name: 'Conditionnel présent', rule: 'Typ 2 (irreal Gegenwart): „Si + imparfait" → Hauptsatz im Conditionnel présent. Bsp: Si j\'avais le temps, je viendrais.' },
      { name: 'Conditionnel passé', rule: 'Typ 3 (irreal Vergangenheit): „Si + plus-que-parfait" → Hauptsatz im Conditionnel passé. Bsp: Si tu étais venu, tu aurais vu le spectacle.' },
    ],
    promptExtra: 'Der si-Nebensatz steht IMMER vollständig im Klartext im Satz (er ist das Signal). Die Lücke ist NUR das Verb im HAUPTSATZ. Die Zeit des si-Satzes (présent / imparfait / plus-que-parfait) entscheidet eindeutig.',
  },
]

export function contrastFamilyById(id) {
  return CONTRAST_FAMILIES.find(f => f.id === id) || null
}

// Die Zeitform-Wahl-Themen als geübte „Formen" (Positionen 14–17), damit sie in
// DERSELBEN Lern-Reihenfolge und im SELBEN SRS laufen wie die 13 konjugierten Formen.
// `kind:'contrast'` unterscheidet sie vom Formbildungs-Drill (kind:'form').
// Die `id` ist zugleich der SRS-Schlüssel (form_progress.form_key) – mit Präfix
// `contrast:`, damit es nie mit einer Formbildungs-id kollidiert.
// `family` verweist auf CONTRAST_FAMILIES; 'mixed' mischt alle Familien (inkl. Si-Sätze).
export const CONTRAST_ITEMS = [
  { id: 'contrast:past',   family: 'past',   name: 'Vergangenheit – welche Zeit?', kind: 'contrast' },
  { id: 'contrast:future', family: 'future', name: 'Zukunft – welche Zeit?',        kind: 'contrast' },
  { id: 'contrast:mood',   family: 'mood',   name: 'Modus – Indicatif / Subjonctif', kind: 'contrast' },
  { id: 'contrast:mixed',  family: 'mixed',  name: 'Gemischt – alle Zeiten',        kind: 'contrast' },
]

// Für eine Zeitform-Wahl-Runde: die zu mischenden Familien. 'mixed' = alle
// (inkl. Si-Sätze), sonst genau die eine Familie.
export function contrastFamiliesFor(family) {
  if (family === 'mixed') return CONTRAST_FAMILIES
  const f = contrastFamilyById(family)
  return f ? [f] : []
}

// Der komplette geübte Lern-Pfad: 13 konjugierte Formen (kind:'form') + 4
// Zeitform-Wahl-Themen (kind:'contrast'), in dieser Reihenfolge. Wird von der
// Ziel-Auswahl (pickTargetForm) und vom Fortschritts-Überblick genutzt.
export function orderedPracticeItems() {
  return [
    ...orderedForms().map(f => ({ ...f, kind: 'form' })),
    ...CONTRAST_ITEMS,
  ]
}

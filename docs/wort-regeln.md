# Regeln für das Speichern von Vokabeln

Diese Datei dokumentiert, **wie neue Wörter in der Datenbank gespeichert werden**
und welche Konventionen pro Wortart gelten. Sie wurde aus den vorhandenen Daten
abgeleitet und bei jedem Import angewendet.

## Datenbank

- Projekt: Supabase **„fre"** (`jxlytgwtihjimcdrdvle`)
- Tabelle: **`cards`**

### Relevante Spalten beim Anlegen

| Spalte | Bedeutung |
|---|---|
| `german` | Deutsche Übersetzung |
| `french` | Französisches Wort / Ausdruck |
| `wortart` | Wortart (steuert u. a. das Verb-Konjugationstraining) |
| `genus` | Genus – **nur bei Nomen** (`m` / `f`) |
| `verbgruppe` | Konjugationsgruppe – **nur bei Verben** (`1` / `2` / `3`) |

Die Lern-Status-Spalten (`status`, `learning_correct_count`, `interval_days`,
`next_review_at`, `created_at`) werden **nicht** gesetzt – sie laufen über die
DB-Defaults (`learning`, `0`, `1`, `now()`).

Mögliche Wortarten: `Nomen`, `Verb`, `Adjektiv`, `Adverb`, `Präposition`,
`Konjunktion`, `Pronomen`, `Ausdruck`, `Sonstiges`.

## Allgemeine Regeln für das `german`-Feld

- **Nur EINE Übersetzung** pro Wort.
- **Kein Komma** (keine Aufzählung mehrerer Bedeutungen).
- **Keine Klammern** – keine Zusätze wie `(hier)`, `hier: …`, `(ein)…`,
  `(Husten)`, `(Syn.: …)` usw.
- Bei **Nomen** bleibt der bestimmte Artikel (`der` / `die` / `das`) erhalten,
  weil er zur Wortart-Konvention gehört (das ist keine Klammer/kein Komma).

## Regeln pro Wortart

### Nomen
- `french` **mit Artikel**: `le …` / `la …` / bei Vokal-Anlaut `l'…`
  (z. B. `l'asile`, `la trousse de toilette`).
- `german` **mit Artikel**: `der` / `die` / `das`.
- `genus` = **`m`** (le) oder **`f`** (la) – richtet sich nach dem
  **französischen** Geschlecht, nicht nach dem deutschen
  (z. B. „der Kummer" → `la peine` → `genus = 'f'`).
- `verbgruppe` = `NULL`.

### Verb
- `french` = Infinitiv; reflexive Verben mit `se` / `s'`
  (z. B. `bavarder`, `s'accroupir`).
- `german` = Infinitiv (z. B. `plaudern`, `sich verschieben`).
- **Kein Artikel.** Objektmarker `qc` / `qn` werden **entfernt**
  (z. B. `toquer à qc` → `toquer à`).
- `verbgruppe`:
  - **`1`** = Verben auf `-er`
  - **`2`** = regelmäßige Verben auf `-ir` (Typ *finir*, z. B. `franchir`, `épaissir`)
  - **`3`** = unregelmäßig / `-re` / `-oir` / unregelmäßige `-ir`
    (z. B. `coudre`, `intervenir`, `revêtir`, `accroître`)
- `genus` = `NULL`.

### Adjektiv
- `french` in der **männlichen Grundform** (Singular),
  z. B. `verni`, `sec`, `étroit` (aus `verni/e` → `verni`).
- `genus` = `NULL`, `verbgruppe` = `NULL`.

### Adverb
- `french` wie geschrieben (z. B. `poliment`, `désormais`).
- Keine Zusatzfelder.

### Ausdruck
- Feste Wendungen / Idiome, meist mehrwortig
  (z. B. `avoir honte`, `faire les cent pas`).
- `faire + Infinitiv`-Konstruktionen zählen als Ausdruck
  (z. B. `faire ressortir`, `faire bouillir`).
- `qc` / `qn` ebenfalls entfernen.
- Keine Zusatzfelder.

### Präposition / Konjunktion / Pronomen / Sonstiges
- `french` wie geschrieben.
- Keine Zusatzfelder.

## Dubletten & Synonyme

Vor dem Einfügen wird gegen die vorhandenen Karten geprüft:

- **Exakte Dubletten** (gleiches `french`) werden vermieden.
- **Synonyme / bedeutungsähnliche** Karten (gleiche/ähnliche deutsche Bedeutung,
  anderes französisches Wort) sind erlaubt und werden vor dem Speichern
  gemeldet, damit die Entscheidung bewusst getroffen wird
  (z. B. `bégayer` = stottern ↔ vorhandenes `bafouiller` = stammeln).

## Workflow beim Import

1. Wörter normalisieren (Artikel, Infinitiv, männliche Grundform, `qc`/`qn` raus).
2. Wortart, `genus`, `verbgruppe` automatisch bestimmen.
3. `german`-Feld nach den allgemeinen Regeln bereinigen
   (eine Übersetzung, kein Komma, keine Klammern).
4. DB auf Dubletten/Synonyme prüfen und melden.
5. Vorschau-Liste zur Freigabe zeigen.
6. Nach Freigabe per `INSERT` in `cards` speichern.

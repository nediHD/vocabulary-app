# Vokabular – Persönliche Deutsch-Französisch Vokabel-App

Eine Single-User Spaced-Repetition Vocabulary App zum Lernen von Deutsch-Französisch Wortpaaren. Vollständig in Deutsch, optimal für Mobilgeräte, hosted auf GitHub Pages.

## Features

- 📚 **Wortschatz verwalten** – Deutsches und französisches Wort speichern
- 🎯 **Lernsitzungen** – Neue Wörter mit Selbstbewertung lernen
- 🔄 **Wiederholung** – Spaced-Repetition mit sich verdoppelnden Intervallen (1, 2, 4, 8, 16 Tage...)
- 📱 **Mobil-optimiert** – Großeap-freundliche Buttons, responsive Design
- 🌐 **Überall einsetzbar** – Static hosting auf GitHub Pages, keine Authentifizierung nötig
- 🔤 **Vollständige Zeichenunterstützung** – Alle deutschen Umlaute (ä, ö, ü, ß) und französischen Akzente (é, è, ê, ç, œ) werden korrekt dargestellt

## Setup

### 1. Supabase Database erstellen

1. Erstelle einen Account auf [supabase.com](https://supabase.com) (kostenlos)
2. Erstelle ein neues Projekt
3. Gehe zum **SQL Editor** und führe folgende SQL aus:

```sql
create table cards (
  id uuid primary key default gen_random_uuid(),
  german text not null,
  french text not null,
  status text not null default 'learning' check (status in ('learning','review')),
  learning_correct_count int not null default 0,
  interval_days int not null default 1,
  next_review_at timestamptz,
  created_at timestamptz not null default now()
);

alter table cards enable row level security;

create policy "anon_select" on cards for select to anon using (true);
create policy "anon_insert" on cards for insert to anon with check (true);
create policy "anon_update" on cards for update to anon using (true) with check (true);
create policy "anon_delete" on cards for delete to anon using (true);
```

4. Speichere deine **Supabase Project URL** und **Anon Key**:
   - Gehe zu Settings → API Keys
   - Kopiere `Project URL` und `anon (public)` Key

### 2. GitHub Repository erstellen

1. Erstelle ein neues Repository auf GitHub
2. Clone es lokal oder push diesen Code dort hin
3. Stelle sicher, dass du ein Main Branch hast

### 3. GitHub Secrets hinzufügen

1. Gehe in deinem Repository zu **Settings → Secrets and variables → Actions**
2. Klicke **New repository secret** und füge folgende hinzu:
   - `VITE_SUPABASE_URL` = deine Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = dein Anon Key

### 4. Vite Base-Pfad konfigurieren

Öffne `vite.config.js` und ersetze `<REPO_NAME>` mit deinem Repository-Namen:

```javascript
// Beispiel: wenn dein Repository "vocabulary-app" heißt:
base: '/vocabulary-app/',

// Wenn du eine custom domain verwendest oder username.github.io:
base: '/',
```

### 5. GitHub Pages aktivieren

1. Gehe in deinem Repository zu **Settings → Pages**
2. Stelle sicher dass:
   - **Source** auf "GitHub Actions" gesetzt ist
   - (Nicht "Deploy from a branch")

### 6. Deploy

Pushe deine Änderungen zu Main:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

GitHub Actions wird automatisch ein Workflow ausführen und die App auf GitHub Pages deployen. Nach 1-2 Minuten ist sie unter `https://<dein-username>.github.io/<repo-name>/` live.

## Lokale Entwicklung

1. **Dependencies installieren:**
   ```bash
   npm install
   ```

2. **.env Datei erstellen:**
   ```bash
   cp .env.example .env
   ```

3. **In .env deine Werte eintragen:**
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Entwicklungsserver starten:**
   ```bash
   npm run dev
   ```

5. **Im Browser öffnen:** http://localhost:5173

## Verwendung

### Dashboard (Übersicht)
Zeigt:
- Gesamtzahl Wörter
- Anzahl Wörter im Lernen
- Anzahl Wörter in Wiederholung
- Anzahl Wörter die heute fällig sind

Buttons zum Starten einer Lernsitzung oder Wiederholungssitzung.

### Wörter verwalten
- Neues Wort hinzufügen (Deutsches & Französisches Wort)
- Liste aller Wörter mit Status
- Löschen-Funktion für jedes Wort

### Lernsitzung
- Zeigt ein Wort (Deutsch oder Französisch zufällig)
- Du tippst die Übersetzung ein
- Aufdecken um deine Antwort zu sehen
- Selbst bewerten: "Gewusst" oder "Nicht gewusst"
- **2x "Gewusst"** → Wort wechselt zu Wiederholung
- **"Nicht gewusst"** → Zähler wird zurückgesetzt

Das Wort wird nach 4 anderen Wörtern erneut gezeigt (nicht am Ende der Liste).

### Wiederholungssitzung
- Nur Wörter die heute oder früher fällig sind werden gezeigt
- Gleich wie Lernsitzung, aber mit Spaced Repetition:
- **"Gewusst"** → Interval verdoppelt (1d → 2d → 4d → 8d...)
- **"Nicht gewusst"** → Interval zurückgesetzt auf 1 Tag, morgen erneut fällig

## Sicherheitshinweise

⚠️ **Wichtig:** Der Anon Key ist bewusst öffentlich. Sicherheit wird durch Supabase Row Level Security (RLS) durchgesetzt. Weil dies eine persönliche App ist, erlauben die Policies dass jeder mit dem Key alle Daten lesen/schreiben kann.

Falls du strengere Sicherheit möchtest, kannst du später Supabase Authentication hinzufügen:
- Benutzer müssen sich anmelden
- RLS-Policies können dann User-spezifische Daten schützen

## Tech Stack

- **Frontend:** React 19 + Vite
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + realtime)
- **Hosting:** GitHub Pages
- **CI/CD:** GitHub Actions

## Zeichen-Unterstützung

Die App unterstützt vollständig:
- Deutsche Umlaute: **ä, ö, ü, Ä, Ö, Ü, ß**
- Französische Akzente: **é, è, ê, ë, à, â, î, ï, ô, û, ù, ü, œ, æ, ç**

Alle Zeichen werden korrekt:
- Eingegeben (Input-Felder)
- Gespeichert (Supabase)
- Angezeigt (überall in der App)

## Häufige Probleme

### "Keine Wörter zum Lernen"
→ Du hast noch keine Wörter in der Datenbank. Gehe zu "Wörter verwalten" und füge ein paar Wörter hinzu.

### "Keine Wörter fällig" in Wiederholung
→ Deine Wiederholungswörter sind noch nicht zum aktuellen Datum fällig. Das ist korrekt! Spaced Repetition bedeutet, dass du Wörter erst wiederholen kannst, wenn deren `next_review_at` Datum erreicht ist.

### Site wird nicht angezeigt
→ Überprüfe:
1. Ist GitHub Actions erfolgreich durchgelaufen? (Actions Tab)
2. Hast du die `base: '/...'` in vite.config.js korrekt gesetzt?
3. Hast du GitHub Pages als Source auf "GitHub Actions" gesetzt?

### Supabase Connection Error
→ Überprüfe:
1. Sind die Secrets in GitHub richtig eingetragen?
2. Ist die Supabase Project URL korrekt?
3. Ist RLS auf der `cards` Tabelle aktiviert?

## Lizenz

Persönliches Projekt, frei verwendbar.

import { supabase } from './supabase'

// Podcast-Folgen (rein französisch). Die Audiodateien liegen im öffentlichen
// Supabase-Bucket „podcast-audio" unter podcast/<datei>.
// `words` = die NEUEN Wörter dieser Folge (genau so, wie sie in `cards.french` stehen).
// `formId` = Zeitform aus lib/grammar.js, die nach der Wörter-Übung geübt wird.
// Neue Folge hinzufügen: Audio in den Bucket legen und hier einen Eintrag ergänzen.
export const PODCAST_EPISODES = [
  {
    id: 1,
    title: 'Le passé composé (A) – Une journée à la mairie',
    tense: 'Passé composé',
    formId: 'passe-compose',
    audio: 'podcast/folge_01.mp3',
    words: [
      "s'inscrire", 'se débrouiller', 'se fâcher', 'franchir', 'chuchoter', 'bavarder', 'essuyer',
      'la mairie', 'la serrure', 'la veille', 'le goûter', 'la cachette', 'le défi', 'la pelouse', 'la poussette',
      'agacé', 'mouillé', 'étourdi', 'rassasié', 'solitaire',
      'se rendre compte', 'avoir honte', "d'un bond", 'faire les cent pas', 'dès que', 'désormais',
    ],
  },
  {
    id: 2,
    title: 'Le passé composé (B) – Le tablier de Mamie Odile',
    tense: 'Passé composé',
    formId: 'passe-compose',
    audio: 'podcast/folge_02.mp3',
    words: [
      'repérer', "s'entrechoquer", "s'étirer", 'crocheter', 'somnoler', 'vomir', 'se redresser',
      'le chancre', "l'accès de colère", 'le don', 'le tablier', 'le recoin', 'le deuil', 'le tarin',
      'translucide', 'railleur', 'plié', 'mal ourlé', 'tassé contre',
      "ne pas avoir l'air dans son assiette", 'tenir la route', 'être à côté de la plaque', 'au fil de',
    ],
  },
]

export function episodeById(id) {
  return PODCAST_EPISODES.find(e => e.id === id) || null
}

export function audioUrl(ep) {
  return supabase.storage.from('podcast-audio').getPublicUrl(ep.audio).data.publicUrl
}

// Lädt die Karten der Folge (nur Status „review") aus der DB – in der Reihenfolge der Folge.
export async function fetchEpisodeCards(ep) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('status', 'review')
    .in('french', ep.words)
  if (error) throw error
  const byFrench = new Map((data || []).map(c => [c.french, c]))
  return ep.words.map(w => byFrench.get(w)).filter(Boolean)
}

// ISO 639-3 codes accepted by ElevenLabs Scribe. Curated list of the most
// commonly studied / used languages. Scribe auto-detects when no code is
// passed; pass a specific code to constrain the transcription.

export interface Language {
  code: string  // ISO 639-3
  name: string  // Native name
  english: string  // English name
}

export const LANGUAGES: Language[] = [
  { code: 'eng', name: 'English', english: 'English' },
  { code: 'deu', name: 'Deutsch', english: 'German' },
  { code: 'fra', name: 'Français', english: 'French' },
  { code: 'spa', name: 'Español', english: 'Spanish' },
  { code: 'ita', name: 'Italiano', english: 'Italian' },
  { code: 'por', name: 'Português', english: 'Portuguese' },
  { code: 'nld', name: 'Nederlands', english: 'Dutch' },
  { code: 'pol', name: 'Polski', english: 'Polish' },
  { code: 'rus', name: 'Русский', english: 'Russian' },
  { code: 'ukr', name: 'Українська', english: 'Ukrainian' },
  { code: 'ces', name: 'Čeština', english: 'Czech' },
  { code: 'slk', name: 'Slovenčina', english: 'Slovak' },
  { code: 'hun', name: 'Magyar', english: 'Hungarian' },
  { code: 'ron', name: 'Română', english: 'Romanian' },
  { code: 'bul', name: 'Български', english: 'Bulgarian' },
  { code: 'hrv', name: 'Hrvatski', english: 'Croatian' },
  { code: 'srp', name: 'Српски', english: 'Serbian' },
  { code: 'slv', name: 'Slovenščina', english: 'Slovenian' },
  { code: 'ell', name: 'Ελληνικά', english: 'Greek' },
  { code: 'tur', name: 'Türkçe', english: 'Turkish' },
  { code: 'swe', name: 'Svenska', english: 'Swedish' },
  { code: 'dan', name: 'Dansk', english: 'Danish' },
  { code: 'nor', name: 'Norsk', english: 'Norwegian' },
  { code: 'fin', name: 'Suomi', english: 'Finnish' },
  { code: 'isl', name: 'Íslenska', english: 'Icelandic' },
  { code: 'cat', name: 'Català', english: 'Catalan' },
  { code: 'eus', name: 'Euskara', english: 'Basque' },
  { code: 'glg', name: 'Galego', english: 'Galician' },
  { code: 'cmn', name: '中文', english: 'Chinese (Mandarin)' },
  { code: 'yue', name: '粵語', english: 'Chinese (Cantonese)' },
  { code: 'jpn', name: '日本語', english: 'Japanese' },
  { code: 'kor', name: '한국어', english: 'Korean' },
  { code: 'vie', name: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'tha', name: 'ไทย', english: 'Thai' },
  { code: 'ind', name: 'Bahasa Indonesia', english: 'Indonesian' },
  { code: 'msa', name: 'Bahasa Melayu', english: 'Malay' },
  { code: 'fil', name: 'Filipino', english: 'Filipino' },
  { code: 'hin', name: 'हिन्दी', english: 'Hindi' },
  { code: 'urd', name: 'اردو', english: 'Urdu' },
  { code: 'ben', name: 'বাংলা', english: 'Bengali' },
  { code: 'tam', name: 'தமிழ்', english: 'Tamil' },
  { code: 'tel', name: 'తెలుగు', english: 'Telugu' },
  { code: 'mal', name: 'മലയാളം', english: 'Malayalam' },
  { code: 'mar', name: 'मराठी', english: 'Marathi' },
  { code: 'guj', name: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'pan', name: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'ara', name: 'العربية', english: 'Arabic' },
  { code: 'heb', name: 'עברית', english: 'Hebrew' },
  { code: 'fas', name: 'فارسی', english: 'Persian (Farsi)' },
  { code: 'swa', name: 'Kiswahili', english: 'Swahili' },
  { code: 'amh', name: 'አማርኛ', english: 'Amharic' },
  { code: 'afr', name: 'Afrikaans', english: 'Afrikaans' },
  { code: 'lat', name: 'Latina', english: 'Latin' },
]

const norm = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function searchLanguages(query: string, limit = 10): Language[] {
  const q = norm(query.trim())
  if (!q) return LANGUAGES.slice(0, limit)
  const scored: Array<{ lang: Language; score: number }> = []
  for (const lang of LANGUAGES) {
    const native = norm(lang.name)
    const en = norm(lang.english)
    const code = lang.code.toLowerCase()
    let score = -1
    if (native === q || en === q || code === q) score = 100
    else if (native.startsWith(q) || en.startsWith(q) || code.startsWith(q)) score = 50
    else if (native.includes(q) || en.includes(q)) score = 20
    if (score > 0) scored.push({ lang, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.lang)
}

export function findLanguage(code: string): Language | null {
  return LANGUAGES.find((l) => l.code === code) ?? null
}

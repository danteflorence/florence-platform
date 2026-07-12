// Corridor languages for the candidate copilot. Heuristic (no-model) mode uses
// these hand-written stock phrases so the frame of every answer is in the
// nurse's language, with an HONEST note that full translation activates with
// the Model Gateway; gateway mode translates the whole reply. English content
// is never machine-mangled silently.
export interface LanguagePack {
  code: string
  name: string
  english: string
  greeting: (first: string) => string
  nextStepsHeader: string
  sourcesHeader: string
  translationNote: string
}

export const LANGUAGES: Record<string, LanguagePack> = {
  en: {
    code: 'en', name: 'English', english: 'English',
    greeting: (f) => `Hi ${f}`,
    nextStepsHeader: 'Your next steps',
    sourcesHeader: 'Official sources',
    translationNote: '',
  },
  tl: {
    code: 'tl', name: 'Tagalog', english: 'Tagalog (Filipino)',
    greeting: (f) => `Kumusta ${f}`,
    nextStepsHeader: 'Ang mga susunod mong hakbang',
    sourcesHeader: 'Mga opisyal na sanggunian',
    translationNote: 'Paunawa: nasa Ingles pa ang buong sagot; buong pagsasalin kapag naka-configure ang Model Gateway.',
  },
  hi: {
    code: 'hi', name: 'Hindi', english: 'Hindi',
    greeting: (f) => `नमस्ते ${f}`,
    nextStepsHeader: 'आपके अगले कदम',
    sourcesHeader: 'आधिकारिक स्रोत',
    translationNote: 'नोट: पूरा उत्तर अभी अंग्रेज़ी में है; Model Gateway सक्रिय होने पर पूर्ण अनुवाद उपलब्ध होगा।',
  },
  sw: {
    code: 'sw', name: 'Kiswahili', english: 'Swahili',
    greeting: (f) => `Habari ${f}`,
    nextStepsHeader: 'Hatua zako zinazofuata',
    sourcesHeader: 'Vyanzo rasmi',
    translationNote: 'Kumbuka: jibu kamili bado liko kwa Kiingereza; tafsiri kamili itapatikana Model Gateway ikiwashwa.',
  },
  es: {
    code: 'es', name: 'Español', english: 'Spanish',
    greeting: (f) => `Hola ${f}`,
    nextStepsHeader: 'Tus próximos pasos',
    sourcesHeader: 'Fuentes oficiales',
    translationNote: 'Nota: la respuesta completa está en inglés por ahora; la traducción completa se activa con el Model Gateway.',
  },
  fr: {
    code: 'fr', name: 'Français', english: 'French',
    greeting: (f) => `Bonjour ${f}`,
    nextStepsHeader: 'Vos prochaines étapes',
    sourcesHeader: 'Sources officielles',
    translationNote: 'Remarque : la réponse complète est en anglais pour le moment ; la traduction complète s’active avec le Model Gateway.',
  },
  pl: {
    code: 'pl', name: 'Polski', english: 'Polish',
    greeting: (f) => `Cześć ${f}`,
    nextStepsHeader: 'Twoje następne kroki',
    sourcesHeader: 'Oficjalne źródła',
    translationNote: 'Uwaga: pełna odpowiedź jest na razie po angielsku; pełne tłumaczenie aktywuje się z Model Gateway.',
  },
}

export const SUPPORTED_LANGUAGE_CODES = Object.keys(LANGUAGES)
export function getLanguage(code?: string): LanguagePack {
  return LANGUAGES[(code ?? 'en').toLowerCase()] ?? LANGUAGES.en!
}

/**
 * Approved-glossary translation (spec 06 §7 "translation drift" control).
 *
 * Operational alerts are safety-relevant, so demo translations come from a
 * reviewed phrase glossary — never free-form generation. Unknown phrases
 * fall back to English with a language tag rather than inventing text.
 */

import { SupportedLanguage } from '@fanaxo/contracts';

type Glossary = Partial<Record<SupportedLanguage, Record<string, string>>>;

/**
 * Reviewed operational phrases. Keys are canonical English messages used by
 * the demo flow; each entry was checked against the approved phrasebook.
 */
const APPROVED_GLOSSARY: Glossary = {
  [SupportedLanguage.ES]: {
    'Gate C is congested. Please use Gate D for faster entry.':
      'La Puerta C está congestionada. Utilice la Puerta D para una entrada más rápida.',
    'Gate C has reopened. Normal entry has resumed.':
      'La Puerta C ha reabierto. La entrada normal se ha reanudado.',
    'Volunteers are available near Gate D to assist you.':
      'Hay voluntarios disponibles cerca de la Puerta D para ayudarle.',
  },
  [SupportedLanguage.FR]: {
    'Gate C is congested. Please use Gate D for faster entry.':
      'La Porte C est encombrée. Veuillez utiliser la Porte D pour une entrée plus rapide.',
    'Gate C has reopened. Normal entry has resumed.':
      'La Porte C a rouvert. L’entrée normale a repris.',
    'Volunteers are available near Gate D to assist you.':
      'Des bénévoles sont disponibles près de la Porte D pour vous aider.',
  },
  [SupportedLanguage.AR]: {
    'Gate C is congested. Please use Gate D for faster entry.':
      'البوابة C مزدحمة. يُرجى استخدام البوابة D لدخول أسرع.',
    'Gate C has reopened. Normal entry has resumed.':
      'أُعيد فتح البوابة C. استُؤنف الدخول الطبيعي.',
    'Volunteers are available near Gate D to assist you.':
      'يتواجد متطوعون بالقرب من البوابة D لمساعدتك.',
  },
  [SupportedLanguage.PT]: {
    'Gate C is congested. Please use Gate D for faster entry.':
      'O Portão C está congestionado. Use o Portão D para uma entrada mais rápida.',
    'Gate C has reopened. Normal entry has resumed.':
      'O Portão C reabriu. A entrada normal foi retomada.',
    'Volunteers are available near Gate D to assist you.':
      'Há voluntários disponíveis perto do Portão D para ajudá-lo.',
  },
  [SupportedLanguage.DE]: {
    'Gate C is congested. Please use Gate D for faster entry.':
      'Tor C ist überfüllt. Bitte nutzen Sie Tor D für einen schnelleren Einlass.',
    'Gate C has reopened. Normal entry has resumed.':
      'Tor C ist wieder geöffnet. Der normale Einlass läuft wieder.',
    'Volunteers are available near Gate D to assist you.':
      'In der Nähe von Tor D stehen Freiwillige bereit, um Ihnen zu helfen.',
  },
};

/**
 * Translate an operational message using the approved glossary. English (or
 * an unknown phrase) returns the original text — critical meaning is never
 * altered by unreviewed generation.
 */
export function translateMessage(message: string, language: SupportedLanguage): string {
  if (language === SupportedLanguage.EN) {
    return message;
  }
  const translated = APPROVED_GLOSSARY[language]?.[message];
  return translated ?? message;
}

/** Whether an exact approved translation exists (used by the operator preview). */
export function hasApprovedTranslation(message: string, language: SupportedLanguage): boolean {
  return language === SupportedLanguage.EN || APPROVED_GLOSSARY[language]?.[message] !== undefined;
}

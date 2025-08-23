import { I18nConfig, SupportedLanguage, TranslationNamespace } from '@/types/i18n.types';
import { LanguageCode } from '@/types/common.types';
export declare const supportedLanguages: SupportedLanguage[];
export declare const translationNamespaces: TranslationNamespace[];
export declare const i18nConfig: I18nConfig;
export declare const defaultTranslations: Record<LanguageCode, Record<string, Record<string, string>>>;
export declare const getLanguageInfo: (code: LanguageCode) => SupportedLanguage | undefined;
export declare const isLanguageSupported: (code: string) => code is LanguageCode;
export declare const detectUserLanguage: (acceptLanguageHeader?: string) => LanguageCode;
export default i18nConfig;
//# sourceMappingURL=i18n.d.ts.map
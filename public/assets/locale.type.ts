export type AppLanguages = 'ar' | 'en';
type DataValue = { [key: string]: DataValue } | string;

export interface Locale {
  lang: AppLanguages;
  data: { [key: string]: DataValue };
}

import { beforeEach } from 'vitest'
import { setLocale } from './i18n'
// Existing Turkish interaction assertions run in an explicit locale. Locale
// selection/default/persistence is covered independently by the i18n suite.
beforeEach(() => setLocale('tr', false))

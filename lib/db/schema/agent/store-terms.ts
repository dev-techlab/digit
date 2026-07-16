import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { agents } from './agent';
import { termsLocaleEnum } from './enums';

/** Store-scoped Terms & Conditions per locale (Terms screen). */
export const storeTerms = pgTable(
  'store_terms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    locale: termsLocaleEnum('locale').notNull(),
    // NULL/empty content ⇒ players fall back to the upstream/global terms.
    content: text('content'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeLocaleUq: uniqueIndex('store_terms_store_locale_uq').on(t.storeId, t.locale),
  })
);

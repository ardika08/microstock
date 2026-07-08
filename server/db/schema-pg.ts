import { pgTable, text, timestamp, integer, boolean, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name'),
  image: text('image'),
  phone: text('phone'),
  planType: text('plan_type').default('free'), // free, topup, starter, lifetime
  credits: integer('credits').default(20), // start with 20 free trial credits
  creditsUsed: integer('credits_used').default(0),
  isActive: boolean('is_active').default(true),
  openaiApiKey: text("openai_api_key"),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').unique().notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').unique().notNull(),
  expires: timestamp('expires').notNull(),
})

export const activationCodes = pgTable('activation_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  userId: uuid('user_id').references(() => users.id),
  status: text('status').default('ACTIVE'), // ACTIVE, USED, REVOKED
  planType: text('plan_type'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
})

export const generateHistory = pgTable('generate_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform'), // adobe_stock, shutterstock
  filename: text('filename'),
  title: text('title'),
  creditsUsed: integer('credits_used').default(1),
  createdAt: timestamp('created_at').defaultNow(),
})

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  mayarOrderId: text('mayar_order_id').unique(),
  productType: text('product_type'), // topup_500, starter_monthly, lifetime
  amount: integer('amount'), // in IDR
  status: text('status').default('pending'), // pending, success, failed
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

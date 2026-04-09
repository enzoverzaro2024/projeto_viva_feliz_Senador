import { integer, pgEnum, pgTable, text, timestamp, varchar, decimal, serial } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin", "volunteer"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  age: varchar("age", { length: 50 }),
  address: text("address"),
  neighborhood: varchar("neighborhood", { length: 100 }),
  cardId: varchar("card_id", { length: 64 }).notNull().unique(),
  cardNumber: varchar("card_number", { length: 50 }), // Nova Coluna "Número do Cartão"
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  processedResgate: integer("processed_resgate").default(0).notNull(), // 0=pendente, 1=enviado, 2=falhou
  processedReforco: integer("processed_reforco").default(0).notNull(), // 0=pendente, 1=enviado, 2=falhou
  resgateNote: text("resgate_note"),   // motivo da falha / nota do resgate
  reforcoNote: text("reforco_note"),   // motivo da falha / nota do reforço
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participants.id),
  volunteerId: integer("volunteer_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participants.id),
  volunteerId: integer("volunteer_id").notNull().references(() => users.id),
  date: timestamp("date").defaultNow().notNull(),
  description: text("description"), // For history like "Noite 1"
});

export const eventSettings = pgTable("event_settings", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").default("Viva Feliz"),
  location: text("location").default(""),
  prevSummary: text("prev_summary"),
  prizesList: text("prizes_list"),
  nextChallenge: text("next_challenge"),
  tonightPoints: text("tonight_points"),
  attPoints: decimal("att_points", { precision: 10, scale: 2 }).default("50"),
  customMessage: text("custom_message"),
  // Novos campos para a arte do cartão
  cardTemplateImage: text("card_template_image"),
  templateQrX: integer("template_qr_x").default(330),
  templateQrY: integer("template_qr_y").default(80),
  templateQrSize: integer("template_qr_size").default(180),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;
export type EventSettings = typeof eventSettings.$inferSelect;
export type InsertEventSettings = typeof eventSettings.$inferInsert;

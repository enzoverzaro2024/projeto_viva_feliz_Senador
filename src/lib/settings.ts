import { db } from "./db";
import { eventSettings } from "./db/schema";
import { eq } from "drizzle-orm";

export interface AppSettings {
  cardTemplateImage?: string | null;
  templateQrX: number;
  templateQrY: number;
  templateQrSize: number;
}

const defaultSettings: AppSettings = {
  templateQrX: 330,
  templateQrY: 80,
  templateQrSize: 180,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const settings = await db.query.eventSettings.findFirst();
    if (!settings) return defaultSettings;
    
    return {
      cardTemplateImage: settings.cardTemplateImage,
      templateQrX: settings.templateQrX ?? defaultSettings.templateQrX,
      templateQrY: settings.templateQrY ?? defaultSettings.templateQrY,
      templateQrSize: settings.templateQrSize ?? defaultSettings.templateQrSize,
    };
  } catch (error) {
    console.error("Error in getSettings:", error);
    return defaultSettings;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const current = await db.query.eventSettings.findFirst();
    
    if (!current) {
      const [inserted] = await db.insert(eventSettings).values(settings).returning();
      return {
        cardTemplateImage: inserted.cardTemplateImage,
        templateQrX: inserted.templateQrX ?? defaultSettings.templateQrX,
        templateQrY: inserted.templateQrY ?? defaultSettings.templateQrY,
        templateQrSize: inserted.templateQrSize ?? defaultSettings.templateQrSize,
      };
    }

    const [updated] = await db.update(eventSettings)
      .set(settings)
      .where(eq(eventSettings.id, current.id))
      .returning();

    return {
      cardTemplateImage: updated.cardTemplateImage,
      templateQrX: updated.templateQrX ?? defaultSettings.templateQrX,
      templateQrY: updated.templateQrY ?? defaultSettings.templateQrY,
      templateQrSize: updated.templateQrSize ?? defaultSettings.templateQrSize,
    };
  } catch (error) {
    console.error("Error in saveSettings:", error);
    throw error;
  }
}

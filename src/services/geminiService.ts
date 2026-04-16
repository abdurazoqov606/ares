import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export const translateBookContent = async (text: string, sourceLang: string = 'auto') => {
  if (!text.trim()) return "";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Updated to a supported model for higher stability
      contents: `Siz jahon miqyosidagi professional tarjimon va muharrirsiz. 
      Quyidagi matnni o'zbek tiliga AKADEMIK va BADIIY uslubda o'giring.
      
      MUHIM TALABLAR:
      1. Ma'noni 100% saqlang, lekin o'zbek tilida tabiiy eshitilishini ta'minlang.
      2. Gaplar tuzilishini o'zbek tili grammatikasiga moslang.
      3. Kitobning (yoki hujjatning) asl ruhini va terminologiyasini saqlab qoling.
      4. Agar matn ilmiy bo'lsa - ilmiy, agar badiiy bo'lsa - badiiy uslubdan foydalaning.
      
      MATN:
      ---
      ${text}
      ---
      
      Faqat o'zbekcha tarjimani qaytaring.`,
      config: {
        systemInstruction: "Siz o'zbek tili lug'at boyligi va grammatikasini mukammal biladigan professional tarjimonsiz.",
      }
    });

    return response.text || "Tarjima amalga oshirilmadi.";
  } catch (error) {
    console.error("Critical Translation Error:", error);
    return `[Tarjima xatoligi: ${error instanceof Error ? error.message : "Noma'lum"}]`;
  }
};

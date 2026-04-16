export const translateBookContent = async (text: string) => {
  if (!text.trim()) return "";
  
  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Server error");
    }

    const data = await response.json();
    return data.translatedText || "Tarjima amalga oshirilmadi.";
  } catch (error) {
    console.error("Translation Client Error:", error);
    return `[Tarjima xatoligi: ${error instanceof Error ? error.message : "Noma'lum"}]`;
  }
};

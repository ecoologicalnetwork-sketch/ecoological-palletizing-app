import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedItem {
  sku: string;
  quantity: number;
}

export async function extractItemsFromDocument(file: File): Promise<ExtractedItem[]> {
  // Convert File to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [
      {
        parts: [
          {
            text: `Extract the line items from this Sales Order. 
Focus on the table structure. Typically the columns are arranged as:
1. Item/Description (may contain SKU and description)
2. SKU (Specific code for the item)
3. QTY/Quantity (Number of units)
4. Rate/Price
5. Amount/Total

Instructions:
- The 'SKU' is usually the 2nd column. If the 2nd column is empty, look at the 1st column.
- The 'Quantity' is usually the 3rd column. Parse it as a whole number.
- Only return items that have a valid SKU and a quantity greater than zero.
- Output ONLY a JSON array of objects with keys "sku" and "quantity".
- Do not include headers or footers.`
          },
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          }
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sku: { type: Type.STRING },
            quantity: { type: Type.INTEGER },
          },
          required: ["sku", "quantity"],
        },
      },
    },
  });

  try {
    const text = response.text.trim();
    const items: ExtractedItem[] = JSON.parse(text);
    return items.map(item => ({
      ...item,
      sku: item.sku?.trim() || ""
    }));
  } catch (err) {
    console.error("Failed to parse Gemini response:", err);
    return [];
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mimeType, base64Data } = req.body as { mimeType: string; base64Data: string };

  if (!mimeType || !base64Data) {
    return res.status(400).json({ error: 'Missing file data' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
- Do not include headers or footers.`,
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sku: { type: Type.STRING },
              quantity: { type: Type.INTEGER },
            },
            required: ['sku', 'quantity'],
          },
        },
      },
    });

    const text = response.text ? response.text.trim() : '[]';
    const items = JSON.parse(text);
    const parsedItems = items.map((item: { sku?: string; quantity: number }) => ({
      ...item,
      sku: item.sku?.trim() || '',
    }));

    return res.status(200).json(parsedItems);
  } catch (err) {
    console.error('Failed to parse Gemini response:', err);
    return res.status(500).json({ error: 'Failed to extract items' });
  }
}

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

  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mimeType: file.type,
        base64Data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to extract items. Status: ${response.status}`);
    }

    const data = await response.json();
    return data.items || data;
  } catch (err) {
    console.error('Failed to fetch from backend:', err);
    throw err; // let the calling function handle the error
  }
}

import { encodeImage } from "../utils/imageEncoder.js";
import fetch from "node-fetch";

export async function queryOpenAIWithImage(
  apiKey,
  imagePath,
  prompt,
  modelId,
  fidelity
) {
  // Getting the base64 string of the image
  const base64Image = encodeImage(imagePath);

  // Request headers
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // Request payload
  const payload = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: fidelity,
            },
          },
        ],
      },
    ],
    max_tokens: 512,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

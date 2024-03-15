import fs from "fs";

export function encodeImage(imagePath) {
  let base64Image = null;
  try {
    base64Image = fs.readFileSync(imagePath, { encoding: "base64" });
  } catch (error) {
    console.error("Failed to encode image:", error);
    return null;
  }
  return base64Image;
}

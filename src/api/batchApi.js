import fs from "fs";
import { encodeImage } from "../utils/imageEncoder.js";
import fetch from "node-fetch";
import path from "path";
import { createWriteStream } from "fs";
import FormData from "form-data";

/**
 * Creates a batch input file for OpenAI's Batch API
 * @param {string} apiKey - OpenAI API key
 * @param {string[]} imagePaths - Array of paths to images
 * @param {string} prompt - The prompt to use for captioning
 * @param {string} modelId - The model ID to use
 * @param {string} fidelity - The fidelity level (low, high, auto)
 * @param {string} outputPath - Path to save the batch input file
 * @returns {Promise<string>} - The file ID of the uploaded batch input file
 */
export async function createBatchInputFile(
  apiKey,
  imagePaths,
  prompt,
  modelId,
  fidelity,
  outputPath
) {
  // Create a write stream to the output file
  const writeStream = createWriteStream(outputPath);
  
  // Write each request to the file
  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    const fileName = path.basename(imagePath);
    const base64Image = encodeImage(imagePath);
    
    if (!base64Image) {
      console.error(`Failed to encode image: ${imagePath}`);
      continue;
    }
    
    const request = {
      custom_id: fileName,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
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
      },
    };
    
    writeStream.write(JSON.stringify(request) + "\n");
  }
  
  // Close the write stream
  writeStream.end();
  
  // Wait for the write stream to finish
  await new Promise((resolve) => writeStream.on("finish", resolve));
  
  // Upload the file to OpenAI
  return await uploadBatchFile(apiKey, outputPath);
}

/**
 * Uploads a batch input file to OpenAI
 * @param {string} apiKey - OpenAI API key
 * @param {string} filePath - Path to the batch input file
 * @returns {Promise<string>} - The file ID of the uploaded file
 */
async function uploadBatchFile(apiKey, filePath) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("purpose", "batch");
  
  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...formData.getHeaders(),
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to upload batch file: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
  }
  
  const data = await response.json();
  return data.id;
}

/**
 * Creates a batch job using the uploaded file
 * @param {string} apiKey - OpenAI API key
 * @param {string} fileId - The file ID of the uploaded batch input file
 * @returns {Promise<string>} - The batch ID
 */
export async function createBatch(apiKey, fileId) {
  const response = await fetch("https://api.openai.com/v1/batches", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input_file_id: fileId,
      endpoint: "/v1/chat/completions",
      completion_window: "24h",
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create batch: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
  }
  
  const data = await response.json();
  return data.id;
}

/**
 * Checks the status of a batch job
 * @param {string} apiKey - OpenAI API key
 * @param {string} batchId - The batch ID
 * @returns {Promise<Object>} - The batch status
 */
export async function checkBatchStatus(apiKey, batchId) {
  const response = await fetch(`https://api.openai.com/v1/batches/${batchId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to check batch status: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
}

/**
 * Downloads the results of a completed batch job
 * @param {string} apiKey - OpenAI API key
 * @param {string} fileId - The file ID of the batch output file
 * @returns {Promise<Array>} - The batch results
 */
export async function downloadBatchResults(apiKey, fileId) {
  const response = await fetch(`https://api.openai.com/v1/files/${fileId}/content`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to download batch results: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
  }
  
  const text = await response.text();
  return text.split("\n").filter(Boolean).map(JSON.parse);
}

/**
 * Downloads the error file of a failed batch job
 * @param {string} apiKey - OpenAI API key
 * @param {string} fileId - The file ID of the batch error file
 * @returns {Promise<Array>} - The batch errors
 */
export async function downloadBatchErrors(apiKey, fileId) {
  if (!fileId) {
    return [];
  }
  
  const response = await fetch(`https://api.openai.com/v1/files/${fileId}/content`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to download batch errors: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
  }
  
  const text = await response.text();
  return text.split("\n").filter(Boolean).map(JSON.parse);
}

/**
 * Processes a batch of images using OpenAI's Batch API
 * @param {string} apiKey - OpenAI API key
 * @param {string[]} imagePaths - Array of paths to images
 * @param {string} prompt - The prompt to use for captioning
 * @param {string} modelId - The model ID to use
 * @param {string} fidelity - The fidelity level (low, high, auto)
 * @param {string} outputFolderPath - Path to save the output files
 * @param {string} fileExt - The file extension to use for output files
 * @returns {Promise<void>}
 */
export async function processBatchImages(
  apiKey,
  imagePaths,
  prompt,
  modelId,
  fidelity,
  outputFolderPath,
  fileExt
) {
  // Calculate file sizes and estimate batch sizes
  const MAX_BATCH_SIZE_BYTES = 180 * 1024 * 1024; // 180MB (leaving some buffer below the 200MB limit)
  const batches = [];
  let currentBatch = [];
  let currentBatchSize = 0;
  
  // First pass: estimate sizes and create batches
  for (const imagePath of imagePaths) {
    const stats = fs.statSync(imagePath);
    const fileSize = stats.size;
    
    // Estimate the size after base64 encoding (adds ~33% overhead)
    const estimatedEncodedSize = fileSize * 1.33;
    
    // If adding this image would exceed the limit, start a new batch
    if (currentBatchSize + estimatedEncodedSize > MAX_BATCH_SIZE_BYTES && currentBatch.length > 0) {
      batches.push([...currentBatch]);
      currentBatch = [imagePath];
      currentBatchSize = estimatedEncodedSize;
    } else {
      currentBatch.push(imagePath);
      currentBatchSize += estimatedEncodedSize;
    }
  }
  
  // Add the last batch if it has any images
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  
  console.log(`Split ${imagePaths.length} images into ${batches.length} batches based on file sizes`);
  console.log(`Maximum batch size set to ${MAX_BATCH_SIZE_BYTES / (1024 * 1024)}MB`);
  
  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batchImages = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batchImages.length} images...`);
    
    // Create a batch input file for this batch
    const batchInputPath = path.join(outputFolderPath, `batch_input_${batchIndex + 1}.jsonl`);
    const fileId = await createBatchInputFile(
      apiKey,
      batchImages,
      prompt,
      modelId,
      fidelity,
      batchInputPath
    );
    
    console.log(`Created batch input file for batch ${batchIndex + 1}`);
    
    // Create a batch job
    const batchId = await createBatch(apiKey, fileId);
    console.log(`Batch ${batchIndex + 1} job created with ID: ${batchId}`);
    
    // Wait for the batch job to complete
    console.log(`Waiting for batch ${batchIndex + 1} to complete...`);
    let batchStatus;
    do {
      batchStatus = await checkBatchStatus(apiKey, batchId);
      console.log(`Batch ${batchIndex + 1} status: ${batchStatus.status}`);
      
      if (batchStatus.status === "failed") {
        console.error(`Batch ${batchIndex + 1} failed. Retrieving error details...`);
        if (batchStatus.error_file_id) {
          try {
            const errors = await downloadBatchErrors(apiKey, batchStatus.error_file_id);
            console.error(`Batch ${batchIndex + 1} errors:`);
            errors.forEach(error => {
              console.error(`- ${error.custom_id}: ${error.error.message}`);
            });
          } catch (error) {
            console.error(`Failed to retrieve error details: ${error.message}`);
          }
        }
        throw new Error(`Batch ${batchIndex + 1} failed. Status: ${batchStatus.status}`);
      }
      
      if (batchStatus.status === "expired") {
        console.error(`Batch ${batchIndex + 1} expired. Retrieving error details...`);
        if (batchStatus.error_file_id) {
          try {
            const errors = await downloadBatchErrors(apiKey, batchStatus.error_file_id);
            console.error(`Batch ${batchIndex + 1} errors:`);
            errors.forEach(error => {
              console.error(`- ${error.custom_id}: ${error.error.message}`);
            });
          } catch (error) {
            console.error(`Failed to retrieve error details: ${error.message}`);
          }
        }
        throw new Error(`Batch ${batchIndex + 1} expired. Status: ${batchStatus.status}`);
      }
      
      if (batchStatus.status === "completed") {
        break;
      }
      
      // Wait for 30 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 30000));
    } while (batchStatus.status !== "completed");
    
    console.log(`Batch ${batchIndex + 1} completed. Downloading results...`);
    const results = await downloadBatchResults(apiKey, batchStatus.output_file_id);
    
    console.log(`Processing results for batch ${batchIndex + 1}...`);
    for (const result of results) {
      if (result.error) {
        console.error(`Error processing ${result.custom_id}: ${result.error.message}`);
        continue;
      }
      
      // Extract just the base name without extension
      const fullFileName = result.custom_id;
      const baseFileName = path.parse(fullFileName).name;
      
      const message = result.response.body.choices[0].message;
      const cleanedMessage = cleanMessage(message.content);
      const fileFullPath = `${outputFolderPath}/${baseFileName}.${fileExt}`;
      fs.writeFileSync(fileFullPath, cleanedMessage);
      console.log(`Processed ${baseFileName}`);
    }
    
    console.log(`Batch ${batchIndex + 1} processing complete.`);
  }
  
  console.log("All batches processed successfully.");
}

/**
 * Escapes parentheses and double quotation marks in a given string by adding a backslash (\) before each of them.
 *
 * @param {string} message - The message to be cleaned.
 * @returns {string} - The cleaned message with parentheses and double quotes escaped.
 */
function cleanMessage(message) {
  return message.replace(/([()"])/g, "\\$1");
}
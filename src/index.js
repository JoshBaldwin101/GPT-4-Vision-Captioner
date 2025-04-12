import fs from "fs";
import { readdir } from "fs/promises";
import process from "process";
import * as path from "path";
import readline from "readline";
import dotenv from "dotenv";
import inquirer from "inquirer";
import { queryOpenAIWithImage } from "./api/visionApi.js";
import { processBatchImages } from "./api/batchApi.js";

dotenv.config();

// apiKey contains OpenAI API key
const apiKey = process.env.OPENAI_API_KEY;

// If the model that contains the vision tech changes, update it here.
const modelWithVision = "gpt-4o";
// Rate limits - Find them here: https://platform.openai.com/account/limits
const RATE_LIMIT_PER_MINUTE = 100000; // Maximum RPM
const INTERVAL_BETWEEN_CALLS = 60000 / RATE_LIMIT_PER_MINUTE; // Time in ms

// Path to the images folder
const imagesFolderPath = "./images";

// Path to output folder
const outputFolderPath = "./output";

/**
 * Main function to be executed
 */
async function main() {
  try {
    // Check if OPENAI_API_KEY environment variable is set
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY.trim() === ""
    ) {
      throw new Error(
        "OPENAI_API_KEY is not set. Please set this environment variable and try again."
      );
    }
    // Check if the images directory is empty
    const isEmpty = await isDirectoryEmpty(imagesFolderPath);
    if (isEmpty) {
      throw new Error(
        `The directory at "${imagesFolderPath}" is either empty or invalid. Don't forget to put your images in the images folder.`
      );
    }
    const prompt = fs.readFileSync("./prompt.txt", "utf8");
    if (!prompt || prompt.trim() == "") {
      throw new Error(
        "Prompt was empty. Please edit prompt.txt with your prompt. Check the README for details."
      );
    }

    // Verify the API key has access to the vision model
    const hasVisionModel = await apiKeyHasAccessTo(apiKey, modelWithVision);

    if (!hasVisionModel) {
      throw new Error(
        `You do not have access to the required ${modelWithVision} model. Unable to proceed. Please see the README.`
      );
    }

    // All checks passed

    const fileExt = (await askOutputFileExtensionQuestion()).answer; // txt or caption

    const outputFolderHasTxtFiles = await directoryContainsExtension(
      outputFolderPath,
      "txt"
    );

    const outputFolderHasCaptionFiles = await directoryContainsExtension(
      outputFolderPath,
      "caption"
    );

    let continueOverwrite = true;
    if (fileExt == "txt" && outputFolderHasTxtFiles) {
      continueOverwrite = (await askTxtOverwriteQuestion()).answer;
    } else if (fileExt == "caption" && outputFolderHasCaptionFiles) {
      continueOverwrite = (await askCaptionOverwriteQuestion()).answer;
    }

    if (!continueOverwrite) {
      console.log("Aborted.");
      return;
    }

    const chosenFidelityLevel = (await askLowOrHighFidelityQuestion()).answer;

    const pathToImagesList = await getListOfPathToImages(imagesFolderPath);

    // Ask the user if they want to use batch processing
    const useBatchProcessing = (await askBatchProcessingQuestion()).answer;

    if (useBatchProcessing) {
      console.log("Using batch processing mode...");
      const costConfirmation = (await askAgreementQuestion()).answer;

      if (!costConfirmation) {
        console.log("Aborted.");
        return;
      }

      console.log("Proceeding with batch processing...");
      await processBatchImages(
        apiKey,
        pathToImagesList,
        prompt,
        modelWithVision,
        chosenFidelityLevel,
        outputFolderPath,
        fileExt
      );
    } else {
      console.log("Using synchronous processing mode...");
      const costConfirmation = (await askAgreementQuestion()).answer;

      if (!costConfirmation) {
        console.log("Aborted.");
        return;
      }

      console.log("Proceeding with synchronous processing...");
      await processImagesSynchronously(
        apiKey,
        pathToImagesList,
        prompt,
        modelWithVision,
        chosenFidelityLevel,
        outputFolderPath,
        fileExt
      );
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
}

/**
 * Process images synchronously (original method)
 */
async function processImagesSynchronously(
  apiKey,
  pathToImagesList,
  prompt,
  modelWithVision,
  chosenFidelityLevel,
  outputFolderPath,
  fileExt
) {
  for (let i = 0; i < pathToImagesList.length; i++) {
    if (i > 0) await delay(INTERVAL_BETWEEN_CALLS);
    const filePath = pathToImagesList[i];
    const fileName = getFileNameFromPath(filePath);
    console.log("Attempting to query for " + fileName);
    await attemptQueryWithRetry(
      apiKey,
      filePath,
      prompt,
      modelWithVision,
      chosenFidelityLevel,
      fileName,
      outputFolderPath,
      fileExt,
      3
    );
  }
  console.log("Processing complete.");
}

async function attemptQueryWithRetry(
  apiKey,
  filePath,
  prompt,
  model,
  fidelity,
  fileName,
  outputFolderPath,
  fileExt,
  retries,
  attempt = 1
) {
  try {
    const outputData = await queryOpenAIWithImage(
      apiKey,
      filePath,
      prompt,
      model,
      fidelity
    );
    const message = outputData.choices[0].message;
    const cleanedMessage = cleanMessage(message.content);
    const fileFullPath = `${outputFolderPath}/${fileName}.${fileExt}`;
    fs.writeFileSync(fileFullPath, cleanedMessage);
  } catch (error) {
    console.error(
      `Attempt ${attempt} failed for: ${fileName}\nError:`,
      error
    );
    if (attempt < retries) {
      console.log(
        `Retrying for ${fileName}... Attempt ${attempt + 1} of ${retries}`
      );
      await delay(INTERVAL_BETWEEN_CALLS); // Delay before retry, consider increasing this delay for exponential backoff
      await attemptQueryWithRetry(
        apiKey,
        filePath,
        prompt,
        model,
        fidelity,
        fileName,
        outputFolderPath,
        fileExt,
        retries,
        attempt + 1
      );
    } else {
      console.log(`All retry attempts failed for: ${fileName}`);
      // Handle the final failure case, maybe logging or flagging the file for manual review
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

/**
 * Extracts the file name without the extension from a given file path.
 *
 * @param {string} path - The full path of the file.
 * @return {string} The file name without its extension.
 *
 * @example
 * // returns 'file1'
 * getFileNameFromPath("./path/to/file1.txt");
 */
function getFileNameFromPath(path) {
  let fileName = path.split(/[/\\]/).pop(); // Use a regex to split by both '/' and '\'
  return fileName.split(".").slice(0, -1).join("."); // Remove the file extension
}

/**
 * Asynchronously gets a list of paths to image files within the specified folder.
 * @param {string} imagesFolderPath - The path to the folder containing image files.
 * @returns {Promise<string[]>} A promise that resolves to an array of strings, each representing a path to an image file in the folder.
 */
async function getListOfPathToImages(imagesFolderPath) {
  const imageExtensions = [
    "png",
    "jpeg",
    "jpg",
    "gif",
    "bmp",
    "tiff",
    "tif",
    "svg",
    "webp",
    "ico",
  ]; // Add more common image file types if needed.
  const pathsToImages = [];

  try {
    const files = await readdir(imagesFolderPath);

    for (const file of files) {
      const extension = path.extname(file).slice(1);
      if (imageExtensions.includes(extension.toLowerCase())) {
        pathsToImages.push(path.join(imagesFolderPath, file));
      }
    }
  } catch (error) {
    console.error("Error reading directory:", error);
  }

  return pathsToImages;
}

async function askOutputFileExtensionQuestion() {
  const question = [
    {
      type: "list",
      name: "answer",
      message:
        "Which file extension would you like to save the output as? Kohya_ss supports both.",
      choices: ["txt", "caption"],
    },
  ];

  const answer = await inquirer.prompt(question);
  return answer;
}

async function askTxtOverwriteQuestion() {
  const question = [
    {
      type: "confirm",
      name: "answer",
      message:
        ".txt file(s) were detected in the output folder. These could be overwritten. Would you like to continue?",
      default: true,
    },
  ];

  const answer = await inquirer.prompt(question);
  return answer;
}

async function askCaptionOverwriteQuestion() {
  const question = [
    {
      type: "confirm",
      name: "answer",
      message:
        ".caption file(s) were detected in the output folder. These could be overwritten. Would you like to continue?",
      default: true,
    },
  ];

  const answer = await inquirer.prompt(question);
  return answer;
}

async function askLowOrHighFidelityQuestion() {
  const question = [
    {
      type: "list",
      name: "answer",
      message:
        "Please choose a fidelity level of image understanding." +
        "\nLow = low image understanding, low constant token usage (Recommended)" +
        "\nHigh = high image understanding, very high token usage" +
        "\nAuto = OpenAI will decide",
      choices: ["low", "high", "auto"],
    },
  ];

  const answer = await inquirer.prompt(question);
  return answer;
}

async function askBatchProcessingQuestion() {
  const question = [
    {
      type: "confirm",
      name: "answer",
      message:
        "Would you like to use batch processing? This is 50% cheaper and has higher rate limits, but results may take up to 24 hours to complete.",
      default: true,
    },
  ];

  const answer = await inquirer.prompt(question);
  return answer;
}

async function askEstimatedHighCostQuestion(tokenCount) {
  const question = [
    {
      type: "confirm",
      name: "answer",
      message:
        "The ROUGHLY ESTIMATED COST is " +
        tokenCount +
        " tokens which translates to roughly $" +
        imageTokensToUSD(tokenCount) +
        " USD. Would you like to continue?",
      default: false,
    },
  ];

  const answer = await inquirer.prompt(question);
  return answer;
}

async function askEstimatedLowCostQuestion(tokenCount) {
  const question = [
    {
      type: "confirm",
      name: "answer",
      message:
        "The ROUGHLY ESTIMATED COST is " +
        tokenCount +
        " tokens which translates to roughly $" +
        imageTokensToUSD(tokenCount) +
        " USD. Would you like to continue?",
      default: false,
    },
  ];

  const answer = await inquirer.prompt(question);
  return answer;
}

async function askAgreementQuestion() {
  const question = [
    {
      type: "confirm",
      name: "answer",
      message:
        "By confirming here and continuing, you agree to accept all costs incurred by these API requests. " +
        "The author and all contributors of this code are not responsible for any costs. " +
        "I also agree to abide by OpenAI's terms of service.",
      default: false,
    },
  ];

  const answer = await inquirer.prompt(question);
  return answer;
}

function calculateLowFidelityCosts(images) {
  const calculation = images.length * 85;
  return calculation;
}

function calculateHighFidelityCosts(images) {
  const calculation = images.length * 170 * 6 + 85;
  return calculation;
}

/**
 * Converts tokens to USD.
 *
 * @param {number} tokens The amount of tokens to be converted.
 * @return {number} The equivalent amount in USD.
 */
function imageTokensToUSD(tokens) {
  // Ensure the input is a number.
  if (typeof tokens !== "number") {
    throw new TypeError("The tokens input must be a number.");
  }

  // Conversion rate: 1,000 tokens = $0.01 USD
  const usd = (tokens / 1000) * 0.01;

  return parseFloat(usd.toFixed(2));
}

async function getOpenAIModels(APIKEY) {
  const API_URL = "https://api.openai.com/v1/models";

  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${APIKEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

async function apiKeyHasAccessTo(apiKey, model) {
  let models = (await getOpenAIModels(apiKey)).data;

  if (!models || models.length === 0) {
    console.log("Error: No access to models with this API key.");
    return false;
  }

  for (let i = 0; i < models.length; i++) {
    let modelLowerCase = model.toLowerCase();
    let checkedModelLowerCase = models[i].id;

    if (modelLowerCase == checkedModelLowerCase) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a specified directory is empty.
 * @param {string} dirPath - The path to the directory to check.
 * @returns {Promise<boolean>} - A promise that resolves to true if the directory is empty, false otherwise.
 */
async function isDirectoryEmpty(dirPath) {
  try {
    const files = await readdir(dirPath);
    // Filter out .gitkeep files
    const relevantFiles = files.filter((file) => file !== ".gitkeep");
    return relevantFiles.length === 0;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("The specified directory does not exist.");
    } else {
      console.log("An error occurred:", error.message);
    }
    return false;
  }
}

/**
 * Checks if a directory contains any files with the specified extension.
 *
 * @param {string} directoryPath - The path to the directory to check.
 * @param {string} extension - The file extension to look for (without the dot).
 * @returns {Promise<boolean>} - A promise that resolves with true if any files with the specified extension exist, false otherwise.
 */
async function directoryContainsExtension(directoryPath, extension) {
  try {
    const files = await readdir(directoryPath);
    // Filter the files to only those with the specified extension.
    const filteredFiles = files.filter(
      (file) =>
        path.extname(file).toLowerCase() === `.${extension.toLowerCase()}`
    );
    // Return true if there are any such files, false otherwise.
    return filteredFiles.length > 0;
  } catch (error) {
    console.error(`Failed to read directory: ${error}`);
    throw error; // Rethrow the error to let the caller handle it.
  }
}

main();

# GPT-4-Vision-Captioner
GPT-4-Vision-Captioner is an innovative project leveraging the powerful capabilities of the new ChatGPT model, `gpt-4-vision-preview`. This tool is designed to analyze a batch of images and produce `.txt` or `.caption` files containing captions. These outputs are particularly structured to facilitate generative AI training, making this tool invaluable for developers in the AI field.

This tool was designed to be used to create training data to be passed into the [Kohya_ss](https://github.com/bmaltais/kohya_ss) Stable Diffusion model trainer.

## Features
- Batch processing of images for efficient caption generation
- Output suitable for generative AI training data in `.txt` or `.caption` formats
- Custom prompt flexibility via a simple `prompt.txt` setup
- Easy to use with minimal setup requirements
- **NEW**: OpenAI Batch API support for 50% lower costs and higher rate limits

## Getting Started

### Prerequisites
- Node.js installed on your machine
- An OpenAI API key

### Setup
1. **Clone the repository:**
```bash
    git clone https://github.com/JoshBaldwin101/GPT-4-Vision-Captioner.git
    
```
2. **Create a `.env` file** in the root directory and add your OpenAI API key:
```
    OPENAI_API_KEY=YourKeyGoesHere

```
3. **Configure the prompt:** Locate the `prompt.txt` file in the root directory and input your desired prompt. Example prompts include:
```
Caption this image in a way that would work well as generative AI training data. The most prominent features should be mentioned first. Only print the generated caption. Don't surround it with quotes.
```
```
Tag this image as if you were tagging it for booru with tags. For an image of a sunflower in a field, you would tag in this format: sunflower, blue sky, beautiful background, nature, plants, trees, rolling hills
```
4. **Add images:** Place your images in the `images` folder located in the root directory.

### Running the Tool
1. Launch the `start_captioner.bat` file. This will automatically handle dependencies.
2. Follow the prompts in the console window to customize your output settings (`txt` or `caption` file extension, fidelity level of image understanding, etc.).
3. Choose whether to use batch processing (recommended for large datasets) or synchronous processing.
4. Confirm the terms regarding cost and OpenAI's terms of service by typing y when prompted.

## Processing Modes

### Synchronous Processing
- Processes images one at a time
- Results are available immediately
- Higher cost per image
- Subject to standard rate limits

### Batch Processing (NEW)
- Processes all images in a single batch
- Results may take up to 24 hours to complete
- 50% lower cost per image
- Higher rate limits
- Ideal for large datasets

## Batch Processing Details

The new batch processing feature uses OpenAI's Batch API to process multiple images at once. This approach offers several advantages:

### Benefits
- **Cost Efficiency**: The Batch API offers a 50% cost discount compared to synchronous APIs.
- **Higher Rate Limits**: The Batch API has substantially higher rate limits compared to the synchronous APIs.
- **Scalability**: The Batch API can handle up to 50,000 requests in a single batch, making it ideal for large datasets.

### How It Works
1. The tool creates a JSONL file containing all your image requests
2. This file is uploaded to OpenAI
3. A batch job is created to process all the images
4. The tool monitors the status of the batch job
5. Once the batch job is complete, the results are downloaded and processed
6. The captions are saved to your output folder

### Batch Job Status
The batch job can have the following statuses:
- **validating**: The input file is being validated
- **failed**: The input file has failed validation
- **in_progress**: The batch is currently being processed
- **finalizing**: The batch has completed and results are being prepared
- **completed**: The batch has been completed and results are ready
- **expired**: The batch was not completed within the 24-hour time window
- **cancelling**: The batch is being cancelled
- **cancelled**: The batch was cancelled

### Testing the Batch Feature
To test the batch processing feature:
1. Place images in the `images` folder
2. Run the application
3. Choose batch processing when prompted
4. Monitor the console output to see the progress. Do NOT close out the window.
5. The application will show you the batch job ID, which you can use to track the status

## How to Get an OpenAI API Key
To use GPT-4-Vision-Captioner, you'll need an API key from OpenAI:

1. Visit [OpenAI](https://openai.com/) and create an account or log in.
2. Navigate to the API section and generate an API key if one does not already exist.. Note: Access to the `gpt-4-vision-preview` model (and other `gpt-4` models) requires adding at least $5 in credits.
3. Increase your API usage limit if you plan on conducting large batch processing.
4. Copy the API key into the `.env` file as demonstrated in the setup section. Do not add quotes or spaces.

## Contribution
Contributions are very much welcome (no matter how small)! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)

## Acknowledgments
Developed by Josh Baldwin. Visit my [GitHub](https://github.com/JoshBaldwin101) for more interesting projects. I'm also looking for a job.

**Note**: This project is not affiliated with OpenAI. Usage of the OpenAI API, including costs and compliance, is the responsibility of the user as per OpenAI's terms of service.
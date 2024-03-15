# GPT-4-Vision-Captioner
GPT-4-Vision-Captioner is an innovative project leveraging the powerful capabilities of the new ChatGPT model, `gpt-4-vision-preview`. This tool is designed to analyze a batch of images and produce `.txt` or `.caption` files containing captions. These outputs are particularly structured to facilitate generative AI training, making this tool invaluable for developers in the AI field.

## Features
- Batch processing of images for efficient caption generation
- Output suitable for generative AI training data in `.txt` or `.caption` formats
- Custom prompt flexibility via a simple `prompt.txt` setup
- Easy to use with minimal setup requirements

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
3. Confirm the terms regarding cost and OpenAI's terms of service by typing y when prompted.

## How to Get an OpenAI API Key
To use GPT-4-Vision-Captioner, you'll need an API key from OpenAI:

1. Visit [OpenAI](https://openai.com/) and create an account or log in.
2. Navigate to the API section and subscribe to a plan. Note: Access to the `gpt-4-vision-preview` model requires adding $5 in credits.
3. Increase your API usage limit if you plan on conducting large batch processing.
4. Copy the API key into the `.env` file as demonstrated in the setup section.

## Contribution
Contributions are very much welcome (no matter how small)! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)

## Acknowledgments
Developed by Josh Baldwin. Visit my [GitHub](https://github.com/JoshBaldwin101) for more interesting projects. I'm also looking for a job.

**Note**: This project is not affiliated with OpenAI. Usage of the OpenAI API, including costs and compliance, is the responsibility of the user as per OpenAI's terms of service.
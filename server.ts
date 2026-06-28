import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure JSON parser with generous limits for robust processing
  app.use(express.json({ limit: "15mb" }));

  // Helper to lazily initialize the GoogleGenAI SDK client
  function getAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in your Secrets / environment settings.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // API Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasApiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Endpoint to generate text drafts and image prompts simultaneously
  app.post("/api/generate-content", async (req, res) => {
    try {
      const { idea, tone, textModel = "gemini-3.5-flash", additionalInstructions = "" } = req.body;
      if (!idea) {
        return res.status(400).json({ error: "Content idea or topic is required." });
      }

      const ai = getAI();

      const systemInstruction = `You are an elite Cross-Platform Social Media Strategist and Copywriter.
Your task is to take a content idea/topic and a desired tone, and simultaneously generate three distinct tailored drafts:
1. LinkedIn (long-form, structured, thought-leadership style with line breaks and appropriate professional emojis).
2. Twitter/X (punchy, highly engaging, under 280 characters, using hooks and optional 1-2 key hashtags).
3. Instagram (highly visual-oriented caption, creative headline hook, friendly spacing, and a dedicated block of hashtags at the bottom).

In addition, for each of these three platforms, you must generate a highly descriptive and tailored Image Generation Prompt that matches the specific post's tone and content.
Image Prompt Guidelines:
- Do NOT include text overlay, letters, UI elements, watermarks, or logos in the image prompt descriptions.
- Describe rich visual composition, subject matter, specific artistic style (e.g., photorealistic, minimalist 3D render, flat vector illustration, vaporwave aesthetic, corporate Memphis, etc.), color palette, mood, and dramatic studio lighting.
- Tailor the visual style to the platform's professional vs aesthetic expectations:
  - LinkedIn: clean, high-tech, professional, elegant.
  - Twitter/X: conceptual, high-contrast, graphic.
  - Instagram: beautiful, aesthetic, highly atmospheric, stunning composition.

You MUST respond with a valid JSON object matching the requested schema.`;

      let response;
      const contentConfig = {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            linkedin: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The drafted long-form post for LinkedIn, professional and spaced out." },
                imagePrompt: { type: Type.STRING, description: "Vivid visual description/prompt for LinkedIn image generation." }
              },
              required: ["text", "imagePrompt"]
            },
            twitter: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The punchy Twitter/X post, under 280 characters, with high-impact hook." },
                imagePrompt: { type: Type.STRING, description: "Conceptual graphic prompt for Twitter image generation." }
              },
              required: ["text", "imagePrompt"]
            },
            instagram: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "Creative Instagram caption, nicely styled with line breaks and hashtags at the bottom." },
                imagePrompt: { type: Type.STRING, description: "Aesthetic, visually gorgeous prompt for Instagram image generation." }
              },
              required: ["text", "imagePrompt"]
            }
          },
          required: ["linkedin", "twitter", "instagram"]
        }
      };

      const modelsToTry = [textModel];
      if (textModel !== "gemini-3.1-flash-lite") {
        modelsToTry.push("gemini-3.1-flash-lite");
      }
      if (textModel !== "gemini-3.5-flash") {
        modelsToTry.push("gemini-3.5-flash");
      }
      if (textModel !== "gemini-3.1-pro-preview") {
        modelsToTry.push("gemini-3.1-pro-preview");
      }

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      let lastError: any = null;
      for (const currentModel of modelsToTry) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`Generating content using model: ${currentModel} (Attempt ${attempt}/2)`);
            response = await ai.models.generateContent({
              model: currentModel,
              contents: `Input Idea: ${idea}\nDesired Tone: ${tone}\nAdditional context constraints: ${additionalInstructions}`,
              config: contentConfig
            });
            if (response && response.text) {
              break;
            }
          } catch (err: any) {
            console.warn(`Model ${currentModel} failed on attempt ${attempt}:`, err.message || err);
            lastError = err;
            if (attempt < 2) {
              console.log("Waiting 1000ms before retrying same model...");
              await sleep(1000);
            }
          }
        }
        if (response && response.text) {
          break;
        }
        console.log(`Model ${currentModel} exhausted. Trying next model in fallback list...`);
        await sleep(500);
      }

      if (!response || !response.text) {
        const status = lastError?.status || "UNAVAILABLE";
        const code = lastError?.code || 503;
        throw new Error(
          `All Gemini text models are currently experiencing high demand (Error ${code} - ${status}). ` +
          `Please wait 5-10 seconds and try again, or check your internet connection.`
        );
      }

      if (!response || !response.text) {
        throw new Error("Received an empty or invalid response from the Gemini content generator.");
      }

      const parsed = JSON.parse(response.text.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error("Error generating social media content:", error);
      res.status(500).json({ error: error.message || "Failed to generate content." });
    }
  });

  // Helper to extract keywords from image prompt for Unsplash fallback
  function extractKeywords(prompt: string): string {
    const stopwords = new Set([
      "a", "an", "the", "and", "or", "but", "about", "above", "after", "along", "amid", "among",
      "as", "at", "by", "for", "from", "in", "into", "like", "of", "off", "on", "onto", "out",
      "over", "to", "under", "with", "without", "photorealistic", "realistic", "high", "quality",
      "studio", "lighting", "minimalist", "render", "illustration", "art", "graphic", "style",
      "vector", "design", "flat", "composition", "scene", "showing", "representing", "symbolizing",
      "vivid", "description", "prompt", "conceptual"
    ]);
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w));
    
    // Return unique keywords up to 3
    const uniqueWords = Array.from(new Set(words)).slice(0, 3);
    return uniqueWords.length > 0 ? uniqueWords.join(",") : "creative,abstract";
  }

  // Endpoint to generate an image
  app.post("/api/generate-image", async (req, res) => {
    const { prompt, aspectRatio = "1:1", imageSize = "1K", model = "gemini-3.1-flash-image-preview" } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Image generation prompt is required." });
    }

    let width = 800;
    let height = 800;
    if (aspectRatio === "16:9") {
      width = 1200;
      height = 675;
    } else if (aspectRatio === "9:16") {
      width = 720;
      height = 1280;
    } else if (aspectRatio === "4:3") {
      width = 960;
      height = 720;
    } else if (aspectRatio === "3:2") {
      width = 900;
      height = 600;
    } else if (aspectRatio === "2:3") {
      width = 600;
      height = 900;
    }

    try {
      const ai = getAI();
      
      // Map models according to instructions
      let apiModel = "gemini-3.1-flash-image";
      if (model === "gemini-3-pro-image-preview" || model === "gemini-3-pro-image") {
        apiModel = "gemini-3-pro-image";
      }

      console.log(`Triggering image generation with model: ${apiModel}, aspect ratio: ${aspectRatio}, size: ${imageSize}`);

      let response;
      const imageModelsToTry = [apiModel];
      const fallbackImageModel = apiModel === "gemini-3.1-flash-image" ? "gemini-3-pro-image" : "gemini-3.1-flash-image";
      imageModelsToTry.push(fallbackImageModel);

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      let lastImageError: any = null;
      for (const currentModel of imageModelsToTry) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`Generating image using model: ${currentModel} (Attempt ${attempt}/2)`);
            response = await ai.models.generateContent({
              model: currentModel,
              contents: {
                parts: [
                  { text: prompt }
                ]
              },
              config: {
                imageConfig: {
                  aspectRatio,
                  imageSize
                }
              }
            });
            if (response && response.candidates?.[0]?.content?.parts) {
              break;
            }
          } catch (err: any) {
            console.warn(`Image model ${currentModel} failed on attempt ${attempt}:`, err.message || err);
            lastImageError = err;
            if (attempt < 2) {
              console.log("Waiting 1000ms before retrying image generation...");
              await sleep(1000);
            }
          }
        }
        if (response && response.candidates?.[0]?.content?.parts) {
          break;
        }
        console.log(`Image model ${currentModel} exhausted. Trying next image model...`);
        await sleep(500);
      }

      if (!response || !response.candidates?.[0]?.content?.parts) {
        const status = lastImageError?.status || "UNAVAILABLE";
        const code = lastImageError?.code || 503;
        throw new Error(
          `All image generation engines are currently overloaded or busy (Error ${code} - ${status}).`
        );
      }

      let base64Image = null;
      if (response && response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Image) {
        throw new Error("No image was returned from the model.");
      }

      res.json({ imageUrl: `data:image/png;base64,${base64Image}`, isFallback: false });
    } catch (error: any) {
      console.warn("Fallback triggered: Image generation error, resolving high-quality Unsplash alternative:", error.message || error);
      const keywords = extractKeywords(prompt);
      const fallbackUrl = `https://images.unsplash.com/featured/${width}x${height}/?${encodeURIComponent(keywords)}`;
      
      res.json({
        imageUrl: fallbackUrl,
        isFallback: true,
        fallbackReason: `We've applied a curated visual fallback (${keywords}) because the AI graphics generation queue is currently at maximum quota.`
      });
    }
  });

  // Set up Vite development server or production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled static assets from dist/.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend server successfully listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical error starting backend server:", err);
});

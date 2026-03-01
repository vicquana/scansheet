import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.post("/api/upload-sheet", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const base64EncodeString = req.file.buffer.toString("base64");
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: base64EncodeString,
              },
            },
            {
              text: "You are an expert Optical Music Recognition (OMR) system. Please analyze this image of handwritten sheet music and output the corresponding valid MusicXML string. Only output the raw MusicXML string without any markdown formatting, code blocks, or additional text. Ensure it is a complete, valid MusicXML document.",
            },
          ],
        },
        config: {
          temperature: 0.1,
        }
      });

      let xmlString = response.text || "";
      
      // Clean up markdown code blocks if the model still outputs them
      if (xmlString.startsWith("```xml")) {
        xmlString = xmlString.replace(/^```xml\n/, "").replace(/\n```$/, "");
      } else if (xmlString.startsWith("```")) {
        xmlString = xmlString.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      // Basic fallback if the model fails to generate valid XML
      if (!xmlString.includes("<?xml")) {
        xmlString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC
    "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
      }

      res.json({ musicXml: xmlString });
    } catch (error) {
      console.error("Error processing sheet music:", error);
      res.status(500).json({ error: "Failed to process sheet music" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

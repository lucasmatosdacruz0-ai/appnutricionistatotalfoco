import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as geminiServiceServer from "./services/geminiServiceServer";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Need to parse large JSON bodies if images are sent
  app.use(express.json({ limit: '50mb' }));

  // Generic RPC endpoint for simple function calls
  app.post("/api/rpc", async (req, res) => {
    try {
      const { method, args } = req.body;
      const fn = (geminiServiceServer as any)[method];
      if (typeof fn !== 'function') {
        return res.status(400).json({ error: `Method ${method} not found` });
      }
      
      const result = await fn(...args);
      res.json({ result });
    } catch (error: any) {
      console.error(`RPC Error [${req.body.method}]:`, error);
      let errMsg = error.message || 'Internal Server Error';
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        errMsg = "Chave de API inválida. Por favor, configure sua chave de API corretamente nas configurações da plataforma.";
      }
      res.status(500).json({ error: errMsg });
    }
  });

  // Dedicated stream endpoint for chat
  app.post("/api/rpc/stream", async (req, res) => {
    try {
      const { message, history } = req.body;
      const stream = geminiServiceServer.sendMessageToAI(message, history);
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Flush headers immediately
      res.flushHeaders();

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error('RPC Stream Error:', error);
      let errMsg = error.message || String(error);
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        errMsg = "Chave de API inválida. Por favor, configure sua chave de API corretamente nas configurações da plataforma.";
      }
      res.write(`data: ${JSON.stringify({ text: "Error: " + errMsg })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  });

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

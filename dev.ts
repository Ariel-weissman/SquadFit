import app from "./server";
import { createServer as createViteServer } from "vite";

async function startDevServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  
  app.use(vite.middlewares);
  console.log("Vite development server mounted.");

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SquadFit App (Dev) running happily at http://localhost:${PORT}`);
  });
}

startDevServer();

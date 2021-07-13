import express from 'express';
import cors from 'cors';

if (!globalThis.window) {
  let setupDom = await import('@memoria/server/dist/setup-dom.js');
  setupDom.default();
}

const app = express();

app.use(cors());

app.get("/films", (req, res) => {
  res.json({ film: "responsed correctly" });
});

app.get("/movies/too-big-to-fail", (req, res) => {
  res.json({ movie: "is too-big-to-fail" });
});

await app.listen(4000);

console.log('# Passthrough web server listening on port 4000');

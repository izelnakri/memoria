// Real HTTP server the passthrough tests hit to prove Pretender let the request through instead of
// intercepting it. Started by the test runner's `--before` hook, so it runs in Node even when the
// suite itself runs in a browser.
//
// NOTE: this deliberately does *not* set up a jsdom environment. It used to import
// `@memoria/server/dist/setup-dom.js`, which meant the test suite could not run without a prior
// `npm run build`. Nothing here needs browser globals -- it is just express.
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());

app.get("/films", (req, res) => {
  res.json({ film: "responsed correctly" });
});

app.get("/movies/too-big-to-fail", (req, res) => {
  res.json({ movie: "is too-big-to-fail" });
});

app.listen(4000);

console.log("# Passthrough web server listening on port 4000");

import FastBoot from "fastboot";
import kleur from "kleur";

export default function(distPath, opts = {}) {
  const OPTIONS =
    typeof distPath === "string"
      ? Object.assign(
          {
            distPath: distPath
          },
          opts
        )
      : distPath;
  const fastboot =
    OPTIONS.fastboot ||
    new FastBoot({
      distPath: OPTIONS.distPath,
      resilient: OPTIONS.resilient === false ? false : true
    });

  return function(req, response, next) {
    let result;
    fastboot
      .visit(req.path, { request: req, response: response })
      .then(
        (res) => {
          result = res;

          return OPTIONS.chunkedResponse ? result.chunks() : result.html();
        },
        (error) => console.log("error is", error)
      )
      .then((body) => {
        let headers = result.headers;
        let statusMessage = result.error ? "NOT OK " : "OK ";

        for (var pair of headers.entries()) {
          response.set(pair[0], pair[1]);
        }

        if (result.error) {
          console.log("RESILIENT MODE CAUGHT:", result.error.stack);
          console.log(result.error);

          next(result.error);
        }

        // TODO: on debug, show fastboot render times
        log(result.statusCode, statusMessage + req.path);
        response.status(result.statusCode);

        if (typeof body === "string") {
          response.send(body);
        } else if (result.error) {
          response.send(body[0]);
        } else {
          body.forEach((chunk) => response.write(chunk));
          response.end();
        }
      })
      .catch((error) => {
        console.log("error is", error);

        if (error.name === "UnrecognizedURLError") {
          next();
        } else {
          response.status(500);
          next(error);
        }
      });
  };
}

function log(statusCode, message) {
  // startTime is the third param
  let color = statusCode === 200 ? "green" : "red";
  let now = new Date();

  // if (startTime) {
  //   let diff = Date.now() - startTime;
  //   message = message + kleur.blue(" " + diff + "ms");
  // }

  console.log(kleur.blue(now.toISOString()) + " " + kleur[color](statusCode) + " " + message);
}

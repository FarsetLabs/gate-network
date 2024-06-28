const express = require("express");
const bodyParser = require("body-parser");

async function startRecipient(callback) {
  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.post("/", (req, res) => {
    callback(req.body);
    if (req.body.params.includes("errorResponse=true")) {
      res.status(500).send();
    } else {
      res.status(200).send();
    }
  });
  return app.listen(8080);
}

async function registerRecipient(recipient) {
  const response = await fetch("http://localhost/register", {
    method: "POST",
    body: new URLSearchParams({
      id: recipient.id,
      psk: recipient.psk,
    }),
  });

  if (!response.ok) throw response.statusText;
}

async function logError(recipient, error) {
  const response = await fetch("http://localhost/error", {
    method: "POST",
    body: new URLSearchParams({
      id: recipient.id,
      psk: recipient.psk,
      error,
    }),
  });

  if (!response.ok) throw response.statusText;
}

async function makeSenderCall(sender, recipient, overrides = {}) {
  const response = await fetch("http://localhost/action", {
    method: "POST",
    body: new URLSearchParams({
      id: sender.id,
      psk: sender.psk,
      affect: recipient.id,
      params: "duration=10",
      ...overrides,
    }),
  });
  if (!response.ok) throw response.statusText;
}

async function getNetworkStatus() {
  const response = await fetch("http://localhost/network");
  if (!response.ok) throw response.statusText;
  return await response.json();
}

module.exports = {
  startRecipient,
  registerRecipient,
  logError,
  makeSenderCall,
  getNetworkStatus,
};

const os = require("node:os");
const dns = require("node:dns");
const express = require("express");
const bodyParser = require("body-parser");
const network = require("./network");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * POST /register
 * Allows devices to register themselves as a known node on the network.
 * Devices which are recipient nodes *must* register. Devices which are sender
 * are not required to regsiter.
 *
 * The device must send its node ID and PSK.
 * - The node ID and PSK combo must match a known node in the network
 *   configuration
 */
app.post("/register", async (req, res) => {
  const { id, psk } = req.body;
  const node = network.getNode(id);

  // ID must match an expected node on the network
  if (!node) {
    return res.status(400).send(); // Bad Request
  }

  // Confirm this request is verified from the expected node
  if (!node.confirmPsk(psk)) {
    return res.status(403).send(); // Forbidden
  }

  node.register(req);
  res.status(200).send();
});

/**
 * POST /error
 * Allows devices to log errors.
 *
 * The device must send its node ID and PSK.
 * - The node ID and PSK combo must match a known node in the network
 *   configuration
 */
app.post("/error", async (req, res) => {
  const { id, psk, error } = req.body;
  const node = network.getNode(id);

  // ID must match an expected node on the network
  if (!node) {
    return res.status(400).send(); // Bad Request
  }

  // Confirm this request is verified from the expected node
  if (!node.confirmPsk(psk)) {
    return res.status(403).send(); // Forbidden
  }

  node.logError({ error });
  res.status(200).send();
});

/**
 * POST /action
 * Allows sender nodes to trigger an action on a recipient node.
 *
 * The device must send its node ID, PSK, the ID of the affected node, and any
 * action parameters.
 * - The node ID and PSK combo must match a known node in the network
 *   configuration
 * - The the affected node ID must match a known node in the network
 *   configuration, which has a recipient role and also registered
 * - The node sending must have permission to affects the affected node in the
 *   network configuration
 * - Any checks functions named in the network configuration must pass
 */
app.post("/action", async (req, res) => {
  const { id, psk, affect, params } = req.body;
  const sender = network.getNode(id);
  const affectedNode = network.getNode(affect);

  // A request must have a sender and an affect, but we can only affect a
  // recipient node
  if (
    !sender ||
    !affectedNode ||
    !affectedNode.isRecipient() ||
    !affectedNode.isRegistered()
  ) {
    return res.status(400).send(); // Bad Request
  }

  // Confirm this request is from the expected sender and that they're allowed
  // to affect that recipient
  if (!sender.confirmPsk(psk) || !sender.canAffectNode(affect)) {
    return res.status(403).send(); // Forbidden
  }

  // If the sender isn't registered, we can reigster them now with the
  // information provided from this action request
  if (!sender.isRegistered()) {
    sender.register(req);
  }

  // Run any checks that are configured for this sender
  if (sender.hasChecks()) {
    const passChecks = await sender.runChecks(req);
    if (!passChecks) return res.status(401).send(); // Unauthorized
  }

  // The sender has sent a valid request, let's log the event and generate
  // an event ID we can share with the recipient
  const eventId = sender.logEvent({ params });

  try {
    const response = await fetch(`http://${affectedNode.getIpAddress()}:8080`, {
      method: "POST",
      body: new URLSearchParams({
        psk: affectedNode.psk,
        params,
      }),
    });
    if (!response.ok) throw new Error("Cannot access affected node");
    res.status(200).send();

    // The request has gone through successfully, let's log the event
    affectedNode.logEvent({ id: eventId, params });
  } catch (e) {
    console.log("Error:", e.message);
    console.log(e);
    res.status(500).send();
    // The request has failed, let's log the error
    affectedNode.logError({ id: eventId, params, error: e.message });

    // TODO: How can we have devices communicate errors back here!
    // TODO: Should the affectedNode be unregistered if it can't be contacted?
    // affectedNode.unregister()
  }
});

app.get("/network", (req, res) => {
  res.json(network);
});

app.listen(80);

dns.lookup(os.hostname(), { family: 4 }, (err, ip) => {
  if (err) throw err;
  console.log(`System running, listening at http://${ip} ...`);
});

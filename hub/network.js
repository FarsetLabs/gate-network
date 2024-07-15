const crypto = require("node:crypto");
const config = require("./config/network.json");
const psks = require("./config/pre-shared-keys.json");
const checks = require("./checks");

class NetworkNode {
  constructor({ id, roles, affects = [], checks = [] }, psk) {
    if (!id) throw new Error("Id must be set");
    if (!psk) throw new Error("PSK must be set");
    if (!roles || roles.length === 0) throw new Error("Roles must be set");

    this.id = id;
    this.psk = psk;
    this.roles = roles;
    this.affects = affects;
    this.checks = checks;
    this.registration = null;
    this.events = [];
    this.errors = [];
  }

  logEvent(event) {
    const id = crypto.randomUUID();
    const eventLog = { id, ...event, eventAt: Date.now() };
    this.events = this.events.slice(-19).concat(eventLog);
    return eventLog.id;
  }

  logError(error) {
    const id = crypto.randomUUID();
    const errorLog = { id, ...error, errorAt: Date.now() };
    this.errors = this.errors.slice(-19).concat(errorLog);
    return errorLog.id;
  }

  isRecipient() {
    return this.roles.includes("recipient");
  }

  isSender() {
    return this.roles.includes("sender");
  }

  canAffectNode(id) {
    return id && this.affects.includes(id);
  }

  confirmPsk(psk) {
    return psk && this.psk && psk === this.psk;
  }

  register(req) {
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (ip.substr(0, 7) == "::ffff:") ip = ip.substr(7)
    if (ip === "::1" || ip === "localhost") ip = "127.0.0.1";
    this.registration = { ip, registeredAt: Date.now() };
  }

  unregister() {
    this.registration = null;
  }

  isRegistered() {
    return !!this.registration;
  }

  getIpAddress() {
    if (!this.isRegistered()) throw new Error("Node is not registered");
    return this.registration.ip;
  }

  hasChecks() {
    return this.checks.length > 0;
  }

  async runChecks(req) {
    for (const check of this.checks) {
      if (typeof checks[check] !== "function") return false;

      const success = await checks[check](req);
      if (!success) return false;
    }

    return true;
  }

  toJSON() {
    return {
      id: this.id,
      roles: this.roles,
      affects: this.affects,
      checks: this.checks,
      registration: this.registration,
      events: this.events,
      errors: this.errors,
    };
  }
}

class Network {
  constructor({ nodes }) {
    this.nodes = nodes.map((node) => new NetworkNode(node, psks[node.id]));
  }

  getNode(id) {
    return this.nodes.find((node) => node.id === id);
  }

  getRecipients() {
    return this.nodes.filter((node) => node.isRecipient());
  }

  getSenders() {
    return this.nodes.filter((node) => node.isSender());
  }

  toJSON() {
    return this.nodes.map((node) => node.toJSON());
  }
}

module.exports = new Network(config);

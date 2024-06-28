const spawn = require("node:child_process").spawn;
const test = require("node:test");
const assert = require("node:assert").strict;
const network = require("../network");
const {
  startRecipient,
  registerRecipient,
  logError,
  makeSenderCall,
  getNetworkStatus,
} = require("./helpers");

const sender = network.getSenders()[0];
const recipient = network.getNode(sender.affects[0]);
let recipientServer;
let recipientCalls = [];
let hub = null;

test.beforeEach(async () => {
  await new Promise((resolve, reject) => {
    hub = spawn("node", ["./index.js"]);
    hub.stdout.on("data", () => resolve());
    hub.stderr.on("data", () => reject());
  });
  recipientCalls = [];
  recipientServer = await startRecipient((body) => recipientCalls.push(body));
});

test.afterEach(() => {
  hub.kill("SIGHUP");
  return new Promise((resolve) => {
    recipientServer.close(resolve);
  });
});

test.describe("Before recipient is registered", () => {
  test("Cannot make the call to the recipient node even when all values are correct", async () => {
    let error;
    try {
      await makeSenderCall(sender, recipient);
    } catch (e) {
      error = e;
    }
    assert.strictEqual(error, "Bad Request");
    assert.deepStrictEqual(recipientCalls, []);
  });
});

test.describe("After recipient is registered", () => {
  test.beforeEach(async () => {
    await registerRecipient(recipient);
  });

  test("Cannot make the call with an incorrect sender node ID", async () => {
    let error;
    try {
      await makeSenderCall(sender, recipient, { id: "incorrect-sender-id" });
    } catch (e) {
      error = e;
    }
    assert.strictEqual(error, "Bad Request");
    assert.deepStrictEqual(recipientCalls, []);
  });

  test("Cannot make the call with an incorrect sender node pre-shared key", async () => {
    let error;
    try {
      await makeSenderCall(sender, recipient, { psk: "incorrect-sender-psk" });
    } catch (e) {
      error = e;
    }
    assert.strictEqual(error, "Forbidden");
    assert.deepStrictEqual(recipientCalls, []);
  });

  test("Cannot make the call with an incorrect recipient node ID", async () => {
    let error;
    try {
      await makeSenderCall(sender, recipient, {
        affect: "incorrect-recipient-id",
      });
    } catch (e) {
      error = e;
    }
    assert.strictEqual(error, "Bad Request");
    assert.deepStrictEqual(recipientCalls, []);
  });

  test("Makes the call to the recipient node when all values are correct", async () => {
    let error;
    try {
      await makeSenderCall(sender, recipient);
    } catch (e) {
      error = e;
    }
    assert.strictEqual(error, undefined);
    assert.deepStrictEqual(recipientCalls, [
      {
        params: "duration=10",
        psk: recipient.psk,
      },
    ]);
  });

  test("Logs an error when the recipient node returns an non-ok response", async () => {
    let error;
    try {
      await makeSenderCall(sender, recipient, { params: "errorResponse=true" });
    } catch (e) {
      error = e;
    }
    assert.strictEqual(error, "Internal Server Error");
    assert.deepStrictEqual(recipientCalls, [
      {
        params: "errorResponse=true",
        psk: recipient.psk,
      },
    ]);

    const status = await getNetworkStatus();
    const senderStatus = status.find(({ id }) => id === sender.id);
    const recipientStatus = status.find(({ id }) => id === recipient.id);
    assert.strictEqual(senderStatus.events.length, 1);
    assert.strictEqual(recipientStatus.errors.length, 1);
    assert.strictEqual(
      recipientStatus.errors[0].error,
      "Cannot access affected node",
    );
    assert.strictEqual(recipientStatus.errors[0].id, senderStatus.events[0].id);
  });

  test("Recipient node can log an error manually", async () => {
    let error;
    try {
      await logError(recipient, "Test Error");
    } catch (e) {
      error = e;
    }

    assert.strictEqual(error, undefined);
    const status = await getNetworkStatus();
    const recipientStatus = status.find(({ id }) => id === recipient.id);
    assert.strictEqual(recipientStatus.errors.length, 1);
    assert.strictEqual(recipientStatus.errors[0].error, "Test Error");
  });
});

# The Hub

This server acts as a central router and auth check for devices communicating
with eachother on the network.

All communication is performed over HTTP. The network is defined in JSON in
`./config/network.json` which contains the list of expected nodes and the
configuration for each node. For details on how a node is configured, see below.

## Setup

1. Clone this repository and go into the `hub/` directory
   ```sh
   git clone git@github.com:FarsetLabs/gate-network.git
   cd gate-network/hub
   ```
1. Create the pre-shared keys config
   ```sh
   cp ./config/pre-shared-keys.json.example ./config/pre-shared-keys.json
   ```
   If you're deploying this, you should get the values for these from 1Password
1. Make sure you have Node.js and npm available, then install dependencies. To
   run the server with the currently defined network using the commands below:
   ```sh
   npm install
   npm start
   ```

## Contributing

Pull requests on this code are very welcome. There is test and linting tooling
in place.

```sh
npm test        # Run tests
npm run format  # Format the code with prettier
```

## Configuring a new Node

To add a new node to the network, create a node configuration and add it to
`./config/network.json`. A node configuration will look something like the
following:

```json
{
  "id": "my-new-node",
  "roles": ["sender", "recipient"],
  "affects": ["other-node"],
  "checks": ["myCustomCheck"]
}
```

- `id` — this is a unique identifier for your node
- `roles` — this is the roles your node will have. Most nodes have one role;
  `"sender"` or `"recipient"`, though some nodes may have both.
  - `"sender"` — these nodes send requests to trigger actions
    - **Example:** A door open button would be a sender node on the network,
      sending requests each time it is pushed
  - `"recipient"` — these nodes receive requests to perform actions
    - **Example:** An automatic door latch would be a recipient node on the
      network, receiving requests to open
- `affects` — _only applicable to sender nodes_, this sets the list of recipient
  nodes that the sender node is allowed to affect.
  - **Example:** A door open button may have permission to open the workshop
    door, but not the front door
- `checks` — _only applicable to sender nodes_, this sets the list of checks
  which must pass before the action can be triggered. This can be omitted/empty
  if there are none.
  - **Example:** An action triggered by a card reader to open the door must
    first be verified that the person is a member

You will also need to add a new pre-shared key to
`./config/pre-shared-keys.json`. This is a mapping of node id (your `id` value
above) to the PSK value.

### Adding a Sender Node

A sender node sends requests to trigger actions.

**Example:** A door open button would be a sender node on the network, sending
requests each time it is pushed

- A sender node makes a POST request to the `/action` endpoint. This must
  provide the parameters:
  - `id` — the unique identifier for the sender node
  - `psk` — the pre-shared key for the sender node
  - `affect` — the unique identifier for the recipient node
  - `params` (optional) — any parameters to be forwarded to the recipient node

If everything goes well, you'll receive a `200` status code in response.

If something goes wrong, you'll receive an error status code in response:

- `400` if there's an issue with the sender or recipient setup
- `403` if the PSK is wrong or the sender is not permitted to affect the
  recipient
- `401` if any of the configured checks don't pass
- `500` if anything goes wrong with processing the request

### Adding a Recipient Node

A recipient node receives requests to perform actions.

**Example:** An automatic door latch would be a recipient node on the network,
receiving requests to open

- A recipient node must make a POST request to the `/register` endpoint. This
  must provide the paramet ers:
  - `id` — the unique identifier for the recipient node
  - `psk` — the pre-shared key for the recipient node

⚠️ A recipient node must register on the network before it can receive requests
from the Hub!

Recipient nodes need to listen on route `/`, port `8080` for POST requests from
the Hub. These will have two parameters:

- `psk` — the pre-shared key for the recipient node
- `params` — the raw parameters provided by the sender node

Parameter validation:

- ‼️ You must validate the `psk` parameter matches the expected pre-shared key
  value of the device. This is the only authentication method that the request
  was sent by the Hub.
- ‼️ You must validate/verify the contents of the `params`. The contents of this
  has not been checked and could contain invalid or malicious data.

  - **Example:** a "duration" parameter may be provided to indicate how long the
    door latch should unlock for. Make sure this value is numerical, and bounded
    so that it can't be too large or too small.

- Errors can be signalled to the Hub via an error response to the request. If
  this cannot be done (e.g. the error occurs after the response has been sent
  but while the action is still occurring), then the recipient node can make a
  POST request to the `/error` endpoint to log this. This must provide the
  parameters:
  - `id` — the unique identifier for the recipient node
  - `psk` — the pre-shared key for the recipient node
  - `error` — the error value to be logged

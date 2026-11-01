# vps-home

A home page for the services of a few servers. The page shows one card for each service. The server checks each service and shows whether it answers. It also reads a few numbers from the API of some services.

## Features

- The services come from a TOML file. The file is read again on each request, so an edit shows on the next reload, without a restart.
- The server checks each service, so the page shows a status for services on a private network too. A status is `up`, `failing` (with the HTTP status) or `down` (with the reason).
- The page asks for new checks every 30 seconds while its tab is visible. A hidden tab sends no request.
- Each card shows the last 30 checks of its service as a bar.
- A line at the top counts the services in each state. The title of the tab shows the problems, for example `1 down · vps-home`.
- A widget shows a few numbers of a service: the documents of Paperless-ngx, the photos and videos of Immich.
- A card shows the icon of its service, or the initials of its name.

## How it works

The page is a SvelteKit app with the Node adapter. The browser talks only to this server. The server talks to the services. Thus, the check addresses and the tokens of the widgets never leave the server.

A round is one check of every service, with the widgets read at the same time. The requests that come in the same 10 seconds share one round. Thus, 3 open tabs do not send 3 requests to each service.

A check sends a `GET` to the check address and does not follow redirects:

| Answer                                     | State     |
| ------------------------------------------ | --------- |
| A status below 400, a redirect included    | `up`      |
| A status of 400 or more                    | `failing` |
| No answer in 5 seconds, or a network error | `down`    |

The server keeps the last 30 checks of each service in memory. A restart clears this history. The server checks the services only while a page asks for checks, so the history has gaps when no tab is open.

## Configuration

### The services file

The server reads `services.toml` in the folder where it starts. Set `SERVICES_FILE` to read another file. `services.example.toml` describes each key and gives an example of each one.

Each `[[service]]` table is one card, in the order of the file:

| Key           | Necessary | Value                                                                                                     |
| ------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `name`        | yes       | The name on the card. Each name must be unique in the file.                                               |
| `url`         | yes       | The address that the card opens (http or https).                                                          |
| `group`       | no        | The section of the card. The default is `Services`. The groups keep the order of their first card.        |
| `description` | no        | A line under the name.                                                                                    |
| `host`        | no        | The machine of the service, shown as a tag.                                                               |
| `icon`        | no        | An image: a URL, or a path on this site. Without an icon, the card shows initials.                        |
| `check`       | no        | The address that the server checks. The default is `url`. Set `false` to stop the checks of this service. |

A `[service.widget]` table adds a widget to the card:

| Key         | Necessary | Value                                                         |
| ----------- | --------- | ------------------------------------------------------------- |
| `type`      | yes       | `paperless` or `immich`.                                      |
| `api`       | no        | The base URL of the API. The default is `url` of the service. |
| `token_env` | yes       | The name of the environment variable that holds the token.    |

The token never goes in the services file. Keep it in the environment of the server.

If the file has an error, the page shows a 500 error with the line or the service, and the key. For example: ``service 3 (Grafana): `url` must be an http or https URL, got "photos"``.

### Environment variables

| Variable                            | Use                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `SERVICES_FILE`                     | The path of the services file. The default is `services.toml`.                                |
| `PAPERLESS_TOKEN`, `IMMICH_API_KEY` | The tokens of the widgets. The names come from `token_env` in the services file.              |
| `HOST`, `PORT`                      | The address and the port of the server (Node adapter). The defaults are `0.0.0.0` and `3000`. |

`.env.example` lists these variables. `pnpm start` reads `.env` when the file exists.

The tokens of the widgets:

- Paperless-ngx: the API token of a user, from the profile page of this user.
- Immich: an API key of an admin user, with the `server.statistics` permission. The statistics of the server are for admins only.

## Development

1. Install the dependencies:

   ```bash
   pnpm install
   ```

2. Make a services file from the example, then change it:

   ```bash
   cp services.example.toml services.toml
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

Run the checks before each commit:

```bash
pnpm test
pnpm check
pnpm lint
pnpm format:check
```

The tests start local HTTP servers for the checks and for the APIs of the widgets. They need no network.

## Deploy

WARNING: The page has no login. Do not make the page public without authentication in front of it. If you do, anyone can see the services, their private addresses and their numbers.

1. Build the app:

   ```bash
   pnpm build
   ```

2. Copy `build/`, `package.json` and `pnpm-lock.yaml` to the server.

3. Install the runtime dependencies on the server:

   ```bash
   pnpm install --prod
   ```

4. Put the services file and the tokens on the server, then start the app:

   ```bash
   SERVICES_FILE=/etc/vps-home/services.toml PORT=3200 node build
   ```

The server must reach each check address and each API. For a service on a private network, start the app on a machine of this network.

Put a reverse proxy with authentication in front of the app. An example for Caddy, with a password hash from `caddy hash-password`:

```caddy
home.example.com {
	basic_auth {
		tom <hash>
	}
	reverse_proxy 127.0.0.1:3200
}
```

## API

`GET /api/checks` gives the current round as JSON. The page uses this endpoint for its refresh.

```json
{
  "checks": { "Grafana": { "state": "up", "status": 200, "ms": 12 } },
  "history": { "Grafana": [{ "at": 1761426065000, "state": "up", "ms": 12 }] },
  "widgets": { "Paperless": { "stats": [{ "value": "1,284", "label": "documents" }] } }
}
```

A service that is not checked has no entry in `checks` and `history`. A service without a widget has no entry in `widgets`. A widget that fails has `{ "error": "..." }` in place of `stats`.

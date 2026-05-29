# ConRes UI

React + TypeScript frontend for the ConRes distributed system demo.

It provides two views:

- Server Monitor at `/`
- Client Node at `/#/client`

## Run

Start the backend first from `backend/ConRes.Api`:

```bash
dotnet run
```

Then start this frontend:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The frontend expects the API and SignalR hub at:

```text
http://localhost:5044
```

See the root `README.md` for the full project overview, demo users, and design diagrams.

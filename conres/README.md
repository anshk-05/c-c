# ConRes - Concurrent Resource System

ConRes is a small distributed system demo for concurrency and communication coursework. It shows multiple client nodes connecting to one server node, competing for access to a shared file, and receiving live publish-subscribe updates.

## What It Demonstrates

- Independent client nodes running in browser windows.
- Server-side admission control with a maximum of 4 active users.
- FIFO waiting queue when the server is full.
- Reader-writer coordination for `ProductSpecification.txt`.
- SignalR publish-subscribe events for sessions, file locks, and file updates.
- A server monitor dashboard with a live pub-sub event log.

## Architecture

The system is split into a React client and an ASP.NET Core server.

- Client node: login, heartbeat, read lock, write lock, and shared-file updates.
- Server monitor: active users, waiting users, file lock state, shared file content, and pub-sub log.
- Server API: authentication, session coordination, lock coordination, shared file storage, and SignalR events.
- Data layer: SQLite user database and a protected text file.

### Component Diagram

![UML component diagram](docs/Figure1_Component_Diagram.png)

### Deployment Diagram

![UML deployment diagram](docs/Figure2_Deployment_Diagram.png)

## Main Design Decisions

- ASP.NET Core was used for the server because it gives clean controllers, background services, dependency injection, and SignalR support.
- React was used for the UI so the server monitor and client node can update live without page refreshes.
- SQLite stores the fixed demo users so login is persistent but simple.
- `SemaphoreSlim` limits the number of active sessions to 4.
- A FIFO queue stores extra valid users when the server is at capacity.
- The shared file uses reader-writer logic: multiple readers are allowed, but writing is exclusive.
- SignalR acts as the publish-subscribe broker. The server publishes changes and all connected clients subscribe to updates.
- Heartbeats allow the server to clean up stale client sessions.

## Project Structure

```text
backend/ConRes.Api/       ASP.NET Core API, SignalR hub, services, SQLite data layer
frontend/conres-ui/       React + TypeScript UI for server monitor and client node
docs/                     Design report and UML diagrams
ConRes.slnx               Solution file
```

## Requirements

- .NET 8 SDK
- Node.js and npm

## How To Run

Open two terminals from the project root.

Terminal 1 - backend:

```bash
cd backend/ConRes.Api
dotnet run
```

The backend runs on:

```text
http://localhost:5044
```

Terminal 2 - frontend:

```bash
cd frontend/conres-ui
npm install
npm run dev
```

The frontend usually runs on:

```text
http://localhost:5173
```

## Useful URLs

- Server Monitor: `http://localhost:5173/`
- Client Node: `http://localhost:5173/#/client`
- Swagger API docs: `http://localhost:5044/swagger`

## Demo Users

| User ID | Username | Password |
| --- | --- | --- |
| 1 | gojo | gojopass |
| 2 | sukuna | sukunapass |
| 3 | itadori | itadoripass |
| 4 | nobara | nobarapass |
| 5 | todo | todopass |
| 6 | toji | tojipass |

## Suggested Demo Flow

1. Start the backend and frontend.
2. Open the Server Monitor.
3. Open two or more Client Node windows.
4. Log in as different users and watch the Server Monitor update.
5. Log in more than 4 users to show the waiting queue.
6. Use one client to read the shared file.
7. Use another client to request a write lock and show it queued.
8. Release the read lock and show the writer being promoted.
9. Write new content and show the file version and pub-sub event log update.

## Key Code Files

- `backend/ConRes.Api/Services/SessionService.cs` - login, active sessions, waiting queue, heartbeat cleanup.
- `backend/ConRes.Api/Services/FileService.cs` - reader-writer lock coordination for the shared file.
- `backend/ConRes.Api/Services/SignalRRealtimeEventPublisher.cs` - publishes server events to subscribed clients.
- `frontend/conres-ui/src/hooks/useSystemStatus.ts` - subscribes to SignalR events and refreshes dashboard state.
- `frontend/conres-ui/src/pages/Dashboard.tsx` - server monitor.
- `frontend/conres-ui/src/pages/ClientNode.tsx` - client node UI.

## Notes

- The shared file is `backend/ConRes.Api/SharedFiles/ProductSpecification.txt`.
- The SQLite database is created automatically by migrations when the backend starts.
- If the frontend cannot connect, check that the backend is running on `http://localhost:5044`.

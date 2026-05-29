# 6CM04 Concurrency and Communication

This repository contains my coursework project for **6CM04 Concurrency and Communication**.

The main implementation is inside the [`conres`](./conres) folder. There is a more detailed README inside that folder with full setup instructions, demo users, design diagrams, and a suggested demonstration flow.

## Project Overview

The project attempts to build a small distributed system that demonstrates key concurrency and communication concepts from the module.

The system is called **ConRes**, short for **Concurrent Resource System**. It models multiple client nodes connecting to a central server node and competing for access to a shared resource.

## What Was Attempted

The implementation focuses on:

- Multiple independent client nodes
- Server-side control of concurrent users
- A waiting queue when the server reaches capacity
- Reader-writer coordination for a shared file
- Exclusive write access to prevent conflicting updates
- Publish-subscribe communication using SignalR
- A live server monitor showing active users, queued users, file state, and pub-sub events
- Basic fault tolerance through client heartbeats and stale session cleanup

## Main Folder

Please open:

[`conres`](./conres)

That folder contains:

- The ASP.NET Core backend
- The React frontend
- UML design diagrams
- The detailed project README
- Instructions for running and demonstrating the system

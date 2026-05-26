import * as signalR from '@microsoft/signalr';

const BASE_URL = 'http://localhost:5044';

export type RealtimeConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type RealtimeEventName =
  | 'ServerConnected'
  | 'SessionStateChanged'
  | 'FileAccessChanged'
  | 'FileUpdated'
  | 'SystemStatusChanged';

export interface RealtimeFileUpdated {
  fileName: string;
  fileVersion: number;
  userId: number;
  updatedAtUtc: string;
}

export function createRealtimeConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${BASE_URL}/hubs/distres`)
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}

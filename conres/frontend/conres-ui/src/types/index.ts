export interface QueuedRequest {
  userId: number;
  isWrite: boolean;
  position: number;
}

export interface SystemStatus {
  activeUserIds: number[];
  waitingUserIds: number[];
  maxConcurrentUsers: number;
  availableSlots: number;
  readingUserIds: number[];
  writingUserId: number | null;
  fileName: string;
  fileQueue: QueuedRequest[];
}

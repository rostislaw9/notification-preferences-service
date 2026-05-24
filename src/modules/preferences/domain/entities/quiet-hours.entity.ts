export interface QuietHoursEntity {
  id: string;
  userId: string | null;
  timezone: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  createdAt: Date;
  updatedAt: Date;
}

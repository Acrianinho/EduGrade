
export interface ActivityMeta {
  date: string;
  content: string;
}

export interface GradePeriod {
  activities: (number | null)[];
  exam: number | null;
  extra: number | null;
}

export interface Student {
  id: string;
  name: string;
  bimesters: {
    1: GradePeriod;
    2: GradePeriod;
    3: GradePeriod;
    4: GradePeriod;
  };
  rec1: number | null;
  rec2: number | null;
  finalExam: number | null;
}

export interface School {
  id: string;
  name: string;
}

export interface ClassRoom {
  id: string;
  schoolId: string;
  name: string;
  subject: string;
  year: string;
  activityCount: number;
  status: 'active' | 'archived';
  activityMetadata: {
    1: ActivityMeta[];
    2: ActivityMeta[];
    3: ActivityMeta[];
    4: ActivityMeta[];
  };
  students: Student[];
  lastModified?: number;
}

export type View = 'list' | 'detail' | 'create' | 'schoolList' | 'archive';
export type BimesterTab = 1 | 2 | 3 | 4 | 'annual';
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline';

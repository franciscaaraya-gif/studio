import type { Timestamp as FirebaseTimestamp } from "firebase/firestore";

// This is a workaround to make the Timestamp type compatible between client and admin SDKs.
// Both SDKs have a Timestamp object with seconds and nanoseconds properties.
// The client-side components will still receive a proper Timestamp object.
export interface GenericTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  status: 'open' | 'closed';
  createdAt: GenericTimestamp | FirebaseTimestamp;
  userId: string;
  voterGroupId?: string;
  voterIdHashes?: string[];
  pollType: 'single' | 'multiple';
  maxChoices?: number;
}

export interface Voter {
  id: string; // This will be the voter's unique ID
  pollId: string;
  isEligible: boolean;
  hasVoted: boolean;
  createdAt: GenericTimestamp | FirebaseTimestamp;
}

export interface Vote {
  id: string;
  pollId: string;
  selectedOptions: string[];
  createdAt: GenericTimestamp | FirebaseTimestamp;
}

export interface VoterGroup {
  id: string;
  name: string;
  userId: string;
  voterCount: number;
  voterIds: string[];
  voterIdHashes?: string[];
  createdAt: GenericTimestamp | FirebaseTimestamp;
}

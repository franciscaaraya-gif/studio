import { Timestamp } from "firebase/firestore";

export type PollStatus = 'draft' | 'active' | 'closed';
export type PollType = 'simple' | 'multiple';

export type PollOption = {
  id: string;
  text: string;
};

export type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  status: PollStatus;
  pollType: PollType;
  maxSelections?: number;
  groupId: string;
  createdAt: Timestamp;
  adminId: string;
};

export type VoterInfo = {
  id: string;
  nombre: string;
  apellido: string;
};

export type VoterGroup = {
  id: string;
  name: string;
  adminId: string;
  voters: VoterInfo[];
  createdAt: Timestamp;
};

export type Vote = {
    id: string;
    pollId: string;
    selectedOptions: string[];
}

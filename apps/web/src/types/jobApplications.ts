export type JobApplicationStatus = 'pending' | 'accepted' | 'rejected';

export type JobApplicationOut = {
  id: number;
  job_posting_id: number;
  subcontractor_id: number;
  contractor_id: number;
  note: string | null;
  status: JobApplicationStatus;
  created_at: string;
  updated_at: string;
};


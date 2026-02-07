import type { JobApplicationOut } from '../types/jobApplications';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const authHeaders = (token: string, extra?: Record<string, string>) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  ...(extra ?? {}),
});

export const applyToJobPosting = async (
  token: string,
  jobPostingId: number,
  note: string,
): Promise<JobApplicationOut> => {
  const res = await fetch(`${baseUrl}/job-postings/${jobPostingId}/apply`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.detail ?? 'Failed to apply');
  }
  return (await res.json()) as JobApplicationOut;
};

export const decideApplication = async (
  token: string,
  applicationId: number,
  decision: 'accepted' | 'rejected',
): Promise<JobApplicationOut> => {
  const res = await fetch(`${baseUrl}/job-applications/${applicationId}/decision`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ decision }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.detail ?? 'Failed to update application');
  }
  return (await res.json()) as JobApplicationOut;
};


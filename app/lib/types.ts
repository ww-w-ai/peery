/**
 * app/lib/types.ts — Shared type definitions
 */

/**
 * Shape of the message sent to SCAN_QUEUE
 */
export interface ScanJobMessage {
  job_id: string;
  git_url: string;
  tag: string;
  submitted_at: string;
  callback_url: string;
}

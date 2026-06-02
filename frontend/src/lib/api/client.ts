/**
 * client.ts — single import point for all API calls.
 * All calls go to the real FastAPI backend (no mock mode).
 */
export type { DonorListQuery, DonorListResult, CreateDonorInput } from "./httpApi";
export * from "./httpApi";

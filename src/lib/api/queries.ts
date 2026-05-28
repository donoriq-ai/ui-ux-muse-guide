import { queryOptions } from "@tanstack/react-query";
import * as api from "./mockApi";

export const qk = {
  currentUser: ["currentUser"] as const,
  tenant: ["tenant"] as const,
  donors: ["donors"] as const,
  donor: (id: string) => ["donor", id] as const,
  audit: (donorId?: string) => ["audit", donorId ?? "_all"] as const,
  users: ["users"] as const,
  settings: ["settings"] as const,
};

export const currentUserQuery = () =>
  queryOptions({ queryKey: qk.currentUser, queryFn: () => api.getCurrentUser() });

export const tenantQuery = () =>
  queryOptions({ queryKey: qk.tenant, queryFn: () => api.getTenant() });

export const donorsQuery = () =>
  queryOptions({ queryKey: qk.donors, queryFn: () => api.listDonors() });

export const donorQuery = (id: string) =>
  queryOptions({ queryKey: qk.donor(id), queryFn: () => api.getDonor(id) });

export const auditQuery = (donorId?: string) =>
  queryOptions({ queryKey: qk.audit(donorId), queryFn: () => api.getAuditTrail(donorId) });

export const usersQuery = () =>
  queryOptions({ queryKey: qk.users, queryFn: () => api.listUsers() });

export const settingsQuery = () =>
  queryOptions({ queryKey: qk.settings, queryFn: () => api.getSettings() });

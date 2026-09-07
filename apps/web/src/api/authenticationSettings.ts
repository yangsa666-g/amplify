import client from './client';

export interface AuthenticationSettings {
  localAuthEnabled: boolean;
}

export const getAdminAuthenticationSettings = () =>
  client.get<AuthenticationSettings>('/admin/settings/authentication');

export const updateAdminAuthenticationSettings = (localAuthEnabled: boolean) =>
  client.patch<AuthenticationSettings>('/admin/settings/authentication', { localAuthEnabled });

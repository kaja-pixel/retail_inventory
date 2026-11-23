import { issueAuthToken } from '../../utils/authTokens.js';

export const getSuperAdminToken = async (): Promise<string> => {
  return issueAuthToken('11111111-1111-1111-1111-111111111111', 'superadmin@skillforge.com');
};

export const getAdminToken = async (): Promise<string> => {
  return issueAuthToken('22222222-2222-2222-2222-222222222222', 'admin@skillforge.com');
};

export const getStaffToken = async (): Promise<string> => {
  return issueAuthToken('33333333-3333-3333-3333-333333333333', 'staff@skillforge.com');
};

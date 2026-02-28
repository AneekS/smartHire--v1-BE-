import * as authService from './auth.service';
import { signupSchema, loginSchema, refreshSchema } from './auth.schema';
import { success } from '../../shared/utils/response';

export async function signupHandler(request: any, reply: any) {
  const body = signupSchema.parse(request.body);
  const result = await authService.signup(body);
  return success(reply, result, 201);
}

export async function loginHandler(request: any, reply: any) {
  const body = loginSchema.parse(request.body);
  const result = await authService.login(body);
  return success(reply, result);
}

export async function refreshHandler(request: any, reply: any) {
  const body = refreshSchema.parse(request.body);
  const result = await authService.refreshTokens(body);
  return success(reply, result);
}

export async function logoutHandler(request: any, reply: any) {
  const body = refreshSchema.safeParse(request.body);
  if (body.success && body.data.refreshToken) {
    await authService.logout(body.data.refreshToken);
  }
  return success(reply, { message: 'Logged out' });
}

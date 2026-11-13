import { ApiAuthService, ROLE_PERMISSIONS } from './auth.api-adapter';
import { DemoAuthService } from '../demo/demo.auth';
import { DEMO_MODE } from '../demo/demo.config';
export * from './auth.api-adapter';
export const authService = DEMO_MODE ? new DemoAuthService(ROLE_PERMISSIONS) : new ApiAuthService();

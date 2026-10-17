import { ActiveNavScreen } from '../types/mining';
import { SCREEN_TO_PATH } from '../utils/navigationRouter';

export interface AppRoute {
  screen: ActiveNavScreen;
  path: string;
  public: boolean;
}

export const APP_ROUTES: AppRoute[] = Object.entries(SCREEN_TO_PATH).map(([screen, path]) => ({
  screen: screen as ActiveNavScreen,
  path,
  public: ['login', 'register', 'activate'].includes(screen)
}));

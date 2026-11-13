import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_PERMISSIONS, SCREEN_OWNER_MAP } from '../src/services/authService';
import { getScreenFromPathname, getPathForScreen } from '../src/utils/navigationRouter';
import { MERCHANDISING_MOCK_ENABLED } from '../src/features/merchandising-mock/mock.config';
test('mock lab has a distinct authenticated route with narrowly scoped roles',()=>{
 assert.equal(getScreenFromPathname('/merchandising/lab'),'merchandising-mock');
 assert.equal(getPathForScreen('merchandising-mock'),'/merchandising/lab');
 for(const role of ['Merchandiser','Store Admin'] as const) assert.ok(ROLE_PERMISSIONS[role].allowedScreens.includes('merchandising-mock'));
 for(const role of ['System Admin','End-Customer'] as const) assert.ok(!ROLE_PERMISSIONS[role].allowedScreens.includes('merchandising-mock'));
 assert.deepEqual(SCREEN_OWNER_MAP['merchandising-mock']?.allowedRoles,['Merchandiser','Store Admin']);
 assert.equal(MERCHANDISING_MOCK_ENABLED,false);
});

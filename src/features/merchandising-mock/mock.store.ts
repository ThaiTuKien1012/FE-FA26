import { initialMockState, restoreMockState } from './mock.engine';
import type { MockState } from './mock.types';
export const MOCK_STORAGE_KEY = 'paspm_merchandising_mock_v1';
export interface MockStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** One local mock database. Auth/session/backend storage is never touched. */
export function createMockStore(storage: () => MockStorage | undefined, options: {key?:string;seed?:()=>MockState} = {}) {
  const key=options.key ?? MOCK_STORAGE_KEY;
  const initial=options.seed ?? initialMockState;
  let state: MockState | undefined;
  let warning = '';
  let memoryOnly = false;
  const listeners = new Set<() => void>();
  const read = (): MockState => {
    if (memoryOnly) return state ?? initial();
    try {
      const target=storage();
      if(!target) throw new Error('Storage unavailable');
      const raw=target.getItem(key);
      if(!raw) {
        const seeded=state ?? initial();
        if(options.seed) target.setItem(key,JSON.stringify(seeded));
        return seeded;
      }
      return restoreMockState(JSON.parse(raw));
    } catch {
      warning='Không đọc được dữ liệu mô phỏng đã lưu. Phiên này sử dụng bộ nhớ tạm.';
      memoryOnly=true;
      return state ?? initial();
    }
  };
  const getSnapshot=()=>state ??= read();
  const emit=()=>listeners.forEach(listener=>listener());
  return {
    getSnapshot,
    getWarning:()=>warning,
    subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}},
    reload:()=>{state=read();emit()},
    update:(change:(current:MockState)=>MockState)=>{
      const current=state ? read() : getSnapshot();
      const next=change(current); // Validation errors never write or announce success.
      try {
        const target=memoryOnly?undefined:storage();
        if(!target)throw new Error('Storage unavailable');
        target.setItem(key,JSON.stringify(next));
      } catch {
        memoryOnly=true;
        warning='Chưa lưu được vào trình duyệt. Thay đổi chỉ tồn tại trong phiên này; không đóng trang.';
      }
      state=next;
      emit();
    },
  };
}

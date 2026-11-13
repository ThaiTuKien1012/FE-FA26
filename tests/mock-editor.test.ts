import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MockLayoutEditor } from '../src/features/merchandising-mock/MockLayoutEditor';
import type { MockState } from '../src/features/merchandising-mock/mock.types';
const state: MockState = { schemaVersion: 1, revision: 0, layouts: [], campaigns: [], activeByStore: {} };
const render = (value = state, readOnly = false) => renderToStaticMarkup(React.createElement(MockLayoutEditor, {state:value,storeId:'store-d1',onSave:()=>{throw Error('render must not save');},readOnly}));
test('draft editor starts empty and clearly labels preview as isolated', () => {
 const html = render();
 assert.match(html,/Chưa có vị trí/);
 assert.match(html,/Xem trước/);
 assert.match(html,/không thay đổi giỏ hàng/);
 assert.match(html,/Lưu bản nháp/);
});
test('version picker exposes only versions from the selected store without restoring automatically',()=>{
 const html = render({...state,layouts:[
  {id:'local',storeId:'store-d1',name:'Local revision',version:2,status:'DRAFT',placements:[]},
  {id:'foreign',storeId:'other',name:'Foreign revision',version:1,status:'DRAFT',placements:[]},
 ]});
 assert.match(html,/Local revision/);assert.doesNotMatch(html,/Foreign revision/);assert.match(html,/Chưa có vị trí/);
});
test('read-only editor disables editing and saving',()=>{
 const html=render(state,true);
 assert.match(html,/<fieldset disabled=""/);
 assert.match(html,/Chỉ xem/);
});

test('approved group palette is isolated to the store',()=>{
 const html=render();
 assert.match(html,/Weeknight greens/);
 assert.doesNotMatch(html,/Breakfast table/);
 assert.match(html,/Thêm vào bố cục/);
});

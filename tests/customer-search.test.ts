import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCustomerSearch } from '../src/features/customer/customerSearch';
test('Vietnamese product discovery accepts unaccented queries',()=>{
 assert.ok(normalizeCustomerSearch('Sữa tươi Đà Lạt').includes(normalizeCustomerSearch('sua tuoi')));
 assert.ok(normalizeCustomerSearch('ĐẬU').includes('dau'));
});

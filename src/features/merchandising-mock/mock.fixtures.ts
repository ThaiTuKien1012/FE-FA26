import { CUSTOMER_STORES } from '../customer/data/customerStores';
import { getCustomerProducts } from '../customer/data/customerCatalog';
import type { CustomerDisplayProduct } from '../customer/customer.types';
import type { ApprovedGroup } from './mock.types';
export const mockStores = CUSTOMER_STORES;
export function mockProducts(storeId:string):CustomerDisplayProduct[] { return getCustomerProducts(storeId).map(p=>({...p})); }
// Explicit preapproved synthetic evidence, independent of real mining runs.
const groups:ApprovedGroup[] = [
  {id:'store-d1-weeknight',storeId:'store-d1',title:'Weeknight greens',items:[{productId:'td-broccoli',quantity:1},{productId:'td-potato',quantity:1}],utility:18,approved:true},
  {id:'store-d1-salad',storeId:'store-d1',title:'Garden salad',items:[{productId:'td-cucumber',quantity:1},{productId:'td-red-onion',quantity:1},{productId:'td-bell-pepper',quantity:1}],utility:22,approved:true},
  {id:'store-q1-breakfast',storeId:'store-q1',title:'Breakfast table',items:[{productId:'bd-bread',quantity:1},{productId:'bd-milk',quantity:1},{productId:'bd-eggs',quantity:1}],utility:25,approved:true},
  {id:'store-q1-coffee',storeId:'store-q1',title:'Coffee break',items:[{productId:'bd-coffee',quantity:1},{productId:'bd-milk',quantity:1}],utility:16,approved:true},
  {id:'store-c1-fruit',storeId:'store-c1',title:'Fruit bowl',items:[{productId:'hc-apple',quantity:1},{productId:'hc-orange',quantity:1}],utility:19,approved:true},
  {id:'store-c1-berries',storeId:'store-c1',title:'Fresh fruit snack',items:[{productId:'hc-strawberry',quantity:1},{productId:'hc-kiwi',quantity:1}],utility:21,approved:true},
  {id:'store-n1-pantry',storeId:'store-n1',title:'Pantry essentials',items:[{productId:'nk-rice',quantity:1},{productId:'nk-cooking-oil',quantity:1}],utility:28,approved:true},
  {id:'store-n1-dinner',storeId:'store-n1',title:'Chicken dinner',items:[{productId:'nk-chicken',quantity:1},{productId:'nk-rice',quantity:1}],utility:24,approved:true},
];
export function approvedGroups(storeId:string):ApprovedGroup[] { return groups.filter(g=>g.storeId===storeId).map(g=>({...g,items:g.items.map(i=>({...i}))})); }

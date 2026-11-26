import type {StoreInput} from './storeManagement.api';

export type StoreFields = {name:string;slug:string;address:string;phone:string};
export function suggestStoreSlug(name:string):string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50).replace(/-+$/g,'');
}
export function storeFieldErrors(values:StoreFields,identity:boolean):Partial<Record<keyof StoreFields,string>> {
  const errors:Partial<Record<keyof StoreFields,string>>={};
  if(identity){
    if(!values.name.trim()||values.name.trim().length>150)errors.name='Enter a store name of up to 150 characters.';
    if(values.slug.trim().length>50||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.slug.trim()))errors.slug='Use up to 50 lowercase letters, numbers and single hyphens between words.';
  }
  if(values.address.trim().length>255)errors.address='Use up to 255 characters for the address.';
  if(values.phone.trim().length>30||!/^[0-9 +().-]*$/.test(values.phone.trim()))errors.phone='Use up to 30 characters: numbers, spaces, + ( ) . or -';
  return errors;
}
export function storeInput(values:StoreFields):Required<StoreInput>{
  return {name:values.name.trim(),slug:values.slug.trim(),address:values.address.trim()||null,phone:values.phone.trim()||null};
}
export const storeRoleLabel=(role:string)=>({SYSTEM_ADMIN:'System Admin',STORE_ADMIN:'Store Admin',MERCHANDISER:'Merchandiser',END_CUSTOMER:'Customer'}[role]||role.replace(/_/g,' ').toLowerCase());
export const storeAccountStatus=(status:string)=>({ACTIVE:'Active',INACTIVE:'Inactive',PENDING_VERIFICATION:'Pending verification'}[status]||status.replace(/_/g,' ').toLowerCase());

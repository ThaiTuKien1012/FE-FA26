export type ImportFormat = 'csv' | 'excel';
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export function importFormat(name:string):ImportFormat|null {
  return /\.csv$/i.test(name)?'csv':/\.xlsx?$/i.test(name)?'excel':null;
}
export function validateImportFile(file:File):string|null {
  if(!importFormat(file.name))return 'Choose a CSV (.csv) or Excel (.xlsx, .xls) file.';
  if(file.size===0)return 'This file is empty. Choose a file with a header and transaction rows.';
  if(file.size>MAX_IMPORT_FILE_BYTES)return 'This file is larger than 5 MiB (5,242,880 bytes). Choose a smaller file.';
  return null;
}
export const importFormatLabel = (name:string) => /\.xlsx$/i.test(name)?'Excel (.xlsx)':/\.xls$/i.test(name)?'Excel (.xls)':/\.csv$/i.test(name)?'CSV (.csv)':'Unsupported format';

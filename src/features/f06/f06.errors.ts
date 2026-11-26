import { F06ApiError } from './f06.http';
import { F05ApiError } from '../f05/f05.http';

/** Public recovery copy. Raw transport messages remain on the thrown error, never in the UI. */
export function recommendationError(error:unknown,operation:'read'|'review'|'generate'='read'):string {
  const message=error instanceof Error?error.message:'';
  if(/choose an analysis with completed results|only a COMPLETED mining run|mining run must be completed/i.test(message))return 'Choose an analysis with completed results.';
  if(/percentage decimal places|No rounding was applied/i.test(message))return 'Use at most four decimal places for this percentage. No rounding was applied.';
  if(/enter a percentage|between 0% and 100%/i.test(message))return 'Enter a percentage between 0 and 100.';
  if(/maxBundleSize must/i.test(message))return 'Bundle size must be a whole number from 2 to 256.';
  if(/minSupportCount must/i.test(message))return 'Minimum transaction count must be a positive whole number.';
  if(/minimumSellableQuantity must/i.test(message))return 'Stock threshold must be a positive whole number.';
  if(/reason.*(?:required|blank|1000)|(?:required|blank|1000).*reason/i.test(message))return 'Enter a reason using 1 to 1,000 characters.';
  if(/safety limit|request fewer types/i.test(message))return 'There are too many candidates to generate at once. Select fewer recommendation types and try again manually.';
  if(/rank scope|10,?000.*(?:rank|candidate)/i.test(message))return 'There are too many suggestions to load at once. Narrow the review status filter and refresh.';
  if(/preserve safely|precision|rounded|exact read-only|unsafe.*(?:number|integer|long)/i.test(message))return 'Some values could not be read accurately. No rounded values were used. Refresh or contact your administrator.';
  if(error instanceof F06ApiError||error instanceof F05ApiError){
    if(error.status===null)return operation==='generate'?'The submission could not be confirmed. Check saved recommendations before trying again; no automatic retry was made.':'Could not connect. Check your connection and refresh manually.';
    switch(error.status){
      case 400:return operation==='review'?'Check your reason before submitting again.':'Check your selection and try again.';
      case 401:return 'Your session has ended. Sign in again to continue.';
      case 403:return /inactive/i.test(message)?'Your store is inactive. Contact your system administrator.':'You do not have permission to perform this action.';
      case 404:return 'This record is unavailable for your store. Choose another analysis or recommendation.';
      case 409:return operation==='review'?'This recommendation has changed. Check the latest decision and availability before trying again.':operation==='generate'?'The saved analysis cannot be used right now. Refresh it or choose another completed analysis.':'The saved information has changed. Refresh and check it before trying again.';
      case 200:return 'The returned information could not be verified. Refresh or contact your administrator.';
      default:return operation==='generate'?'The submission could not be confirmed. Check saved recommendations before trying again; no automatic retry was made.':'Unable to load the information. Refresh manually or contact your administrator.';
    }
  }
  return 'Unable to complete this action. Check your selection and refresh manually.';
}

import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

/** Keep native keyboard and mobile selection, with one consistent disclosure icon. */
export function AccountSelect({className='',children,...props}:SelectHTMLAttributes<HTMLSelectElement>) {
  return <div className="relative mt-2">
    <select {...props} className={`${className.replace(/\bmt-2\b/g,'')} appearance-none pr-11 hover:border-[#B5C7B9] disabled:cursor-not-allowed`}>
      {children}
    </select>
    <ChevronDown aria-hidden="true" strokeWidth={1.7} className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87958B]"/>
  </div>;
}

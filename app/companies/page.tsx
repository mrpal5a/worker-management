import { redirect } from 'next/navigation';

/** Companies moved under /add as a sub-tab. Kept as a redirect for old bookmarks/links. */
export default function CompaniesRedirect() {
  redirect('/add/companies');
}

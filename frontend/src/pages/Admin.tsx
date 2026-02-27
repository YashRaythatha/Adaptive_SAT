import PageTitle from '../components/PageTitle'

export default function Admin() {
  return (
    <div>
      <PageTitle>Admin</PageTitle>
      <p className="mt-2 text-gray-600">Question review — use X-ADMIN-KEY header for admin endpoints.</p>
    </div>
  )
}

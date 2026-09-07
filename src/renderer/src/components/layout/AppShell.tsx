import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { NewMovementDialog } from '../movements/NewMovementDialog'
import { EditMovementDialog } from '../movements/EditMovementDialog'
import { DeleteMovementDialog } from '../movements/DeleteMovementDialog'
import { PayBillDialog } from '../movements/PayBillDialog'
import { useAppStore } from '../../store/useAppStore'
import { DashboardPage } from '../../pages/DashboardPage'
import { MovementsPage } from '../../pages/MovementsPage'
import { PendingPage } from '../../pages/PendingPage'
import { RecurrencesPage } from '../../pages/RecurrencesPage'
import { CategoriesPage } from '../../pages/CategoriesPage'
import { TrashPage } from '../../pages/TrashPage'
import { SettingsPage } from '../../pages/SettingsPage'
import { AboutPage } from '../../pages/AboutPage'

export function AppShell() {
  const view = useAppStore((state) => state.view)

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {view === 'dashboard' && <DashboardPage />}
          {view === 'movements' && <MovementsPage />}
          {view === 'pending' && <PendingPage />}
          {view === 'recurrences' && <RecurrencesPage />}
          {view === 'categories' && <CategoriesPage />}
          {view === 'trash' && <TrashPage />}
          {view === 'settings' && <SettingsPage />}
          {view === 'about' && <AboutPage />}
        </main>
      </div>
      <NewMovementDialog />
      <EditMovementDialog />
      <DeleteMovementDialog />
      <PayBillDialog />
    </div>
  )
}

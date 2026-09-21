import { expect, test } from '../support/fixtures';

const STATS_CARDS = [
  { testId: 'stats-card-users', title: 'Total Users', showsCount: true },
  { testId: 'stats-card-documents', title: 'Total Claims', showsCount: true },
  { testId: 'stats-card-chart', title: 'Claims by Status', showsCount: false },
];

test.describe('Admin dashboard (UI)', () => {
  test('shows the platform totals and the claims-by-status breakdown', async ({ adminPage }) => {
    await adminPage.goto('/admin/dashboard');

    await expect(adminPage.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    for (const { testId, title, showsCount } of STATS_CARDS) {
      const card = adminPage.getByTestId(testId);
      await expect(card).toContainText(title);
      if (showsCount) {
        await expect(card).toContainText(/\d+/);
      }
    }
  });
});

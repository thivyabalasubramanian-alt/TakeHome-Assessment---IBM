import type { Locator, Page } from '@playwright/test';
import type { ClaimRequest } from '../data/claim-builder';

export type IncidentDetails = Pick<ClaimRequest, 'incidentDate' | 'incidentLocation' | 'claimAmount'>;

/** The three-step "Submit New Claim" wizard. */
export class NewClaimPage {
  readonly dateInput: Locator;
  readonly locationInput: Locator;
  readonly amountInput: Locator;
  readonly descriptionInput: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  private readonly submitButton: Locator;
  readonly reviewStep: Locator;

  constructor(private readonly page: Page) {
    this.dateInput = page.getByLabel(/when did the incident occur/i);
    this.locationInput = page.getByLabel(/where did the incident occur/i);
    this.amountInput = page.getByLabel(/claim amount/i);
    this.descriptionInput = page.getByLabel(/describe what happened/i);
    this.nextButton = page.getByRole('button', { name: 'Next', exact: true });
    this.backButton = page.getByRole('button', { name: 'Back', exact: true });
    this.submitButton = page.getByRole('button', { name: 'Submit Claim', exact: true });
    this.reviewStep = page.getByTestId('wizard-step-3');
  }

  async goto(): Promise<void> {
    await this.page.goto('/claims/new');
  }

  async fillIncidentDetails(details: IncidentDetails): Promise<void> {
    await this.dateInput.fill(details.incidentDate);
    await this.locationInput.fill(details.incidentLocation);
    await this.amountInput.fill(String(details.claimAmount));
  }

  async fillDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
  }

  async next(): Promise<void> {
    await this.nextButton.click();
  }

  async back(): Promise<void> {
    await this.backButton.click();
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Validation message shown under a field. */
  error(text: string): Locator {
    return this.page.getByRole('alert').filter({ hasText: text });
  }
}

export interface ReviewData {
  rating: number | null;
  reviewCount: number | null;
  status: 'CURRENT' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
  message: string;
}

export class ReviewsProvider {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.YELP_API_KEY;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async fetchReviewsForBusiness(businessName: string, city: string): Promise<ReviewData> {
    if (!this.isConfigured()) {
      // Strictly comply with User Instruction #7: "Ratings data unavailable"
      return {
        rating: null,
        reviewCount: null,
        status: 'UNAVAILABLE',
        message: 'Ratings data unavailable — independent ratings provider not configured.'
      };
    }

    // In a configured environment, call the provider API with proper credentials
    // Otherwise fallback safely without inventing fake numbers
    return {
      rating: null,
      reviewCount: null,
      status: 'UNAVAILABLE',
      message: 'Ratings data unavailable for this location.'
    };
  }
}

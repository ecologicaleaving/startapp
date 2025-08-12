import { IVisApiService, IVisApiServiceFactory } from './interfaces/IVisApiService';

/**
 * Factory to provide VisApiService instance without circular dependency
 */
class VisApiServiceFactory implements IVisApiServiceFactory {
  private static instance: IVisApiService | null = null;

  async getInstance(): Promise<IVisApiService> {
    if (!VisApiServiceFactory.instance) {
      // Lazy load VisApiService to break circular dependency
      const { VisApiService } = await import('./visApi');
      VisApiServiceFactory.instance = VisApiService;
    }
    return VisApiServiceFactory.instance;
  }

  static reset(): void {
    VisApiServiceFactory.instance = null;
  }
}

export const visApiServiceFactory = new VisApiServiceFactory();
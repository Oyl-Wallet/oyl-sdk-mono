import { DefaultProvider } from './providers/default';
import { IProvider } from './interfaces';

export { IProvider, DefaultProvider };

// For backward compatibility
export class Provider extends DefaultProvider {
  constructor(url: string) {
    super(url);
  }
}

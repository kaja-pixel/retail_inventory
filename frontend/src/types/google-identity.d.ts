interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleButtonOptions {
  theme: 'outline' | 'filled_blue' | 'filled_black';
  size: 'large' | 'medium' | 'small';
  text: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape: 'rectangular' | 'pill' | 'circle' | 'square';
  width: number;
}

interface GoogleIdentityServices {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(element: HTMLElement, options: GoogleButtonOptions): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentityServices;
      };
    };
  }
}

export {};

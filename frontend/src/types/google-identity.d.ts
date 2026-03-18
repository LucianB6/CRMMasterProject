interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleButtonConfig {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdentityConfig) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
}

interface GoogleAccounts {
  id: GoogleAccountsId;
}

interface GoogleGlobal {
  accounts: GoogleAccounts;
}

interface Window {
  google?: GoogleGlobal;
}

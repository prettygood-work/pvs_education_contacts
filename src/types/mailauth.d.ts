declare module 'mailauth' {
  export interface AuthenticateOptions {
    sender: string;
    validateMx?: boolean;
    validateSMTP?: boolean;
  }

  export interface AuthenticateResult {
    mx?: boolean;
    smtp?: {
      code: number;
      message: string;
    } | false;
  }

  export function authenticate(
    email: string,
    options: AuthenticateOptions
  ): Promise<AuthenticateResult>;
}
export class CVMeshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CVMeshError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PopupBlockedError extends CVMeshError {
  constructor(message = 'Popup window was blocked by the browser. Please allow popups for this site.') {
    super(message);
    this.name = 'PopupBlockedError';
  }
}

export class UserCancelledError extends CVMeshError {
  constructor(message = 'Resume sharing was cancelled by the user.') {
    super(message);
    this.name = 'UserCancelledError';
  }
}

export class TimeoutError extends CVMeshError {
  constructor(message = 'Resume sharing request timed out.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class TokenRedemptionError extends CVMeshError {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(`Failed to redeem resume token (HTTP ${status}): ${message}`);
    this.name = 'TokenRedemptionError';
    this.status = status;
    this.details = details;
  }
}

// Token revocation denylist. Short TTLs limit exposure, but a leaked or
// logged-out token sometimes needs to die *now*. We deny by `jti` until the
// token's own expiry (after which it's dead anyway, so the entry is dropped).
//
// In production back this with Redis/DB so revocation is shared across all API
// instances; the interface is identical.

export interface Revocations {
  revoke(jti: string, expSec: number): void;
  isRevoked(jti: string): boolean;
}

export class MemoryRevocations implements Revocations {
  private map = new Map<string, number>(); // jti -> token expiry (unix seconds)

  revoke(jti: string, expSec: number): void {
    this.map.set(jti, expSec);
  }

  isRevoked(jti: string): boolean {
    const exp = this.map.get(jti);
    if (exp === undefined) return false;
    if (exp < Math.floor(Date.now() / 1000)) {
      this.map.delete(jti); // already expired - no need to keep denying
      return false;
    }
    return true;
  }
}

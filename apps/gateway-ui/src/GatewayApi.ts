import { GatewayInfo, Federation } from '@fedimint/types';

export const SESSION_STORAGE_KEY = 'gateway-ui-key';

// GatewayApi is an implementation of the ApiInterface
export class GatewayApi {
  private baseUrl: string | undefined = process.env.REACT_APP_FM_GATEWAY_API;

  // Tests a provided password or the one in session storage
  testPassword = async (password?: string): Promise<boolean> => {
    const tempPassword = password || this.getPassword();

    if (!tempPassword) {
      return false;
    }

    // Replace with temp password to check.
    sessionStorage.setItem(SESSION_STORAGE_KEY, tempPassword);

    try {
      await this.fetchInfo();
      return true;
    } catch (err) {
      // TODO: make sure error is auth error, not unrelated
      console.error(err);
      this.clearPassword();
      return false;
    }
  };

  private getPassword = (): string | null => {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  };

  clearPassword = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  private post = async (api: string, body: unknown): Promise<Response> => {
    if (this.baseUrl === undefined) {
      throw new Error(
        'Misconfigured Gateway API. Make sure FM_GATEWAY_API is configured appropriately'
      );
    }

    const password = this.getPassword();
    if (!password) {
      throw new Error(
        'Misconfigured Gateway API. Make sure gateway password is configured appropriately'
      );
    }

    return fetch(`${this.baseUrl}/${api}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify(body),
    });
  };

  private get = async (api: string): Promise<Response> => {
    if (this.baseUrl === undefined) {
      throw new Error(
        'Misconfigured Gateway API. Make sure FM_GATEWAY_API is configured appropriately'
      );
    }

    const password = this.getPassword();
    if (!password) {
      throw new Error(
        'Misconfigured Gateway API. Make sure gateway password is configured appropriately'
      );
    }

    return fetch(`${this.baseUrl}/${api}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
    });
  };

  fetchInfo = async (): Promise<GatewayInfo> => {
    try {
      const res: Response = await this.get('info');

      if (res.ok) {
        const info: GatewayInfo = await res.json();
        return Promise.resolve(info);
      }

      throw responseToError(res);
    } catch (error) {
      return Promise.reject({ message: 'Error fetching gateway info', error });
    }
  };

  fetchAddress = async (federationId: string): Promise<string> => {
    try {
      const res: Response = await this.post('address', {
        federation_id: federationId,
      });

      if (res.ok) {
        const address: string = await res.json();
        return Promise.resolve(address);
      }

      throw responseToError(res);
    } catch (error) {
      return Promise.reject({
        message: 'Error fetching deposit address',
        error,
      });
    }
  };

  connectFederation = async (inviteCode: string): Promise<Federation> => {
    try {
      const res: Response = await this.post('connect-fed', {
        invite_code: inviteCode,
        use_tor: true,
      });

      if (res.ok) {
        const federation: Federation = await res.json();
        return Promise.resolve(federation);
      }

      throw responseToError(res);
    } catch (error) {
      return Promise.reject({ message: 'Error connecting federation', error });
    }
  };

  leaveFederation = async (federationId: string): Promise<void> => {
    try {
      const res: Response = await this.post('leave-fed', {
        federation_id: federationId,
      });

      if (!res.ok) {
        throw responseToError(res);
      }
    } catch (error) {
      return Promise.reject({ message: 'Error leaving federation', error });
    }
  };

  requestWithdrawal = async (
    federationId: string,
    msatAmountOrAll: number | string, // you can pass msat amount or 'all'
    address: string
  ): Promise<string> => {
    try {
      const res: Response = await this.post('withdraw', {
        federation_id: federationId,
        amount: msatAmountOrAll,
        address,
      });

      if (res.ok) {
        const txid: string = await res.json();
        return Promise.resolve(txid);
      }

      throw responseToError(res);
    } catch (error) {
      return Promise.reject({ message: 'Error requesting withdrawal', error });
    }
  };
}

const responseToError = (res: Response): Error => {
  return new Error(`Status : ${res.status} \nReason : ${res.statusText}\n`);
};

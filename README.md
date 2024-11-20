# Hydra Client

A lightweight TypeScript client for handling OAuth2 token management with Hydra authentication server.

## Features

- Automatic token caching
- Token refresh management for different targets/audiences
- Error handling with optional logging

## Usage
``` typescript
import { HydraClient, HydraConfig } from '@livechat/hydra-tools';


const config: HydraConfig = {
    url: 'YOUR_HYDRA_URL',
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
    timeout: 5000 // optional, defaults to 5000ms
    };

const client = new HydraClient(config);

const authHeader = await client.getAuthHeaderForTarget('your-target');
```

`authHeader` is a string in that looks as `Bearer TOKEN`.

If acquiring the hydra token fails and the client does not have a valid token cached, the client will throw an error. Internally the library uses `axios` and will propagate the `AxiosError` to the caller. You can check that it is indeed an axios error calling `axios.isAxiosError`.

## Configuration

The `HydraConfig` interface accepts the following parameters:


``` typescript 
interface HydraConfig {
url: string; // Hydra server URL
clientId: string; // OAuth2 client ID
clientSecret: string; // OAuth2 client secret
timeout?: number; // Request timeout in milliseconds (default: 5000)
}
```


### Optional Logging

The client accepts an optional logger that must implement an error method, and it will log errors that occur during token acquisition. 

## Token Management

The client automatically handles:
- Token caching per target
- Automatic refresh after half of the token's lifetime to avoid probems with Hydra's server downtime
- Fallback to cached tokens during failed refresh attempts

## Internal Use Only

This package is intended for internal use within the organization. Please ensure proper handling of credentials and configuration values.

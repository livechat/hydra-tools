# Hydra Client

A lightweight TypeScript client for handling OAuth2 token management with Hydra authentication server.

## Features

- Automatic token caching
- Token refresh management
- Configurable timeout settings
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


## Optional Logging

The client accepts an optional logger that implements the `HydraLogger` interface:

``` typescript
interface HydraLogger {
error: (obj: unknown, msg?: string, ...args: unknown[]) => void;
}
```
Usage with logger:

```typescript
const logger: HydraLogger = {
error: console.error
};
const client = new HydraClient(config, logger);
```

## Token Management

The client automatically handles:
- Token caching per target
- Automatic refresh after half of the token's lifetime
- Fallback to cached tokens during failed refresh attempts

## Internal Use Only

This package is intended for internal use within the organization. Please ensure proper handling of credentials and configuration values.
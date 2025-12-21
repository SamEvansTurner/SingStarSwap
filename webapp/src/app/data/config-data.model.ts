export interface ServerConfig {
    port: number;
}

export interface PS3Config {
    address: string;
    ps2path: string;
    titlefilter: string;
    ps3path: string;
}

export interface Config {
    server: ServerConfig;
    PS3: PS3Config;
}

export interface SaveConfigResponse {
    success: boolean;
    requiresRestart: boolean;
    newPort: number;
}

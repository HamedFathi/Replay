export interface ScriptConfig {
    file: string,
    line?: number,
    col?: number,
    speed?: number,
    delay?: number,
    clean?: boolean,
    next?: string,
    save?: boolean,
    info?: boolean,
}

export interface Script {
    content: string,
    options: ScriptConfig
}
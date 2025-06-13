export interface ScriptConfig {
    file: string,
    line?: number,
    col?: number,
    speed?: number,
    delay?: number,
    bspeed?: number,
    bdelay?: number,
    clean?: boolean,
    next?: string,
    save?: boolean,
}

export interface Script {
    content: string,
    options: ScriptConfig
}
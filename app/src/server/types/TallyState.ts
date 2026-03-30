
export enum LightAlertType {
    INFO,
    NORMAL,
    PRIO
}

export enum LightAlertTarget {
    OPERATOR,
    TALENT
}


export interface LightAlertState {
    number: number;
    type: LightAlertType;
    target: LightAlertTarget;
}

export interface TallyState {
    program: Array<number>;
    preview: Array<number>;
    alert: Array<LightAlertState>;
}
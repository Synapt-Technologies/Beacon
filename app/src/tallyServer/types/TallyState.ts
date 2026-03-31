
export enum LightAlertType { // TODO Check if these are desired types
    IDENT,
    INFO,
    NORMAL,
    PRIO,
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
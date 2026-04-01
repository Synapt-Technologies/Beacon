

export interface TallyState {
    program: Array<number>;
    preview: Array<number>;
}

export interface GlobalTallySource {
    device: string;
    source: number; // TODO check if this should be a number
}
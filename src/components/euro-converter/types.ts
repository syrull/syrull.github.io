// src/components/euro-converter/types.ts

export type WorkflowState =
    | 'START'
    | 'TERMS'
    | 'CAPTCHA_1'
    | 'CAPTCHA_2'
    | 'MAP_BULGARIA'
    | 'MAP_GERMANY'
    | 'QUEUE_WAIT'
    | 'AMOUNT_INPUT'
    | 'CONFIRM_1'
    | 'CONFIRM_2'
    | 'CONFIRM_3'
    | 'LOADING'
    | 'FAKE_ERROR'
    | 'RESULT'
    | 'DONE';

export interface ConverterState {
    step: WorkflowState;
    eurAmount: number | null;
    bgnAmount: number | null;
    queueNumber: number;
    servingNumber: number;
    loadingAttempts: number;
    conversionCount: number;
}

export const INITIAL_STATE: ConverterState = {
    step: 'START',
    eurAmount: null,
    bgnAmount: null,
    queueNumber: 847,
    servingNumber: 3,
    loadingAttempts: 0,
    conversionCount: 0,
};

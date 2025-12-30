import React, { useState } from 'react';
import type { ConverterState, WorkflowState } from './types';
import { INITIAL_STATE } from './types';
import {
    Start,
    TermsAndConditions,
    Captcha,
    MapSelector,
    QueueWait,
    AmountInput,
    ConfirmDialogs,
    FakeLoading,
    FakeError,
    ResultDisplay,
    Done,
} from './steps';
import './styles/chaos.css';

// EUR to BGN fixed rate (Bulgaria uses fixed rate of 1.95583)
const EUR_TO_BGN_RATE = 1.95583;

/**
 * EuroConverter - The Worst Currency Converter Ever Made
 *
 * A state machine-driven component that guides users through
 * a frustratingly terrible UX to convert EUR to BGN.
 */
export default function EuroConverter() {
    const [state, setState] = useState<ConverterState>(INITIAL_STATE);

    // Navigate to a specific step
    const goToStep = (step: WorkflowState) => {
        setState((prev) => ({ ...prev, step }));
    };

    // Set the EUR amount and calculate BGN
    const setAmount = (eurAmount: number) => {
        const bgnAmount = Math.round(eurAmount * EUR_TO_BGN_RATE * 100) / 100;
        setState((prev) => ({
            ...prev,
            eurAmount,
            bgnAmount,
        }));
    };

    // Increment loading attempts counter
    const incrementLoadingAttempts = () => {
        setState((prev) => ({
            ...prev,
            loadingAttempts: prev.loadingAttempts + 1,
        }));
    };

    // Reset converter to initial state (preserving conversion count)
    const resetConverter = () => {
        setState((prev) => ({
            ...INITIAL_STATE,
            conversionCount: prev.conversionCount + 1,
        }));
    };

    // Render the current step
    const renderStep = () => {
        switch (state.step) {
            case 'START':
                return <Start onNext={() => goToStep('TERMS')} />;

            case 'TERMS':
                return <TermsAndConditions onNext={() => goToStep('CAPTCHA_1')} />;

            case 'CAPTCHA_1':
                return <Captcha variant={1} onNext={() => goToStep('CAPTCHA_2')} />;

            case 'CAPTCHA_2':
                return <Captcha variant={2} onNext={() => goToStep('MAP_BULGARIA')} />;

            case 'MAP_BULGARIA':
                return <MapSelector country="bulgaria" onNext={() => goToStep('MAP_GERMANY')} />;

            case 'MAP_GERMANY':
                return <MapSelector country="germany" onNext={() => goToStep('QUEUE_WAIT')} />;

            case 'QUEUE_WAIT':
                return (
                    <QueueWait
                        queueNumber={state.queueNumber}
                        servingNumber={state.servingNumber}
                        onNext={() => goToStep('AMOUNT_INPUT')}
                    />
                );

            case 'AMOUNT_INPUT':
                return (
                    <AmountInput
                        onSetAmount={setAmount}
                        onNext={() => goToStep('CONFIRM_1')}
                    />
                );

            case 'CONFIRM_1':
                return (
                    <ConfirmDialogs
                        level={1}
                        onConfirm={() => goToStep('CONFIRM_2')}
                        onCancel={resetConverter}
                    />
                );

            case 'CONFIRM_2':
                return (
                    <ConfirmDialogs
                        level={2}
                        onConfirm={() => goToStep('CONFIRM_3')}
                        onCancel={resetConverter}
                    />
                );

            case 'CONFIRM_3':
                return (
                    <ConfirmDialogs
                        level={3}
                        onConfirm={() => goToStep('LOADING')}
                        onCancel={resetConverter}
                    />
                );

            case 'LOADING':
                return (
                    <FakeLoading
                        loadingAttempts={state.loadingAttempts}
                        onNext={() => goToStep('RESULT')}
                        onError={() => {
                            incrementLoadingAttempts();
                            goToStep('FAKE_ERROR');
                        }}
                    />
                );

            case 'FAKE_ERROR':
                return <FakeError onNext={() => goToStep('RESULT')} />;

            case 'RESULT':
                return (
                    <ResultDisplay
                        eurAmount={state.eurAmount}
                        bgnAmount={state.bgnAmount}
                        onNext={() => goToStep('DONE')}
                    />
                );

            case 'DONE':
                return (
                    <Done
                        conversionCount={state.conversionCount}
                        onReset={resetConverter}
                    />
                );

            default:
                return <div>Unknown step: {state.step}</div>;
        }
    };

    return (
        <div className="euro-converter">
            {renderStep()}
        </div>
    );
}

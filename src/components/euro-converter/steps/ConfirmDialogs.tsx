import React from 'react';

interface ConfirmDialogsProps {
    confirmNumber: 1 | 2 | 3;
    eurAmount: number | null;
    onNext: () => void;
}

export default function ConfirmDialogs({ confirmNumber, eurAmount, onNext }: ConfirmDialogsProps) {
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">CONFIRM {confirmNumber}</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Confirm Dialog {confirmNumber}
            </p>
            <p style={{ textAlign: 'center' }}>
                Amount: {eurAmount} EUR
            </p>
            <div style={{ textAlign: 'center' }}>
                <button className="chaos-button" onClick={onNext}>
                    Next
                </button>
            </div>
        </div>
    );
}

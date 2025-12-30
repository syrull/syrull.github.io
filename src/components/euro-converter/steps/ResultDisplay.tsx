import React from 'react';

interface ResultDisplayProps {
    eurAmount: number | null;
    bgnAmount: number | null;
    onNext: () => void;
}

export default function ResultDisplay({ eurAmount, bgnAmount, onNext }: ResultDisplayProps) {
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">RESULT</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Result Display step
            </p>
            <p style={{ textAlign: 'center' }}>
                {eurAmount} EUR = {bgnAmount} BGN
            </p>
            <div style={{ textAlign: 'center' }}>
                <button className="chaos-button" onClick={onNext}>
                    Next
                </button>
            </div>
        </div>
    );
}

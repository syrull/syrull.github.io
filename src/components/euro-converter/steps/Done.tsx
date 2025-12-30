import React from 'react';

interface DoneProps {
    conversionCount: number;
    onReset: () => void;
}

export default function Done({ conversionCount, onReset }: DoneProps) {
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">DONE!</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Done step
            </p>
            <p style={{ textAlign: 'center' }}>
                Total conversions: {conversionCount}
            </p>
            <div style={{ textAlign: 'center' }}>
                <button className="chaos-button" onClick={onReset}>
                    Start Over
                </button>
            </div>
        </div>
    );
}

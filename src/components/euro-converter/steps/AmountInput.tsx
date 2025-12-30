import React from 'react';

interface AmountInputProps {
    onSetAmount: (amount: number) => void;
    onNext: () => void;
}

export default function AmountInput({ onSetAmount, onNext }: AmountInputProps) {
    const handleSubmit = () => {
        onSetAmount(100); // Stub: set a default amount
        onNext();
    };

    return (
        <div className="chaos-box">
            <h2 className="chaos-title">AMOUNT INPUT</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Amount Input step
            </p>
            <div style={{ textAlign: 'center' }}>
                <button className="chaos-button" onClick={handleSubmit}>
                    Next
                </button>
            </div>
        </div>
    );
}

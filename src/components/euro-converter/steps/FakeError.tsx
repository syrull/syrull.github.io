import React from 'react';

interface FakeErrorProps {
    onNext: () => void;
}

export default function FakeError({ onNext }: FakeErrorProps) {
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">ERROR!</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Fake Error step
            </p>
            <div style={{ textAlign: 'center' }}>
                <button className="chaos-button" onClick={onNext}>
                    Continue
                </button>
            </div>
        </div>
    );
}

import React from 'react';

interface FakeLoadingProps {
    loadingAttempts: number;
    onNext: () => void;
    onError: () => void;
}

export default function FakeLoading({ loadingAttempts, onNext, onError }: FakeLoadingProps) {
    // Stub: just provide a next button
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">LOADING...</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Fake Loading step (attempt {loadingAttempts + 1})
            </p>
            <div style={{ textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="chaos-button" onClick={onNext}>
                    Success
                </button>
                <button className="chaos-button" onClick={onError}>
                    Error
                </button>
            </div>
        </div>
    );
}

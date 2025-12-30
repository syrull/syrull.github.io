import React from 'react';

interface TermsAndConditionsProps {
    onNext: () => void;
}

export default function TermsAndConditions({ onNext }: TermsAndConditionsProps) {
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">TERMS & CONDITIONS</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Terms and Conditions step
            </p>
            <div style={{ textAlign: 'center' }}>
                <button className="chaos-button" onClick={onNext}>
                    Next
                </button>
            </div>
        </div>
    );
}

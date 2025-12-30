import React from 'react';

interface StartProps {
    onNext: () => void;
}

export default function Start({ onNext }: StartProps) {
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">START</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                Welcome to the WORST Currency Converter Ever!
            </p>
            <div style={{ textAlign: 'center' }}>
                <button className="chaos-button" onClick={onNext}>
                    Begin Suffering
                </button>
            </div>
        </div>
    );
}

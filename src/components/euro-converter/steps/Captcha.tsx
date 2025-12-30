import React from 'react';

interface CaptchaProps {
    variant: 1 | 2;
    onNext: () => void;
}

export default function Captcha({ variant, onNext }: CaptchaProps) {
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">CAPTCHA {variant}</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Captcha step {variant}
            </p>
            <div style={{ textAlign: 'center' }}>
                <button className="chaos-button" onClick={onNext}>
                    Next
                </button>
            </div>
        </div>
    );
}

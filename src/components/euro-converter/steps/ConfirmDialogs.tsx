import React from 'react';

interface ConfirmDialogsProps {
    level: 1 | 2 | 3;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialogs({ level, onConfirm, onCancel }: ConfirmDialogsProps) {
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">CONFIRM {level}</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Confirm Dialog {level}
            </p>
            <div style={{ textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="chaos-button" onClick={onCancel}>
                    Cancel
                </button>
                <button className="chaos-button" onClick={onConfirm}>
                    Confirm
                </button>
            </div>
        </div>
    );
}

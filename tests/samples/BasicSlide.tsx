import React from 'react';

const BasicSlide = () => {
    return (
        <div style={{
            width: '1280px',
            height: '720px',
            padding: '40px',
            backgroundColor: '#ffffff',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h1 style={{ color: '#2563eb', fontSize: '48px', marginBottom: '20px' }}>
                Welcome to TSX2Slides
            </h1>
            <p style={{ fontSize: '24px', color: '#4b5563', lineHeight: '1.5' }}>
                A simple tool to convert your React components into professional presentations.
            </p>
            <ul style={{ marginTop: '30px', fontSize: '24px', color: '#1f2937' }}>
                <li style={{ marginBottom: '10px' }}>Offline rendering</li>
                <li style={{ marginBottom: '10px' }}>Text-based output (searchable)</li>
                <li style={{ marginBottom: '10px' }}>Supports PDF and PPTX</li>
            </ul>
        </div>
    );
};

export default BasicSlide;

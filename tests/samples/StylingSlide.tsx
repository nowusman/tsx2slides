import React from 'react';

const StylingSlide = () => {
    return (
        <div style={{
            width: '1280px',
            height: '720px',
            padding: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontFamily: 'Georgia'
        }}>
            <h1 style={{ fontSize: '56px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                Styling & Effects
            </h1>

            <div style={{ display: 'flex', gap: '30px', marginTop: '50px' }}>
                <div style={{
                    padding: '30px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '4px solid white',
                    borderRadius: '20px',
                    width: '300px'
                }}>
                    <h3>Glassmorphism</h3>
                    <p>Testing borders, border-radius, and semi-transparent backgrounds.</p>
                </div>

                <div style={{
                    padding: '30px',
                    backgroundColor: 'white',
                    color: 'black',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    borderLeft: '10px solid #f59e0b',
                    width: '300px'
                }}>
                    <h3>Solid Box</h3>
                    <p>Testing box shadows and thick borders.</p>
                </div>
            </div>

            <div style={{ marginTop: '50px' }}>
                <p style={{ fontFamily: 'Courier New', fontSize: '20px' }}>
                    This line uses a Monospace font.
                </p>
                <p style={{ fontFamily: 'Times New Roman', fontSize: '24px', fontStyle: 'italic' }}>
                    This line is italic Serif.
                </p>
            </div>
        </div>
    );
};

export default StylingSlide;

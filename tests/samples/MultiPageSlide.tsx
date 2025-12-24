import React from 'react';

const MultiPageSlide = () => {
    return (
        <div style={{
            width: '1280px',
            backgroundColor: '#ffffff',
            fontFamily: 'Helvetica'
        }}>
            <div style={{ height: '720px', padding: '40px', borderBottom: '2px dashed #ccc' }}>
                <h1>Page 1</h1>
                <p style={{ fontSize: '32px' }}>This is the first page of the multi-page document.</p>
                <div style={{ marginTop: '100px', height: '400px', backgroundColor: '#f3f4f6' }}>
                    Big content block on page 1
                </div>
            </div>

            <div style={{ height: '720px', padding: '40px', borderBottom: '2px dashed #ccc' }}>
                <h1>Page 2</h1>
                <p style={{ fontSize: '32px' }}>This content should automatically flow to the second slide.</p>
                <div style={{ marginTop: '100px', height: '400px', backgroundColor: '#d1fae5' }}>
                    Big content block on page 2
                </div>
            </div>

            <div style={{ height: '720px', padding: '40px' }}>
                <h1>Page 3</h1>
                <p style={{ fontSize: '32px' }}>And finally a third page.</p>
                <div style={{ marginTop: '100px', height: '400px', backgroundColor: '#fee2e2' }}>
                    Big content block on page 3
                </div>
            </div>
        </div>
    );
};

export default MultiPageSlide;

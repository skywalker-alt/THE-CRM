import React from 'react';
import { X, UserPlus, FileSpreadsheet, Search } from 'lucide-react';

export function NewLeadSelectorModal({ onClose, onSelectManual, onSelectImport, onSelectScrape }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-panel" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Lead</h2>
                    <button className="btn-icon" onClick={onClose}><X size={24} /></button>
                </div>
                <div className="modal-body">
                    <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                        How would you like to add leads to the CRM?
                    </p>
                    <div style={{ display: 'grid', gap: '15px' }}>
                        <button 
                            className="selector-option-btn list-card" 
                            style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', border: '1px solid var(--border-color)', outline: 'none' }}
                            onClick={() => {
                                onClose();
                                onSelectManual();
                            }}
                        >
                            <div style={{ background: 'var(--primary-color)', padding: '10px', borderRadius: '50%', color: 'white' }}>
                                <UserPlus size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>Manual Entry</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fill out a form to add a single lead directly.</p>
                            </div>
                        </button>
                        
                        <button 
                            className="selector-option-btn list-card" 
                            style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', border: '1px solid var(--border-color)', outline: 'none' }}
                            onClick={() => {
                                onClose();
                                if (onSelectImport) onSelectImport();
                            }}
                        >
                            <div style={{ background: 'var(--success-color)', padding: '10px', borderRadius: '50%', color: 'white' }}>
                                <FileSpreadsheet size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>Import from Google Sheets</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Bulk import and automatically clean your lead data.</p>
                            </div>
                        </button>

                        <button 
                            className="selector-option-btn list-card" 
                            style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', border: '1px solid var(--border-color)', outline: 'none' }}
                            onClick={() => {
                                onClose();
                                if (onSelectScrape) onSelectScrape();
                            }}
                        >
                            <div style={{ background: 'var(--accent-color)', padding: '10px', borderRadius: '50%', color: 'white' }}>
                                <Search size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>Scrape Leads</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Search and automatically extract businesses into the CRM.</p>
                            </div>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

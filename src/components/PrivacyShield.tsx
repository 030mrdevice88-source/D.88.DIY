import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, Key, RefreshCw, FileText, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface GPGKey {
  id: string;
  name: string;
  email: string;
  publicKey: string;
  privateKey: string;
  createdAt: string;
}

export const PrivacyShield: React.FC = () => {
  const [keys, setKeys] = useState<GPGKey[]>([]);
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt' | 'keys'>('encrypt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [encryptData, setEncryptData] = useState('');
  const [selectedPublicKey, setSelectedPublicKey] = useState('');
  const [encryptedResult, setEncryptedResult] = useState('');

  const [decryptData, setDecryptData] = useState('');
  const [selectedPrivateKey, setSelectedPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [decryptedResult, setDecryptedResult] = useState('');

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const savedKeys = localStorage.getItem('privacy_shield_keys');
    if (savedKeys) {
      try {
        setKeys(JSON.parse(savedKeys));
      } catch (e) {
        console.error('Failed to parse privacy_shield_keys', e);
      }
    }
  }, []);

  const saveKeys = (newKeys: GPGKey[]) => {
    setKeys(newKeys);
    localStorage.setItem('privacy_shield_keys', JSON.stringify(newKeys));
  };

  const generateKey = async () => {
    if (!newName || !newEmail) {
      setError('Name und Email sind erforderlich.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/privacy/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, passphrase: newPassphrase }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const newKey: GPGKey = {
        id: Math.random().toString(36).substring(7),
        name: newName,
        email: newEmail,
        publicKey: data.publicKey,
        privateKey: data.privateKey,
        createdAt: new Date().toISOString(),
      };

      saveKeys([...keys, newKey]);
      setSuccess('GPG Schlüsselpaar erfolgreich generiert.');
      setNewName('');
      setNewEmail('');
      setNewPassphrase('');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const encrypt = async () => {
    if (!encryptData || !selectedPublicKey) {
      setError('Daten und öffentlicher Schlüssel sind erforderlich.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/privacy/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: encryptData, publicKey: selectedPublicKey }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setEncryptedResult(data.encrypted);
      setSuccess('Daten erfolgreich verschlüsselt.');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const decrypt = async () => {
    if (!decryptData || !selectedPrivateKey) {
      setError('Verschlüsselte Daten und privater Schlüssel sind erforderlich.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/privacy/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptedData: decryptData, privateKey: selectedPrivateKey, passphrase }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setDecryptedResult(data.decrypted);
      setSuccess('Daten erfolgreich entschlüsselt.');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const deleteKey = (id: string) => {
    saveKeys(keys.filter(k => k.id !== id));
    setShowDeleteConfirm(null);
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-tactical-accent/20 rounded-lg shrink-0">
            <Shield className="text-tactical-accent w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Privacy-Shield</h2>
            <p className="text-[10px] text-tactical-muted uppercase tracking-widest font-bold">GPG / Age Encryption Suite</p>
          </div>
        </div>
      </div>

      <div className="flex bg-tactical-card border border-tactical-border rounded-xl p-1 self-start overflow-x-auto max-w-full">
        <button 
          onClick={() => setActiveTab('encrypt')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === 'encrypt' ? "bg-tactical-accent text-tactical-bg" : "text-tactical-muted hover:text-tactical-text"
          )}
        >
          <Lock size={14} /> Verschlüsseln
        </button>
        <button 
          onClick={() => setActiveTab('decrypt')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === 'decrypt' ? "bg-tactical-accent text-tactical-bg" : "text-tactical-muted hover:text-tactical-text"
          )}
        >
          <Unlock size={14} /> Entschlüsseln
        </button>
        <button 
          onClick={() => setActiveTab('keys')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === 'keys' ? "bg-tactical-accent text-tactical-bg" : "text-tactical-muted hover:text-tactical-text"
          )}
        >
          <Key size={14} /> Schlüsselbund
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'encrypt' && (
              <motion.div 
                key="encrypt"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-6"
              >
                <div className="space-y-4">
                  <label className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">Zu verschlüsselnde Daten</label>
                  <textarea 
                    value={encryptData}
                    onChange={(e) => setEncryptData(e.target.value)}
                    placeholder="Geben Sie hier den Text ein, den Sie verschlüsseln möchten..."
                    className="w-full bg-tactical-bg border border-tactical-border rounded-2xl p-4 text-sm focus:outline-none focus:border-tactical-accent min-h-[150px] resize-none font-mono"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">Öffentlicher Schlüssel (Empfänger)</label>
                  <select 
                    value={selectedPublicKey}
                    onChange={(e) => setSelectedPublicKey(e.target.value)}
                    className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs focus:border-tactical-accent outline-none appearance-none"
                  >
                    <option value="">Schlüssel auswählen...</option>
                    {keys.map(k => (
                      <option key={k.id} value={k.publicKey}>{k.name} ({k.email})</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={encrypt}
                  disabled={loading || !encryptData || !selectedPublicKey}
                  className="w-full py-4 bg-tactical-accent text-tactical-bg font-bold rounded-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="animate-spin" size={20} /> : <Lock size={20} />}
                  JETZT VERSCHLÜSSELN
                </button>

                {encryptedResult && (
                  <div className="space-y-4 pt-4 border-t border-tactical-border">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-tactical-accent uppercase font-bold tracking-widest">Verschlüsseltes Ergebnis (PGP Message)</label>
                      <button 
                        onClick={() => navigator.clipboard.writeText(encryptedResult)}
                        className="text-[10px] text-tactical-muted hover:text-tactical-accent font-bold uppercase tracking-widest"
                      >
                        Kopieren
                      </button>
                    </div>
                    <pre className="w-full bg-tactical-bg border border-tactical-border rounded-2xl p-4 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
                      {encryptedResult}
                    </pre>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'decrypt' && (
              <motion.div 
                key="decrypt"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-6"
              >
                <div className="space-y-4">
                  <label className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">Verschlüsselte PGP Nachricht</label>
                  <textarea 
                    value={decryptData}
                    onChange={(e) => setDecryptData(e.target.value)}
                    placeholder="Fügen Sie hier die verschlüsselte Nachricht ein..."
                    className="w-full bg-tactical-bg border border-tactical-border rounded-2xl p-4 text-sm focus:outline-none focus:border-tactical-accent min-h-[150px] resize-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <label className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">Privater Schlüssel</label>
                    <select 
                      value={selectedPrivateKey}
                      onChange={(e) => setSelectedPrivateKey(e.target.value)}
                      className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs focus:border-tactical-accent outline-none appearance-none"
                    >
                      <option value="">Schlüssel auswählen...</option>
                      {keys.map(k => (
                        <option key={k.id} value={k.privateKey}>{k.name} ({k.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">Passphrase (optional)</label>
                    <input 
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Passwort für den Schlüssel..."
                      className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs focus:border-tactical-accent outline-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={decrypt}
                  disabled={loading || !decryptData || !selectedPrivateKey}
                  className="w-full py-4 bg-tactical-accent text-tactical-bg font-bold rounded-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="animate-spin" size={20} /> : <Unlock size={20} />}
                  JETZT ENTSCHLÜSSELN
                </button>

                {decryptedResult && (
                  <div className="space-y-4 pt-4 border-t border-tactical-border">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-tactical-accent uppercase font-bold tracking-widest">Entschlüsselte Daten</label>
                      <button 
                        onClick={() => navigator.clipboard.writeText(decryptedResult)}
                        className="text-[10px] text-tactical-muted hover:text-tactical-accent font-bold uppercase tracking-widest"
                      >
                        Kopieren
                      </button>
                    </div>
                    <div className="w-full bg-tactical-bg border border-tactical-border rounded-2xl p-4 text-sm font-mono whitespace-pre-wrap">
                      {decryptedResult}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'keys' && (
              <motion.div 
                key="keys"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <RefreshCw className="text-tactical-accent" size={20} /> Neuen Schlüssel generieren
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">Name</label>
                      <input 
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Max Mustermann"
                        className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs focus:border-tactical-accent outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">Email</label>
                      <input 
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="max@example.com"
                        className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs focus:border-tactical-accent outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">Passphrase (Sicherheit)</label>
                    <input 
                      type="password"
                      value={newPassphrase}
                      onChange={(e) => setNewPassphrase(e.target.value)}
                      placeholder="Starkes Passwort für den privaten Schlüssel..."
                      className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs focus:border-tactical-accent outline-none"
                    />
                  </div>
                  <button 
                    onClick={generateKey}
                    disabled={loading || !newName || !newEmail}
                    className="w-full py-4 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent font-bold rounded-2xl hover:bg-tactical-accent hover:text-tactical-bg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <Key size={20} />}
                    SCHLÜSSELPAAR GENERIEREN
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileText className="text-tactical-accent" size={20} /> Vorhandene Schlüssel ({keys.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {keys.length === 0 ? (
                      <div className="p-8 bg-tactical-card/50 border border-dashed border-tactical-border rounded-3xl text-center">
                        <p className="text-tactical-muted italic">Keine Schlüssel im lokalen Speicher gefunden.</p>
                      </div>
                    ) : (
                      keys.map(k => (
                        <div key={k.id} className="bg-tactical-card border border-tactical-border rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-tactical-accent/10 rounded-2xl flex items-center justify-center border border-tactical-accent/30">
                              <Key className="text-tactical-accent" size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{k.name}</p>
                              <p className="text-[10px] text-tactical-muted">{k.email}</p>
                              <p className="text-[8px] text-tactical-muted uppercase mt-1">ID: {k.id} | Erstellt: {new Date(k.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full md:w-auto">
                            <button 
                              onClick={() => {
                                const blob = new Blob([k.publicKey], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${k.name}_public.asc`;
                                a.click();
                              }}
                              className="flex-1 md:flex-none p-2 bg-tactical-bg border border-tactical-border rounded-lg hover:border-tactical-accent transition-colors"
                              title="Öffentlichen Schlüssel exportieren"
                            >
                              <Download size={16} />
                            </button>
                            <button 
                              onClick={() => setShowDeleteConfirm(k.id)}
                              className="flex-1 md:flex-none p-2 bg-tactical-bg border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                              title="Schlüssel löschen"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-tactical-accent/5 border border-tactical-accent/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-tactical-accent" size={24} />
              <h4 className="text-sm font-bold uppercase tracking-widest">Sicherheitshinweis</h4>
            </div>
            <p className="text-xs text-tactical-muted leading-relaxed">
              Ihre GPG-Schlüssel werden aktuell im <strong>LocalStorage</strong> Ihres Browsers gespeichert. 
              Dies ist für Demonstrationszwecke geeignet, aber für maximale Sicherheit sollten Sie 
              einen Hardware-Token (YubiKey) oder einen dedizierten Passwort-Manager verwenden.
            </p>
            <div className="pt-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-tactical-accent">
                <div className="w-1.5 h-1.5 rounded-full bg-tactical-accent animate-pulse" />
                END-TO-END ENCRYPTION ACTIVE
              </div>
            </div>
          </div>

          <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest">Privacy Features</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-tactical-bg rounded-xl border border-tactical-border">
                <Shield size={16} className="text-tactical-accent" />
                <span className="text-[10px] font-bold">RSA 4096-bit Keys</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-tactical-bg rounded-xl border border-tactical-border">
                <Lock size={16} className="text-tactical-accent" />
                <span className="text-[10px] font-bold">AES-256 Symmetric</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-tactical-bg rounded-xl border border-tactical-border">
                <Unlock size={16} className="text-tactical-accent" />
                <span className="text-[10px] font-bold">Zero-Knowledge Decrypt</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-tactical-card border border-tactical-border rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-4 text-red-500">
                <div className="p-3 bg-red-500/10 rounded-2xl">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold">Schlüssel löschen?</h3>
              </div>
              <p className="text-tactical-muted text-sm leading-relaxed">
                Sind Sie sicher, dass Sie diesen GPG-Schlüssel unwiderruflich aus Ihrem lokalen Speicher löschen möchten? 
                Verschlüsselte Daten, die diesen Schlüssel benötigen, können danach nicht mehr entschlüsselt werden.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 bg-tactical-bg border border-tactical-border rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-tactical-border transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={() => deleteKey(showDeleteConfirm)}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-colors"
                >
                  Löschen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 p-4 bg-red-500 text-white rounded-2xl shadow-2xl flex items-center gap-3 z-50"
          >
            <AlertTriangle size={20} />
            <span className="text-xs font-bold">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:opacity-70">×</button>
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 p-4 bg-emerald-500 text-white rounded-2xl shadow-2xl flex items-center gap-3 z-50"
          >
            <Shield size={20} />
            <span className="text-xs font-bold">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-2 hover:opacity-70">×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

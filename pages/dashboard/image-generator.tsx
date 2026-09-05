"use client"

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import Head from 'next/head';
import DashboardLayout from '~/components/dashboard/DashboardLayout';

// Interface untuk data gambar hasil generate
interface GeneratedAsset {
    dataUrl: string;
    fileName: string;
    labelText: string;
}

export default function ImageGeneratorPage() {
    // State Management
    const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
    const [apiKey, setApiKey] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingText, setLoadingText] = useState<string>('');
    const [showTerms, setShowTerms] = useState<boolean>(false);

    // Form States
    const [theme, setTheme] = useState<string>('');
    const [batchPrompts, setBatchPrompts] = useState<string>('');
    const [variantCount, setVariantCount] = useState<number>(4);
    const [aspectRatio, setAspectRatio] = useState<string>('1:1');
    const [isWhiteBg, setIsWhiteBg] = useState<boolean>(false);

    // Image Reference States
    const [referenceBase64, setReferenceBase64] = useState<string | null>(null);
    const [referenceMime, setReferenceMime] = useState<string | null>(null);
    const [referencePreview, setReferencePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Results State
    const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);

    // Efek untuk memuat dan menyimpan API Key ke localStorage
    useEffect(() => {
        const savedKey = localStorage.getItem('autofillstock_gemini_key');
        if (savedKey) setApiKey(savedKey);
    }, []);

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.trim();
        setApiKey(val);
        localStorage.setItem('autofillstock_gemini_key', val);
    };

    const clearApiKey = () => {
        setApiKey('');
        localStorage.removeItem('autofillstock_gemini_key');
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(null), 8000);
    };

    // Handler Unggah File
    const handleFile = (file: File | undefined | null) => {
        setErrorMsg(null);
        if (!file) return;
        if (!file.type.startsWith('image/')) return showError("Unggah file gambar valid (JPG/PNG).");
        if (file.size > 5 * 1024 * 1024) return showError("Maksimal ukuran gambar adalah 5MB.");

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setReferencePreview(result);
            setReferenceBase64(result.split(',')[1]);
            setReferenceMime(file.type);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setReferenceBase64(null);
        setReferenceMime(null);
        setReferencePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Hitungan Batch
    const batchLines = batchPrompts.trim() ? batchPrompts.trim().split('\n').filter(l => l.trim().length > 0) : [];
    const estimatedTotalImages = activeTab === 'image' ? variantCount : batchLines.length * 2;

    // Fungsi Utama Generate Single API Call
    const generateSingleImage = async (promptText: string, ratio: string): Promise<string> => {
        if (!apiKey) throw new Error("API Key masih kosong! Silakan isi API Key Gemini Anda di sidebar.");

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`;
        let parts: any[] = [{ text: promptText }];
        
        if (activeTab === 'image' && referenceBase64 && referenceMime) {
            parts.push({ inlineData: { mimeType: referenceMime, data: referenceBase64 } });
        }

        const payload = {
            contents: [{ role: "user", parts: parts }],
            generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ratio } }
        };

        const response = await fetch(apiUrl, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "Gagal menghubungi server API. Pastikan API Key valid.");
        }

        const result = await response.json();
        const part = result?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (!part || !part.inlineData || !part.inlineData.data) throw new Error("Gagal memproses data gambar dari AI.");
        
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    };

    // Eksekusi Generate Massal
    const handleGenerate = async () => {
        setErrorMsg(null);
        let tasksToProcess: { prompt: string, variantLabel: string }[] = [];

        if (activeTab === 'image') {
            if (!referenceBase64) return showError("Unggah gambar referensi dahulu.");
            if (!theme.trim()) return showError("Isi Tema / Objek baru.");
            
            let basePrompt = `Analyze the provided reference image. Extract ONLY its artistic style, color palette, lighting, texture, and visual concept. Do NOT duplicate the specific subjects in the reference image. Using ONLY that extracted style, generate a completely new image of: "${theme}".`;
            if (isWhiteBg) basePrompt += " The subject MUST be placed on a completely isolated, pure solid white background.";
            
            for (let i = 0; i < variantCount; i++) {
                tasksToProcess.push({ 
                    prompt: basePrompt + ` (Variation ${i+1}: ensure noticeable differences in composition).`, 
                    variantLabel: `Varian ${i+1}` 
                });
            }
        } else {
            if (batchLines.length === 0) return showError("Masukkan setidaknya satu baris prompt.");
            batchLines.forEach((linePrompt, lineIdx) => {
                let cleanPrompt = linePrompt.trim();
                if (isWhiteBg) cleanPrompt += " The subject MUST be placed on a completely isolated, pure solid white background.";
                for (let v = 1; v <= 2; v++) {
                    tasksToProcess.push({ 
                        prompt: cleanPrompt + ` (Batch ${lineIdx + 1}, Variation ${v}: distinct composition).`, 
                        variantLabel: `Prompt ${lineIdx + 1} - V${v}` 
                    });
                }
            });
        }

        setIsLoading(true);
        const newAssets: GeneratedAsset[] = [];
        
        try {
            for (let i = 0; i < tasksToProcess.length; i++) {
                const task = tasksToProcess[i];
                setLoadingText(`Membuat gambar (${i + 1} dari ${tasksToProcess.length})... Mohon tunggu.`);
                
                const imageData = await generateSingleImage(task.prompt, aspectRatio);
                const extension = imageData.startsWith('data:image/png') ? 'png' : 'jpg';
                const fileName = `Autofill_Gen_${Date.now()}_${i+1}.${extension}`;
                
                newAssets.push({ dataUrl: imageData, fileName: fileName, labelText: task.variantLabel });
                setGeneratedAssets(prev => [...prev, newAssets[newAssets.length - 1]]);
            }
        } catch (err: any) {
            showError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper untuk Download
    const downloadRawImage = (dataUrl: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = async () => {
        if (generatedAssets.length === 0) return;
        setIsLoading(true);
        setLoadingText("Menyiapkan file ZIP...");

        try {
            const zip = new JSZip();
            generatedAssets.forEach((asset) => {
                const base64Data = asset.dataUrl.split(",")[1] || "";
                zip.file(asset.fileName, base64Data, { base64: true });
            });
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `Autofill_Batch_${Date.now()}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err: any) {
            showError("Gagal membuat ZIP.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout title="Image Generator">
        <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-4rem)] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-slate-800">
            <Head>
                <title>Image Generator - Autofillstock</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            
            {/* Sidebar Kontrol */}
            <div className="w-full lg:w-[420px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 relative">
                
                {/* Tab Menu */}
                <div className="flex border-b border-slate-200">
                    <button 
                        onClick={() => { setActiveTab('image'); setErrorMsg(null); }}
                        className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${activeTab === 'image' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        Pakai Referensi
                    </button>
                    <button 
                        onClick={() => { setActiveTab('text'); setErrorMsg(null); }}
                        className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${activeTab === 'text' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        Batch Prompt
                    </button>
                </div>

                {/* Input API Key (BYOK) */}
                <div className="p-5 border-b border-slate-200 bg-slate-50">
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="api-key-input" className="block text-sm font-bold text-slate-700">
                            API Key Gemini <span className="text-red-500">*</span>
                        </label>
                        {apiKey && (
                            <button onClick={clearApiKey} className="text-[10px] text-red-500 hover:underline font-medium">Hapus Key</button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mb-2 leading-tight">
                        Dapatkan API Key gratis di <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">Google AI Studio</a>. <br/>
                        <span className="text-[10px] text-amber-600 mt-1 block font-medium">*Key tersimpan di browser Anda & tidak dikirim ke server Autofillstock.</span>
                    </p>
                    <input 
                        type="password" 
                        id="api-key-input"
                        value={apiKey}
                        onChange={handleApiKeyChange}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" 
                        placeholder="Paste API Key di sini..."
                    />
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                    
                    {errorMsg && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
                            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Mode Image */}
                    {activeTab === 'image' && (
                        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">1. Unggah Referensi</label>
                                <div 
                                    className={`border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition relative bg-slate-50 group ${referencePreview ? 'p-2' : 'p-6'}`}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50'); }}
                                    onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50'); handleFile(e.dataTransfer.files[0]); }}
                                >
                                    <input type="file" ref={fileInputRef} onChange={(e) => handleFile(e.target.files?.[0])} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    
                                    {!referencePreview ? (
                                        <div>
                                            <svg className="mx-auto h-10 w-10 text-slate-400 group-hover:text-indigo-500 transition" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <p className="mt-2 text-sm text-slate-600 font-medium">Klik atau seret gambar ke sini</p>
                                        </div>
                                    ) : (
                                        <div className="w-full relative">
                                            <img src={referencePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-sm object-contain" />
                                            <button onClick={removeImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow hover:bg-red-600 focus:outline-none z-10 transition">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">2. Tema / Objek Baru</label>
                                <textarea value={theme} onChange={(e) => setTheme(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" placeholder="Contoh: Seekor singa laut sedang bersantai memakai kacamata hitam..."></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Jumlah Varian</label>
                                <select value={variantCount} onChange={(e) => setVariantCount(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer">
                                    {[1,2,3,4,5,10].map(n => <option key={n} value={n}>{n} Gambar</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Mode Text Batch */}
                    {activeTab === 'text' && (
                        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-semibold text-slate-700">1. Masukkan Daftar Prompt</label>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{batchLines.length} Prompt</span>
                                </div>
                                <textarea value={batchPrompts} onChange={(e) => setBatchPrompts(e.target.value)} rows={7} className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono text-xs" placeholder="Golden retriever wearing sunglasses...&#10;Cyberpunk cat looking at the city..."></textarea>
                            </div>
                        </div>
                    )}

                    {/* Pengaturan Global */}
                    <div className="flex items-center p-4 bg-slate-50 border border-slate-200 rounded-lg mt-auto">
                        <input type="checkbox" id="white-bg" checked={isWhiteBg} onChange={(e) => setIsWhiteBg(e.target.checked)} className="w-5 h-5 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 cursor-pointer" />
                        <label htmlFor="white-bg" className="ml-3 block text-sm font-semibold text-slate-700 cursor-pointer select-none">
                            Wajib Latar Putih 
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Rasio Ukuran</label>
                        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer">
                            <option value="1:1">1:1 (Persegi)</option>
                            <option value="16:9">16:9 (Lanskap)</option>
                            <option value="9:16">9:16 (Potret)</option>
                        </select>
                    </div>
                </div>

                {/* Tombol Eksekusi */}
                <div className="p-6 bg-white border-t border-slate-200 shrink-0">
                    <div className="flex justify-between items-center mb-4 px-1 text-xs font-medium text-slate-500">
                        <span>Estimasi Hasil:</span>
                        <span className="font-bold text-slate-900">{estimatedTotalImages} Gambar</span>
                    </div>
                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition focus:outline-none flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        ) : (
                            "Mulai Buat Gambar"
                        )}
                    </button>
                </div>
            </div>

            {/* Area Hasil Workspace */}
            <div className="flex-1 bg-slate-50/50 overflow-y-auto relative p-6 lg:p-8 custom-scrollbar">
                
                {/* Header Workspace */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Workspace Generate</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowTerms(true)} className="text-xs font-semibold text-slate-500 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition">
                            Info Keamanan
                        </button>
                        {generatedAssets.length > 0 && (
                            <button onClick={handleDownloadAll} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-2 disabled:opacity-50">
                                Unduh Semua (ZIP)
                            </button>
                        )}
                    </div>
                </div>

                {/* Loading Overlay Terpisah untuk Workspace */}
                {isLoading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/70 backdrop-blur-sm rounded-xl">
                        <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center border border-slate-100 min-w-[300px]">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-600 text-sm font-medium">{loadingText}</p>
                        </div>
                    </div>
                )}

                {generatedAssets.length === 0 && !isLoading ? (
                    <div className="h-[60%] flex flex-col items-center justify-center text-center">
                        <div className="bg-white p-5 rounded-full shadow-sm mb-4 border border-slate-100">
                            <svg className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Belum Ada Gambar</h3>
                        <p className="text-slate-500 text-sm max-w-sm mt-1">Isi formulir di sidebar untuk mulai membuat aset gambar microstock.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
                        {generatedAssets.map((asset, idx) => (
                            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                                <div className={`relative w-full bg-slate-100 ${aspectRatio === '16:9' ? 'aspect-[16/9]' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'}`}>
                                    <img src={asset.dataUrl} alt={asset.labelText} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 left-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm backdrop-blur-sm">{asset.labelText}</div>
                                </div>
                                <div className="p-4 flex flex-col gap-3">
                                    <button onClick={() => downloadRawImage(asset.dataUrl, asset.fileName)} className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg text-sm font-semibold transition border border-indigo-200">
                                        Unduh Gambar Asli
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Info Keamanan */}
            {showTerms && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowTerms(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Informasi Keamanan & API</h3>
                        </div>
                        <div className="p-5 space-y-3 text-sm text-slate-600">
                            <p>Fitur Generator Gambar ini beroperasi menggunakan <strong>Google Gemini AI</strong>.</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Keamanan API Key:</strong> API Key yang Anda masukkan hanya disimpan di <em>local storage</em> browser perangkat Anda dan dikirimkan langsung ke server Google.</li>
                                <li><strong>Privasi Data:</strong> Autofillstock <strong>tidak pernah menyimpan, membaca, atau mencatat</strong> API Key Anda ke dalam database kami.</li>
                                <li><strong>Penggunaan:</strong> Penggunaan dan *billing* (jika melebihi batas gratis) sepenuhnya mengikuti syarat dari akun Google Anda. Gunakan key dengan bijak.</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-slate-50 text-right">
                            <button onClick={() => setShowTerms(false)} className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium">Saya Mengerti</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </DashboardLayout>
    );
}
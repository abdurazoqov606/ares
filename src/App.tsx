import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  BookOpen, 
  Languages, 
  ArrowRight, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  Type,
  Maximize2,
  Download
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { cn } from './lib/utils';
import { translateBookContent } from './services/geminiService';

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PageContent {
  original: string;
  translated: string;
  pageNumber: number;
  imageData?: string; // Data URL of the original page image
  width: number;
  height: number;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pages, setPages] = useState<PageContent[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile);
      processPDF(uploadedFile);
    }
  };

  const processPDF = async (pdfFile: File) => {
    setIsProcessing(true);
    setPages([]);
    setProgress(0);

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      const totalPages = pdf.numPages;
      const extractedPages: PageContent[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        
        // 1. Extract Text
        const textContent = await page.getTextContent();
        // @ts-ignore
        const text = textContent.items.map((item: any) => item.str).join(' ');
        
        // 2. Render Page to Image (to keep pictures and layout)
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (context) {
          await page.render({ 
            canvasContext: context, 
            viewport,
          } as any).promise;
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          if (text.trim()) {
            const translated = await translateBookContent(text);
            extractedPages.push({
              original: text,
              translated: translated,
              pageNumber: i,
              imageData: imageData,
              width: viewport.width,
              height: viewport.height
            });
          } else {
            extractedPages.push({
              original: "",
              translated: "",
              pageNumber: i,
              imageData: imageData,
              width: viewport.width,
              height: viewport.height
            });
          }
        }
        
        const currentProgress = Math.round((i / totalPages) * 100);
        setProgress(currentProgress);
        setPages([...extractedPages]);
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert("PDF tahlil qilishda xatolik yuz berdi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAsPDF = async () => {
    if (pages.length === 0) return;
    
    const { jsPDF } = await import('jspdf');
    // Using orientations based on the first page
    const orientation = pages[0].width > pages[0].height ? 'l' : 'p';
    const doc = new jsPDF(orientation, 'pt', [pages[0].width, pages[0].height]);
    
    for (let index = 0; index < pages.length; index++) {
      const page = pages[index];
      if (index > 0) doc.addPage([page.width, page.height]);
      
      if (page.imageData) {
        // Add original image as semi-transparent background or reference
        doc.addImage(page.imageData, 'JPEG', 0, 0, page.width, page.height, undefined, 'FAST');
      }

      // Add a white overlay rectangle for the translated text to be readable
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 20, page.width - 40, page.height - 40, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      
      const splitText = doc.splitTextToSize(page.translated, page.width - 60);
      doc.text(splitText, 30, 50);
      
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Bet: ${page.pageNumber}`, page.width / 2, page.height - 20, { align: 'center' });
    }
    
    doc.save(`${file?.name?.replace('.pdf', '')}_uzb_sifatli.pdf`);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      processPDF(droppedFile);
    }
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-accent selection:text-white overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-60 overflow-hidden z-0">
        <div className="atmosphere absolute inset-0" />
      </div>

      <main className="relative z-10 container mx-auto px-6 py-12 md:py-24">
        {/* Header */}
        <header className="mb-24 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 border border-accent/30 rounded-full flex items-center justify-center text-ink font-serif italic font-bold text-xl">
              G
            </div>
            <span className="font-serif italic font-bold tracking-widest text-2xl bg-gradient-to-r from-white to-muted bg-clip-text text-transparent">GLOBUS KITOB</span>
          </div>
          <nav className="hidden md:flex gap-12 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
            <a href="#" className="hover:text-ink transition-colors">Arxiv</a>
            <a href="#" className="hover:text-ink transition-colors">Tillar</a>
            <a href="#" className="hover:text-ink transition-colors">AI Texnologiya</a>
            <a href="#" className="text-ink hover:text-accent transition-colors">Kirish</a>
          </nav>
        </header>

        {/* Hero Section */}
        <AnimatePresence mode="wait">
          {!file && !isProcessing && (
            <motion.section 
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center"
            >
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-12"
              >
                <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-tight">
                  Jahon adabiyoti <br />
                  <span className="italic text-accent block mt-2">O'zbek tilida.</span>
                </h1>
                
                <p className="max-w-md text-lg text-muted leading-relaxed font-light">
                  Istalgan tildagi kitoblarni original formatini saqlagan holda o'zbek tiliga o'giring. 
                  Bizning AI nafaqat so'zlarni, balki asar ruhini ham tarjima qiladi.
                </p>

                <div className="grid grid-cols-3 gap-8 border-t border-border-subtle pt-8">
                  {[
                    { val: "120+", lbl: "Tillar" },
                    { val: "100%", lbl: "Format saqlash" },
                    { val: "4ms", lbl: "Tahlil tezligi" },
                  ].map((s, i) => (
                    <div key={i} className="space-y-1">
                      <span className="block font-serif text-2xl text-ink">{s.val}</span>
                      <span className="block text-[10px] uppercase tracking-wider text-muted font-bold">{s.lbl}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
              
              <div className="relative">
                {/* Preview Card Decoration */}
                <motion.div 
                  initial={{ opacity: 0, rotate: -15, y: 20 }}
                  animate={{ opacity: 1, rotate: -10, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-12 -left-12 w-48 h-64 bg-white rounded-lg shadow-2xl p-6 space-y-3 z-20 pointer-events-none hidden md:block"
                >
                  <div className="h-2 w-3/4 bg-gray-200 rounded" />
                  <div className="h-1.5 w-full bg-gray-100 rounded" />
                  <div className="h-1.5 w-full bg-gray-100 rounded" />
                  <div className="h-1.5 w-1/2 bg-gray-100 rounded" />
                  <div className="mt-6 pt-4 border-t border-gray-50">
                    <div className="h-24 bg-gray-50 rounded" />
                  </div>
                </motion.div>

                <div 
                  className="glass p-12 lg:p-16 rounded-[2rem] text-center space-y-10 relative z-10"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                >
                  <div 
                    className="border border-dashed border-border-subtle rounded-2xl py-16 px-8 cursor-pointer hover:border-accent/40 transition-colors group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="application/pdf"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">📖</div>
                    <h3 className="text-xl font-medium mb-2">PDF yoki Kitobni yuklang</h3>
                    <p className="text-sm text-muted">Avtomatik til aniqlash tizimi yoqilgan</p>
                  </div>
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-ink text-paper py-5 rounded-full font-bold uppercase tracking-widest text-xs hover:scale-[1.02] transition-transform active:scale-95 cursor-pointer shadow-xl shadow-ink/5"
                  >
                    Tarjimani boshlash
                  </button>

                  <div className="flex justify-center gap-6 text-[10px] font-bold tracking-widest text-muted">
                    <span>• EPUB</span>
                    <span>• PDF</span>
                    <span>• MOBI</span>
                    <span>• DOCX</span>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* Processing State */}
          {isProcessing && (
            <motion.section 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[60vh] flex flex-col items-center justify-center text-center"
            >
              <div className="space-y-8">
                <div className="relative inline-block">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="w-32 h-32 border-2 border-dashed border-accent rounded-full opacity-20"
                  />
                  <BookOpen className="w-12 h-12 text-ink absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-5xl font-serif italic font-medium tracking-tighter text-ink">O'girlmoqda...</h2>
                  <p className="text-muted text-lg uppercase tracking-widest font-bold text-xs">{progress}% tugatildi</p>
                </div>

                <div className="w-64 h-1.5 bg-white/5 rounded-full mx-auto overflow-hidden">
                  <motion.div 
                    className="h-full bg-accent shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                  />
                </div>

                <p className="max-w-xs mx-auto italic text-muted text-sm font-serif leading-relaxed px-4">
                  "Kitob — bu cho'ntakda olib yuriladigan mo'jizakor bog'dir."
                  <br />
                  <span className="not-italic text-[10px] uppercase font-bold tracking-[0.3em] opacity-40">Filtrlash va tahlil jarayoni</span>
                </p>
              </div>
            </motion.section>
          )}

          {/* Reader View */}
          {!isProcessing && pages.length > 0 && (
            <motion.section 
              key="reader"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12 pb-24"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border-subtle pb-8 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                    Hujjat: {file?.name}
                  </div>
                  <h2 className="text-4xl font-serif italic font-medium tracking-tight">
                    Kitob mutolaasi
                  </h2>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={downloadAsPDF}
                    className="flex items-center gap-2 px-6 py-3 border border-border-subtle rounded-full hover:bg-ink hover:text-paper transition-all text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    PDF Yuklab olish
                  </button>
                  <button 
                    onClick={() => { setFile(null); setPages([]); }}
                    className="px-6 py-3 bg-accent text-white rounded-full hover:scale-105 transition-all text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-accent/20 cursor-pointer"
                  >
                    Yangi kitob
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                {/* Left Side: Original Image Visual */}
                <div className="glass p-4 rounded-[2.5rem] space-y-4 relative overflow-hidden group min-h-[600px] flex flex-col">
                  <div className="flex justify-between items-center px-4 text-[10px] uppercase tracking-widest font-bold text-muted">
                    <span>Original Page Visual</span>
                    <span>Bet: {pages[currentPage]?.pageNumber}</span>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-2xl overflow-hidden relative">
                    {pages[currentPage]?.imageData ? (
                      <img 
                        src={pages[currentPage].imageData} 
                        alt="Original page" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-xs italic">
                        Tasvir yuklanmoqda...
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Translated Text */}
                <motion.div 
                  key={currentPage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/5 border border-white/10 p-12 md:p-20 rounded-[2.5rem] shadow-2xl space-y-12 relative overflow-hidden min-h-[600px]"
                >
                  {/* Subtle focus shadow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-accent/5 blur-[120px] pointer-events-none" />
                  
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.3em] font-bold text-accent relative z-10">
                    <span>O'zbek tiliga tarjima</span>
                    <span className="text-muted opacity-50 font-sans">PAGE {pages[currentPage]?.pageNumber}</span>
                  </div>
                  
                  <div className="prose prose-xl prose-invert max-w-none relative z-10 leading-[1.6] font-serif text-ink/90 first-letter:text-6xl first-letter:font-bold first-letter:text-accent first-letter:mr-4 first-letter:float-left first-letter:italic">
                    {pages[currentPage]?.translated}
                  </div>

                  <div className="flex justify-between items-center pt-12 border-t border-white/5 relative z-10">
                    <button 
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="group flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all outline-none"
                    >
                      <div className="w-12 h-12 border border-border-subtle rounded-full flex items-center justify-center group-hover:bg-accent group-hover:border-accent transition-colors">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </div>
                      Oldingi
                    </button>
                    
                    <div className="text-[10px] font-bold tracking-[0.3em] text-muted">
                      {currentPage + 1} / {pages.length}
                    </div>

                    <button 
                      disabled={currentPage === pages.length - 1}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="group flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all outline-none"
                    >
                      Keyingi
                      <div className="w-12 h-12 border border-border-subtle rounded-full flex items-center justify-center group-hover:bg-accent group-hover:border-accent transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                </motion.div>
              </div>
              
              <div className="flex justify-center gap-3 py-12">
                {pages.map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={cn(
                      "h-1 rounded-full transition-all duration-500",
                      currentPage === i ? "w-12 bg-accent" : "w-1.5 bg-white/10 hover:bg-white/30"
                    )}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 bg-white/[0.02]">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-accent/20 border border-accent/30 rounded-full" />
              <span className="font-serif italic font-bold tracking-widest uppercase text-sm">Globus AI</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted opacity-50 max-w-xs leading-relaxed">
              Jahon adabiyotini o'zbek tilida birlashtiramiz. 
              Toshkent • New York • London
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-12 text-[10px] uppercase tracking-widest font-bold text-muted">
            <a href="#" className="hover:text-ink transition-colors underline underline-offset-8 decoration-accent/0 hover:decoration-accent/100">Xizmatlar</a>
            <a href="#" className="hover:text-ink transition-colors underline underline-offset-8 decoration-accent/0 hover:decoration-accent/100">Foydalanish shartlari</a>
            <a href="#" className="hover:text-ink transition-colors underline underline-offset-8 decoration-accent/0 hover:decoration-accent/100">Maxfiylik</a>
          </div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted opacity-30">
            © 2024 GLOBUS AI TARJIMA TIZIMI
          </div>
        </div>
      </footer>
    </div>
  );
}

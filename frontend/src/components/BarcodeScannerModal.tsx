import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, type CameraDevice } from 'html5-qrcode';
import { api } from '../api/client.js';
import type {
  ReceivingDocumentSummary,
  ReceivingDocumentDetail,
  ReceivingItem,
  Product,
} from '../types/index.js';
import { Modal } from './Modal.js';
import { StatusBadge } from './StatusBadge.js';
import { ReceivingDetailPage } from '../pages/ReceivingDetailPage.js';
import {
  Barcode,
  Camera,
  CameraOff,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Package,
  Layers,
  ArrowRight,
  Volume2,
  VolumeX,
  RefreshCw,
  FileText,
  Check,
  ExternalLink,
  Plus,
  Minus,
  Sparkles,
  Info,
  Keyboard,
  Play,
  Pause,
  Truck,
  Send,
  Trash2,
  Printer,
  Clock,
  ShieldCheck,
  FilePlus,
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  onItemReceived?: () => void;
}

type ScanDeviceMode = 'camera' | 'gun';
type WorkflowMode = 'active_doc' | 'new_inbound';

interface DraftInboundItem {
  product_id: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
}

// Web Audio API sound synthesizer
const playSound = (type: 'success' | 'warning' | 'error', enabled: boolean) => {
  if (!enabled) return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Pleasant 2-tone chime: 659Hz (E5) -> 880Hz (A5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === 'warning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ignore audio context errors if browser blocks autoplay
  }
};

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onNotify,
  onItemReceived,
}) => {
  // Workflow Tab: 'active_doc' (proses dokumen ada) vs 'new_inbound' (catat masuk baru oleh operator)
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('active_doc');

  // Input Device: 'camera' vs 'gun'
  const [scanDeviceMode, setScanDeviceMode] = useState<ScanDeviceMode>('camera');

  // Active Documents State
  const [activeDocuments, setActiveDocuments] = useState<ReceivingDocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<ReceivingDocumentDetail | null>(null);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Master Products State (for Catat Masuk Baru lookup)
  const [masterProducts, setMasterProducts] = useState<Product[]>([]);

  // Scanner & Sound State
  const [barcodeQuery, setBarcodeQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Camera State
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const [isCameraPaused, setIsCameraPaused] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // In-modal Document Detail state (returns directly to scan on close!)
  const [detailModalDocId, setDetailModalDocId] = useState<string | null>(null);

  // Matched Item in Active Document State
  const [matchedItem, setMatchedItem] = useState<ReceivingItem | null>(null);
  const [receiveQty, setReceiveQty] = useState<number>(1);
  const [submittingReceive, setSubmittingReceive] = useState<boolean>(false);

  // Matched Product in New Inbound Mode State
  const [matchedNewProduct, setMatchedNewProduct] = useState<Product | null>(null);
  const [newInboundQty, setNewInboundQty] = useState<number>(1);
  const [draftInboundItems, setDraftInboundItems] = useState<DraftInboundItem[]>([]);
  const [submittingNewInbound, setSubmittingNewInbound] = useState<boolean>(false);

  // Feedback Messages
  const [scanMessage, setScanMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
    suggestDocId?: string;
    suggestDocNumber?: string;
  } | null>(null);

  // Highlighted item ID in list (for flash feedback)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  // 1. Initial Load when Modal Opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    fetchActiveDocuments();
    fetchMasterProducts();
  }, [isOpen]);

  // 2. Camera Lifecycle Management
  useEffect(() => {
    let isCancelled = false;

    if (isOpen && scanDeviceMode === 'camera') {
      const timer = setTimeout(() => {
        if (!isCancelled) {
          startCamera();
        }
      }, 250);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
      if (scanDeviceMode === 'gun') {
        setTimeout(() => barcodeInputRef.current?.focus(), 150);
      }
    }

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen, scanDeviceMode, workflowMode, selectedDocId]);

  const fetchMasterProducts = async () => {
    try {
      const res = await api.get('/products', { params: { limit: 100 } });
      if (res.data.success) {
        setMasterProducts(res.data.data);
      }
    } catch {
      // non-fatal
    }
  };

  const fetchActiveDocuments = async () => {
    setLoadingDocs(true);
    try {
      // Query without status=ALL to avoid enum errors
      const res = await api.get('/receivings', { params: { limit: 50 } });
      if (res.data.success) {
        const allDocs: ReceivingDocumentSummary[] = res.data.data;
        const active = allDocs.filter((d) => d.status !== 'COMPLETED');
        setActiveDocuments(active);

        if (active.length > 0) {
          const inProgress = active.find((d) => d.status === 'IN_PROGRESS');
          const initialId = inProgress ? inProgress.id : active[0].id;
          setSelectedDocId(initialId);
          fetchDocumentDetail(initialId);
          setWorkflowMode('active_doc');
        } else {
          setSelectedDocId('');
          setSelectedDocument(null);
          // If no active documents, switch directly to "Catat Masuk Baru" mode
          setWorkflowMode('new_inbound');
        }
      }
    } catch {
      onNotify('error', 'Gagal memuat daftar dokumen penerimaan aktif.');
      setWorkflowMode('new_inbound');
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchDocumentDetail = async (docId: string) => {
    if (!docId) return;
    setLoadingDetail(true);
    try {
      const res = await api.get(`/receivings/${docId}`);
      if (res.data.success) {
        const docDetail: ReceivingDocumentDetail = res.data.data;
        setSelectedDocument(docDetail);

        if (matchedItem) {
          const updated = docDetail.items.find((i) => i.id === matchedItem.id);
          if (updated) {
            setMatchedItem(updated);
            const remaining = updated.expected_quantity - updated.received_quantity;
            setReceiveQty(remaining > 0 ? 1 : 0);
          }
        }
      }
    } catch {
      onNotify('error', 'Gagal memuat rincian item dokumen.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectDocument = (docId: string) => {
    setSelectedDocId(docId);
    setMatchedItem(null);
    setScanMessage(null);
    setBarcodeQuery('');
    fetchDocumentDetail(docId);
  };

  // Camera Control Functions
  const startCamera = async (cameraIdOverride?: string) => {
    const elem = document.getElementById('barcode-camera-scanner-viewfinder');
    if (!elem) return;

    await stopCamera();

    setIsCameraStarting(true);
    setCameraError(null);

    try {
      const devices = await Html5Qrcode.getCameras();
      setAvailableCameras(devices);

      const targetCamera =
        cameraIdOverride ||
        selectedCameraId ||
        (devices.length > 0 ? devices[0].id : { facingMode: 'environment' });
      if (typeof targetCamera === 'string') {
        setSelectedCameraId(targetCamera);
      } else if (devices.length > 0) {
        setSelectedCameraId(devices[0].id);
      }

      const html5QrCode = new Html5Qrcode('barcode-camera-scanner-viewfinder', {
        verbose: false,
        useBarCodeDetectorIfSupported: true,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.ITF,
        ],
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        targetCamera,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.min(viewfinderWidth * 0.85, 340);
            const height = Math.min(viewfinderHeight * 0.65, 200);
            return { width: Math.round(width), height: Math.round(height) };
          },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          handleCameraBarcodeDecoded(decodedText);
        },
        () => {
          // Silent frame error callback
        }
      );

      setIsCameraActive(true);
      setIsCameraPaused(false);
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        setCameraError(
          'Akses kamera laptop ditolak oleh browser. Silakan izinkan izin kamera pada ikon gembok di address bar browser.'
        );
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
        setCameraError(
          'Kamera tidak terdeteksi pada laptop ini. Anda dapat menggunakan mode Scanner Gun / Input Manual.'
        );
      } else {
        setCameraError(`Gagal mengakses kamera: ${errMsg}`);
      }
      setIsCameraActive(false);
    } finally {
      setIsCameraStarting(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
    setIsCameraActive(false);
    setIsCameraStarting(false);
    setIsCameraPaused(false);
  };

  const togglePauseCamera = () => {
    if (!scannerRef.current) return;
    try {
      if (isCameraPaused) {
        scannerRef.current.resume();
        setIsCameraPaused(false);
      } else {
        scannerRef.current.pause(true);
        setIsCameraPaused(true);
      }
    } catch {
      // ignore
    }
  };

  const resumeCameraIfPaused = () => {
    if (!scannerRef.current) return;
    try {
      scannerRef.current.resume();
    } catch {
      // ignore if not paused
    } finally {
      setIsCameraPaused(false);
    }
  };

  const handleCameraChange = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    await startCamera(newCameraId);
  };

  // Dispatch barcode scan based on current workflow mode
  const handleDecodedBarcode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;

    if (workflowMode === 'active_doc') {
      matchBarcodeInActiveDocument(clean);
    } else {
      matchBarcodeInMasterProducts(clean);
    }
  };

  const handleCameraBarcodeDecoded = (decodedText: string) => {
    const now = Date.now();
    const clean = decodedText.trim().toUpperCase();

    // 2.5s debounce for the same barcode
    if (clean === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2500) {
      return;
    }

    lastScannedCodeRef.current = clean;
    lastScannedTimeRef.current = now;
    setBarcodeQuery(clean);

    handleDecodedBarcode(clean);
  };

  const handleGunBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleDecodedBarcode(barcodeQuery);
  };

  // --- WORKFLOW 1: MATCHING IN ACTIVE DOCUMENT ---
  const matchBarcodeInActiveDocument = async (query: string) => {
    if (!selectedDocument) return;

    const found = selectedDocument.items.find(
      (it) => it.sku.toUpperCase() === query || it.product_name.toUpperCase().includes(query)
    );

    if (found) {
      setMatchedItem(found);
      const remaining = found.expected_quantity - found.received_quantity;
      setReceiveQty(remaining > 0 ? 1 : 0);
      setHighlightedItemId(found.id);

      if (found.status === 'COMPLETED' || remaining <= 0) {
        setScanMessage({
          type: 'warning',
          text: `Item SKU "${found.sku}" (${found.product_name}) sudah selesai diterima 100% (${found.received_quantity}/${found.expected_quantity} ${found.unit}).`,
        });
        playSound('warning', soundEnabled);
      } else {
        setScanMessage({
          type: 'success',
          text: `[Kamera] SKU "${found.sku}" terverifikasi! Masukkan jumlah fisik lalu klik Konfirmasi Terima.`,
        });
        playSound('success', soundEnabled);
      }
      return;
    }

    // Check cross-document match
    let otherDocMatch: { doc: ReceivingDocumentSummary; itemSku: string; itemName: string } | null =
      null;
    const otherDocs = activeDocuments.filter((d) => d.id !== selectedDocId);

    for (const otherDoc of otherDocs) {
      try {
        const checkRes = await api.get(`/receivings/${otherDoc.id}`);
        if (checkRes.data.success) {
          const detail: ReceivingDocumentDetail = checkRes.data.data;
          const match = detail.items.find(
            (it) => it.sku.toUpperCase() === query || it.product_name.toUpperCase().includes(query)
          );
          if (match) {
            otherDocMatch = {
              doc: otherDoc,
              itemSku: match.sku,
              itemName: match.product_name,
            };
            break;
          }
        }
      } catch {
        // ignore
      }
    }

    if (otherDocMatch) {
      setMatchedItem(null);
      setScanMessage({
        type: 'warning',
        text: `SKU "${query}" tidak ada di dokumen ${selectedDocument.doc_number}, tetapi terdaftar di dokumen ${otherDocMatch.doc.doc_number}.`,
        suggestDocId: otherDocMatch.doc.id,
        suggestDocNumber: otherDocMatch.doc.doc_number,
      });
      playSound('warning', soundEnabled);
    } else {
      setMatchedItem(null);
      setScanMessage({
        type: 'error',
        text: `SKU / Barcode "${query}" tidak terdaftar dalam dokumen ${selectedDocument.doc_number}. Gunakan tab "Catat Masuk Baru" jika ini kiriman baru!`,
      });
      playSound('error', soundEnabled);
    }
  };

  const handleConfirmReceiveInActiveDoc = async () => {
    if (!selectedDocument || !matchedItem) return;

    const remaining = matchedItem.expected_quantity - matchedItem.received_quantity;
    if (receiveQty <= 0) {
      onNotify('warning', 'Jumlah penerimaan fisik harus lebih besar dari 0.');
      return;
    }

    if (receiveQty > remaining) {
      onNotify(
        'error',
        `Jumlah input (${receiveQty}) melebihi sisa target dokumen (${remaining} ${matchedItem.unit}). Sistem menolak over-receiving.`
      );
      playSound('error', soundEnabled);
      return;
    }

    setSubmittingReceive(true);
    try {
      const res = await api.post(`/receivings/${selectedDocument.id}/receive`, {
        item_id: matchedItem.id,
        increment_quantity: Number(receiveQty),
      });

      if (res.data.success) {
        playSound('success', soundEnabled);
        onNotify(
          'success',
          `Berhasil menerima ${receiveQty} ${matchedItem.unit} untuk produk "${matchedItem.product_name}" (${matchedItem.sku})!`
        );

        setScanMessage({
          type: 'success',
          text: `Tercatat: +${receiveQty} ${matchedItem.unit} berhasil masuk ke inventaris untuk SKU ${matchedItem.sku}.`,
        });

        // Trigger dashboard stats refresh
        onItemReceived?.();

        // Refresh current document details
        await fetchDocumentDetail(selectedDocument.id);

        // Flash highlight
        setHighlightedItemId(matchedItem.id);
        setTimeout(() => setHighlightedItemId(null), 3000);

        setBarcodeQuery('');
        if (scanDeviceMode === 'gun') {
          setTimeout(() => barcodeInputRef.current?.focus(), 150);
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Gagal memproses penerimaan fisik barang.';
      onNotify('error', msg);
      playSound('error', soundEnabled);
    } finally {
      setSubmittingReceive(false);
    }
  };

  // --- WORKFLOW 2: CATAT MASUK BARU (OPERATOR GENERATE KE SUPERVISOR) ---
  const matchBarcodeInMasterProducts = (query: string) => {
    const found = masterProducts.find(
      (p) => p.sku.toUpperCase() === query || p.name.toUpperCase().includes(query)
    );

    if (found) {
      setMatchedNewProduct(found);
      setNewInboundQty(1);
      setScanMessage({
        type: 'success',
        text: `Produk "${found.name}" (${found.sku}) terdeteksi! Tentukan jumlah fisik masuk lalu klik Tambah ke Daftar.`,
      });
      playSound('success', soundEnabled);
    } else {
      setMatchedNewProduct(null);
      setScanMessage({
        type: 'error',
        text: `SKU / Barcode "${query}" tidak ditemukan di Master Produk. Pastikan kode barcode sudah terdaftar di sistem.`,
      });
      playSound('error', soundEnabled);
    }
  };

  const handleAddDraftInboundItem = () => {
    if (!matchedNewProduct || newInboundQty <= 0) return;

    setDraftInboundItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.product_id === matchedNewProduct.id);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex].quantity += newInboundQty;
        return copy;
      }
      return [
        ...prev,
        {
          product_id: matchedNewProduct.id,
          sku: matchedNewProduct.sku,
          name: matchedNewProduct.name,
          unit: matchedNewProduct.unit,
          quantity: newInboundQty,
        },
      ];
    });

    onNotify(
      'success',
      `+${newInboundQty} ${matchedNewProduct.unit} "${matchedNewProduct.name}" ditambahkan ke daftar catatan masuk.`
    );
    playSound('success', soundEnabled);
    setMatchedNewProduct(null);
    setBarcodeQuery('');
    setScanMessage(null);
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftInboundItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Kirim Catat Masuk ke Supervisor (Generate Dokumen Inbound)
  const handleSubmitNewInboundToSupervisor = async () => {
    if (draftInboundItems.length === 0) {
      onNotify('warning', 'Pindai dan tambahkan minimal 1 item barang masuk terlebih dahulu.');
      return;
    }

    setSubmittingNewInbound(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedDocNumber = `RCV-INB-${dateStr}-${randomSuffix}`;

      const res = await api.post('/receivings', {
        doc_number: generatedDocNumber,
        items: draftInboundItems.map((item) => ({
          product_id: item.product_id,
          expected_quantity: item.quantity,
          received_quantity: item.quantity,
        })),
      });

      if (res.data.success) {
        playSound('success', soundEnabled);
        onNotify(
          'success',
          `Dokumen ${generatedDocNumber} berhasil dibuat & dikirim ke Supervisor! Menunggu pengecekan & ACC Supervisor.`
        );

        setDraftInboundItems([]);
        setMatchedNewProduct(null);
        setBarcodeQuery('');

        // Refresh documents and switch to Active Doc tab
        await fetchActiveDocuments();
        setSelectedDocId(res.data.data.id);
        fetchDocumentDetail(res.data.data.id);
        setWorkflowMode('active_doc');

        onItemReceived?.();
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Gagal mengirim catat masuk ke supervisor.';
      onNotify('error', msg);
      playSound('error', soundEnabled);
    } finally {
      setSubmittingNewInbound(false);
    }
  };

  const remainingQtyInActive = matchedItem
    ? matchedItem.expected_quantity - matchedItem.received_quantity
    : 0;

  const totalDraftQuantity = draftInboundItems.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (detailModalDocId) {
            setDetailModalDocId(null);
            return;
          }
          stopCamera();
          onClose();
        }}
        maxWidth="2xl"
      title={
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm shrink-0">
            <Barcode className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-bold text-slate-900 truncate">Scan Barcode Penerimaan</span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Operator
              </span>
            </div>
            <div className="text-[11px] sm:text-xs font-normal text-slate-500 truncate hidden sm:block">
              Pindai fisik barang, catat masuk ke supervisor, dan cetak bukti setelah di-ACC
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
        {/* TOP WORKFLOW MODE SWITCHER (Active Documents vs Catat Masuk Baru) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row items-center gap-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setWorkflowMode('active_doc')}
              className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                workflowMode === 'active_doc'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dokumen Terjadwal ({activeDocuments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkflowMode('new_inbound')}
              className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                workflowMode === 'new_inbound'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FilePlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Catat Masuk Baru</span>
              {draftInboundItems.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-mono">
                  {draftInboundItems.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 px-1">
            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              title={soundEnabled ? 'Matikan Suara Beep' : 'Nyalakan Suara Beep'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Beep Aktif</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Senyap</span>
                </>
              )}
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchActiveDocuments}
              disabled={loadingDocs}
              title="Segarkan Dokumen"
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* WORKFLOW TAB 1: DOKUMEN AKTIF TERJADWAL */}
        {workflowMode === 'active_doc' && (
          <div className="space-y-3">
            {activeDocuments.length === 0 ? (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>Belum ada dokumen inbound terjadwal yang aktif.</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Truk barang baru saja tiba? Anda dapat langsung beralih ke tab <strong>"Catat Masuk Baru"</strong> untuk memindai barcode fisik barang, menginput jumlah yang diterima, dan otomatis mengirimkannya ke Supervisor untuk di-ACC!
                </p>
                <button
                  type="button"
                  onClick={() => setWorkflowMode('new_inbound')}
                  className="mt-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buka Catat Masuk Baru Sekarang</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <label htmlFor="doc-select-main" className="text-xs font-bold text-slate-800">
                      Pilih Dokumen Inbound yang Diproses:
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {activeDocuments.length} Dokumen Aktif
                  </span>
                </div>

                <select
                  id="doc-select-main"
                  value={selectedDocId}
                  onChange={(e) => handleSelectDocument(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                >
                  {activeDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.doc_number} • {doc.status === 'IN_PROGRESS' ? 'SEDANG BERJALAN' : 'DRAFT'} ({doc.completed_items}/{doc.total_items} item selesai) — Supervisor: {doc.supervisor_username}
                    </option>
                  ))}
                </select>

                {selectedDocument && (
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-white/80 px-3 py-2 rounded-lg border border-slate-200/80 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={selectedDocument.status} />
                      <span className="font-mono font-bold text-slate-900">{selectedDocument.doc_number}</span>
                      <span className="text-slate-400">•</span>
                      <span>Supervisor: <strong className="text-slate-800">{selectedDocument.supervisor_username}</strong></span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span>Verifikasi Fisik:</span>
                        <strong className="text-emerald-700">
                          {selectedDocument.completed_items} / {selectedDocument.total_items} Item
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (scannerRef.current && isCameraActive && !isCameraPaused) {
                            togglePauseCamera();
                          }
                          setDetailModalDocId(selectedDocument.id);
                        }}
                        className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer transition hover:underline"
                        title="Lihat rincian lengkap dokumen"
                      >
                        <span>Lihat Rincian</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* WORKFLOW TAB 2: CATAT MASUK BARU BANNER */}
        {workflowMode === 'new_inbound' && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs sm:text-sm">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Penerimaan Fisik Baru Mandiri oleh Operator</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Arahkan kamera ke barcode barang masuk atau ketik SKU produk. Kuantitas fisik yang Anda catat akan otomatis dikirim ke Supervisor untuk diverifikasi dan di-ACC.
            </p>
          </div>
        )}

        {/* SCANNER DEVICE MODE SELECTOR (Kamera vs Scanner Gun) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <Barcode className="w-4 h-4 text-emerald-600" />
            <span>Alat Pemindai:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setScanDeviceMode('camera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                scanDeviceMode === 'camera'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera Laptop (Webcam)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            </button>

            <button
              type="button"
              onClick={() => setScanDeviceMode('gun')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                scanDeviceMode === 'gun'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Scanner Gun / Teks SKU</span>
            </button>
          </div>
        </div>

        {/* DEVICE 1: LAPTOP WEBCAM VIEWFINDER */}
        {scanDeviceMode === 'camera' && (
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl p-4 text-white shadow-lg space-y-3 animate-fade-in relative overflow-hidden">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-white block">Kamera Laptop Aktif</span>
                  <span className="text-[11px] text-slate-400">
                    Dekatkan kode batang / QR Code produk ke kamera
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {availableCameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none"
                  >
                    {availableCameras.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Kamera ${cam.id.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={togglePauseCamera}
                  title={isCameraPaused ? 'Lanjutkan Pemindaian' : 'Jeda Kamera'}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                >
                  {isCameraPaused ? (
                    <>
                      <Play className="w-3 h-3 text-emerald-400" />
                      <span>Lanjut</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3 h-3 text-amber-400" />
                      <span>Jeda</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Viewfinder Window */}
            <div className="relative w-full max-h-72 aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
              <div id="barcode-camera-scanner-viewfinder" className="w-full h-full object-cover" />

              {isCameraStarting && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-center p-4 z-10">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                  <span className="text-xs font-medium text-slate-300">
                    Menghubungkan ke kamera laptop...
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Pastikan browser telah diberikan izin akses kamera
                  </span>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 z-10 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <CameraOff className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-rose-200 max-w-sm leading-relaxed">{cameraError}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
                    >
                      Coba Lagi
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanDeviceMode('gun')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition border border-slate-700"
                    >
                      Beralih ke Input Teks
                    </button>
                  </div>
                </div>
              )}

              {isCameraActive && !isCameraStarting && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 z-10">
                  <div className="relative w-64 sm:w-80 h-36 border border-emerald-400/40 rounded-xl bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br" />

                    {!isCameraPaused && (
                      <div className="absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-laser-scan" />
                    )}

                    <span className="text-[10px] text-emerald-300/80 font-mono tracking-wider uppercase bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                      {isCameraPaused ? 'Kamera Dijeda' : 'Arahkan Barcode ke Sini'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mendukung Barcode 1D (Code 128, EAN, UPC) & QR Code</span>
              </div>
              {barcodeQuery && (
                <div className="font-mono text-emerald-400 font-semibold">
                  Terdeteksi: {barcodeQuery}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DEVICE 2: SCANNER GUN / INPUT MANUAL */}
        {scanDeviceMode === 'gun' && (
          <form
            onSubmit={handleGunBarcodeSubmit}
            className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-2.5 transition-all focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs sm:text-sm">
                <Barcode className="w-4 h-4 text-emerald-600" />
                <span>Pindai Barcode Gun atau Ketik SKU Produk:</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-mono">
                Tekan [Enter] untuk mencocokkan
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeQuery}
                  onChange={(e) => setBarcodeQuery(e.target.value.toUpperCase())}
                  placeholder="Contoh: SKU-MON-27, SKU-KBD-MECH..."
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-emerald-300 rounded-lg text-sm font-mono uppercase text-slate-900 placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Barcode className="w-4 h-4" />
                <span>Pindai & Cocokkan</span>
              </button>
            </div>
          </form>
        )}

        {/* FEEDBACK ALERT MESSAGE */}
        {scanMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 animate-fade-in ${
              scanMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : scanMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-2">
              {scanMessage.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {scanMessage.type === 'warning' && (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              {scanMessage.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium leading-relaxed">{scanMessage.text}</p>
                {scanMessage.suggestDocId && (
                  <button
                    type="button"
                    onClick={() => handleSelectDocument(scanMessage.suggestDocId!)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 underline cursor-pointer"
                  >
                    <span>Beralih ke Dokumen {scanMessage.suggestDocNumber} sekarang</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setScanMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* WORKFLOW 1: PRODUCT VERIFICATION CARD FOR ACTIVE DOCUMENT */}
        {workflowMode === 'active_doc' && matchedItem && (
          <div className="bg-white border-2 border-emerald-400/80 rounded-xl p-4 shadow-sm space-y-3.5 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 rounded-bl-xl text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3" />
              <span>Data Terverifikasi</span>
            </div>

            <div className="pr-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                  {matchedItem.sku}
                </span>
                <span className="text-[11px] text-slate-500">
                  Satuan: <strong>{matchedItem.unit}</strong>
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">{matchedItem.product_name}</h3>
            </div>

            <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Target Manifes</span>
                <span className="text-base font-bold text-slate-800 font-mono">
                  {matchedItem.expected_quantity}{' '}
                  <span className="text-xs font-normal text-slate-500">{matchedItem.unit}</span>
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-emerald-700 block">Sudah Diterima</span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  {matchedItem.received_quantity}{' '}
                  <span className="text-xs font-normal text-emerald-600">{matchedItem.unit}</span>
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-amber-700 block">Sisa Harus Masuk</span>
                <span className="text-base font-bold text-amber-700 font-mono">
                  {remainingQtyInActive}{' '}
                  <span className="text-xs font-normal text-amber-600">{matchedItem.unit}</span>
                </span>
              </div>
            </div>

            {remainingQtyInActive <= 0 || matchedItem.status === 'COMPLETED' ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  Item ini telah selesai diterima 100%. Tidak ada kekurangan fisik yang perlu dimasukkan.
                </span>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Jumlah Diterima:</span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setReceiveQty((prev) => Math.max(1, prev - 1))}
                      disabled={receiveQty <= 1 || submittingReceive}
                      className="p-1.5 border border-slate-300 rounded-l-lg bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={remainingQtyInActive}
                      value={receiveQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val)) setReceiveQty(1);
                        else setReceiveQty(Math.min(remainingQtyInActive, Math.max(1, val)));
                      }}
                      className="w-16 py-1 text-center font-mono font-bold text-sm border-y border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setReceiveQty((prev) => Math.min(remainingQtyInActive, prev + 1))}
                      disabled={receiveQty >= remainingQtyInActive || submittingReceive}
                      className="p-1.5 border border-slate-300 rounded-r-lg bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{matchedItem.unit}</span>

                  {remainingQtyInActive > 1 && (
                    <button
                      type="button"
                      onClick={() => setReceiveQty(remainingQtyInActive)}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 transition cursor-pointer"
                    >
                      Semua Sisa ({remainingQtyInActive})
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmReceiveInActiveDoc}
                  disabled={submittingReceive}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {submittingReceive ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan ke Stok...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Konfirmasi Terima ({receiveQty} {matchedItem.unit})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* WORKFLOW 2: MATCHED PRODUCT IN NEW INBOUND (CATAT MASUK BARU) */}
        {workflowMode === 'new_inbound' && matchedNewProduct && (
          <div className="bg-white border-2 border-emerald-400 rounded-xl p-4 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                  {matchedNewProduct.sku}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {matchedNewProduct.name}
                </h3>
              </div>
              <span className="text-xs text-slate-500">Satuan: <strong>{matchedNewProduct.unit}</strong></span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Jumlah Fisik Diterima:</span>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setNewInboundQty((prev) => Math.max(1, prev - 1))}
                    disabled={newInboundQty <= 1}
                    className="p-1.5 border border-slate-300 rounded-l-lg bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={newInboundQty}
                    onChange={(e) => setNewInboundQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 py-1 text-center font-mono font-bold text-sm border-y border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setNewInboundQty((prev) => prev + 1)}
                    className="p-1.5 border border-slate-300 rounded-r-lg bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs text-slate-500 font-medium">{matchedNewProduct.unit}</span>
              </div>

              <button
                type="button"
                onClick={handleAddDraftInboundItem}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah ke Daftar Catat Masuk</span>
              </button>
            </div>
          </div>
        )}

        {/* WORKFLOW 2: DRAFT INBOUND ITEMS TABLE & SUBMIT TO SUPERVISOR */}
        {workflowMode === 'new_inbound' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-3 p-3 sm:p-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Daftar Barang Masuk yang Dipindai</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {draftInboundItems.length} Jenis Produk (Total {totalDraftQuantity} Qty Fisik)
              </span>
            </div>

            {draftInboundItems.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Belum ada barang yang ditambahkan. Pindai barcode produk di atas untuk memasukkan ke daftar.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {draftInboundItems.map((item, idx) => (
                  <div key={item.product_id} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-slate-400 w-4">{idx + 1}.</span>
                      <span className="font-mono font-bold text-slate-900">{item.sku}</span>
                      <span className="text-slate-600 truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        +{item.quantity} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Big Action: Kirim Catat Masuk ke Supervisor */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dokumen akan langsung terbit di dashboard Supervisor untuk di-ACC.</span>
              </div>

              <button
                type="button"
                onClick={handleSubmitNewInboundToSupervisor}
                disabled={draftInboundItems.length === 0 || submittingNewInbound}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {submittingNewInbound ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menerbitkan Dokumen...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Catat Masuk ke Supervisor ({draftInboundItems.length} Item)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* WORKFLOW 1: ACTIVE DOCUMENT ITEMS CHECKLIST & SUPERVISOR ACC NOTICE */}
        {workflowMode === 'active_doc' && selectedDocument && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Daftar Item Inbound Dokumen ({selectedDocument.items.length} Item)</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Klik baris item untuk memilih langsung
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {loadingDetail ? (
                <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Memuat data item dokumen...</span>
                </div>
              ) : selectedDocument.items.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  Tidak ada item terdaftar dalam dokumen ini.
                </div>
              ) : (
                selectedDocument.items.map((item) => {
                  const rem = item.expected_quantity - item.received_quantity;
                  const isCompleted = item.status === 'COMPLETED' || rem <= 0;
                  const isHighlighted = highlightedItemId === item.id;
                  const isSelected = matchedItem?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setMatchedItem(item);
                        setReceiveQty(rem > 0 ? 1 : 0);
                        setHighlightedItemId(item.id);
                        setBarcodeQuery(item.sku);
                        playSound('success', soundEnabled);
                      }}
                      className={`p-2.5 sm:px-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                          : isHighlighted
                          ? 'bg-amber-50/80 animate-pulse'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.received_quantity > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Package className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {item.sku}
                            </span>
                            <StatusBadge status={item.status} size="sm" />
                          </div>
                          <div className="text-xs text-slate-600 truncate font-medium">
                            {item.product_name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <div className="text-xs font-bold font-mono text-slate-800">
                            {item.received_quantity} / {item.expected_quantity}{' '}
                            <span className="text-[10px] font-normal text-slate-500">{item.unit}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {rem > 0 ? (
                              <span className="text-amber-700 font-semibold">Sisa: {rem}</span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Lengkap 100%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ACC & PRINT RECEIPT STATUS FOOTER */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {selectedDocument.status === 'COMPLETED' ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Dokumen telah di-ACC oleh Supervisor! Bukti penerimaan dapat dicetak.</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (scannerRef.current && isCameraActive && !isCameraPaused) {
                        togglePauseCamera();
                      }
                      setDetailModalDocId(selectedDocument.id);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Bukti Penerimaan</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Status dokumen: <strong>Menunggu ACC Supervisor</strong>. Setelah di-ACC oleh Supervisor, bukti penerimaan barang siap dicetak.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>

    {/* In-Modal Document Detail: When closed, returns directly to Scan Barcode Modal! */}
    {detailModalDocId && (
      <Modal
        isOpen={true}
        onClose={() => {
          setDetailModalDocId(null);
          if (selectedDocId) {
            fetchDocumentDetail(selectedDocId);
          }
          resumeCameraIfPaused();
        }}
        title={
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Rincian Dokumen Penerimaan Barang</span>
          </div>
        }
        maxWidth="5xl"
        zIndex="z-60"
        backdropClassName="bg-black/60 backdrop-blur-xs"
      >
        <ReceivingDetailPage
          documentId={detailModalDocId}
          onBack={() => {
            setDetailModalDocId(null);
            if (selectedDocId) {
              fetchDocumentDetail(selectedDocId);
            }
            resumeCameraIfPaused();
          }}
          onNotify={onNotify}
          onUpdated={() => {
            fetchDocumentDetail(selectedDocId);
            onItemReceived?.();
          }}
          isModal={true}
        />
      </Modal>
    )}
  </>
  );
};

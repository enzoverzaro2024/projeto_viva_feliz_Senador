"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

interface CardData {
  cardId: string;
  name: string;
  cardNumber?: string;
}

export default function PrintCardsClient() {
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardTemplate, setCardTemplate] = useState<string | null>(null);
  const [templateQrX, setTemplateQrX] = useState(330);
  const [templateQrY, setTemplateQrY] = useState(80);
  const [templateQrSize, setTemplateQrSize] = useState(180);

  useEffect(() => {
    const cardsParam = searchParams.get("cards");
    if (cardsParam) {
      try {
        setCards(JSON.parse(decodeURIComponent(cardsParam)));
      } catch {}
    } else {
      const stored = sessionStorage.getItem("printDataMass");
      if (stored) {
        try {
          setCards(JSON.parse(stored));
        } catch {}
      }
    }
    
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        
        const s = data.settings || {};
        
        if (s.cardTemplateImage) setCardTemplate(s.cardTemplateImage);
        else setCardTemplate(localStorage.getItem("cardTemplateImage"));

        setTemplateQrX(s.templateQrX || Number(localStorage.getItem("cardTemplateQrX")) || 330);
        setTemplateQrY(s.templateQrY || Number(localStorage.getItem("cardTemplateQrY")) || 80);
        setTemplateQrSize(s.templateQrSize || Number(localStorage.getItem("cardTemplateQrSize")) || 180);

      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [searchParams]);

  const handlePrint = () => window.print();

  const extractNumber = (card: CardData) => {
    if (card.cardNumber) return String(card.cardNumber).padStart(3, '0');
    return card.name ? card.name.match(/\d+/)?.[0] ?? card.name : '';
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>;
  if (cards.length === 0) return <div style={{ padding: '2rem', textAlign: 'center' }}>Nenhum cartão para imprimir</div>;

  const CARD_W_MM = 85.6;
  const CARD_H_MM = 54;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 10mm; size: A4 portrait; }
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(2, ${CARD_W_MM}mm);
          gap: 2mm;
          justify-content: center;
          padding: 5mm;
        }
        .card-template-wrap {
          position: relative;
          width: ${CARD_W_MM}mm;
          height: ${CARD_H_MM}mm;
          overflow: hidden;
          page-break-inside: avoid;
        }
        .card-template-img {
          width: 100%;
          height: 100%;
          object-fit: fill;
          display: block;
        }
        .card-qr-overlay {
          position: absolute;
          top: ${(templateQrY / 400 * 100).toFixed(2)}%;
          left: ${(templateQrX / 560 * 100).toFixed(2)}%;
          width: ${(templateQrSize / 560 * 100).toFixed(2)}%;
        }
        .card-number {
          text-align: center;
          font-family: monospace;
          font-weight: 800;
          font-size: 1em;
          color: #1a1a2e;
          background: rgba(255,255,255,0.85);
          border-radius: 4px;
          margin-bottom: 2px;
          padding: 1px 4px;
          letter-spacing: 1px;
        }
      `}</style>

      {/* Print button */}
      <div className="no-print" style={{ padding: '1rem', textAlign: 'center', background: '#f8f9fa', borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={handlePrint} style={{
          background: '#6366f1', color: 'white', border: 'none', borderRadius: '0.5rem',
          padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}>
          🖨️ Imprimir {cards.length} Cartões
        </button>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
          {cardTemplate
            ? 'Orientação: Paisagem (A4). Usando arte personalizada.'
            : 'Dica: Use papel A4, orientação retrato. Os cartões são cortados ao longo das linhas tracejadas.'}
        </p>
      </div>

      {/* Cards Grid */}
      <div className="card-grid">
        {cards.map((card, i) => (
          cardTemplate ? (
            /* Template mode: JPG background + QR + number */
            <div key={i} className="card-template-wrap">
              <img src={cardTemplate} crossOrigin="anonymous" alt="arte" className="card-template-img" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
              <div className="card-qr-overlay">
                <div className="card-number">
                  {extractNumber(card)}
                </div>
                <QRCodeCanvas value={card.cardId} size={256} level="M" includeMargin={false}
                  style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            </div>
          ) : (
            /* Default mode */
            <div key={i} style={{
              border: '1px dashed #ccc',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pageBreakInside: 'avoid',
              minHeight: '55mm',
              background: 'white',
            }}>
              <div style={{
                background: '#6366f1', color: 'white',
                padding: '4px 20px', borderRadius: '12px',
                fontSize: '11px', fontWeight: 700, fontFamily: 'Inter, Arial, sans-serif',
                marginBottom: '6px', letterSpacing: '0.5px',
              }}>
                ♥ EventCard
              </div>
              <QRCodeCanvas value={card.cardId} size={90} level="M" includeMargin={false} />
              <div style={{
                marginTop: '6px', fontSize: '16px', fontWeight: 800,
                fontFamily: 'monospace', color: '#1a1a2e', letterSpacing: '1px',
              }}>
                {card.cardId}
              </div>
              <div style={{ fontSize: '9px', color: '#9ca3af', fontFamily: 'Inter, Arial, sans-serif', marginTop: '2px' }}>
                {card.name}
              </div>
            </div>
          )
        ))}
      </div>
    </>
  );
}

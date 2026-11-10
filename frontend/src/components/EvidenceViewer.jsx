import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import useBodyScrollLock from '../hooks/useBodyScrollLock.js'

function EvidenceViewer({ url, label = 'Lihat bukti' }) {
  const [open, setOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  useBodyScrollLock(open)

  function openViewer() {
    setImageError(false)
    setOpen(true)
  }

  return (
    <>
      <button className="return-evidence-link" type="button" onClick={openViewer}>
        {label} <ExternalLink size={12} />
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="detail-modal evidence-viewer-modal" role="dialog" aria-modal="true" aria-labelledby="return-evidence-title">
            <div className="modal-heading">
              <div><p className="eyebrow">Dokumentasi pengajuan</p><h2 id="return-evidence-title">Bukti foto retur</h2></div>
              <button className="icon-button" type="button" aria-label="Tutup bukti foto" onClick={() => setOpen(false)}><X size={19} /></button>
            </div>
            {imageError
              ? <p className="evidence-viewer-error" role="alert">Foto bukti tidak dapat ditampilkan.</p>
              : <img className="evidence-viewer-image" src={url} alt="Bukti foto pengajuan retur" onError={() => setImageError(true)} />}
          </section>
        </div>
      )}
    </>
  )
}

export default EvidenceViewer

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CalendarDays, Check, ChevronDown, Clock3, Plus, Save, School, Trash2, Utensils, Wheat, X } from 'lucide-react'
import { apiRequest } from '../lib/api.js'

const LEVELS = ['SD', 'SMP', 'SMA', 'SMK', 'SLB']
const NUTRIENT_FIELDS = [
  { key: 'calories', label: 'Energi', unit: 'kkal', max: 900, icon: '⚡' },
  { key: 'protein', label: 'Protein', unit: 'g', max: 40, icon: '◉' },
  { key: 'carbohydrates', label: 'Karbohidrat', unit: 'g', max: 120, icon: '◈' },
  { key: 'fat', label: 'Lemak', unit: 'g', max: 35, icon: '◌' },
]

function localDateValue() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatScheduleDate(value) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
}

function NutritionPage() {
  const [ingredients, setIngredients] = useState([])
  const [schools, setSchools] = useState([])
  const [menus, setMenus] = useState([])
  const [form, setForm] = useState({
    name: '',
    educationLevel: 'SD',
    date: localDateValue(),
    productionNote: '',
  })
  const [rows, setRows] = useState([])
  const [schoolIds, setSchoolIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [ingredientFormOpen, setIngredientFormOpen] = useState(false)
  const [savingIngredient, setSavingIngredient] = useState(false)
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    category: '',
    calories: '',
    protein: '',
    carbohydrates: '',
    fat: '',
  })

  const loadPageData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ingredientResult, schoolResult, menuResult] = await Promise.all([
        apiRequest('/api/admin/nutrition/ingredients'),
        apiRequest('/api/admin/schools'),
        apiRequest('/api/admin/nutrition/menus'),
      ])
      setIngredients(ingredientResult.ingredients)
      setSchools(schoolResult.schools.filter((school) => school.isActive))
      setMenus(menuResult.menus)
    } catch (requestError) {
      setError(requestError.message || 'Data menu dan gizi gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPageData() }, [loadPageData])

  const eligibleSchools = useMemo(
    () => schools.filter((school) => school.educationLevel === form.educationLevel),
    [schools, form.educationLevel],
  )
  const nutrition = useMemo(() => rows.reduce((total, row) => {
    const ingredient = ingredients.find((item) => item.id === row.ingredientId)
    const multiplier = Number(row.amountGrams || 0) / 100
    if (!ingredient || !Number.isFinite(multiplier)) return total
    total.calories += ingredient.calories * multiplier
    total.protein += ingredient.protein * multiplier
    total.carbohydrates += ingredient.carbohydrates * multiplier
    total.fat += ingredient.fat * multiplier
    return total
  }, { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }), [ingredients, rows])
  const totalWeight = rows.reduce((sum, row) => sum + (Number(row.amountGrams) || 0), 0)
  const targetPortions = eligibleSchools
    .filter((school) => schoolIds.includes(school.id))
    .reduce((sum, school) => sum + school.targetPupils, 0)

  function changeLevel(level) {
    setForm({ ...form, educationLevel: level })
    setSchoolIds([])
  }

  function addIngredient() {
    const ingredient = ingredients.find((item) => !rows.some((row) => row.ingredientId === item.id))
      || ingredients[0]
    if (ingredient) setRows([...rows, { ingredientId: ingredient.id, amountGrams: '10' }])
  }

  function updateIngredient(index, key, value) {
    setRows(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row))
  }

  function toggleSchool(id) {
    setSchoolIds((current) => current.includes(id) ? current.filter((schoolId) => schoolId !== id) : [...current, id])
  }

  async function saveAndSchedule(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest('/api/admin/nutrition/menus', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          schoolIds,
          ingredients: rows.map((row) => ({ ingredientId: row.ingredientId, amountGrams: Number(row.amountGrams) })),
        }),
      })
      setNotice(result.message)
      setSchoolIds([])
      setForm((current) => ({ ...current, name: '', productionNote: '' }))
      await loadPageData()
    } catch (requestError) {
      setError(requestError.message || 'Menu MBG gagal dijadwalkan.')
    } finally {
      setSaving(false)
    }
  }

  async function saveNewIngredient(event) {
    event.preventDefault()
    setSavingIngredient(true)
    setError('')
    try {
      const result = await apiRequest('/api/admin/nutrition/ingredients', {
        method: 'POST',
        body: JSON.stringify({
          ...ingredientForm,
          unit: 'g',
          calories: Number(ingredientForm.calories),
          protein: Number(ingredientForm.protein),
          carbohydrates: Number(ingredientForm.carbohydrates),
          fat: Number(ingredientForm.fat),
        }),
      })
      setIngredients((current) => [...current, result.ingredient].sort((a, b) => a.name.localeCompare(b.name, 'id')))
      setRows((current) => [...current, { ingredientId: result.ingredient.id, amountGrams: '50' }])
      setIngredientForm({ name: '', category: '', calories: '', protein: '', carbohydrates: '', fat: '' })
      setIngredientFormOpen(false)
      setNotice(result.message)
    } catch (requestError) {
      setError(requestError.message || 'Bahan makanan gagal disimpan.')
    } finally {
      setSavingIngredient(false)
    }
  }

  return (
    <main className="dashboard-content nutrition-page">
      <div className="page-heading">
        <div>
          <p className="breadcrumb">Admin <span>/</span> Menu &amp; Gizi</p>
          <p className="eyebrow"><span className="eyebrow-line" /> Penyusunan menu program MBG</p>
          <h1>Menu &amp; kalkulasi gizi harian</h1>
          <p className="page-description">Atur komposisi per porsi, pilih sekolah penerima, dan jadwalkan persiapan distribusi.</p>
        </div>
        <div className="date-badge"><CalendarDays size={15} /><span>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${form.date}T12:00:00`))}</span></div>
      </div>

      {notice && <div className="inline-notice success-notice" role="status"><Check size={16} /> {notice}</div>}
      {error && <div className="inline-notice error-notice" role="alert"><AlertTriangle size={16} /> {error}</div>}
      {loading ? <div className="panel management-empty"><span className="loading-spinner" /> Memuat data menu dan bahan makanan...</div> : (
        <form onSubmit={saveAndSchedule}>
          <div className="nutrition-workspace">
            <section className="panel nutrition-form-panel">
              <div className="nutrition-panel-heading">
                <div className="nutrition-heading-icon"><Utensils size={18} /></div>
                <div><h2>Rincian menu harian</h2><p>Susun bahan MBG untuk satu porsi siswa</p></div>
                <span className="draft-status"><span /> Rancangan</span>
              </div>
              <div className="nutrition-form-content">
                <label className="form-label" htmlFor="menu-name">Nama menu</label>
                <input className="management-input" id="menu-name" required maxLength={160} placeholder="Contoh: Nasi ayam tumis sayur & pisang" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />

                <div className="nutrition-top-fields">
                  <div><label className="form-label" htmlFor="menu-level">Jenjang sekolah penerima</label>
                    <span className="select-input-wrap"><select className="management-input" id="menu-level" value={form.educationLevel} onChange={(event) => changeLevel(event.target.value)}>{LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select><ChevronDown size={14} /></span>
                  </div>
                  <div><label className="form-label" htmlFor="menu-date">Tanggal distribusi</label><input className="management-input" id="menu-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
                </div>

                <section className="school-picker">
                  <div className="picker-heading">
                    <span><School size={15} /> Sekolah penerima <strong>{schoolIds.length}</strong></span>
                    {eligibleSchools.length > 0 && <button type="button" onClick={() => setSchoolIds(schoolIds.length === eligibleSchools.length ? [] : eligibleSchools.map((school) => school.id))}>{schoolIds.length === eligibleSchools.length ? 'Hapus pilihan' : 'Pilih semua'}</button>}
                  </div>
                  {!eligibleSchools.length ? (
                    <div className="no-eligible-schools">Belum ada sekolah aktif jenjang {form.educationLevel}. <Link to="/schools">Tambah sekolah <ArrowRight size={12} /></Link></div>
                  ) : (
                    <div className="school-checkbox-list">
                      {eligibleSchools.map((school) => (
                        <label className={`school-checkbox-row${schoolIds.includes(school.id) ? ' school-selected' : ''}`} key={school.id}>
                          <input type="checkbox" checked={schoolIds.includes(school.id)} onChange={() => toggleSchool(school.id)} />
                          <span className="custom-checkbox"><Check size={11} /></span>
                          <span className="school-checkbox-name">{school.name}</span>
                          <span className="school-checkbox-portions">{school.targetPupils.toLocaleString('id-ID')} porsi</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="picker-target"><span>Target distribusi yang dijadwalkan</span><strong>{targetPortions.toLocaleString('id-ID')} porsi <span>·</span> {schoolIds.length} sekolah</strong></p>
                </section>

                <div className="ingredient-section-heading">
                  <div><h3>Daftar bahan makanan</h3><p>Nilai gizi bahan dihitung untuk porsi yang dimasak</p></div>
                  <div className="ingredient-heading-actions">
                    <button className="button-secondary add-ingredient-button" type="button" onClick={() => setIngredientFormOpen(true)}><Plus size={14} /> Bahan katalog</button>
                    <button className="button-secondary add-ingredient-button" type="button" onClick={addIngredient} disabled={!ingredients.length || rows.length >= ingredients.length}><Plus size={14} /> Ke menu</button>
                  </div>
                </div>
                {!ingredients.length ? <div className="no-eligible-schools">Katalog bahan masih kosong. Tambahkan bahan makanan dan masukkan nilai gizi dari label atau sumber tepercaya.</div> : (
                  <div className="ingredient-cards">
                    {rows.map((row, index) => {
                      const selected = ingredients.find((ingredient) => ingredient.id === row.ingredientId)
                      return (
                        <div className="ingredient-card" key={`${row.ingredientId}-${index}`}>
                          <span className="ingredient-card-icon"><Wheat size={16} /></span>
                          <label className="sr-only" htmlFor={`ingredient-${index}`}>Bahan makanan ke-{index + 1}</label>
                          <span className="select-input-wrap ingredient-select-wrap"><select className="management-input ingredient-select" id={`ingredient-${index}`} required value={row.ingredientId} onChange={(event) => updateIngredient(index, 'ingredientId', event.target.value)}>{ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}</select><ChevronDown size={13} /></span>
                          <label className="sr-only" htmlFor={`amount-${index}`}>Jumlah bahan dalam gram</label>
                          <span className="amount-input-wrap"><input className="management-input amount-input" id={`amount-${index}`} type="number" min="0.1" step="0.1" max="10000" required value={row.amountGrams} onChange={(event) => updateIngredient(index, 'amountGrams', event.target.value)} /><span>g</span></span>
                          <span className="ingredient-category">{selected?.category}</span>
                          <button className="remove-ingredient" type="button" aria-label={`Hapus ${selected?.name || 'bahan'}`} onClick={() => setRows(rows.filter((_, rowIndex) => rowIndex !== index))}><Trash2 size={15} /></button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <p className="ingredient-total"><span>{rows.length} bahan <span>·</span> Total berat per porsi</span><strong>{totalWeight.toLocaleString('id-ID')} g</strong></p>

                <label className="form-label production-note-label" htmlFor="production-note">Catatan persiapan dapur <span className="optional-label">Opsional</span></label>
                <textarea className="management-input production-note-input" id="production-note" rows="2" maxLength={2000} placeholder="Contoh: Porsi dikemas terpisah. Distribusi dimulai pukul 08.00 WIB." value={form.productionNote} onChange={(event) => setForm({ ...form, productionNote: event.target.value })} />
              </div>
            </section>

            <aside className="panel nutrition-summary-panel">
              <div className="nutrition-panel-heading summary-heading">
                <div className="nutrition-heading-icon nutrition-summary-icon"><Wheat size={18} /></div>
                <div><h2>Ringkasan nilai gizi</h2><p>Estimasi kandungan untuk satu porsi</p></div>
              </div>
              <div className="nutrition-values">
                {NUTRIENT_FIELDS.map((nutrient) => {
                  const value = nutrition[nutrient.key]
                  const barWidth = Math.min((value / nutrient.max) * 100, 100)
                  return (
                    <article className="nutrient-card" key={nutrient.key}>
                      <div className="nutrient-name"><span className="nutrient-symbol">{nutrient.icon}</span>{nutrient.label}<span>({nutrient.unit})</span></div>
                      <strong>{nutrient.key === 'calories' ? Math.round(value) : Number(value.toFixed(1))}</strong>
                      <div className="nutrient-bar"><span style={{ width: `${barWidth}%` }} /></div>
                      <div className="nutrient-reference">
                        <span>Per porsi</span>
                        <span>Estimasi per porsi</span>
                      </div>
                    </article>
                  )
                })}
              </div>
              <p className="nutrition-disclaimer"><strong>Catatan estimasi</strong><span>Angka dihitung dari nilai per 100 g yang dikelola admin. Gunakan label atau sumber tepercaya dan minta verifikasi tenaga gizi sebelum produksi.</span></p>
              <p className="nutrition-updated"><Clock3 size={12} /> Kalkulasi diperbarui otomatis</p>
            </aside>
          </div>

          <div className="schedule-action-bar">
            <div><strong>{form.date ? `Distribusi ${form.educationLevel} · ${formatScheduleDate(`${form.date}T12:00:00`)}` : 'Tanggal distribusi belum dipilih'}</strong><span>{targetPortions.toLocaleString('id-ID')} porsi <span>·</span> {schoolIds.length} sekolah penerima</span></div>
            <button className="button-primary" type="submit" disabled={saving || !schoolIds.length || !rows.length}>
              <Save size={15} /> {saving ? 'Menyimpan jadwal...' : 'Simpan & jadwalkan distribusi'}
            </button>
          </div>
        </form>
      )}

      <section className="panel scheduled-menus-panel">
        <div className="panel-heading">
          <div><h2>Jadwal menu tersimpan</h2><p>Menu yang sudah disiapkan dan sekolah penerima</p></div>
          <span className="school-total"><CalendarDays size={14} /> {menus.length} jadwal</span>
        </div>
        {!menus.length ? <div className="management-empty">Belum ada jadwal menu. Susun menu MBG di atas untuk memulai.</div> : (
          <div className="saved-menu-list">
            {menus.slice(0, 5).map((menu) => {
              const portions = menu.recipients.reduce((sum, recipient) => sum + recipient.portions, 0)
              return (
                <article className="saved-menu-row" key={menu.id}>
                  <span className="saved-menu-icon"><Utensils size={16} /></span>
                  <div><strong>{menu.name}</strong><span>{menu.recipients.length} sekolah <span>·</span> {portions.toLocaleString('id-ID')} porsi</span></div>
                  <span className="saved-menu-date">{formatScheduleDate(menu.date)}</span>
                  <span className="saved-menu-level">{menu.educationLevel}</span>
                </article>
              )
            })}
          </div>
        )}
      </section>
      {ingredientFormOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIngredientFormOpen(false) }}>
          <section className="detail-modal school-modal ingredient-modal" role="dialog" aria-modal="true" aria-labelledby="new-ingredient-title">
            <div className="modal-heading">
              <div><p className="eyebrow">Katalog bahan menu</p><h2 id="new-ingredient-title">Tambah bahan makanan</h2></div>
              <button className="icon-button" type="button" aria-label="Tutup formulir bahan" onClick={() => setIngredientFormOpen(false)}><X size={19} /></button>
            </div>
            <p className="school-modal-description">Masukkan nilai gizi berdasarkan 100 g bahan dari label produk atau sumber tepercaya.</p>
            <form className="school-form ingredient-form" onSubmit={saveNewIngredient}>
              <label className="form-label" htmlFor="ingredient-name">Nama bahan</label>
              <input className="management-input" id="ingredient-name" required maxLength={120} placeholder="Nama bahan makanan" value={ingredientForm.name} onChange={(event) => setIngredientForm({ ...ingredientForm, name: event.target.value })} />
              <label className="form-label" htmlFor="ingredient-category">Kategori</label>
              <input className="management-input" id="ingredient-category" required maxLength={60} placeholder="Contoh: sumber protein" value={ingredientForm.category} onChange={(event) => setIngredientForm({ ...ingredientForm, category: event.target.value })} />
              <div className="ingredient-nutrient-fields">
                {NUTRIENT_FIELDS.map((nutrient) => (
                  <div key={nutrient.key}>
                    <label className="form-label" htmlFor={`catalog-${nutrient.key}`}>{nutrient.label} ({nutrient.unit})</label>
                    <input className="management-input" id={`catalog-${nutrient.key}`} type="number" min="0" max="10000" step="0.01" required placeholder="0" value={ingredientForm[nutrient.key]} onChange={(event) => setIngredientForm({ ...ingredientForm, [nutrient.key]: event.target.value })} />
                  </div>
                ))}
              </div>
              <p className="school-form-help"><Wheat size={13} /> Masukkan nilai per 100 g bahan sesuai sumber yang digunakan.</p>
              <button className="button-primary school-submit-button" type="submit" disabled={savingIngredient}>
                {savingIngredient ? 'Menyimpan bahan...' : <><Plus size={16} /> Simpan ke katalog</>}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default NutritionPage

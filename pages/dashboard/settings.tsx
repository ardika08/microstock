import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import { useUser } from "~/hooks/useUser"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Camera, Eye, EyeOff, Bell, Mail, MessageSquare, ShieldAlert, Check, Loader2, Key, AlertCircle } from "lucide-react"

function PasswordStrengthMeter({ password }: { password: string }) {
  const getStrength = (pw: string) => {
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    return score
  }

  const strength = getStrength(password)
  const labels = ["", "Lemah", "Cukup", "Baik", "Kuat"]
  const textColors = ["", "text-red-400", "text-amber-400", "text-blue-400", "text-emerald-400"]

  if (!password) return null

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              level <= strength
                ? strength === 1
                  ? "bg-red-500"
                  : strength === 2
                  ? "bg-amber-500"
                  : strength === 3
                  ? "bg-blue-500"
                  : "bg-emerald-500"
                : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className={`text-xs font-medium ${textColors[strength]}`}>
          Kekuatan password: {labels[strength]}
        </p>
      )}
    </div>
  )
}

interface ToggleProps {
  label: string
  description: string
  icon: React.ElementType
  defaultChecked?: boolean
}

function NotificationToggle({ label, description, icon: Icon, defaultChecked = false }: ToggleProps) {
  const [enabled, setEnabled] = useState(defaultChecked)
  return (
    <div className="flex items-start justify-between py-4 border-b border-white/5 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="bg-slate-800 p-2 rounded-lg mt-0.5">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 flex-shrink-0 mt-0.5 ${
          enabled
            ? "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
            : "bg-slate-700"
        }`}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <motion.span
          animate={{ x: enabled ? 22 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const { planType } = useUser()

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [apiKeyMasked, setApiKeyMasked] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)
  const [avatarHover, setAvatarHover] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ✅ Init dari session — bukan hardcoded
  const [profileForm, setProfileForm] = useState({
    nama: "",
    email: "",
    telepon: "",
  })

  // ✅ Load profil dari session dan /api/user/me
  useEffect(() => {
    if (session?.user) {
      setProfileForm({
        nama: session.user.name || "",
        email: session.user.email || "",
        telepon: "",
      })
      setProfileLoading(false)
    }
  }, [session])

  // Load existing API key on mount
  useEffect(() => {
    fetch('/api/user/api-key')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => {
        if (d.hasKey) {
          setApiKey(d.maskedKey || '')
          setApiKeyMasked(true)
        }
      })
      .catch(() => {})
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2_000_000) {
      alert('File terlalu besar. Maksimum 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ✅ Profile save — real API call
  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileError(null)
    try {
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileForm.nama }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal menyimpan profil')
      }
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err: any) {
      setProfileError(err.message || 'Gagal menyimpan profil. Coba lagi.')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSaveApiKey = async () => {
    if (apiKeyMasked) return
    setApiKeySaving(true)
    setApiKeyError(null)
    try {
      const res = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal menyimpan')
      }
      localStorage.setItem('autofillstock_openai_key', apiKey.trim())
      setApiKeySaved(true)
      setApiKeyMasked(true)
      setTimeout(() => setApiKeySaved(false), 3000)
    } catch (err: any) {
      setApiKeyError(err.message || 'Gagal menyimpan API key. Coba lagi.')
    } finally {
      setApiKeySaving(false)
    }
  }

  // ✅ Password save — validasi + real API call (endpoint PATCH /api/user/me)
  const handleSavePassword = async () => {
    setPasswordError(null)

    // Validasi client-side
    if (!currentPassword) {
      setPasswordError('Masukkan password saat ini.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password baru minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password tidak cocok.')
      return
    }

    setPasswordSaving(true)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal mengubah password')
      }
      setPasswordSaved(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSaved(false), 3000)
    } catch (err: any) {
      setPasswordError(err.message || 'Gagal mengubah password. Coba lagi.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const inputClasses = "w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"

  // ✅ DashboardLayout tanpa hardcoded name/email
  return (
    <DashboardLayout title="Settings">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Pengaturan</h1>
          <p className="text-gray-400 mt-1">Kelola profil, keamanan, dan preferensi notifikasi Anda</p>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-white/10 rounded-xl p-6"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-100">Profil</h2>
            <p className="text-sm text-gray-400">Update informasi profil Anda</p>
          </div>

          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-6">
              <div
                className="relative cursor-pointer"
                onMouseEnter={() => setAvatarHover(true)}
                onMouseLeave={() => setAvatarHover(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden ring-2 ring-blue-500/20">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : session?.user?.image ? (
                    <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(session?.user?.name || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <AnimatePresence>
                  {avatarHover && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">Foto Profil</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, atau GIF (maks. 2MB)</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs text-gray-300 hover:bg-slate-700 transition-colors"
                >
                  Ganti Foto
                </button>
              </div>
            </div>

            {/* Form Fields */}
            {profileLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat profil...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="nama" className="text-sm font-medium text-gray-300">Nama Lengkap</label>
                  <input
                    id="nama"
                    value={profileForm.nama}
                    onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                    className={inputClasses}
                    placeholder="Nama Anda"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-300">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    readOnly
                    className={`${inputClasses} opacity-50 cursor-not-allowed`}
                  />
                  <p className="text-xs text-gray-500">Email tidak dapat diubah</p>
                </div>
              </div>
            )}

            {/* Error */}
            {profileError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {profileError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving || profileLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg text-sm font-medium transition-all duration-200"
              >
                {profileSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : profileSaved ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {profileSaving ? "Menyimpan..." : profileSaved ? "Tersimpan!" : "Simpan Perubahan"}
              </button>
              {profileSaved && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-emerald-400"
                >
                  Profil berhasil diperbarui
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>

        {/* OpenAI API Key Card — for lifetime and free plan */}
        {(planType === "lifetime" || planType === "free" || planType === "topup") && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-900 border border-white/10 rounded-xl p-6"
        >
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Key className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-100">OpenAI API Key</h2>
            </div>
            <p className="text-sm text-gray-400">
              Diperlukan untuk paket Free Trial dan One-time. Paket Starter menggunakan API key dari server.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setApiKeyMasked(false) }}
                  placeholder="sk-..."
                  className={inputClasses + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  aria-label={showApiKey ? "Sembunyikan API key" : "Tampilkan API key"}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Dapatkan API key di <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">platform.openai.com/api-keys</a>
              </p>
            </div>

            {apiKeyError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {apiKeyError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveApiKey}
                disabled={apiKeySaving || apiKeyMasked || !apiKey.startsWith('sk-')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all duration-200"
              >
                {apiKeySaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : apiKeySaved ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
                {apiKeySaving ? "Menyimpan..." : apiKeySaved ? "Tersimpan!" : "Simpan API Key"}
              </button>
              {apiKey && !apiKeyMasked && (
                <button
                  onClick={() => { setApiKey(''); setApiKeySaved(false); setApiKeyError(null) }}
                  className="px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                >
                  Hapus
                </button>
              )}
              {apiKeyMasked && (
                <button
                  onClick={() => { setApiKey(''); setApiKeyMasked(false) }}
                  className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-all duration-200"
                >
                  Ganti Key
                </button>
              )}
            </div>

            {apiKeySaved && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> API key tersimpan
              </p>
            )}
          </div>
        </motion.div>
        )}

        {/* Change Password Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-white/10 rounded-xl p-6"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-100">Ubah Password</h2>
            <p className="text-sm text-gray-400">Pastikan akun Anda menggunakan password yang kuat</p>
          </div>

          <div className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <label htmlFor="current-pw" className="text-sm font-medium text-gray-300">Password Saat Ini</label>
              <div className="relative">
                <input
                  id="current-pw"
                  type={showCurrentPw ? "text" : "password"}
                  placeholder="Masukkan password saat ini"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`${inputClasses} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showCurrentPw ? "Sembunyikan" : "Tampilkan"}
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label htmlFor="new-pw" className="text-sm font-medium text-gray-300">Password Baru</label>
              <div className="relative">
                <input
                  id="new-pw"
                  type={showNewPw ? "text" : "password"}
                  placeholder="Masukkan password baru"
                  className={`${inputClasses} pr-10`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showNewPw ? "Sembunyikan" : "Tampilkan"}
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={newPassword} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirm-pw" className="text-sm font-medium text-gray-300">Konfirmasi Password Baru</label>
              <div className="relative">
                <input
                  id="confirm-pw"
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputClasses} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showConfirmPw ? "Sembunyikan" : "Tampilkan"}
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Show mismatch warning live */}
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Password tidak cocok
                </p>
              )}
            </div>

            {/* Error */}
            {passwordError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {passwordError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSavePassword}
                disabled={passwordSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg text-sm font-medium transition-all duration-200"
              >
                {passwordSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : passwordSaved ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {passwordSaving ? "Menyimpan..." : passwordSaved ? "Password Diperbarui!" : "Ubah Password"}
              </button>
              {passwordSaved && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-emerald-400"
                >
                  Password berhasil diubah
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900 border border-white/10 rounded-xl p-6"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-100">Preferensi Notifikasi</h2>
            <p className="text-sm text-gray-400">Atur jenis notifikasi yang ingin Anda terima</p>
          </div>

          <div>
            <NotificationToggle
              label="Notifikasi Email"
              description="Terima ringkasan aktivitas via email setiap hari"
              icon={Mail}
              defaultChecked={true}
            />
            <NotificationToggle
              label="Generate Selesai"
              description="Notifikasi setiap kali proses generate metadata selesai"
              icon={Bell}
              defaultChecked={true}
            />
            <NotificationToggle
              label="Pesan & Pengumuman"
              description="Update produk, tips, dan pengumuman dari tim Autofillstock"
              icon={MessageSquare}
              defaultChecked={false}
            />
            <NotificationToggle
              label="Peringatan Keamanan"
              description="Notifikasi login baru atau aktivitas mencurigakan"
              icon={ShieldAlert}
              defaultChecked={true}
            />
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

import React, { useState, useRef } from "react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Camera, Eye, EyeOff, Bell, Mail, MessageSquare, ShieldAlert, Check } from "lucide-react"

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
  const colors = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"]
  const textColors = ["", "text-red-600", "text-yellow-600", "text-blue-600", "text-green-600"]

  if (!password) return null

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              level <= strength ? colors[strength] : "bg-gray-200"
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
    <div className="flex items-start justify-between py-4 border-b last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="bg-gray-100 p-2 rounded-lg mt-0.5">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5 ${
          enabled ? "bg-blue-600" : "bg-gray-300"
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [profileSaved, setProfileSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profileForm, setProfileForm] = useState({
    nama: "Budi Santoso",
    email: "budi@example.com",
    telepon: "+62 812 3456 7890",
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = () => {
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const handleSavePassword = () => {
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  return (
    <DashboardLayout title="Settings" userName="Budi Santoso" userEmail="budi@example.com">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-gray-500 mt-1">Kelola profil, keamanan, dan preferensi notifikasi Anda</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>Update informasi profil Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    "B"
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-gray-50 transition-colors"
                  title="Upload foto"
                >
                  <Camera className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Foto Profil</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, atau GIF (maks. 2MB)</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Ganti Foto
                </Button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input
                  id="nama"
                  value={profileForm.nama}
                  onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  readOnly
                  className="bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">Email tidak dapat diubah</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="telepon">Nomor Telepon</Label>
                <Input
                  id="telepon"
                  value={profileForm.telepon}
                  onChange={(e) => setProfileForm({ ...profileForm, telepon: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveProfile} className="gap-2">
                {profileSaved && <Check className="w-4 h-4" />}
                {profileSaved ? "Tersimpan!" : "Simpan Perubahan"}
              </Button>
              {profileSaved && <p className="text-sm text-green-600">Profil berhasil diperbarui</p>}
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ubah Password</CardTitle>
            <CardDescription>Pastikan akun Anda menggunakan password yang kuat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-pw">Password Saat Ini</Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  type={showCurrentPw ? "text" : "password"}
                  placeholder="Masukkan password saat ini"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-pw">Password Baru</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNewPw ? "text" : "password"}
                  placeholder="Masukkan password baru"
                  className="pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={newPassword} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Konfirmasi Password Baru</Label>
              <div className="relative">
                <Input
                  id="confirm-pw"
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Ulangi password baru"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSavePassword} className="gap-2">
                {passwordSaved && <Check className="w-4 h-4" />}
                {passwordSaved ? "Password Diperbarui!" : "Ubah Password"}
              </Button>
              {passwordSaved && <p className="text-sm text-green-600">Password berhasil diubah</p>}
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferensi Notifikasi</CardTitle>
            <CardDescription>Atur jenis notifikasi yang ingin Anda terima</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

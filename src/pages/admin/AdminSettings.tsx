import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FloatingNav } from "@/components/FloatingNav"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { GlassCard } from "@/components/GlassCard"
import { useFeedback } from "@/context/FeedbackContext"
import { 
  Settings2, 
  ShieldCheck, 
  KeyRound, 
  Database, 
  BellRing, 
  Globe, 
  Cpu, 
  Save, 
  RotateCcw, 
  Check, 
  SlidersHorizontal,
  Lock,
  Mail,
  Network,
  HardDriveDownload,
  Terminal,
  Activity,
  UserCheck
} from "lucide-react"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
}

export default function AdminSettings() {
  const subPages = getSectionChildren("/admin")
  const { showToast, confirm } = useFeedback()
  
  // Settings States
  const [systemName, setSystemName] = useState("HKC Trading Enterprise")
  const [primaryCurrency, setPrimaryCurrency] = useState("ETB")
  const [timezone, setTimezone] = useState("UTC-5 (EST)")
  const [activeTab, setActiveTab] = useState("general")
  const [isSaved, setIsSaved] = useState(false)

  // Interactive switches
  const [toggles, setToggles] = useState({
    maintenanceMode: false,
    twoFactorAuth: true,
    apiCaching: true,
    emailAlerts: true,
    debugLogs: false,
    autoBackup: true
  })

  // Numeric states
  const [sessionTimeout, setSessionTimeout] = useState(30) // minutes
  const [backupFrequency, setBackupFrequency] = useState(24) // hours

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    confirm({
      title: "Commit Settings Update",
      message: "Are you sure you want to apply these system configurations to all active ERP environment nodes?",
      confirmLabel: "Apply Settings",
      cancelLabel: "Cancel",
      onConfirm: () => {
        setIsSaved(true)
        showToast(
          "Settings Saved Successfully",
          "success",
          "Global configuration properties have been successfully updated."
        )
        setTimeout(() => setIsSaved(false), 3000)
      }
    })
  }

  const handleReset = () => {
    confirm({
      title: "Reset Configuration Defaults",
      message: "This will revert all database intervals, authentication policies, and primary defaults to standard values. Are you sure?",
      confirmLabel: "Reset System",
      cancelLabel: "Cancel",
      isDestructive: true,
      onConfirm: () => {
        setSystemName("HKC Trading Enterprise")
        setPrimaryCurrency("ETB")
        setTimezone("UTC-5 (EST)")
        setToggles({
          maintenanceMode: false,
          twoFactorAuth: true,
          apiCaching: true,
          emailAlerts: true,
          debugLogs: false,
          autoBackup: true
        })
        setSessionTimeout(30)
        setBackupFrequency(24)
        showToast(
          "System Reset Succeeded",
          "warning",
          "Configurations successfully restored to original parameters."
        )
      }
    })
  }

  // Sidebar settings tabs configuration
  const settingsTabs = [
    { id: "general", label: "General System", icon: Settings2, description: "Name, currency, timezone, & metadata" },
    { id: "security", label: "Security & Auth", icon: ShieldCheck, description: "2FA, session policies, password strength" },
    { id: "api", label: "API & Integrations", icon: KeyRound, description: "Manage webhooks, tokens & rate limits" },
    { id: "backups", label: "Data & Backups", icon: Database, description: "Backup intervals, logs & direct export" },
    { id: "notifications", label: "Notifications", icon: BellRing, description: "System alerts, Slack, and email webhooks" }
  ]

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={fade} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">System Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Configure global preferences, authentication policies, and backup rules.</p>
          </div>
          <div className="shrink-0">
            <SubPageNav items={subPages} />
          </div>
        </div>

        {/* Saved Success Banner */}
        <AnimatePresence>
          {isSaved && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-sm font-semibold px-4 py-3 rounded-2xl mb-6 flex items-center gap-2"
            >
              <Check className="size-4 shrink-0" />
              Global preferences and environment variables have been updated successfully!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar Tabs Selectors */}
          <div className="flex flex-col gap-2">
            {settingsTabs.map((tab) => {
              const TabIcon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 group",
                    isSelected 
                      ? "bg-[#1c1c1e] border-transparent text-white shadow-md shadow-black/10" 
                      : "glass-card border-black/[0.03] text-[#505054] hover:text-black hover:bg-white/80 hover:border-black/10"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isSelected 
                      ? "bg-white/10 text-white" 
                      : "bg-black/5 text-[#505054] group-hover:bg-black/10 group-hover:text-black"
                  )}>
                    <TabIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-bold leading-tight", isSelected ? "text-white" : "text-black")}>
                      {tab.label}
                    </p>
                    <p className={cn("text-xs mt-0.5 truncate", isSelected ? "text-zinc-400" : "text-gray-400")}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              )
            })}

            {/* Quick Status Widgets */}
            <div className="mt-4 p-4 rounded-[2rem] glass-card border border-black/5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="size-4 text-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-black uppercase tracking-wider">System Health</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Database Connection</span>
                  <span className="text-emerald-500 font-bold">99.9%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Memory Usage</span>
                  <span className="text-black font-semibold">4.2 GB / 8 GB</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">API Latency</span>
                  <span className="text-black font-semibold">24ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Tab Content */}
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="wait">
              {activeTab === "general" && (
                <motion.div
                  key="general"
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-5"
                >
                  {/* General Config GlassCard */}
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-green-100 text-green-700">
                        <Globe className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">General Configurations</h3>
                        <p className="text-xs text-gray-400">Configure global metadata and regional settings for the platform.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">System Name</label>
                        <input 
                          type="text" 
                          value={systemName} 
                          onChange={(e) => setSystemName(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Primary Currency</label>
                        <select 
                          value={primaryCurrency} 
                          onChange={(e) => setPrimaryCurrency(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                        >
                          <option value="ETB">ETB (Br) - Ethiopian Birr</option>
                          <option value="USD">USD ($) - United States Dollar</option>
                          <option value="EUR">EUR (€) - Euro</option>
                          <option value="GBP">GBP (£) - British Pound Sterling</option>
                          <option value="JPY">JPY (¥) - Japanese Yen</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Default Timezone</label>
                        <select 
                          value={timezone} 
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                        >
                          <option value="UTC-5 (EST)">UTC-5 (EST) - Eastern Standard Time</option>
                          <option value="UTC+0 (GMT)">UTC+0 (GMT) - Greenwich Mean Time</option>
                          <option value="UTC+1 (CET)">UTC+1 (CET) - Central European Time</option>
                          <option value="UTC+8 (SGT)">UTC+8 (SGT) - Singapore Standard Time</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Operational Brand Identity</label>
                        <input 
                          type="text" 
                          value="HKC Trading ERP Global" 
                          disabled
                          className="w-full bg-black/[0.01] border border-black/5 rounded-2xl px-4 py-3 text-sm font-medium text-gray-400 outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Interactive Custom Switch - Maintenance Mode */}
                    <div className="p-4 rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 mt-0.5">
                          <SlidersHorizontal className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-black">Maintenance Mode</p>
                          <p className="text-xs text-gray-400">Strictly restrict client connections to admin profiles only.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleToggle("maintenanceMode")}
                        className={cn(
                          "w-11 h-6 rounded-full p-1 transition-colors duration-300 relative",
                          toggles.maintenanceMode ? "bg-rose-500" : "bg-black/10"
                        )}
                      >
                        <div className={cn(
                          "size-4 rounded-full bg-white transition-transform duration-300 shadow",
                          toggles.maintenanceMode ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-5"
                >
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-indigo-400/20 text-indigo-600">
                        <Lock className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Security & Access Authorization</h3>
                        <p className="text-xs text-gray-400">Manage security layers, user credentials encryption, and inactivity lock policies.</p>
                      </div>
                    </div>

                    {/* Policy options */}
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.01] hover:bg-black/[0.02] transition-colors border border-black/5">
                        <div className="flex items-start gap-3">
                          <UserCheck className="size-4.5 text-zinc-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-black">Require Two-Factor Authentication (2FA)</p>
                            <p className="text-xs text-gray-400">All administrative staff will be forced to configure mobile 2FA code verification.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleToggle("twoFactorAuth")}
                          className={cn(
                            "w-11 h-6 rounded-full p-1 transition-colors duration-300 relative",
                            toggles.twoFactorAuth ? "bg-indigo-600" : "bg-black/10"
                          )}
                        >
                          <div className={cn(
                            "size-4 rounded-full bg-white transition-transform duration-300 shadow",
                            toggles.twoFactorAuth ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      {/* Session Slider */}
                      <div className="p-4 rounded-2xl bg-black/[0.01] border border-black/5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-bold text-black">Inactivity Session Timeout</p>
                            <p className="text-xs text-gray-400">In seconds before inactive administrators are auto-logged out.</p>
                          </div>
                          <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">{sessionTimeout} mins</span>
                        </div>
                        <input 
                          type="range" 
                          min="5" 
                          max="120" 
                          step="5"
                          value={sessionTimeout}
                          onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
                          className="w-full accent-indigo-600 h-1 bg-black/10 rounded-full cursor-pointer"
                        />
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === "api" && (
                <motion.div
                  key="api"
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-5"
                >
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-green-100 text-green-700">
                        <Cpu className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">API & Integrations Platform</h3>
                        <p className="text-xs text-gray-400">Provision secure developer keys, cache strategies, and route controls.</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.01] hover:bg-black/[0.02] transition-colors border border-black/5">
                        <div className="flex items-start gap-3">
                          <Terminal className="size-4.5 text-zinc-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-black">API Query Performance Caching</p>
                            <p className="text-xs text-gray-400">Actively caches inventory counts to boost retrieval speed.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleToggle("apiCaching")}
                          className={cn(
                            "w-11 h-6 rounded-full p-1 transition-colors duration-300 relative",
                            toggles.apiCaching ? "bg-[#1c1c1e]" : "bg-black/10"
                          )}
                        >
                          <div className={cn(
                            "size-4 rounded-full bg-white transition-transform duration-300 shadow",
                            toggles.apiCaching ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl border border-dashed border-black/15 bg-black/[0.01]">
                        <p className="text-xs font-bold text-black uppercase tracking-wider mb-2">Production REST Client Key</p>
                        <div className="flex items-center gap-3">
                          <code className="flex-1 bg-black/5 px-4 py-2.5 rounded-xl text-xs font-mono text-zinc-600 overflow-x-auto">
                            hkc_live_pk_3923a1ef9c80d5b412bc4f
                          </code>
                          <button className="px-4 py-2.5 rounded-xl bg-[#1c1c1e] text-white text-xs font-semibold hover:bg-zinc-800 transition-colors">
                            Regenerate
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === "backups" && (
                <motion.div
                  key="backups"
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-5"
                >
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-emerald-400/20 text-emerald-600">
                        <Database className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Database Backup & Recovery</h3>
                        <p className="text-xs text-gray-400">Configure auto-export, snapshot intervals, and system debugging files.</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.01] hover:bg-black/[0.02] transition-colors border border-black/5">
                        <div className="flex items-start gap-3">
                          <Network className="size-4.5 text-zinc-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-black">Automatic Cloud Replication</p>
                            <p className="text-xs text-gray-400">Sync database snapshot immediately to cloud replication storage.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleToggle("autoBackup")}
                          className={cn(
                            "w-11 h-6 rounded-full p-1 transition-colors duration-300 relative",
                            toggles.autoBackup ? "bg-emerald-600" : "bg-black/10"
                          )}
                        >
                          <div className={cn(
                            "size-4 rounded-full bg-white transition-transform duration-300 shadow",
                            toggles.autoBackup ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      {/* Backup Interval Slider */}
                      <div className="p-4 rounded-2xl bg-black/[0.01] border border-black/5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-bold text-black">Snapshots Creation Frequency</p>
                            <p className="text-xs text-gray-400">Interval duration between standard database snapshots.</p>
                          </div>
                          <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Every {backupFrequency} hours</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="48" 
                          step="1"
                          value={backupFrequency}
                          onChange={(e) => setBackupFrequency(parseInt(e.target.value))}
                          className="w-full accent-emerald-600 h-1 bg-black/10 rounded-full cursor-pointer"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-black/5 hover:border-black/15 bg-white/50 text-xs font-bold text-black transition-all">
                          <HardDriveDownload className="size-4 text-zinc-500" />
                          Export Raw JSON Dump
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-black/5 hover:border-black/15 bg-white/50 text-xs font-bold text-black transition-all">
                          <Activity className="size-4 text-zinc-500" />
                          Audit Security Logs
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === "notifications" && (
                <motion.div
                  key="notifications"
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-5"
                >
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-green-100 text-green-700">
                        <BellRing className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Platform Alerts & Notification Logs</h3>
                        <p className="text-xs text-gray-400">Configure global mailers, instant messaging sync, and debug reports.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.01] hover:bg-black/[0.02] transition-colors border border-black/5">
                        <div className="flex items-start gap-3">
                          <Mail className="size-4.5 text-zinc-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-black">Email System Alerts</p>
                            <p className="text-xs text-gray-400">Notify primary owners when critical stock limits are surpassed.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleToggle("emailAlerts")}
                          className={cn(
                            "w-11 h-6 rounded-full p-1 transition-colors duration-300 relative",
                            toggles.emailAlerts ? "bg-green-700" : "bg-black/10"
                          )}
                        >
                          <div className={cn(
                            "size-4 rounded-full bg-white transition-transform duration-300 shadow",
                            toggles.emailAlerts ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.01] hover:bg-black/[0.02] transition-colors border border-black/5">
                        <div className="flex items-start gap-3">
                          <Terminal className="size-4.5 text-zinc-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-black">Console Debug Logs</p>
                            <p className="text-xs text-gray-400">Write transaction payloads into standard standard-out streams.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleToggle("debugLogs")}
                          className={cn(
                            "w-11 h-6 rounded-full p-1 transition-colors duration-300 relative",
                            toggles.debugLogs ? "bg-green-700" : "bg-black/10"
                          )}
                        >
                          <div className={cn(
                            "size-4 rounded-full bg-white transition-transform duration-300 shadow",
                            toggles.debugLogs ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button 
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full glass-card border border-black/5 text-xs font-bold hover:bg-white text-[#505054] transition-colors h-[38px]"
              >
                <RotateCcw className="size-3.5" />
                Reset Defaults
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-black hover:bg-zinc-800 text-white text-xs font-bold active:scale-95 transition-all shadow-md h-[38px]"
              >
                {isSaved ? <Check className="size-3.5 text-green-500" /> : <Save className="size-3.5" />}
                {isSaved ? "Settings Saved" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}

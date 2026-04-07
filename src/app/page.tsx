
"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type User = {
  id: string
  name: string | null
  email?: string | null
  avatar_url?: string | null
  is_admin?: boolean
  auth_user_id?: string | null
  created_at?: string
}

type Group = {
  id: string
  name: string | null
  owner_id?: string | null
  created_at?: string
}

type GroupMember = {
  id: string
  user_id: string
  group_id: string
  owner_id?: string | null
  created_at?: string
}

type Expense = {
  id: string
  title: string
  amount: number
  group_id: string | null
  paid_by: string
  created_at?: string
  owner_id?: string | null
}

type ExpenseSplit = {
  id: string
  expense_id: string
  user_id: string
  amount: number
  owner_id?: string | null
}

type GroupWithMembers = {
  id: string
  name: string | null
  members: User[]
}

type BalanceItem = {
  debtorId: string
  creditorId: string
  amount: number
  groupId: string
}

type FriendInvitation = {
  id: string
  email: string
  invited_by: string
  status: string
  created_at?: string
}

type Friendship = {
  id: string
  user_id: string
  friend_id: string
  status?: string
  created_at?: string
}

type NotificationItem = {
  id: string
  title: string
  message: string
  createdAt: string
  type: "invite" | "expense" | "debt" | "reminder" | "settlement_request"
  ctaLabel?: string
  ctaScreen?: Screen
}

type SplitMode = "equal" | "custom"
type ExpenseMode = "group" | "friend"
type Screen = "home" | "amigos" | "gastos" | "balances" | "historial" | "moroso" | "perfil"
type TrustLevel = "top" | "good" | "meh" | "dodgy" | "chaos"
type GameId = "moroso" | "reflejos" | "memoria" | "excusas" | "monedas"

type TagInfo = {
  label: string
  level: TrustLevel
  title: string
  description: string
  colorClass: string
  borderClass: string
}

const TRUST_CONTENT: Record<
  TrustLevel,
  {
    labels: string[]
    title: string
    description: string
    colorClass: string
    borderClass: string
  }
> = {
  top: {
    labels: ["Buena gente", "Bizum ninja", "De fiar", "Santo del Bizum", "No da guerra"],
    title: "Nivel de confianza alto",
    description: "Este colega suele pagar bien y no acostumbra a hacer el payaso con las deudas.",
    colorClass: "bg-emerald-100 text-emerald-800",
    borderClass: "border-emerald-200",
  },
  good: {
    labels: ["Cumple más o menos", "Ni tan mal", "Aceptable", "Va tirando", "Medio decente"],
    title: "Nivel de confianza decente",
    description: "Normalmente responde, aunque a veces se le tiene que mirar un poco mal para que espabile.",
    colorClass: "bg-sky-100 text-sky-800",
    borderClass: "border-sky-200",
  },
  meh: {
    labels: ["Va lento", "Hay que recordarle", "Pagador perezoso", "Necesita presión", "Se hace rogar"],
    title: "Nivel de confianza medio",
    description: "No es de los peores, pero tampoco de los que te dan paz. Suele pagar cuando le aprietas.",
    colorClass: "bg-amber-100 text-amber-800",
    borderClass: "border-amber-200",
  },
  dodgy: {
    labels: ["Se hace el loco", "Bizum fantasma", "Te está toreando", "Promesas y cero pagos", "Moroso en prácticas"],
    title: "Nivel de confianza bajo",
    description: "Aquí ya empieza el festival de excusas. Mucho luego te paso y poco soltar la pasta.",
    colorClass: "bg-orange-100 text-orange-800",
    borderClass: "border-orange-200",
  },
  chaos: {
    labels: ["Gorra legendaria", "Rata premium", "Moroso profesional", "El desaparecido", "Debe hasta el saludo"],
    title: "Nivel de confianza nefasto",
    description: "Este cabrón ya está en nivel histórico. Si paga, se celebra como festivo nacional.",
    colorClass: "bg-red-100 text-red-800",
    borderClass: "border-red-200",
  },
}

const GAME_INFO: Record<GameId, { title: string; icon: string; subtitle: string; description: string }> = {
  moroso: {
    title: "A por el moroso",
    icon: "💸",
    subtitle: "Haz click antes de que se escape.",
    description: "El clásico. Cuanto más rápido vayas, más pasta le rascas.",
  },
  reflejos: {
    title: "Reflejos Bizum",
    icon: "⚡",
    subtitle: "Pulsa solo los cobros buenos.",
    description: "Si tocas una trampa, pierdes ritmo. Ideal para manos rápidas.",
  },
  memoria: {
    title: "Memoria de deudas",
    icon: "🧠",
    subtitle: "Recuerda la secuencia.",
    description: "Mira el orden, memorízalo y repítelo para recuperar dinero.",
  },
  excusas: {
    title: "Caza excusas",
    icon: "😑",
    subtitle: "Encuentra el pago real.",
    description: "Entre tantas excusas, solo una opción es cobrar de verdad.",
  },
  monedas: {
    title: "Lluvia de monedas",
    icon: "🪙",
    subtitle: "Caza monedas, evita trampas.",
    description: "Haz click en monedas y no toques las trampas o pierdes puntos.",
  },
}

const seededIndex = (input: string, length: number) => {
  const sum = input.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return sum % length
}

const ADMIN_EMAIL = "gpinegrad@gmail.com"
const containsReservedAdminName = (value: string) => value.toLowerCase().includes("girma")

export default function Home() {
  const [user, setUser] = useState<any>(null)

  const [name, setName] = useState("")
  const [groupName, setGroupName] = useState("")

  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [groupsWithMembers, setGroupsWithMembers] = useState<GroupWithMembers[]>([])
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [receivedInvitations, setReceivedInvitations] = useState<FriendInvitation[]>([])
  const [sentInvitations, setSentInvitations] = useState<FriendInvitation[]>([])

  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState("")

  const [expenseMode, setExpenseMode] = useState<ExpenseMode>("group")
  const [expenseTitle, setExpenseTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [expenseGroupId, setExpenseGroupId] = useState("")
  const [selectedFriendId, setSelectedFriendId] = useState("")
  const [paidBy, setPaidBy] = useState("")
  const [splitMode, setSplitMode] = useState<SplitMode>("equal")
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseSplits, setExpenseSplits] = useState<ExpenseSplit[]>([])

  const [showExpenseHistory, setShowExpenseHistory] = useState(false)
  const [showSettledHistory, setShowSettledHistory] = useState(false)
  const [openMemberGroups, setOpenMemberGroups] = useState<Record<string, boolean>>({})
  const [openBalanceGroups, setOpenBalanceGroups] = useState<Record<string, boolean>>({})

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [screen, setScreen] = useState<Screen>("home")
  const [menuOpen, setMenuOpen] = useState(false)
  const menuItems: Screen[] = ["amigos", "gastos", "balances", "historial", "moroso", "perfil"]

  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState("")
  const [apellidos, setApellidos] = useState("")
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [tagModal, setTagModal] = useState<TagInfo | null>(null)
  const [toast, setToast] = useState("")
  const [actionFlash, setActionFlash] = useState<{ emoji: string; text: string } | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationReadIds, setNotificationReadIds] = useState<string[]>([])
  const [manualNotifications, setManualNotifications] = useState<NotificationItem[]>([])
  const [dbNotifications, setDbNotifications] = useState<NotificationItem[]>([])

  const [showGuide, setShowGuide] = useState(true)
  const [showGamesMenu, setShowGamesMenu] = useState(false)
  const [activeGame, setActiveGame] = useState<GameId | null>(null)
  const [showGameFullscreen, setShowGameFullscreen] = useState(false)

  const [gameTimeLeft, setGameTimeLeft] = useState(12)
  const [gameRunning, setGameRunning] = useState(false)
  const [gameMessage, setGameMessage] = useState("")
  const [gameCash, setGameCash] = useState(0)
  const [gamePressure, setGamePressure] = useState(0)

  const [morosoPosition, setMorosoPosition] = useState({ x: 35, y: 32 })
  const [coinBursts, setCoinBursts] = useState<{ id: number; x: number; y: number; value: number }[]>([])
  const [gameRound, setGameRound] = useState(0)

  const [reflexTiles, setReflexTiles] = useState<{ id: number; kind: "money" | "trap"; value: number }[]>([])
  const [memorySequence, setMemorySequence] = useState<number[]>([])
  const [memoryInput, setMemoryInput] = useState<number[]>([])
  const [memoryShowing, setMemoryShowing] = useState(false)
  const [memoryFlash, setMemoryFlash] = useState<number | null>(null)
  const [excuseOptions, setExcuseOptions] = useState<string[]>([])
  const [excuseCorrectIndex, setExcuseCorrectIndex] = useState(0)
  const [coinRainItems, setCoinRainItems] = useState<{ id: number; kind: "coin" | "trap"; left: number; top: number; value: number }[]>([])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(""), 2200)
  }

  const triggerActionFlash = (emoji: string, text: string) => {
    setActionFlash({ emoji, text })
    setTimeout(() => setActionFlash(null), 1400)
  }

  const buildSettlementRequestMessage = ({
    scope,
    debtorId,
    creditorId,
    amount,
    groupId,
  }: {
    scope: "friend" | "group"
    debtorId: string
    creditorId: string
    amount: number
    groupId?: string | null
  }) => {
    return `SETTLEMENT_REQUEST|${scope}|${groupId || "none"}|${debtorId}|${creditorId}|${amount.toFixed(2)}`
  }

  const parseSettlementRequestMessage = (message: string) => {
    if (!message.startsWith("SETTLEMENT_REQUEST|")) return null
    const parts = message.split("|")
    if (parts.length < 6) return null

    return {
      scope: parts[1] as "friend" | "group",
      groupId: parts[2] === "none" ? null : parts[2],
      debtorId: parts[3],
      creditorId: parts[4],
      amount: Number(parts[5]),
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }

    getUser()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  const currentAppUser = useMemo(() => {
    return users.find((u) => u.auth_user_id === user?.id) || null
  }, [users, user])

  useEffect(() => {
    if (!user?.id) return
    try {
      const savedRead = window.localStorage.getItem(`tedebo_notification_reads_${user.id}`)
      const savedManual = window.localStorage.getItem(`tedebo_manual_notifications_${user.id}`)
      if (savedRead) setNotificationReadIds(JSON.parse(savedRead))
      if (savedManual) setManualNotifications(JSON.parse(savedManual))
    } catch {}
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    try {
      window.localStorage.setItem(`tedebo_notification_reads_${user.id}`, JSON.stringify(notificationReadIds))
    } catch {}
  }, [notificationReadIds, user?.id])

  useEffect(() => {
    if (!user?.id) return
    try {
      window.localStorage.setItem(`tedebo_manual_notifications_${user.id}`, JSON.stringify(manualNotifications))
    } catch {}
  }, [manualNotifications, user?.id])

  useEffect(() => {
    if (!user) return
    const run = async () => {
      await ensureCurrentAppUserProfile()
      await loadAll()
    }
    run()
  }, [user])

  useEffect(() => {
    if (!currentAppUser) return
    getFriendships()
  }, [currentAppUser])

  useEffect(() => {
    if (!currentAppUser) return
    setPaidBy(currentAppUser.id)
  }, [currentAppUser])

  useEffect(() => {
    setProfileName(currentAppUser?.name || "")
  }, [currentAppUser])


  const ensureCurrentAppUserProfile = async () => {
    if (!user) return

    const { data: existing, error: existingError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (existingError) return
    if (existing) return

    const displayName =
      [user.user_metadata?.nombre, user.user_metadata?.apellidos]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      user.email?.split("@")[0] ||
      "Usuario"

    await supabase.from("users").insert({
      name: displayName,
      auth_user_id: user.id,
      owner_id: user.id,
      email: user.email?.toLowerCase() || null,
      is_admin: (user.email || "").toLowerCase() === ADMIN_EMAIL,
    })
  }

  const loadAll = async () => {
    await Promise.all([
      getUsers(),
      getGroups(),
      getGroupMembers(),
      getExpenses(),
      getExpenseSplits(),
      getReceivedInvitations(),
      getSentInvitations(),
    ])
  }

  const isAdmin = useMemo(() => {
    return (user?.email || "").toLowerCase() === ADMIN_EMAIL || currentAppUser?.is_admin || false
  }, [currentAppUser, user])

  const getUsers = async () => {
    const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false })
    if (data) setUsers(data as User[])
  }

  const getGroups = async () => {
    if (!user) return
    const { data } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false })
    if (data) setGroups(data as Group[])
  }

  const getGroupMembers = async () => {
    if (!user) return
    const { data } = await supabase
      .from("group_members")
      .select("*")
      .order("created_at", { ascending: false })
    if (data) setGroupMembers(data as GroupMember[])
  }

  const getExpenses = async () => {
    if (!user) return
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false })
    if (data) setExpenses(data as Expense[])
  }

  const getExpenseSplits = async () => {
    if (!user) return
    const { data } = await supabase
      .from("expense_splits")
      .select("*")
    if (data) setExpenseSplits(data as ExpenseSplit[])
  }

  const getReceivedInvitations = async () => {
    if (!user?.email) return
    const { data } = await supabase
      .from("friend_invitations")
      .select("*")
      .eq("email", user.email.toLowerCase())
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    if (data) setReceivedInvitations(data as FriendInvitation[])
  }

  const getSentInvitations = async () => {
    if (!user) return
    const { data } = await supabase
      .from("friend_invitations")
      .select("*")
      .eq("invited_by", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    if (data) setSentInvitations(data as FriendInvitation[])
  }

  const getFriendships = async () => {
    if (!currentAppUser) return
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .eq("user_id", currentAppUser.id)
      .eq("status", "accepted")
    if (data) setFriendships(data as Friendship[])
  }

  const friendList = useMemo(() => {
    const friendIds = new Set(friendships.filter((f) => f.status === "accepted").map((f) => f.friend_id))
    const rawFriends = users.filter((u) => friendIds.has(u.id))
    const uniqueMap = new Map<string, User>()
    rawFriends.forEach((friend) => {
      if (!uniqueMap.has(friend.id)) uniqueMap.set(friend.id, friend)
    })
    return Array.from(uniqueMap.values())
  }, [users, friendships])

  const getInitials = (value?: string | null) => {
    const fallback = "US"
    if (!value?.trim()) return fallback
    const initials = value
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    return initials || fallback
  }

  const uploadProfileAvatar = async (file: File) => {
    if (!currentAppUser || !user) return

    setAvatarUploading(true)

    const fileExt = file.name.split(".").pop() || "jpg"
    const filePath = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setAvatarUploading(false)
      alert("Error subiendo la foto. Revisa que exista el bucket 'avatars' en Supabase.")
      return
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
    const publicUrl = data.publicUrl

    if (!publicUrl) {
      setAvatarUploading(false)
      alert("No se pudo obtener la URL pública de la imagen")
      return
    }

    setProfileAvatarUrl(publicUrl)
    setAvatarUploading(false)
    showToast("Foto subida ✅")
  }

  const saveProfile = async () => {
    if (!currentAppUser) return

    const cleanName = profileName.trim()
    if (!cleanName) {
      alert("Introduce un nombre válido")
      return
    }

    const isProtectedAdminEmail = (user?.email || "").toLowerCase() === ADMIN_EMAIL

    if (!isProtectedAdminEmail && containsReservedAdminName(cleanName)) {
      alert("El nombre Girma está reservado para el administrador. Elige otro nombre.")
      return
    }

    setProfileSaving(true)

    const { error } = await supabase
      .from("users")
      .update({
        name: cleanName,
        avatar_url: profileAvatarUrl.trim() || null,
        is_admin: (user?.email || "").toLowerCase() === ADMIN_EMAIL,
      })
      .eq("id", currentAppUser.id)

    setProfileSaving(false)

    if (error) {
      alert("Error guardando el perfil. Si falla la foto, crea la columna avatar_url en users.")
      return
    }

    showToast("Perfil actualizado ✅")
    setIsEditingProfile(false)
    await getUsers()
  }


  const createNotification = async ({
    userId,
    title,
    message,
    type,
    ctaLabel,
    ctaScreen,
  }: {
    userId: string
    title: string
    message: string
    type: NotificationItem["type"]
    ctaLabel?: string
    ctaScreen?: Screen
  }) => {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      read: false,
    })

    if (error) {
      console.error("Error creando notificación:", error)
      return false
    }

    if (currentAppUser?.id === userId) {
      setDbNotifications((prev) => [
        {
          id: `temp-${Date.now()}-${Math.random()}`,
          title,
          message,
          createdAt: new Date().toISOString(),
          type,
          ctaLabel,
          ctaScreen,
        },
        ...prev,
      ])
    }

    return true
  }

  const loadNotifications = async () => {
    if (!currentAppUser) return

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", currentAppUser.id)
      .order("created_at", { ascending: false })

    if (!data) return

    const mapped: NotificationItem[] = data.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: n.created_at,
      type: n.type,
      ctaLabel:
        n.type === "invite"
          ? "Ver amigos"
          : n.type === "expense"
          ? "Ver historial"
          : n.type === "settlement_request"
          ? "Ver balances"
          : "Ver amigos",
      ctaScreen: n.type === "expense" ? "historial" : n.type === "settlement_request" ? "balances" : "amigos",
    }))

    setDbNotifications(mapped)
    setNotificationReadIds((prev) =>
      Array.from(new Set([...prev, ...data.filter((n: any) => n.read).map((n: any) => n.id)]))
    )
  }

  useEffect(() => {
    loadNotifications()
  }, [currentAppUser?.id])

  useEffect(() => {
    if (!currentAppUser?.id) return

    const interval = setInterval(() => {
      loadNotifications()
    }, 4000)

    const handleFocusReload = () => {
      loadNotifications()
    }

    window.addEventListener("focus", handleFocusReload)
    document.addEventListener("visibilitychange", handleFocusReload)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", handleFocusReload)
      document.removeEventListener("visibilitychange", handleFocusReload)
    }
  }, [currentAppUser?.id])

  const pushManualNotification = (item: NotificationItem) => {
    setManualNotifications((prev) => [item, ...prev].slice(0, 25))
  }

  const copyText = async (value: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        return true
      }
    } catch {}
    return false
  }

  const markAllNotificationsAsRead = async (items: NotificationItem[]) => {
    const ids = items.map((item) => item.id)
    setNotificationReadIds((prev) => Array.from(new Set([...prev, ...ids])))

    const dbIds = ids.filter((id) =>
      dbNotifications.some((notificationItem) => notificationItem.id === id)
    )

    if (dbIds.length > 0) {
      await supabase.from("notifications").update({ read: true }).in("id", dbIds)
      await loadNotifications()
    }
  }

  const handleNotificationClick = async (item: NotificationItem) => {
    setNotificationReadIds((prev) => Array.from(new Set([...prev, item.id])))

    if (dbNotifications.some((notificationItem) => notificationItem.id === item.id)) {
      await supabase.from("notifications").update({ read: true }).eq("id", item.id)
      await loadNotifications()
    }

    if (item.ctaScreen) setScreen(item.ctaScreen)
    setNotificationsOpen(false)
  }

  const deleteNotification = async (notificationId: string) => {
    const isDbNotification = dbNotifications.some((item) => item.id === notificationId)

    if (isDbNotification) {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId)
      if (error) {
        alert("No se pudo borrar la notificación")
        return
      }
      setDbNotifications((prev) => prev.filter((item) => item.id !== notificationId))
    } else {
      setManualNotifications((prev) => prev.filter((item) => item.id !== notificationId))
    }

    setNotificationReadIds((prev) => prev.filter((id) => id !== notificationId))
    showToast("Notificación eliminada 🗑️")
  }

  const deleteAllNotifications = async () => {
    if (dbNotifications.length > 0) {
      const ids = dbNotifications.map((item) => item.id)
      const { error } = await supabase.from("notifications").delete().in("id", ids)
      if (error) {
        alert("No se pudieron borrar todas las notificaciones")
        return
      }
    }

    setDbNotifications([])
    setManualNotifications([])
    setNotificationReadIds([])
    showToast("Todas las notificaciones eliminadas 🗑️")
  }

  const addUser = async () => {
    if (!name.trim() || !user || !currentAppUser) {
      alert("Introduce un correo")
      return
    }

    const normalizedEmail = name.trim().toLowerCase()

    if (!normalizedEmail.includes("@")) {
      alert("Introduce un correo válido")
      return
    }

    if (normalizedEmail === (user.email || "").toLowerCase()) {
      alert("No puedes invitarte a ti mismo")
      return
    }

    const { data: existingUserByEmail, error: userLookupError } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (userLookupError) {
      alert("Error comprobando el correo")
      return
    }

    if (existingUserByEmail) {
      const alreadyFriend = friendships.some(
        (f) => f.friend_id === existingUserByEmail.id && f.status === "accepted"
      )

      if (alreadyFriend) {
        alert("Ese colega ya está en tu lista de amigos")
        return
      }
    }

    const { data: pendingInvitation } = await supabase
      .from("friend_invitations")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("invited_by", user.id)
      .eq("status", "pending")
      .maybeSingle()

    if (pendingInvitation) {
      alert("Ese correo ya tiene una invitación pendiente")
      return
    }

    const { error } = await supabase.from("friend_invitations").insert({
      email: normalizedEmail,
      invited_by: user.id,
      status: "pending",
    })

    if (error) {
      alert("Error al enviar invitación")
      return
    }

    if (existingUserByEmail?.id) {
      await createNotification({
        userId: existingUserByEmail.id,
        title: "Nueva invitación",
        message: `${currentAppUser.name || "Un colega"} te ha enviado una invitación en TeDebo.`,
        type: "invite",
        ctaLabel: "Ver amigos",
        ctaScreen: "amigos",
      })
    }

    const res = await fetch("/api/send-invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail }),
    })

    if (!res.ok) {
      alert("La invitación se guardó, pero el correo no pudo enviarse")
    } else {
      showToast("Invitación enviada 🚀")
    }

    setName("")
    await getSentInvitations()
  }

  const acceptInvitation = async (invitation: FriendInvitation) => {
    if (!user || !currentAppUser) return

    const { data: senderAppUser, error: senderError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", invitation.invited_by)
      .single()

    if (senderError || !senderAppUser) {
      alert("No se encontró al usuario que envió la invitación")
      return
    }

    const alreadyFriend = friendships.some(
      (f) => f.friend_id === senderAppUser.id && f.status === "accepted"
    )

    if (!alreadyFriend) {
      const { data: existingFriendship } = await supabase
        .from("friendships")
        .select("*")
        .eq("user_id", currentAppUser.id)
        .eq("friend_id", senderAppUser.id)
        .maybeSingle()

      if (!existingFriendship) {
        const { error: friendshipError } = await supabase.from("friendships").insert([
          {
            user_id: currentAppUser.id,
            friend_id: senderAppUser.id,
            status: "accepted",
          },
          {
            user_id: senderAppUser.id,
            friend_id: currentAppUser.id,
            status: "accepted",
          },
        ])

        if (friendshipError) {
          alert("Error creando la amistad")
          return
        }
      }
    }

    await supabase
      .from("friend_invitations")
      .delete()
      .eq("id", invitation.id)

    await supabase
      .from("friend_invitations")
      .delete()
      .eq("invited_by", senderAppUser.auth_user_id)
      .eq("email", user.email?.toLowerCase() || "")
      .eq("status", "pending")

    await createNotification({
      userId: senderAppUser.id,
      title: "Invitación aceptada",
      message: `${currentAppUser.name || "Un colega"} ha aceptado tu invitación.`,
      type: "invite",
      ctaLabel: "Ver amigos",
      ctaScreen: "amigos",
    })

    showToast(alreadyFriend ? "Ya erais amigos" : "Amigo añadido correctamente")
    await getReceivedInvitations()
    await getSentInvitations()
    await getFriendships()
  }

  const addGroup = async () => {
    if (!groupName.trim() || !user || !currentAppUser) return

    const { data: createdGroup } = await supabase
      .from("groups")
      .insert([
        {
          name: groupName.trim(),
          owner_id: user.id,
        },
      ])
      .select()
      .single()

    if (!createdGroup) {
      alert("Error creando grupo")
      return
    }

    await supabase.from("group_members").insert({
      user_id: currentAppUser.id,
      group_id: createdGroup.id,
      owner_id: user.id,
    })

    setGroupName("")
    showToast("Grupo creado ✅")
    await getGroups()
    await getGroupMembers()
    await buildGroupsWithMembers()
  }

  const addPersonToGroup = async () => {
    if (!selectedUserId || !selectedGroupId || !user) return

    const alreadyExists = groupMembers.some(
      (item) => item.user_id === selectedUserId && item.group_id === selectedGroupId
    )

    if (alreadyExists) {
      alert("Esa persona ya está en el grupo")
      return
    }

    const { error } = await supabase.from("group_members").insert([
      {
        user_id: selectedUserId,
        group_id: selectedGroupId,
        owner_id: user.id,
      },
    ])

    if (error) {
      alert("Error añadiendo amigo al grupo")
      return
    }

    setSelectedUserId("")
    setSelectedGroupId("")
    showToast("Colega añadido al grupo 👌")
    await getGroupMembers()
    await buildGroupsWithMembers()
  }

  const membersOfSelectedExpenseGroup = useMemo(() => {
    return groupMembers
      .filter((item) => item.group_id === expenseGroupId)
      .map((item) => users.find((userItem) => userItem.id === item.user_id))
      .filter(Boolean) as User[]
  }, [expenseGroupId, groupMembers, users])

  const friendParticipants = useMemo(() => {
    if (!currentAppUser || !selectedFriendId) return []
    const friend = users.find((u) => u.id === selectedFriendId)
    return friend ? [currentAppUser, friend] : []
  }, [currentAppUser, selectedFriendId, users])

  const expenseParticipants = expenseMode === "group" ? membersOfSelectedExpenseGroup : friendParticipants

  const visibleExpenseIds = useMemo(() => {
    if (!currentAppUser) return new Set<string>()
    const ids = new Set<string>()

    expenseSplits.forEach((split) => {
      if (split.user_id === currentAppUser.id) ids.add(split.expense_id)
    })

    expenses.forEach((expense) => {
      if (expense.paid_by === currentAppUser.id) ids.add(expense.id)
    })

    const myGroupIds = new Set(
      groupMembers
        .filter((member) => member.user_id === currentAppUser.id)
        .map((member) => member.group_id)
    )

    expenses.forEach((expense) => {
      if (expense.group_id && myGroupIds.has(expense.group_id)) {
        ids.add(expense.id)
      }
    })

    return ids
  }, [currentAppUser, expenseSplits, expenses, groupMembers])

  const visibleExpenses = useMemo(() => {
    return expenses.filter((expense) => visibleExpenseIds.has(expense.id))
  }, [expenses, visibleExpenseIds])

  const visibleExpenseSplits = useMemo(() => {
    return expenseSplits.filter((split) => visibleExpenseIds.has(split.expense_id))
  }, [expenseSplits, visibleExpenseIds])

  const getUserById = (userId?: string | null) => {
    if (!userId) return null
    return users.find((u) => u.id === userId) || null
  }

  const getUserName = (userId: string) => users.find((u) => u.id === userId)?.name || "Usuario"

  const getUserAvatar = (userId?: string | null) => {
    const userItem = getUserById(userId)
    return userItem?.avatar_url || null
  }

  const renderAvatar = (
    userId?: string | null,
    fallbackName?: string | null,
    sizeClass = "h-12 w-12",
    textClass = "text-base",
    extraClass = ""
  ) => {
    const avatarUrl = getUserAvatar(userId)
    const displayName = fallbackName || getUserById(userId)?.name || "Usuario"

    return (
      <div
        className={`grid ${sizeClass} place-items-center overflow-hidden rounded-full bg-black font-bold text-white shadow-sm ${textClass} ${extraClass}`.trim()}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          getInitials(displayName)
        )}
      </div>
    )
  }

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return "Gasto individual"
    return groups.find((g) => g.id === groupId)?.name || "Grupo"
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sin fecha"
    return new Date(dateString).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getExpensePeopleSummary = (expenseId: string) => {
    const splits = visibleExpenseSplits.filter((split) => split.expense_id === expenseId)
    if (splits.length === 0) return "Sin reparto guardado"
    return splits
      .map((split) => `${getUserName(split.user_id)}: ${Number(split.amount).toFixed(2)}€`)
      .join(" · ")
  }

  const handleCustomSplitChange = (userId: string, value: string) => {
    setCustomSplits((prev) => ({
      ...prev,
      [userId]: value,
    }))
  }

  const toggleMemberGroup = (groupId: string) => {
    setOpenMemberGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  const toggleBalanceGroup = (groupId: string) => {
    setOpenBalanceGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  const resetExpenseForm = () => {
    setExpenseTitle("")
    setAmount("")
    setExpenseGroupId("")
    setSelectedFriendId("")
    setPaidBy(currentAppUser?.id || "")
    setSplitMode("equal")
    setCustomSplits({})
  }

  const startGame = (game: GameId) => {
    setActiveGame(game)
    setShowGameFullscreen(true)
    setGameRunning(true)
    setGameTimeLeft(game === "memoria" ? 18 : 12)
    setGamePressure(0)
    setGameCash(0)
    setGameMessage("")
    setCoinBursts([])
    setGameRound((r) => r + 1)

    if (game === "moroso") moveMoroso()
    if (game === "reflejos") {
      setReflexTiles(Array.from({ length: 9 }, (_, index) => ({
        id: index,
        kind: Math.random() > 0.7 ? "trap" : "money",
        value: Math.random() > 0.7 ? -4 : Math.floor(Math.random() * 5) + 3,
      })))
    }
    if (game === "memoria") {
      const sequence = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4))
      setMemorySequence(sequence)
      setMemoryInput([])
      setMemoryShowing(true)
      playMemorySequence(sequence)
    }
    if (game === "excusas") loadExcuseRound()
    if (game === "monedas") setCoinRainItems([])
  }

  const closeGame = () => {
    setShowGameFullscreen(false)
    setGameRunning(false)
    setGameMessage("")
    setCoinBursts([])
    setActiveGame(null)
    setMemorySequence([])
    setMemoryInput([])
    setMemoryShowing(false)
    setMemoryFlash(null)
    setCoinRainItems([])
    setReflexTiles([])
  }

  const moveMoroso = () => {
    const x = Math.random() * 70
    const y = Math.random() * 60
    setMorosoPosition({ x, y })
  }

  const hitMoroso = () => {
    if (!gameRunning) return
    const gain = Math.floor(Math.random() * 8) + 3
    setGameCash((prev) => prev + gain)
    setGamePressure((prev) => prev + 15)

    const burst = {
      id: Date.now(),
      x: morosoPosition.x,
      y: morosoPosition.y,
      value: gain,
    }

    setCoinBursts((prev) => [...prev, burst])
    setTimeout(() => {
      setCoinBursts((prev) => prev.filter((b) => b.id !== burst.id))
    }, 800)

    moveMoroso()
  }

  const hitReflexTile = (tileIndex: number) => {
    if (!gameRunning) return
    const tile = reflexTiles[tileIndex]
    if (!tile) return

    if (tile.kind === "money") {
      setGameCash((prev) => prev + tile.value)
      setGamePressure((prev) => prev + 8)
    } else {
      setGameCash((prev) => Math.max(prev + tile.value, 0))
      setGamePressure((prev) => Math.max(prev - 8, 0))
    }

    setReflexTiles((prev) =>
      prev.map((item, index) =>
        index === tileIndex
          ? {
              ...item,
              kind: Math.random() > 0.7 ? "trap" : "money",
              value: Math.random() > 0.7 ? -4 : Math.floor(Math.random() * 5) + 3,
            }
          : item
      )
    )
  }

  const playMemorySequence = async (sequence: number[]) => {
    for (const value of sequence) {
      setMemoryFlash(value)
      await new Promise((resolve) => setTimeout(resolve, 650))
      setMemoryFlash(null)
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    setMemoryShowing(false)
  }

  const pressMemory = (value: number) => {
    if (!gameRunning || memoryShowing) return

    const nextInput = [...memoryInput, value]
    setMemoryInput(nextInput)

    const currentIndex = nextInput.length - 1
    if (memorySequence[currentIndex] !== value) {
      setGameCash((prev) => Math.max(prev - 5, 0))
      setGameMessage("😵 Te liaste. Vuelve a intentarlo.")
      const sequence = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4))
      setMemorySequence(sequence)
      setMemoryInput([])
      setMemoryShowing(true)
      playMemorySequence(sequence)
      return
    }

    if (nextInput.length === memorySequence.length) {
      const gain = 12
      setGameCash((prev) => prev + gain)
      setGamePressure((prev) => prev + 12)
      const sequence = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4))
      setMemorySequence(sequence)
      setMemoryInput([])
      setMemoryShowing(true)
      playMemorySequence(sequence)
    }
  }

  const loadExcuseRound = () => {
    const goodPayments = ["Te hago Bizum ahora", "Te paso el dinero ya", "Listo, te acabo de pagar", "Te lo mando en este momento"]
    const excuses = ["No me deja la app", "Luego te paso", "Estoy sin batería", "Te pago mañana seguro", "Ahora voy fatal", "No tengo cobertura", "Se me olvidó", "Luego luego"]

    const correct = goodPayments[Math.floor(Math.random() * goodPayments.length)]
    const wrong1 = excuses[Math.floor(Math.random() * excuses.length)]
    const wrong2 = excuses[Math.floor(Math.random() * excuses.length)]
    const options = [correct, wrong1, wrong2].sort(() => Math.random() - 0.5)
    setExcuseOptions(options)
    setExcuseCorrectIndex(options.indexOf(correct))
  }

  const pickExcuse = (index: number) => {
    if (!gameRunning) return
    if (index === excuseCorrectIndex) {
      setGameCash((prev) => prev + 10)
      setGamePressure((prev) => prev + 10)
    } else {
      setGameCash((prev) => Math.max(prev - 3, 0))
    }
    loadExcuseRound()
  }

  const clickCoinRainItem = (id: number) => {
    if (!gameRunning) return
    const target = coinRainItems.find((item) => item.id === id)
    if (!target) return

    if (target.kind === "coin") {
      setGameCash((prev) => prev + target.value)
      setGamePressure((prev) => prev + 6)
    } else {
      setGameCash((prev) => Math.max(prev - target.value, 0))
      setGamePressure((prev) => Math.max(prev - 6, 0))
    }

    setCoinRainItems((prev) => prev.filter((item) => item.id !== id))
  }

  useEffect(() => {
    if (!gameRunning) return
    if (gameTimeLeft <= 0) {
      setGameRunning(false)
      if (gameCash > 45) setGameMessage("🔥 Le has reventado el bolsillo.")
      else if (gameCash > 25) setGameMessage("😤 Algo has rascado, pero sigue tensito.")
      else setGameMessage("😂 Hoy se te escapó vivo.")
      return
    }

    const timer = setTimeout(() => {
      setGameTimeLeft((t) => t - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [gameRunning, gameTimeLeft, gameCash])

  useEffect(() => {
    if (!gameRunning || activeGame !== "moroso") return
    const speed = Math.max(320, 1200 - gamePressure * 5)
    const interval = setInterval(() => {
      moveMoroso()
    }, speed)
    return () => clearInterval(interval)
  }, [gameRunning, gamePressure, gameRound, activeGame])

  useEffect(() => {
    if (!gameRunning || activeGame !== "reflejos") return
    const interval = setInterval(() => {
      setReflexTiles(Array.from({ length: 9 }, (_, index) => ({
        id: index,
        kind: Math.random() > 0.75 ? "trap" : "money",
        value: Math.random() > 0.75 ? -4 : Math.floor(Math.random() * 5) + 2,
      })))
    }, 900)
    return () => clearInterval(interval)
  }, [gameRunning, activeGame])

  useEffect(() => {
    if (!gameRunning || activeGame !== "monedas") return
    const interval = setInterval(() => {
      const id = Date.now() + Math.random()
      setCoinRainItems((prev) => [
        ...prev.slice(-14),
        {
          id,
          kind: Math.random() > 0.75 ? "trap" : "coin",
          left: Math.random() * 88,
          top: Math.random() * 78,
          value: Math.floor(Math.random() * 6) + 2,
        },
      ])
    }, 450)
    return () => clearInterval(interval)
  }, [gameRunning, activeGame])

  const addExpense = async () => {
    if (!expenseTitle || !amount || !paidBy || !user || !currentAppUser) return
    if (expenseMode === "group" && !expenseGroupId) return
    if (expenseMode === "friend" && !selectedFriendId) return

    const amountNumber = parseFloat(amount)
    if (Number.isNaN(amountNumber) || amountNumber <= 0) return

    const participants = expenseParticipants
    if (participants.length === 0) {
      alert(expenseMode === "group" ? "Ese grupo no tiene personas" : "Elige un amigo")
      return
    }

    if (!participants.some((member) => member.id === paidBy)) {
      alert("Quien paga debe estar dentro del gasto")
      return
    }

    const { data: expenseData } = await supabase
      .from("expenses")
      .insert([
        {
          title: expenseTitle,
          amount: amountNumber,
          group_id: expenseMode === "group" ? expenseGroupId : null,
          paid_by: paidBy,
          owner_id: user.id,
        },
      ])
      .select()

    if (!expenseData || expenseData.length === 0) return

    const expenseId = expenseData[0].id

    let splitsToInsert: { expense_id: string; user_id: string; amount: number; owner_id: string }[] = []

    if (splitMode === "equal") {
      const splitAmount = Number((amountNumber / participants.length).toFixed(2))
      splitsToInsert = participants.map((member) => ({
        expense_id: expenseId,
        user_id: member.id,
        amount: splitAmount,
        owner_id: user.id,
      }))
    } else {
      const customAmounts = participants.map((member) => ({
        user_id: member.id,
        amount: Number(parseFloat(customSplits[member.id] || "0").toFixed(2)),
      }))

      const totalCustom = Number(customAmounts.reduce((sum, item) => sum + item.amount, 0).toFixed(2))
      if (totalCustom !== Number(amountNumber.toFixed(2))) {
        alert("La suma personalizada no coincide con el total")
        return
      }

      splitsToInsert = customAmounts.map((item) => ({
        expense_id: expenseId,
        user_id: item.user_id,
        amount: item.amount,
        owner_id: user.id,
      }))
    }

    await supabase.from("expense_splits").insert(splitsToInsert)

    for (const participant of participants) {
      if (participant.id === currentAppUser.id) continue

      await createNotification({
        userId: participant.id,
        title: "Nuevo gasto",
        message: `${currentAppUser.name || "Un colega"} añadió "${expenseTitle}" por ${amountNumber.toFixed(2)}€.`,
        type: "expense",
        ctaLabel: "Ver historial",
        ctaScreen: "historial",
      })
    }

    resetExpenseForm()
    showToast("Gasto añadido ✅")
    triggerActionFlash("💸", "Gasto añadido")
    await getExpenses()
    await getExpenseSplits()
  }

  const deleteExpense = async (expenseId: string) => {
    if (!isAdmin) {
      alert("Solo Girma puede borrar gastos por ahora")
      return
    }

    const { error: splitsError } = await supabase
      .from("expense_splits")
      .delete()
      .eq("expense_id", expenseId)

    const { error: expenseError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)

    if (splitsError || expenseError) {
      alert("No se pudo borrar de verdad. Revisa permisos o vuelve a intentarlo.")
      return
    }

    setExpenseSplits((prev) => prev.filter((split) => split.expense_id !== expenseId))
    setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId))
    showToast("Elemento borrado 🗑️")

    await getExpenses()
    await getExpenseSplits()
  }

  const deleteAllExpensesByIds = async (expenseIds: string[], successMessage: string) => {
    if (!isAdmin) {
      alert("Solo Girma puede borrar historial completo por ahora")
      return
    }

    if (expenseIds.length === 0) {
      alert("No hay nada que borrar")
      return
    }

    const { error: splitsError } = await supabase
      .from("expense_splits")
      .delete()
      .in("expense_id", expenseIds)

    const { error: expenseError } = await supabase
      .from("expenses")
      .delete()
      .in("id", expenseIds)

    if (splitsError || expenseError) {
      alert("No se pudo borrar todo de verdad. Revisa permisos o vuelve a intentarlo.")
      return
    }

    setExpenseSplits((prev) => prev.filter((split) => !expenseIds.includes(split.expense_id)))
    setExpenses((prev) => prev.filter((expense) => !expenseIds.includes(expense.id)))
    showToast(successMessage)

    await getExpenses()
    await getExpenseSplits()
  }

  const deleteAllNormalHistory = async () => {
    await deleteAllExpensesByIds(
      normalExpenses.map((expense) => expense.id),
      "Historial de gastos borrado 🗑️"
    )
  }

  const deleteAllSettledHistory = async () => {
    await deleteAllExpensesByIds(
      settledExpenses.map((expense) => expense.id),
      "Historial de deudas saldadas borrado 🗑️"
    )
  }

  const deleteAllHistory = async () => {
    await deleteAllExpensesByIds(
      expenses.map((expense) => expense.id),
      "Todo el historial se ha borrado 🗑️"
    )
  }

  const settleBalance = async (item: BalanceItem) => {
    if (!user || !currentAppUser) return

    const canSettle = isAdmin || currentAppUser.id === item.creditorId

    if (!canSettle) {
      alert("Solo la persona que tiene que recibir el dinero puede saldar la deuda. Nada de jugadas raras.")
      return
    }

    const { data: expenseData } = await supabase
      .from("expenses")
      .insert([
        {
          title: "Saldar deuda",
          amount: item.amount,
          group_id: item.groupId,
          paid_by: item.debtorId,
          owner_id: user.id,
        },
      ])
      .select()

    if (!expenseData || expenseData.length === 0) return

    const expenseId = expenseData[0].id

    await supabase.from("expense_splits").insert([
      { expense_id: expenseId, user_id: item.debtorId, amount: 0, owner_id: user.id },
      { expense_id: expenseId, user_id: item.creditorId, amount: item.amount, owner_id: user.id },
    ])

    const pendingRequest = groupSettlementRequests.find(
      (request) =>
        request.groupId === item.groupId &&
        request.debtorId === item.debtorId &&
        request.creditorId === item.creditorId
    )

    if (pendingRequest?.notificationId) {
      await supabase.from("notifications").delete().eq("id", pendingRequest.notificationId)
    }

    await createNotification({
      userId: item.debtorId,
      title: "Pago de grupo confirmado ✅",
      message: `${getUserName(item.creditorId)} ha aceptado el pago de ${item.amount.toFixed(2)}€ del grupo ${getGroupName(item.groupId)} y la deuda ya quedó saldada.`,
      type: "debt",
      ctaLabel: "Ver historial",
      ctaScreen: "historial",
    })

    await loadNotifications()

    showToast("Deuda saldada 👌")
    triggerActionFlash("✅", "Cobro confirmado")
    await getExpenses()
    await getExpenseSplits()
  }


  const requestFriendSettlementConfirmation = async (friendId: string, rawAmount: number) => {
    if (!user || !currentAppUser) return

    const settleAmount = Math.abs(Number(rawAmount.toFixed(2)))
    if (settleAmount <= 0) return

    const created = await createNotification({
      userId: friendId,
      title: "Te piden confirmar un pago 🧾",
      message: buildSettlementRequestMessage({
        scope: "friend",
        debtorId: currentAppUser.id,
        creditorId: friendId,
        amount: settleAmount,
      }),
      type: "settlement_request",
      ctaLabel: "Ver amigos",
      ctaScreen: "amigos",
    })

    showToast(created ? "Solicitud enviada al otro usuario." : "No se pudo enviar la solicitud al otro usuario.")
    triggerActionFlash("🧾", "Confirmación solicitada")
    await loadNotifications()
  }

  const confirmFriendSettlement = async (request: {
    notificationId: string
    debtorId: string
    creditorId: string
    amount: number
  }) => {
    if (!user || !currentAppUser) return

    const canConfirm = isAdmin || currentAppUser.id === request.creditorId
    if (!canConfirm) {
      alert("Solo la persona que tiene que recibir el dinero puede confirmar el pago.")
      return
    }

    const { data: expenseData } = await supabase
      .from("expenses")
      .insert([
        {
          title: "Saldar deuda",
          amount: request.amount,
          group_id: null,
          paid_by: request.debtorId,
          owner_id: user.id,
        },
      ])
      .select()

    if (!expenseData || expenseData.length === 0) return

    const expenseId = expenseData[0].id

    await supabase.from("expense_splits").insert([
      {
        expense_id: expenseId,
        user_id: request.debtorId,
        amount: 0,
        owner_id: user.id,
      },
      {
        expense_id: expenseId,
        user_id: request.creditorId,
        amount: request.amount,
        owner_id: user.id,
      },
    ])

    await supabase.from("notifications").delete().eq("id", request.notificationId)

    await createNotification({
      userId: request.debtorId,
      title: "Pago confirmado ✅",
      message: `${getUserName(request.creditorId)} ha aceptado el pago de ${request.amount.toFixed(2)}€ y la deuda ya quedó saldada.`,
      type: "debt",
      ctaLabel: "Ver historial",
      ctaScreen: "historial",
    })

    await loadNotifications()

    showToast("Pago entre colegas confirmado 👌")
    triggerActionFlash("🤝", "Pago confirmado")
    await getExpenses()
    await getExpenseSplits()
  }

  const requestGroupSettlementConfirmation = async (item: BalanceItem) => {
    if (!currentAppUser) return

    const created = await createNotification({
      userId: item.creditorId,
      title: "Te piden confirmar un pago de grupo 🧾",
      message: buildSettlementRequestMessage({
        scope: "group",
        debtorId: item.debtorId,
        creditorId: item.creditorId,
        amount: item.amount,
        groupId: item.groupId,
      }),
      type: "settlement_request",
      ctaLabel: "Ver balances",
      ctaScreen: "balances",
    })

    showToast(created ? "Solicitud enviada al otro usuario." : "No se pudo enviar la solicitud al otro usuario.")
    triggerActionFlash("🧾", "Confirmación solicitada")
    await loadNotifications()
  }

  const buildGroupsWithMembers = async () => {
    if (!user) return

    const { data: groupsData } = await supabase.from("groups").select("*").order("created_at", { ascending: false })
    const { data: usersData } = await supabase.from("users").select("*")
    const { data: membersData } = await supabase.from("group_members").select("*")

    if (!groupsData || !usersData || !membersData) return

    const result: GroupWithMembers[] = (groupsData as Group[]).map((group) => {
      const membersOfGroup = (membersData as GroupMember[])
        .filter((item) => item.group_id === group.id)
        .map((item) => (usersData as User[]).find((userItem) => userItem.id === item.user_id))
        .filter(Boolean) as User[]

      return { ...group, members: membersOfGroup }
    })

    setGroupsWithMembers(result)
  }

  useEffect(() => {
    if (!user) return
    buildGroupsWithMembers()
  }, [groups, users, groupMembers, user])

  const balancesByGroup = useMemo(() => {
    const resultByGroup: Record<string, BalanceItem[]> = {}

    for (const group of groups) {
      const groupExpenses = visibleExpenses.filter((expense) => expense.group_id === group.id)
      const map = new Map<string, number>()

      for (const expense of groupExpenses) {
        const splitsOfExpense = visibleExpenseSplits.filter((split) => split.expense_id === expense.id)

        for (const split of splitsOfExpense) {
          if (split.user_id === expense.paid_by) continue

          const key = `${split.user_id}|${expense.paid_by}`
          const reverseKey = `${expense.paid_by}|${split.user_id}`

          if (map.has(reverseKey)) {
            const current = map.get(reverseKey)!
            const newValue = current - split.amount

            if (newValue > 0) map.set(reverseKey, newValue)
            else {
              map.delete(reverseKey)
              if (newValue < 0) map.set(key, Math.abs(newValue))
            }
          } else {
            map.set(key, (map.get(key) || 0) + split.amount)
          }
        }
      }

      const balances: BalanceItem[] = []
      map.forEach((amountValue, key) => {
        const [debtorId, creditorId] = key.split("|")
        balances.push({ debtorId, creditorId, amount: amountValue, groupId: group.id })
      })

      resultByGroup[group.id] = balances
    }

    return resultByGroup
  }, [groups, visibleExpenses, visibleExpenseSplits])

  const morosoPorGrupo = useMemo(() => {
    const result: Record<string, { userId: string; amount: number } | null> = {}

    for (const group of groups) {
      const balances = balancesByGroup[group.id] || []
      const debtMap = new Map<string, number>()

      for (const item of balances) {
        debtMap.set(item.debtorId, (debtMap.get(item.debtorId) || 0) + item.amount)
      }

      let maxUserId: string | null = null
      let maxDebt = 0

      debtMap.forEach((amountValue, userId) => {
        if (amountValue > maxDebt) {
          maxDebt = amountValue
          maxUserId = userId
        }
      })

      result[group.id] = maxUserId && maxDebt > 0 ? { userId: maxUserId, amount: maxDebt } : null
    }

    return result
  }, [groups, balancesByGroup])

  const friendBalances = useMemo(() => {
    if (!currentAppUser) return []
    const map = new Map<string, number>()

    for (const expense of visibleExpenses) {
      const splitsOfExpense = visibleExpenseSplits.filter((split) => split.expense_id === expense.id)

      for (const split of splitsOfExpense) {
        if (split.user_id === expense.paid_by) continue

        if (expense.paid_by === currentAppUser.id && split.user_id !== currentAppUser.id) {
          map.set(split.user_id, (map.get(split.user_id) || 0) + split.amount)
        }

        if (split.user_id === currentAppUser.id && expense.paid_by !== currentAppUser.id) {
          map.set(expense.paid_by, (map.get(expense.paid_by) || 0) - split.amount)
        }
      }
    }

    const currentUserGroupIds = new Set(
      groupMembers.filter((item) => item.user_id === currentAppUser.id).map((item) => item.group_id)
    )

    groupMembers
      .filter((item) => currentUserGroupIds.has(item.group_id) && item.user_id !== currentAppUser.id)
      .forEach((item) => {
        if (!map.has(item.user_id)) map.set(item.user_id, 0)
      })

    return Array.from(map.entries())
      .map(([friendId, amountValue]) => ({
        friendId,
        amount: Number(amountValue.toFixed(2)),
      }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  }, [currentAppUser, visibleExpenses, visibleExpenseSplits, groupMembers])

  
  const notifications = useMemo(() => {
    if (!currentAppUser || !user) {
      return [...manualNotifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }

    const autoNotifications: NotificationItem[] = []

    receivedInvitations
      .filter((inv) => inv.status === "pending")
      .slice(0, 5)
      .forEach((inv) => {
        autoNotifications.push({
          id: `received-invite-${inv.id}`,
          title: "Invitación pendiente",
          message: `Tienes una invitación pendiente para ${inv.email}.`,
          createdAt: inv.created_at || new Date().toISOString(),
          type: "invite",
          ctaLabel: "Ver amigos",
          ctaScreen: "amigos",
        })
      })

    sentInvitations
      .filter((inv) => inv.status === "pending")
      .slice(0, 5)
      .forEach((inv) => {
        autoNotifications.push({
          id: `sent-invite-${inv.id}`,
          title: "Invitación enviada",
          message: `Tu invitación a ${inv.email} sigue pendiente.`,
          createdAt: inv.created_at || new Date().toISOString(),
          type: "invite",
          ctaLabel: "Ver amigos",
          ctaScreen: "amigos",
        })
      })

    friendBalances
      .filter((item) => item.amount > 0)
      .slice(0, 5)
      .forEach((item) => {
        autoNotifications.push({
          id: `friend-debt-${item.friendId}`,
          title: "Te deben dinero",
          message: `${getUserName(item.friendId)} te debe ${item.amount.toFixed(2)}€.`,
          createdAt: new Date().toISOString(),
          type: "debt",
          ctaLabel: "Ver amigos",
          ctaScreen: "amigos",
        })
      })

    expenses
      .filter((expense) => {
        const participants = expenseSplits
          .filter((split) => split.expense_id === expense.id)
          .map((split) => split.user_id)
        return participants.includes(currentAppUser.id)
      })
      .slice(0, 6)
      .forEach((expense) => {
        autoNotifications.push({
          id: `expense-${expense.id}`,
          title: "Movimiento reciente",
          message: `${expense.title} · ${Number(expense.amount).toFixed(2)}€ · ${getGroupName(
            expense.group_id
          )}`,
          createdAt: expense.created_at || new Date().toISOString(),
          type: "expense",
          ctaLabel: "Ver historial",
          ctaScreen: "historial",
        })
      })

    const merged = [...dbNotifications, ...manualNotifications, ...autoNotifications]
    const deduped = merged.filter(
      (item, index, arr) => arr.findIndex((candidate) => candidate.id === item.id) === index
    )

    return deduped.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [
    currentAppUser,
    user,
    dbNotifications,
    manualNotifications,
    receivedInvitations,
    sentInvitations,
    friendBalances,
    expenses,
    expenseSplits,
    groups,
    users,
  ])

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((item) => !notificationReadIds.includes(item.id)).length
  }, [notifications, notificationReadIds])

const normalExpenses = useMemo(() => visibleExpenses.filter((expense) => expense.title !== "Saldar deuda"), [visibleExpenses])
  const settledExpenses = useMemo(() => visibleExpenses.filter((expense) => expense.title === "Saldar deuda"), [visibleExpenses])

  const moroso = useMemo(() => {
    if (!currentAppUser) return null
    let maxFriendId: string | null = null
    let maxDebt = 0

    for (const item of friendBalances) {
      if (item.amount > maxDebt) {
        maxDebt = item.amount
        maxFriendId = item.friendId
      }
    }

    return maxFriendId && maxDebt > 0 ? { friendId: maxFriendId, amount: maxDebt } : null
  }, [friendBalances, currentAppUser])


  const settlementRequestNotifications = useMemo(() => {
    return notifications
      .map((item) => {
        const parsed = parseSettlementRequestMessage(item.message)
        if (!parsed) return null
        return {
          notificationId: item.id,
          title: item.title,
          createdAt: item.createdAt,
          ...parsed,
        }
      })
      .filter(Boolean) as Array<{
      notificationId: string
      title: string
      createdAt: string
      scope: "friend" | "group"
      groupId: string | null
      debtorId: string
      creditorId: string
      amount: number
    }>
  }, [notifications])

  const friendSettlementRequests = useMemo(() => {
    return settlementRequestNotifications.filter((item) => item.scope === "friend")
  }, [settlementRequestNotifications])

  const groupSettlementRequests = useMemo(() => {
    return settlementRequestNotifications.filter((item) => item.scope === "group")
  }, [settlementRequestNotifications])

  const monthlyPayersRanking = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const map = new Map<string, number>()

    visibleExpenses.forEach((expense) => {
      if (!expense.created_at) return
      const date = new Date(expense.created_at)
      if (date.getMonth() !== month || date.getFullYear() !== year) return
      map.set(expense.paid_by, (map.get(expense.paid_by) || 0) + Number(expense.amount || 0))
    })

    return Array.from(map.entries())
      .map(([userId, total]) => ({ userId, total }))
      .sort((a, b) => b.total - a.total)
  }, [visibleExpenses])

  const monthlyDebtorsRanking = useMemo(() => {
    return friendBalances
      .filter((item) => item.amount > 0)
      .map((item) => ({ userId: item.friendId, total: item.amount }))
      .sort((a, b) => b.total - a.total)
  }, [friendBalances])

  const rankingPagadores = useMemo(() => {
    const map = new Map<string, number>()
    visibleExpenses.forEach((expense) => {
      map.set(expense.paid_by, (map.get(expense.paid_by) || 0) + expense.amount)
    })
    return Array.from(map.entries())
      .map(([userId, total]) => ({ userId, total }))
      .sort((a, b) => b.total - a.total)
  }, [visibleExpenses])

  const totalPaid = useMemo(() => {
    if (!currentAppUser) return 0
    return visibleExpenses
      .filter((expense) => expense.paid_by === currentAppUser.id)
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  }, [currentAppUser, visibleExpenses])

  const totalYouAreOwed = useMemo(() => {
    return friendBalances
      .filter((item) => item.amount > 0)
      .reduce((sum, item) => sum + item.amount, 0)
  }, [friendBalances])

  const totalYouOwe = useMemo(() => {
    return Math.abs(
      friendBalances
        .filter((item) => item.amount < 0)
        .reduce((sum, item) => sum + item.amount, 0)
    )
  }, [friendBalances])

  const netBalance = useMemo(() => totalYouAreOwed - totalYouOwe, [totalYouAreOwed, totalYouOwe])

  const myGroupsCount = useMemo(() => {
    if (!currentAppUser) return 0
    return new Set(
      groupMembers.filter((item) => item.user_id === currentAppUser.id).map((item) => item.group_id)
    ).size
  }, [currentAppUser, groupMembers])

  const myCreatedExpensesCount = useMemo(() => {
    if (!currentAppUser) return 0
    return visibleExpenses.filter((expense) => expense.paid_by === currentAppUser.id).length
  }, [currentAppUser, visibleExpenses])

  const recentActivity = useMemo(() => {
    return [...visibleExpenses].slice(0, 5)
  }, [visibleExpenses])

  const topSharedFriend = useMemo(() => {
    const counts = new Map<string, number>()

    visibleExpenseSplits.forEach((split) => {
      if (!currentAppUser) return
      if (split.user_id === currentAppUser.id) return
      counts.set(split.user_id, (counts.get(split.user_id) || 0) + 1)
    })

    let topId: string | null = null
    let topCount = 0

    counts.forEach((count, friendId) => {
      if (count > topCount) {
        topCount = count
        topId = friendId
      }
    })

    return topId ? { friendId: topId, count: topCount } : null
  }, [visibleExpenseSplits, currentAppUser])

  const getTrustInfo = (amount: number, userId: string): TagInfo => {
    let level: TrustLevel = "top"
    if (amount > 150) level = "chaos"
    else if (amount > 80) level = "dodgy"
    else if (amount > 30) level = "meh"
    else if (amount > 10) level = "good"

    const content = TRUST_CONTENT[level]
    const index = seededIndex(userId, content.labels.length)

    return {
      label: content.labels[index],
      level,
      title: content.title,
      description: content.description,
      colorClass: content.colorClass,
      borderClass: content.borderClass,
    }
  }

  const getFriendBalanceText = (friendId: string) => {
    const item = friendBalances.find((f) => f.friendId === friendId)
    if (!item || item.amount === 0) return "Balance a cero"
    if (item.amount > 0) return `${getUserName(friendId)} te debe ${item.amount.toFixed(2)}€`
    return `Debes ${Math.abs(item.amount).toFixed(2)}€ a ${getUserName(friendId)}`
  }

  const handleClaimFriendPayment = async (friendId: string, amountValue: number) => {
    const friendName = getUserName(friendId)
    const message = `Ey ${friendName}, me debes ${amountValue.toFixed(2)}€ en TeDebo 😏 ¿Me lo pasas cuando puedas?`
    const copied = await copyText(message)

    const created = await createNotification({
      userId: friendId,
      title: "Te reclaman dinero 💸",
      message: `${currentAppUser?.name || "Un colega"} te está reclamando ${amountValue.toFixed(2)}€ en TeDebo.`,
      type: "reminder",
      ctaLabel: "Ver amigos",
      ctaScreen: "amigos",
    })

    showToast(
      created
        ? copied
          ? "Reclamo enviado al otro usuario y mensaje copiado 💸"
          : "Reclamo enviado al otro usuario"
        : "No se pudo enviar la notificación al otro usuario"
    )
    triggerActionFlash("📣", "Reclamo enviado")
  }

  const handleClaimGroupPayment = async (item: BalanceItem) => {
    const debtorName = getUserName(item.debtorId)
    const creditorName = getUserName(item.creditorId)
    const groupName = getGroupName(item.groupId)
    const youAreCreditor = currentAppUser?.id === item.creditorId

    const message = youAreCreditor
      ? `Ey ${debtorName}, me debes ${item.amount.toFixed(2)}€ del grupo ${groupName} 😏`
      : `${debtorName} debe ${item.amount.toFixed(2)}€ a ${creditorName} en ${groupName}.`

    const copied = await copyText(message)

    const created = await createNotification({
      userId: item.debtorId,
      title: "Te reclaman un pago de grupo 💸",
      message: `${creditorName} te está reclamando ${item.amount.toFixed(2)}€ del grupo ${groupName}.`,
      type: "reminder",
      ctaLabel: "Ver balances",
      ctaScreen: "balances",
    })

    showToast(
      created
        ? copied
          ? "Reclamo de grupo enviado y mensaje copiado 📲"
          : "Reclamo de grupo enviado al otro usuario"
        : "No se pudo enviar la notificación al otro usuario"
    )
    triggerActionFlash("📲", "Reclamo enviado")
  }

  const openFriendExpense = (friendId: string) => {
    setExpenseMode("friend")
    setSelectedFriendId(friendId)
    setExpenseGroupId("")
    setPaidBy(currentAppUser?.id || "")
    setScreen("gastos")
  }

  if (!user) {
    return (
      <main className="min-h-screen overflow-x-hidden flex items-center justify-center bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617)] px-4 overflow-hidden">
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-2xl text-white shadow-lg">💸</div>
            <div>
              <h1 className="text-3xl font-black text-black">TeDebo</h1>
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500">cuentas entre colegas</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2 text-center text-black">
            {authMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>

          <button
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            className="text-sm text-gray-500 hover:text-black mb-4 w-full text-center transition"
          >
            {authMode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>

          <input
            className="border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none p-3 mb-3 w-full rounded-lg transition"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {authMode === "register" && (
            <div className="flex flex-col">
              <input className="border border-gray-300 p-3 mb-3 w-full rounded-lg" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              <input className="border border-gray-300 p-3 mb-3 w-full rounded-lg" placeholder="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
            </div>
          )}

          <input
            className="border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none p-3 mb-3 w-full rounded-lg transition"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={async () => {
              if (loading) return
              setLoading(true)

              if (!email || !password || (authMode === "register" && (!nombre || !apellidos))) {
                alert("Faltan datos")
                setLoading(false)
                return
              }

              const isProtectedAdminEmail = email.toLowerCase() === ADMIN_EMAIL
              const requestedDisplayName = `${nombre} ${apellidos}`.trim()

              if (authMode === "register" && !isProtectedAdminEmail && containsReservedAdminName(requestedDisplayName)) {
                alert("El nombre Girma está reservado para el administrador. Usa otro nombre.")
                setLoading(false)
                return
              }

              let error: any
              if (authMode === "login") {
                const res = await supabase.auth.signInWithPassword({ email, password })
                error = res.error
              } else {
                const res = await supabase.auth.signUp({
                  email,
                  password,
                  options: { data: { nombre, apellidos } },
                })
                error = res.error
              }

              if (error) {
                alert(error.message)
                setLoading(false)
                return
              }

              setLoading(false)
            }}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-black text-white"
          >
            {loading ? "Cargando..." : authMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_35%,_#ffffff_70%)] px-4 py-4 sm:px-5 sm:py-5 lg:p-4">
      {toast && <div className="fixed bottom-6 right-6 z-[80] rounded-xl bg-black px-4 py-3 text-white shadow-2xl">{toast}</div>}
      {(menuOpen || notificationsOpen) && (
        <button
          aria-label="Cerrar paneles"
          onClick={() => {
            setMenuOpen(false)
            setNotificationsOpen(false)
          }}
          className="fixed inset-0 z-[40] bg-black/10 sm:bg-black/5"
        />
      )}
      {actionFlash && (
        <div className="pointer-events-none fixed right-6 top-24 z-[85] rounded-2xl bg-white px-5 py-4 text-black shadow-2xl">
          <p className="text-2xl">{actionFlash.emoji}</p>
          <p className="mt-1 text-sm font-semibold">{actionFlash.text}</p>
        </div>
      )}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-60px] top-24 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl animate-pulse" />
        <div className="absolute right-[-30px] top-12 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-80px] left-1/3 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl animate-pulse" />
      </div>

      <div className="mx-auto max-w-6xl relative">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <button
            onClick={() => setScreen("home")}
            className="flex items-center gap-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Volver a inicio"
          >
            {renderAvatar(
              currentAppUser?.id,
              currentAppUser?.name,
              "h-12 w-12",
              "text-sm",
              "ring-2 ring-white shadow-lg"
            )}
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500">TeDebo</p>
              <p className="text-xs text-gray-400">Inicio</p>
            </div>
          </button>

          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative z-[60]">
              <button onClick={() => setMenuOpen(!menuOpen)} className="px-4 py-2 rounded-xl bg-white border border-gray-200">☰</button>
              {menuOpen && (
                <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 w-[90vw] max-w-[280px] pointer-events-auto sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:translate-x-0 sm:w-40 bg-white border rounded-xl shadow-lg z-50">
                  {menuItems.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setScreen(item)
                        setMenuOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 capitalize"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative z-[60]">
              <button
                onClick={() => {
                  setNotificationsOpen((prev) => !prev)
                  if (!notificationsOpen) markAllNotificationsAsRead(notifications)
                }}
                className="relative rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm"
              >
                🔔
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50 w-[92vw] max-w-[320px] pointer-events-auto sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:translate-x-0 sm:w-[340px] rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-black">Notificaciones</p>
                      <p className="text-xs text-gray-500">Invites, gastos y recordatorios.</p>
                    </div>
                    <button
                      onClick={() => markAllNotificationsAsRead(notifications)}
                      className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-black"
                    >
                      Marcar todo
                    </button>
                  </div>

                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                        No tienes notificaciones por ahora.
                      </div>
                    ) : (
                      notifications.map((item) => {
                        const unread = !notificationReadIds.includes(item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`block w-full rounded-xl border p-3 text-left transition-all hover:bg-gray-50 ${
                              unread ? "border-black/10 bg-gray-50" : "border-gray-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-black">{item.title}</p>
                                <p className="mt-1 text-xs leading-5 text-gray-600">
                                  {parseSettlementRequestMessage(item.message)
                                    ? `Solicitud de confirmación por ${parseSettlementRequestMessage(item.message)?.amount.toFixed(2)}€${parseSettlementRequestMessage(item.message)?.groupId ? ` · ${getGroupName(parseSettlementRequestMessage(item.message)?.groupId || null)}` : ""}`
                                    : item.message}
                                </p>
                              </div>
                              {unread && <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[11px] text-gray-400">{formatDate(item.createdAt)}</span>
                              {item.ctaLabel && (
                                <span className="rounded-full bg-black px-2 py-1 text-[10px] font-semibold text-white">
                                  {item.ctaLabel}
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setUser(null)
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 text-sm rounded-lg shadow sm:px-4 sm:text-base"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {screen === "home" && (
          <div className="mx-auto flex max-w-6xl animate-[fadeIn_.35s_ease] flex-col gap-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-slate-800 to-black p-5 sm:p-4 lg:p-8 text-white shadow-2xl">
              <div className="absolute -top-4 -left-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute top-10 right-6 h-20 w-20 rounded-full bg-green-400/20 blur-2xl" />
              <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-red-400/20 blur-2xl" />

              <div className="relative z-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] items-center">
                <div className="flex flex-col gap-4">
                  <div className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm backdrop-blur">
                    Bienvenido al rincón de las cuentas pendientes
                  </div>

                  <h2 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                    Si estás aquí,
                    <br />
                    <span className="text-green-300">alguien te debe pasta.</span>
                  </h2>

                  <p className="max-w-2xl text-sm text-gray-200 sm:text-base">
                    Grupos, balances visuales, onboarding, ranking mensual y minijuegos para meter presión.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">Grupos reales</div>
                    <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">Amigos y balances</div>
                    <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">Historial y morosos</div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-xs uppercase tracking-wide text-white/60">Colegas</p>
                      <p className="mt-2 text-2xl font-black">{friendList.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-xs uppercase tracking-wide text-white/60">Grupos</p>
                      <p className="mt-2 text-2xl font-black">{groups.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-xs uppercase tracking-wide text-white/60">Gastos</p>
                      <p className="mt-2 text-2xl font-black">{normalExpenses.length}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <p className="text-xs uppercase tracking-wide text-white/60">Top pagador del mes</p>
                      <p className="mt-2 text-lg font-black">
                        {monthlyPayersRanking[0] ? getUserName(monthlyPayersRanking[0].userId) : "Sin datos"}
                      </p>
                      <p className="mt-1 text-sm text-white/70">
                        {monthlyPayersRanking[0] ? `${monthlyPayersRanking[0].total.toFixed(2)}€ pagados` : "Todavía no hay pagos este mes"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <p className="text-xs uppercase tracking-wide text-white/60">Moroso fuerte del mes</p>
                      <p className="mt-2 text-lg font-black">
                        {monthlyDebtorsRanking[0] ? getUserName(monthlyDebtorsRanking[0].userId) : "Sin datos"}
                      </p>
                      <p className="mt-1 text-sm text-white/70">
                        {monthlyDebtorsRanking[0] ? `${monthlyDebtorsRanking[0].total.toFixed(2)}€ pendientes` : "Hoy la peña va fina"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="relative h-[300px] w-[300px] [perspective:1000px]">
                    <div className="absolute inset-0 rounded-[32px] bg-white/10 blur-2xl" />
                    <div className="absolute left-1/2 top-1/2 grid h-60 w-60 -translate-x-1/2 -translate-y-1/2 grid-cols-3 gap-2 rounded-[28px] border border-white/15 bg-black/20 p-4 shadow-2xl backdrop-blur-md animate-[floatCube_6s_ease-in-out_infinite]">
                      {["😏", "💸", "🕶️", "🪙", "🤑", "💰", "😈", "🏦", "🫰"].map((icon, index) => (
                        <div key={index} className="flex items-center justify-center rounded-xl border border-white/10 bg-white/10 text-2xl shadow-inner backdrop-blur-sm">
                          {icon}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {showGuide && (
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-black">Cómo funciona TeDebo</h3>
                    <p className="mt-1 text-sm text-gray-500">Guía rápida para que cualquiera entienda la app en 10 segundos.</p>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">Cerrar</button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["1", "👤", "Crea cuenta", "Entra y deja lista tu cuenta."],
                    ["2", "📩", "Invita amigos", "Que se registren con el mismo correo."],
                    ["3", "🧾", "Añade gastos", "Grupo o gasto directo, como tú quieras."],
                    ["4", "📊", "Revisa balances", "Mira quién debe y quién paga más."],
                  ].map(([num, icon, title, desc]) => (
                    <div key={num} className="rounded-2xl bg-gray-50 p-4 shadow-sm">
                      <p className="text-2xl">{icon}</p>
                      <p className="mt-3 font-bold text-black">{title}</p>
                      <p className="mt-2 text-sm text-gray-600">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-4 text-white shadow-2xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">📩 Trae a tu gente</div>
                  <h3 className="mt-3 text-2xl font-black sm:text-3xl">
                    Trae a tus colegas y empieza a repartir cuentas como un jefe 😈
                  </h3>
                  <p className="mt-2 text-sm text-white/90 sm:text-base">
                    Mándales la invitación y que entren con el mismo correo al que les llegó.
                  </p>
                </div>

                <div className="w-full max-w-xl rounded-2xl bg-white/10 p-4 backdrop-blur-md">
                  <label className="mb-2 block text-sm font-semibold text-white">Correo de tu colega</label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      placeholder="colega@correo.com"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-white/90 p-3 text-black outline-none"
                    />
                    <button onClick={addUser} className="rounded-xl bg-black px-5 py-3 font-semibold text-white transition-all hover:scale-105 active:scale-95">
                      Enviar invitación
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-white/80">Importante: tu colega debe registrarse o iniciar sesión con ese mismo correo.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-black">Actividad y avisos</h3>
                  <p className="text-sm text-gray-500">Lo más importante que tienes pendiente ahora mismo.</p>
                </div>
                <div className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                  {unreadNotificationsCount} nuevas
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {notifications.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left transition-all hover:scale-[1.01]"
                  >
                    <p className="text-sm font-bold text-black">{item.title}</p>
                    <p className="mt-2 text-sm leading-5 text-gray-600">{item.message}</p>
                    <p className="mt-3 text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                  </button>
                ))}
                {notifications.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 md:col-span-3">
                    De momento no tienes nada urgente. Buena señal.
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-black">Centro de minijuegos</h3>
                    <p className="text-sm text-gray-500">Juega en pantalla completa y métele presión al drama financiero.</p>
                  </div>

                  <button onClick={() => setShowGamesMenu((prev) => !prev)} className="rounded-xl bg-black px-4 py-3 text-white transition-all hover:scale-105 active:scale-95">
                    {showGamesMenu ? "Ocultar" : "Más minijuegos"}
                  </button>
                </div>

                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Tiempo</p>
                    <p className="text-xl font-bold text-black">{gameTimeLeft}s</p>
                  </div>
                  <div className="rounded-xl bg-gray-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Pasta recuperada</p>
                    <p className="text-xl font-bold text-black">{gameCash}€</p>
                  </div>
                  <div className="rounded-xl bg-gray-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Presión</p>
                    <p className="text-xl font-bold text-black">{gamePressure}%</p>
                  </div>
                </div>

                <div className="mb-4 h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 transition-all duration-200" style={{ width: `${Math.min(gamePressure, 100)}%` }} />
                </div>

                <button onClick={() => startGame("moroso")} className="w-full rounded-2xl bg-gradient-to-br from-black to-zinc-800 p-4 text-left text-white transition-all hover:scale-[1.01] active:scale-[0.99]">
                  <p className="text-4xl">💸</p>
                  <p className="mt-3 text-xl font-black">A por el moroso</p>
                  <p className="mt-2 text-sm text-white/70">El clásico para empezar fuerte. Rápido, simple y adictivo.</p>
                </button>

                {showGamesMenu && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(["reflejos", "memoria", "excusas", "monedas"] as GameId[]).map((game) => (
                      <button key={game} onClick={() => startGame(game)} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <p className="text-2xl">{GAME_INFO[game].icon}</p>
                        <p className="mt-3 font-bold text-black">{GAME_INFO[game].title}</p>
                        <p className="mt-1 text-sm text-gray-600">{GAME_INFO[game].subtitle}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-black">Quién pagó más</h3>
                    <p className="text-sm text-gray-500">Podio mensual para el pique sano.</p>
                  </div>
                  <div className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">🏆 Podio</div>
                </div>

                <div className="space-y-3">
                  {rankingPagadores.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">Todavía no hay pagos para montar el ranking.</div>
                  ) : (
                    rankingPagadores.slice(0, 5).map((item, index) => (
                      <div key={item.userId} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-black text-sm font-bold text-white">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}
                          </div>
                          <div>
                            <p className="font-semibold text-black">{getUserName(item.userId)}</p>
                            <p className="text-xs text-gray-500">Total pagado acumulado</p>
                          </div>
                        </div>

                        <div className="rounded-full bg-white px-3 py-1 text-sm font-bold text-black shadow-sm">{item.total.toFixed(2)}€</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === "amigos" && (
          <div className="mx-auto flex max-w-4xl animate-[fadeIn_.35s_ease] flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-semibold text-black">Colegas</h2>
              <p className="mt-1 text-sm text-gray-500">Aquí ves el balance global contigo y cada colega, con su nivel de confianza incluido.</p>

              <div className="mt-4 space-y-3">
                {friendList.length === 0 ? (
                  <p className="text-gray-500">Todavía no tienes balances con colegas.</p>
                ) : (
                  friendList.map((friend) => {
                    const balance = friendBalances.find((item) => item.friendId === friend.id)?.amount || 0
                    const trustInfo = getTrustInfo(balance > 0 ? balance : 0, friend.id)

                    return (
                      <div key={friend.id} className={`rounded-xl border p-4 ${trustInfo.borderClass}`}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-3">
                            {renderAvatar(friend.id, friend.name, "h-12 w-12", "text-sm")}
                            <div>
                              <p className="text-lg font-semibold text-black">{friend.name}</p>
                              <p className="text-sm text-gray-600">{getFriendBalanceText(friend.id)}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => setTagModal(trustInfo)} className={`rounded-full px-3 py-2 text-sm font-semibold ${trustInfo.colorClass}`}>
                              {trustInfo.label}
                            </button>

                            {balance < 0 && (
                              <button
                                onClick={() => requestFriendSettlementConfirmation(friend.id, balance)}
                                className="rounded-xl bg-emerald-600 px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                              >
                                Pedir confirmación de deuda saldada
                              </button>
                            )}

                            {balance > 0 && (
                              <>
                                <button
                                  onClick={() => handleClaimFriendPayment(friend.id, balance)}
                                  className="rounded-xl bg-amber-500 px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                                >
                                  Reclamar pago
                                </button>

                                {friendSettlementRequests.some(
                                  (request) =>
                                    request.debtorId === friend.id && request.creditorId === currentAppUser?.id
                                ) && (
                                  <button
                                    onClick={() => {
                                      const request = friendSettlementRequests.find(
                                        (item) =>
                                          item.debtorId === friend.id &&
                                          item.creditorId === currentAppUser?.id
                                      )
                                      if (request) confirmFriendSettlement(request)
                                    }}
                                    className="rounded-xl bg-sky-600 px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                                  >
                                    Aceptar pago y saldar deuda
                                  </button>
                                )}
                              </>
                            )}

                            <button onClick={() => openFriendExpense(friend.id)} className="rounded-xl bg-black px-4 py-3 text-white transition-all hover:scale-105 active:scale-95">
                              Añadir gasto directo
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full rounded-full ${balance > 0 ? "bg-emerald-500" : balance < 0 ? "bg-red-500" : "bg-gray-400"}`}
                            style={{ width: `${Math.min(Math.max(Math.abs(balance) * 2, 12), 100)}%` }}
                          />
                        </div>

                        {balance < 0 && (
                          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                            Si ya has pagado a {friend.name}, pulsa <span className="font-semibold">“Pedir confirmación de deuda saldada”</span>.
                          </div>
                        )}

                        {balance > 0 &&
                          friendSettlementRequests.some(
                            (request) =>
                              request.debtorId === friend.id && request.creditorId === currentAppUser?.id
                          ) && (
                            <div className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">
                              {friend.name} te ha pedido confirmar que ya te pagó. Pulsa <span className="font-semibold">“Aceptar pago y saldar deuda”</span> para quitar la deuda.
                            </div>
                          )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-xl font-semibold text-black">Invitaciones recibidas</h3>
                <div className="mt-3 space-y-3">
                  {receivedInvitations.length === 0 ? (
                    <p className="text-gray-500">No tienes invitaciones pendientes.</p>
                  ) : (
                    receivedInvitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-xl border p-3">
                        <div>
                          <p className="font-semibold text-black">{inv.email}</p>
                          <p className="text-xs text-gray-500">{inv.status}</p>
                        </div>
                        <button onClick={() => acceptInvitation(inv)} className="rounded-lg bg-black px-4 py-2 text-white">Aceptar</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-xl font-semibold text-black">Invitaciones enviadas</h3>
                <div className="mt-3 space-y-3">
                  {sentInvitations.length === 0 ? (
                    <p className="text-gray-500">No has enviado invitaciones aún.</p>
                  ) : (
                    sentInvitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-xl border p-3">
                        <div>
                          <p className="font-semibold text-black">{inv.email}</p>
                          <p className="text-xs text-gray-500">{inv.status}</p>
                        </div>
                        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
                          {inv.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === "gastos" && (
          <div className="mx-auto flex max-w-4xl animate-[fadeIn_.35s_ease] flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-black">Añadir gasto</h2>
                  <p className="mt-1 text-sm text-gray-500">Flujo más limpio y visual.</p>
                </div>
                <div className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
                  {expenseMode === "group" ? "Modo grupo" : "Modo amigo"}
                </div>
              </div>

              <div className="mb-5 grid gap-3 sm:grid-cols-5">
                {[
                  ["1", "¿Con quién?"],
                  ["2", "Concepto"],
                  ["3", "Cantidad"],
                  ["4", "Quién paga"],
                  ["5", "Reparto"],
                ].map(([n, txt]) => (
                  <div key={n} className="rounded-2xl bg-gray-50 p-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Paso {n}</p>
                    <p className="mt-2 text-sm font-semibold text-black">{txt}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setExpenseMode("group")
                        setSelectedFriendId("")
                      }}
                      className={`rounded-xl px-4 py-2 text-white transition-all ${expenseMode === "group" ? "bg-black" : "bg-gray-500"}`}
                    >
                      Gasto de grupo
                    </button>

                    <button
                      onClick={() => {
                        setExpenseMode("friend")
                        setExpenseGroupId("")
                      }}
                      className={`rounded-xl px-4 py-2 text-white transition-all ${expenseMode === "friend" ? "bg-black" : "bg-gray-500"}`}
                    >
                      Gasto con amigo
                    </button>
                  </div>

                  <input placeholder="Concepto (ej: cena)" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none" />
                  <input type="number" placeholder="Cantidad total" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none" />

                  {expenseMode === "group" ? (
                    <select value={expenseGroupId} onChange={(e) => { setExpenseGroupId(e.target.value); setPaidBy(""); setCustomSplits({}) }} className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none">
                      <option value="">Grupo</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  ) : (
                    <select value={selectedFriendId} onChange={(e) => { setSelectedFriendId(e.target.value); setPaidBy(currentAppUser?.id || ""); setCustomSplits({}) }} className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none">
                      <option value="">Amigo</option>
                      {friendList.map((friend) => <option key={friend.id} value={friend.id}>{friend.name}</option>)}
                    </select>
                  )}

                  <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} disabled={expenseParticipants.length === 0} className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none disabled:bg-gray-100">
                    <option value="">
                      {expenseParticipants.length === 0 ? (expenseMode === "group" ? "Ese grupo no tiene personas" : "Primero elige amigo") : "Quién paga"}
                    </option>
                    {expenseParticipants.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>

                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setSplitMode("equal")} className={`rounded-xl px-3 py-2 text-white ${splitMode === "equal" ? "bg-black" : "bg-gray-500"}`}>Equitativa</button>
                    <button onClick={() => setSplitMode("custom")} className={`rounded-xl px-3 py-2 text-white ${splitMode === "custom" ? "bg-black" : "bg-gray-500"}`}>Personalizada</button>
                  </div>

                  {splitMode === "custom" && expenseParticipants.length > 0 && (
                    <div className="mt-3 rounded-xl border p-3">
                      <h3 className="font-semibold text-black">Importe por persona</h3>
                      <div className="mt-2 flex flex-col gap-2">
                        {expenseParticipants.map((member) => (
                          <div key={member.id} className="flex flex-col gap-1">
                            <label className="text-sm text-black">{member.name}</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0"
                              value={customSplits[member.id] || ""}
                              onChange={(e) => handleCustomSplitChange(member.id, e.target.value)}
                              className="rounded-lg border border-gray-300 p-3 text-black outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={addExpense} className="mt-4 w-full rounded-xl bg-red-600 p-3 text-white transition-all hover:scale-105 active:scale-95">Añadir gasto</button>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <h3 className="font-semibold text-black">Vista previa</h3>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <p><span className="font-semibold">Concepto:</span> {expenseTitle || "-"}</p>
                    <p><span className="font-semibold">Cantidad:</span> {amount || "0"}€</p>
                    <p><span className="font-semibold">Modo:</span> {expenseMode === "group" ? "Grupo" : "Amigo"}</p>
                    <p><span className="font-semibold">Participantes:</span> {expenseParticipants.length}</p>
                    <p><span className="font-semibold">Reparto:</span> {splitMode === "equal" ? "Equitativo" : "Personalizado"}</p>
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-black">Consejos</p>
                    <ul className="mt-2 space-y-1 text-xs text-gray-600">
                      <li>• Quien paga debe estar dentro del gasto.</li>
                      <li>• Usa personalizado si no todos ponen lo mismo.</li>
                      <li>• Para balances directos, usa amigo en vez de grupo.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-black">Miembros por grupo</h2>
              <div className="mt-3 flex flex-col gap-4">
                {groupsWithMembers.length === 0 ? (
                  <p className="text-gray-500">No hay grupos todavía</p>
                ) : (
                  groupsWithMembers.map((group) => (
                    <div key={group.id} className="rounded border p-3">
                      <button onClick={() => toggleMemberGroup(group.id)} className="flex w-full items-center justify-between text-left">
                        <h3 className="font-bold text-black">{group.name}</h3>
                        <span className="text-black">{openMemberGroups[group.id] ? "▲" : "▼"}</span>
                      </button>

                      {openMemberGroups[group.id] && (
                        <div className="mt-2">
                          {group.members.length === 0 ? (
                            <p className="text-sm text-gray-500">Todavía no hay personas en este grupo</p>
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {group.members.map((member) => <li key={member.id} className="text-black">- {member.name}</li>)}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <h3 className="text-lg font-semibold text-black">Crear grupo</h3>
                  <div className="mt-3 flex gap-2">
                    <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nombre del grupo" className="w-full rounded-lg border border-gray-300 p-3 text-black" />
                    <button onClick={addGroup} className="rounded-xl bg-black px-4 py-3 text-white">Crear</button>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <h3 className="text-lg font-semibold text-black">Añadir persona a grupo</h3>
                  <div className="mt-3 grid gap-2">
                    <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="rounded-lg border border-gray-300 p-3 text-black">
                      <option value="">Persona</option>
                      {friendList.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>

                    <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="rounded-lg border border-gray-300 p-3 text-black">
                      <option value="">Grupo</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>

                    <button onClick={addPersonToGroup} className="rounded-xl bg-black px-4 py-3 text-white">Añadir</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === "balances" && (
          <div className="mx-auto flex max-w-4xl animate-[fadeIn_.35s_ease] flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-black">Balances por grupo</h2>
              <p className="mt-1 text-sm text-gray-500">Visual más claro para entender quién debe y cuánto.</p>

              <div className="mt-4 flex flex-col gap-4">
                {groups.length === 0 ? (
                  <p className="text-gray-500">No hay grupos todavía</p>
                ) : (
                  groups.map((group) => {
                    const balances = balancesByGroup[group.id] || []
                    const morosoGrupo = morosoPorGrupo[group.id]
                    const maxAmount = balances.length > 0 ? Math.max(...balances.map((b) => b.amount)) : 0

                    return (
                      <div key={group.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <button onClick={() => toggleBalanceGroup(group.id)} className="flex w-full items-center justify-between text-left">
                          <div>
                            <h3 className="font-bold text-black">{group.name}</h3>
                            {morosoGrupo && (
                              <p className="mt-1 text-sm text-red-600">
                                Moroso del grupo: {getUserName(morosoGrupo.userId)} · {morosoGrupo.amount.toFixed(2)}€
                              </p>
                            )}
                          </div>
                          <span className="text-black">{openBalanceGroups[group.id] ? "▲" : "▼"}</span>
                        </button>

                        {openBalanceGroups[group.id] && (
                          <div className="mt-3 space-y-3">
                            {balances.length === 0 ? (
                              <p className="text-sm text-gray-500">No hay deudas en este grupo</p>
                            ) : (
                              balances.map((item, index) => (
                                <div key={index} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-3">
                                      {renderAvatar(item.debtorId, getUserName(item.debtorId), "h-12 w-12", "text-sm")}
                                      <div>
                                        <p className="font-semibold text-black">{getUserName(item.debtorId)}</p>
                                        <p className="text-sm text-gray-500">
                                          Debe a {getUserName(item.creditorId)}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                          {renderAvatar(item.creditorId, getUserName(item.creditorId), "h-7 w-7", "text-[10px]")}
                                          <span className="text-xs text-gray-500">{getUserName(item.creditorId)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                                        {item.amount.toFixed(2)}€
                                      </span>
                                      {currentAppUser?.id === item.creditorId && (
                                        <button onClick={() => handleClaimGroupPayment(item)} className="rounded-xl bg-amber-500 px-4 py-3 text-white">
                                          Reclamar
                                        </button>
                                      )}
                                      {currentAppUser?.id === item.debtorId && !isAdmin ? (
                                        <button onClick={() => requestGroupSettlementConfirmation(item)} className="rounded-xl bg-emerald-600 px-4 py-3 text-white">
                                          Solicitar confirmación
                                        </button>
                                      ) : (
                                        <button onClick={() => settleBalance(item)} className="rounded-xl bg-black px-4 py-3 text-white">
                                          {groupSettlementRequests.some(
                                            (request) =>
                                              request.groupId === item.groupId &&
                                              request.debtorId === item.debtorId &&
                                              request.creditorId === item.creditorId
                                          )
                                            ? "Aceptar pago y saldar deuda"
                                            : "Saldar"}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600"
                                      style={{ width: `${maxAmount > 0 ? Math.max((item.amount / maxAmount) * 100, 12) : 12}%` }}
                                    />
                                  </div>

                                  {currentAppUser?.id === item.debtorId && !isAdmin && (
                                    <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                                      Si ya has pagado esta deuda, pulsa <span className="font-semibold">“Pedir confirmación de deuda saldada”</span>.
                                    </div>
                                  )}

                                  {groupSettlementRequests.some(
                                    (request) =>
                                      request.groupId === item.groupId &&
                                      request.debtorId === item.debtorId &&
                                      request.creditorId === item.creditorId
                                  ) &&
                                    currentAppUser?.id === item.creditorId && (
                                      <div className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">
                                        {getUserName(item.debtorId)} te ha pedido confirmar este pago. Pulsa <span className="font-semibold">“Aceptar pago y saldar deuda”</span>.
                                      </div>
                                    )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {screen === "historial" && (
          <div className="mx-auto flex max-w-4xl animate-[fadeIn_.35s_ease] flex-col gap-4">
            {isAdmin && (
              <div className="flex justify-end">
                <button
                  onClick={deleteAllHistory}
                  className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
                >
                  Borrar historial completo
                </button>
              </div>
            )}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setShowExpenseHistory((prev) => !prev)} className="flex w-full items-center justify-between text-left">
                  <div>
                    <h2 className="text-xl font-semibold text-black">Historial de gastos</h2>
                    <p className="mt-1 text-sm text-gray-500">Todos los movimientos normales guardados.</p>
                  </div>
                  <span className="text-black">{showExpenseHistory ? "▲" : "▼"}</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={deleteAllNormalHistory}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Borrar todo
                  </button>
                )}
              </div>

              {showExpenseHistory && (
                <div className="mt-4">
                  {normalExpenses.length === 0 ? (
                    <p className="text-gray-500">Todavía no hay gastos normales</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {normalExpenses.map((e) => (
                        <li key={e.id} className="rounded-xl border bg-gray-50 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {renderAvatar(e.paid_by, getUserName(e.paid_by), "h-11 w-11", "text-sm")}
                              <div>
                                <p className="font-semibold text-black">{e.title}</p>
                                <p className="mt-1 text-sm text-gray-700">{e.amount}€ · {getGroupName(e.group_id)}</p>
                                <p className="text-sm text-gray-700">Pagó: {getUserName(e.paid_by)}</p>
                                <p className="mt-2 text-xs text-gray-500">{formatDate(e.created_at)}</p>
                              </div>
                            </div>
                            <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-black shadow-sm">
                              {e.group_id ? "Grupo" : "Individual"}
                            </div>
                          </div>

                          <div className="mt-3 rounded-lg bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reparto</p>
                            <p className="mt-1 text-sm text-black">{getExpensePeopleSummary(e.id)}</p>
                          </div>

                          {isAdmin && <button onClick={() => deleteExpense(e.id)} className="mt-3 rounded bg-black px-3 py-2 text-white">Borrar gasto</button>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setShowSettledHistory((prev) => !prev)} className="flex w-full items-center justify-between text-left">
                  <div>
                    <h2 className="text-xl font-semibold text-black">Historial de deudas saldadas</h2>
                    <p className="mt-1 text-sm text-gray-500">Los movimientos ya resueltos también cuentan.</p>
                  </div>
                  <span className="text-black">{showSettledHistory ? "▲" : "▼"}</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={deleteAllSettledHistory}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Borrar todo
                  </button>
                )}
              </div>

              {showSettledHistory && (
                <div className="mt-4">
                  {settledExpenses.length === 0 ? (
                    <p className="text-gray-500">Todavía no hay deudas saldadas</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {settledExpenses.map((e) => (
                        <li key={e.id} className="rounded-xl border bg-green-50 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {renderAvatar(e.paid_by, getUserName(e.paid_by), "h-11 w-11", "text-sm")}
                              <div>
                                <p className="font-semibold text-black">Saldar deuda</p>
                                <p className="mt-1 text-sm text-gray-700">{e.amount}€ · {getGroupName(e.group_id)}</p>
                                <p className="text-sm text-gray-700">Pagó: {getUserName(e.paid_by)}</p>
                                <p className="mt-2 text-xs text-gray-500">{formatDate(e.created_at)}</p>
                              </div>
                            </div>
                            <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-green-700 shadow-sm">Saldado</div>
                          </div>

                          <div className="mt-3 rounded-lg bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Movimiento</p>
                            <p className="mt-1 text-sm text-black">{getExpensePeopleSummary(e.id)}</p>
                          </div>

                          {isAdmin && <button onClick={() => deleteExpense(e.id)} className="mt-3 rounded bg-black px-3 py-2 text-white">Borrar registro</button>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {screen === "moroso" && (
          <div className="mx-auto flex max-w-4xl animate-[fadeIn_.35s_ease] flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xl font-semibold text-black">Moroso del mes</h2>

              {!moroso ? (
                <p className="text-green-600">No hay morosos. Hoy la peña se ha portado.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-2xl bg-gradient-to-br from-red-500 to-black p-4 text-white shadow-xl">
                    <div className="flex items-center gap-4">
                      {renderAvatar(moroso.friendId, getUserName(moroso.friendId), "h-16 w-16", "text-lg")}
                      <div>
                        <div className="text-3xl">💀</div>
                        <p className="mt-2 text-2xl font-bold">{getUserName(moroso.friendId)}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-lg">te debe {moroso.amount.toFixed(2)}€</p>
                    <p className="mt-3 text-sm opacity-80">Nivel de morosidad: extremo</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-lg font-bold text-black">Top balances contigo</h3>
                    <div className="mt-4 space-y-3">
                      {friendBalances
                        .filter((item) => item.amount > 0)
                        .slice(0, 5)
                        .map((item, index) => (
                          <div key={item.friendId} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-full bg-black text-sm font-bold text-white">
                                {index + 1}
                              </div>
                              {renderAvatar(item.friendId, getUserName(item.friendId), "h-10 w-10", "text-xs")}
                              <div>
                                <p className="font-semibold text-black">{getUserName(item.friendId)}</p>
                                <p className="text-xs text-gray-500">Debe contigo</p>
                              </div>
                            </div>

                            <div className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">{item.amount.toFixed(2)}€</div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>


        {screen === "perfil" && (
          <div className="mx-auto flex max-w-5xl animate-[fadeIn_.35s_ease] flex-col gap-4">
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-black via-zinc-900 to-slate-800 p-4 text-white shadow-2xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  {renderAvatar(currentAppUser?.id, currentAppUser?.name, "h-24 w-24", "text-2xl", "ring-4 ring-white/15")}
                  <div>
                    <p className="text-3xl font-black">{currentAppUser?.name || "Usuario"}</p>
                    <p className="mt-1 text-sm text-white/70">{user?.email || currentAppUser?.email || "Sin correo"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        {isAdmin ? "Admin" : "Usuario"}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
                        Alta: {formatDate(currentAppUser?.created_at)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${netBalance >= 0 ? "bg-emerald-400/20 text-emerald-200" : "bg-red-400/20 text-red-200"}`}>
                        {netBalance >= 0 ? "Buen momento" : "Toca recuperar"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-white/60">Colega más frecuente</p>
                    <p className="mt-2 text-lg font-black">
                      {topSharedFriend ? getUserName(topSharedFriend.friendId) : "Sin datos"}
                    </p>
                    <p className="mt-1 text-xs text-white/65">
                      {topSharedFriend ? `${topSharedFriend.count} gastos compartidos` : "Aún no hay suficiente actividad"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-white/60">Estado</p>
                    <p className="mt-2 text-lg font-black">
                      {netBalance >= 0 ? "Vas mandando" : "Hay que meter presión"}
                    </p>
                    <p className="mt-1 text-xs text-white/65">
                      {netBalance >= 0
                        ? "Ahora mismo te deben más de lo que debes."
                        : "Debes más de lo que te deben. Hora de cobrar."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {isEditingProfile && (
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-xl font-bold text-black">Editar perfil</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Cambia tu nombre visible y tu avatar. La foto se verá también por amigos, balances e historial.
                </p>

                <div className="mt-5 grid gap-5 lg:grid-cols-[180px_1fr]">
                  <div className="flex flex-col items-center gap-4 rounded-2xl bg-gray-50 p-5">
                    <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-black text-3xl font-black text-white shadow-lg">
                      {profileAvatarUrl ? (
                        <img src={profileAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        getInitials(profileName || currentAppUser?.name)
                      )}
                    </div>
                    <p className="text-center text-sm text-gray-500">Vista previa del perfil</p>
                  </div>

                  <div className="grid gap-4">
                    <input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full rounded-xl border border-gray-300 p-3 text-black outline-none"
                    />

                    <input
                      value={profileAvatarUrl}
                      onChange={(e) => setProfileAvatarUrl(e.target.value)}
                      placeholder="URL de la foto (opcional)"
                      className="w-full rounded-xl border border-gray-300 p-3 text-black outline-none"
                    />

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <label className="cursor-pointer rounded-xl bg-black px-5 py-3 font-semibold text-white transition-all hover:scale-105 active:scale-95 text-center">
                        {avatarUploading ? "Subiendo..." : "Subir foto"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) await uploadProfileAvatar(file)
                          }}
                        />
                      </label>

                      {profileAvatarUrl && (
                        <button
                          onClick={() => setProfileAvatarUrl("")}
                          className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-black transition-all hover:scale-105 active:scale-95"
                        >
                          Quitar foto
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={saveProfile}
                        disabled={profileSaving || avatarUploading}
                        className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                      >
                        {profileSaving ? "Guardando..." : "Guardar cambios"}
                      </button>

                      <button
                        onClick={() => {
                          setProfileName(currentAppUser?.name || "")
                          setProfileAvatarUrl(currentAppUser?.avatar_url || "")
                          setIsEditingProfile(false)
                        }}
                        className="rounded-xl bg-gray-200 px-5 py-3 font-semibold text-black transition-all hover:scale-105 active:scale-95"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isEditingProfile && (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => {
                    setProfileName(currentAppUser?.name || "")
                    setProfileAvatarUrl(currentAppUser?.avatar_url || "")
                    setIsEditingProfile(true)
                  }}
                  className="rounded-xl bg-black px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                >
                  Editar perfil
                </button>

                <button
                  onClick={async () => {
                    await supabase.auth.signOut()
                    setUser(null)
                  }}
                  className="rounded-xl bg-red-500 px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                >
                  Cerrar sesión
                </button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-black">Ranking del mes</h3>
                    <p className="text-sm text-gray-500">Quién más está pagando este mes.</p>
                  </div>
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">🏆 Mes</span>
                </div>

                <div className="mt-4 space-y-3">
                  {monthlyPayersRanking.slice(0, 3).map((item, index) => (
                    <div key={item.userId} className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center gap-3">
                        {renderAvatar(item.userId, getUserName(item.userId), "h-10 w-10", "text-sm")}
                        <div>
                          <p className="font-semibold text-black">{index + 1}. {getUserName(item.userId)}</p>
                          <p className="text-xs text-gray-500">Pagador del mes</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-black">
                        {item.total.toFixed(2)}€
                      </span>
                    </div>
                  ))}
                  {monthlyPayersRanking.length === 0 && (
                    <p className="text-sm text-gray-500">Todavía no hay pagos este mes.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-black">Confirmaciones pendientes</h3>
                    <p className="text-sm text-gray-500">Pagos que están esperando tu visto bueno.</p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">🧾 Pago</span>
                </div>

                <div className="mt-4 space-y-3">
                  {[...friendSettlementRequests, ...groupSettlementRequests]
                    .filter((request) => request.creditorId === currentAppUser?.id)
                    .slice(0, 4)
                    .map((request) => (
                      <div key={request.notificationId} className="rounded-2xl bg-gray-50 p-4">
                        <p className="font-semibold text-black">{getUserName(request.debtorId)} dice que ya pagó</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {request.amount.toFixed(2)}€ {request.groupId ? `· ${getGroupName(request.groupId)}` : "· gasto directo"}
                        </p>
                      </div>
                    ))}
                  {[...friendSettlementRequests, ...groupSettlementRequests].filter(
                    (request) => request.creditorId === currentAppUser?.id
                  ).length === 0 && <p className="text-sm text-gray-500">No tienes confirmaciones pendientes.</p>}
                </div>
              </div>
            </div>

<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Total pagado</p>
                <p className="mt-2 text-3xl font-black text-black">{totalPaid.toFixed(2)}€</p>
                <p className="mt-1 text-xs text-gray-500">Lo que has adelantado tú</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Te deben</p>
                <p className="mt-2 text-3xl font-black text-emerald-600">{totalYouAreOwed.toFixed(2)}€</p>
                <p className="mt-1 text-xs text-emerald-700/80">Pendiente de cobrar</p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-red-700">Debes</p>
                <p className="mt-2 text-3xl font-black text-red-600">{totalYouOwe.toFixed(2)}€</p>
                <p className="mt-1 text-xs text-red-700/80">Pendiente de pagar</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Balance neto</p>
                <p className={`mt-2 text-3xl font-black ${netBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {netBalance.toFixed(2)}€
                </p>
                <p className="mt-1 text-xs text-gray-500">Tu foto económica ahora mismo</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="grid gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-xl font-bold text-black">Datos del usuario</h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Nombre</p>
                      <p className="mt-2 font-semibold text-black">{currentAppUser?.name || "Sin nombre"}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Correo</p>
                      <p className="mt-2 break-all font-semibold text-black">{user?.email || currentAppUser?.email || "Sin correo"}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Rol</p>
                      <p className="mt-2 font-semibold text-black">{isAdmin ? "Admin" : "Usuario"}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Fecha de registro</p>
                      <p className="mt-2 font-semibold text-black">{formatDate(currentAppUser?.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-xl font-bold text-black">Tus estadísticas</h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Amigos</p>
                      <p className="mt-2 text-2xl font-black text-black">{friendList.length}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Grupos</p>
                      <p className="mt-2 text-2xl font-black text-black">{myGroupsCount}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Gastos creados</p>
                      <p className="mt-2 text-2xl font-black text-black">{myCreatedExpensesCount}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Colega más frecuente</p>
                      <p className="mt-2 font-semibold text-black">
                        {topSharedFriend ? `${getUserName(topSharedFriend.friendId)} (${topSharedFriend.count})` : "Sin datos"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-xl font-bold text-black">Actividad reciente</h3>
                  <div className="mt-4 space-y-3">
                    {recentActivity.length === 0 ? (
                      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                        Todavía no tienes actividad reciente.
                      </div>
                    ) : (
                      recentActivity.map((expense) => (
                        <div key={expense.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {renderAvatar(expense.paid_by, getUserName(expense.paid_by), "h-11 w-11", "text-sm")}
                              <div>
                                <p className="font-semibold text-black">{expense.title}</p>
                                <p className="mt-1 text-sm text-gray-600">
                                  {expense.amount}€ · {getGroupName(expense.group_id)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Pagó {getUserName(expense.paid_by)} · {formatDate(expense.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black shadow-sm">
                              {expense.group_id ? "Grupo" : "Directo"}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-black p-5 text-white shadow-sm">
                  <p className="text-sm uppercase tracking-wide text-white/60">Estado actual</p>
                  <p className="mt-2 text-2xl font-black">
                    {netBalance >= 0 ? "Vas ganando la batalla del Bizum" : "Te toca recuperar terreno"}
                  </p>
                  <p className="mt-2 text-sm text-white/75">
                    {netBalance >= 0
                      ? "Entre lo que has pagado y lo que te deben, hoy mandas tú."
                      : "Ahora mismo debes más de lo que te deben. Hora de meter presión."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {showGameFullscreen && activeGame && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black px-4 py-4">
          <div className="relative h-full w-full overflow-hidden rounded-none bg-gradient-to-br from-zinc-950 via-slate-900 to-black text-white md:rounded-3xl">
            <div className="absolute inset-0 opacity-60">
              <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />
              <div className="absolute right-10 bottom-10 h-32 w-32 rounded-full bg-red-400/20 blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
                <div>
                  <h3 className="text-xl font-black">{GAME_INFO[activeGame].title}</h3>
                  <p className="text-sm text-white/70">{GAME_INFO[activeGame].description}</p>
                </div>

                <button onClick={closeGame} className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white">Salir</button>
              </div>

              <div className="grid gap-3 px-4 py-4 sm:grid-cols-3 sm:px-6">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-white/60">Tiempo</p>
                  <p className="text-2xl font-black">{gameTimeLeft}s</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-white/60">Pasta recuperada</p>
                  <p className="text-2xl font-black">{gameCash}€</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-white/60">Presión</p>
                  <p className="text-2xl font-black">{gamePressure}%</p>
                </div>
              </div>

              <div className="px-4 sm:px-6">
                <div className="h-4 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 transition-all duration-200" style={{ width: `${Math.min(gamePressure, 100)}%` }} />
                </div>
              </div>

              <div className="relative mt-4 flex-1 overflow-hidden px-4 pb-4 sm:px-6 sm:pb-6">
                <div className="relative h-full min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-green-50 via-yellow-50 to-red-50">
                  {!gameRunning && gameMessage && (
                    <div className="absolute inset-0 grid place-items-center p-4 text-center">
                      <div className="max-w-md rounded-3xl bg-white/90 p-4 shadow-xl">
                        <p className="text-5xl">{gameCash > 45 ? "🔥" : gameCash > 25 ? "😤" : "😂"}</p>
                        <p className="mt-4 text-xl font-black text-black">{gameMessage}</p>
                        <p className="mt-3 text-sm text-gray-600">Dinero recuperado: {gameCash}€</p>
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                          <button onClick={() => startGame(activeGame)} className="rounded-xl bg-black px-4 py-3 text-white">Volver a jugar</button>
                          <button onClick={closeGame} className="rounded-xl bg-red-500 px-4 py-3 text-white">Salir</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {gameRunning && activeGame === "moroso" && (
                    <>
                      <button
                        onClick={hitMoroso}
                        className="absolute z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black text-4xl text-white shadow-xl transition-transform active:scale-90"
                        style={{ left: `${morosoPosition.x}%`, top: `${morosoPosition.y}%` }}
                      >
                        💸
                      </button>

                      {coinBursts.map((coin) => (
                        <div key={coin.id} className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 text-2xl font-black text-emerald-600" style={{ left: `${coin.x}%`, top: `${coin.y - 8}%` }}>
                          +{coin.value}€
                        </div>
                      ))}
                    </>
                  )}

                  {gameRunning && activeGame === "reflejos" && (
                    <div className="grid h-full gap-3 p-4 sm:grid-cols-3">
                      {reflexTiles.map((tile, index) => (
                        <button key={tile.id} onClick={() => hitReflexTile(index)} className={`rounded-3xl text-4xl font-black shadow-xl transition-all hover:scale-105 active:scale-95 ${tile.kind === "money" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                          {tile.kind === "money" ? "€" : "✕"}
                        </button>
                      ))}
                    </div>
                  )}

                  {gameRunning && activeGame === "memoria" && (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                      <div className="mb-6 max-w-lg rounded-3xl bg-white/90 p-4 text-black shadow-xl">
                        <p className="text-lg font-black">{memoryShowing ? "Memoriza la secuencia" : "Repite la secuencia"}</p>
                        <p className="mt-2 text-sm text-gray-600">Cuando se iluminen los números, guárdalos. Luego púlsalos en el mismo orden.</p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {[0, 1, 2, 3].map((value) => (
                          <button key={value} onClick={() => pressMemory(value)} className={`grid h-28 w-28 place-items-center rounded-3xl text-3xl font-black shadow-xl transition-all ${memoryFlash === value ? "bg-black text-white scale-110" : "bg-white text-black"}`}>
                            {value + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {gameRunning && activeGame === "excusas" && (
                    <div className="flex h-full flex-col items-center justify-center p-4">
                      <div className="mb-6 max-w-xl rounded-3xl bg-white/90 p-4 text-center text-black shadow-xl">
                        <p className="text-2xl font-black">Encuentra el pago real</p>
                        <p className="mt-2 text-sm text-gray-600">Deja de tragarte excusas y caza la única opción que suena a cobro de verdad.</p>
                      </div>

                      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-3">
                        {excuseOptions.map((option, index) => (
                          <button key={`${option}-${index}`} onClick={() => pickExcuse(index)} className="rounded-3xl bg-white p-5 text-left text-black shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <p className="text-lg font-bold">{option}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {gameRunning && activeGame === "monedas" && (
                    <div className="relative h-full">
                      {coinRainItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => clickCoinRainItem(item.id)}
                          className={`absolute z-20 grid h-16 w-16 place-items-center rounded-full text-2xl shadow-xl transition-all hover:scale-105 active:scale-95 ${item.kind === "coin" ? "bg-yellow-400 text-black" : "bg-red-500 text-white"}`}
                          style={{ left: `${item.left}%`, top: `${item.top}%` }}
                        >
                          {item.kind === "coin" ? "🪙" : "💣"}
                        </button>
                      ))}
                      <div className="absolute bottom-4 left-4 rounded-xl bg-white/80 px-3 py-2 text-sm text-black shadow">Monedas sí. Trampas no.</div>
                    </div>
                  )}

                  {!gameRunning && !gameMessage && (
                    <div className="absolute inset-0 grid place-items-center p-4 text-center">
                      <div className="max-w-md rounded-3xl bg-white/90 p-4 shadow-xl">
                        <p className="text-5xl">{GAME_INFO[activeGame].icon}</p>
                        <p className="mt-3 text-lg font-bold text-black">{GAME_INFO[activeGame].subtitle}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`inline-flex rounded-full px-3 py-2 text-sm font-semibold ${tagModal.colorClass}`}>{tagModal.label}</p>
                <h3 className="mt-4 text-2xl font-black text-black">{tagModal.title}</h3>
              </div>

              <button onClick={() => setTagModal(null)} className="rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-black">✕</button>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-600">{tagModal.description}</p>

            <button onClick={() => setTagModal(null)} className="mt-6 w-full rounded-xl bg-black px-4 py-3 text-white">Vale, ya sé de qué pie cojea</button>
          </div>
        </div>
      )}
    </main>
  )
}

"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type User = {
  id: string
  name: string | null
  is_admin?: boolean
  auth_user_id?: string | null
  ow_r_id?: string | null
  is_pending?: boolean
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
  token?: string
  created_at?: string
}

type Friendship = {
  id: string
  user_id: string
  friend_id: string
  status?: string
  created_at?: string
}

type FriendBalanceItem = {
  friendId: string
  amount: number
}

type SplitMode = "equal" | "custom"
type ExpenseMode = "group" | "friend"
type Screen = "home" | "amigos" | "gastos" | "balances" | "historial" | "moroso"
type TrustLevel = "top" | "good" | "meh" | "dodgy" | "chaos"

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
    description:
      "Este colega suele pagar bien y no acostumbra a hacer el payaso con las deudas. De estos sí da gusto fiarse.",
    colorClass: "bg-emerald-100 text-emerald-800",
    borderClass: "border-emerald-200",
  },
  good: {
    labels: ["Cumple más o menos", "Ni tan mal", "Aceptable", "Va tirando", "Medio decente"],
    title: "Nivel de confianza decente",
    description:
      "Normalmente responde, aunque a veces se le tiene que mirar un poco mal para que espabile.",
    colorClass: "bg-sky-100 text-sky-800",
    borderClass: "border-sky-200",
  },
  meh: {
    labels: ["Va lento", "Hay que recordarle", "Pagador perezoso", "Necesita presión", "Se hace rogar"],
    title: "Nivel de confianza medio",
    description:
      "No es de los peores, pero tampoco de los que te dan paz. Suele pagar... cuando le aprietas.",
    colorClass: "bg-amber-100 text-amber-800",
    borderClass: "border-amber-200",
  },
  dodgy: {
    labels: ["Se hace el loco", "Bizum fantasma", "Te está toreando", "Promesas y cero pagos", "Moroso en prácticas"],
    title: "Nivel de confianza bajo",
    description:
      "Aquí ya empieza el festival de excusas. Mucho 'luego te paso' y poco soltar la pasta.",
    colorClass: "bg-orange-100 text-orange-800",
    borderClass: "border-orange-200",
  },
  chaos: {
    labels: ["Gorra legendaria", "Rata premium", "Moroso profesional", "El desaparecido", "Debe hasta el saludo"],
    title: "Nivel de confianza nefasto",
    description:
      "Este cabrón ya está en nivel histórico. Si paga, se celebra como festivo nacional.",
    colorClass: "bg-red-100 text-red-800",
    borderClass: "border-red-200",
  },
}

const seededIndex = (input: string, length: number) => {
  const sum = input.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return sum % length
}

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
const menuItems: Screen[] = ["amigos", "gastos", "balances", "historial", "moroso"]

  const [gameRunning, setGameRunning] = useState(false)
  const [gameTimeLeft, setGameTimeLeft] = useState(12)
  const [gamePressure, setGamePressure] = useState(0)
  const [gameCash, setGameCash] = useState(0)
  const [gameMessage, setGameMessage] = useState("")
  const [morosoPosition, setMorosoPosition] = useState({ x: 35, y: 32 })
  const [coinBursts, setCoinBursts] = useState<{ id: number; x: number; y: number; value: number }[]>([])
  const [gameRound, setGameRound] = useState(0)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState("")
  const [apellidos, setApellidos] = useState("")
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [tagModal, setTagModal] = useState<TagInfo | null>(null)

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

  const ensureCurrentAppUserProfile = async () => {
  if (!user) return

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (existingError) {
    console.log("Error buscando usuario actual:", existingError)
    return
  }

  if (existing) return

  const displayName =
    [user.user_metadata?.nombre, user.user_metadata?.apellidos]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user.email?.split("@")[0] ||
    "Usuario"

  const { error: insertError } = await supabase.from("users").insert({
    name: displayName,
    auth_user_id: user.id,
    owner_id: user.id,
    email: user.email?.toLowerCase() || null,
  })

  if (insertError) {
    console.log("Error creando perfil de usuario:", insertError)
  }
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
    return currentAppUser?.is_admin || false
  }, [currentAppUser])

  const getUsers = async () => {
    const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false })
    if (data) setUsers(data as User[])
  }

  const getGroups = async () => {
    if (!user) return

    const { data } = await supabase
      .from("groups")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)
      .order("created_at", { ascending: false })

    if (data) setGroups(data as Group[])
  }

  const getGroupMembers = async () => {
    if (!user) return

    const { data } = await supabase
      .from("group_members")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)
      .order("created_at", { ascending: false })

    if (data) setGroupMembers(data as GroupMember[])
  }

  const getExpenses = async () => {
    if (!user) return

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)
      .order("created_at", { ascending: false })

    if (data) setExpenses(data as Expense[])
  }

  const getExpenseSplits = async () => {
    if (!user) return

    const { data } = await supabase
      .from("expense_splits")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)

    if (data) setExpenseSplits(data as ExpenseSplit[])
  }

  const getReceivedInvitations = async () => {
    if (!user?.email) return

    const { data, error } = await supabase
      .from("friend_invitations")
      .select("*")
      .eq("email", user.email.toLowerCase())
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })

    if (!error && data) setReceivedInvitations(data as FriendInvitation[])
  }

  const getSentInvitations = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from("friend_invitations")
      .select("*")
      .eq("invited_by", user.id)
      .order("created_at", { ascending: false })

    if (!error && data) setSentInvitations(data as FriendInvitation[])
  }

  const getFriendships = async () => {
    if (!currentAppUser) return

    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .eq("user_id", currentAppUser.id)

    if (!error && data) setFriendships(data as Friendship[])
  }

  const addUser = async () => {
    if (!name.trim() || !user) {
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

    const { data: existingInvitation } = await supabase
      .from("friend_invitations")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("invited_by", user.id)
      .eq("status", "pending")
      .maybeSingle()

    if (existingInvitation) {
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
      console.log(error)
      return
    }

    const res = await fetch("/api/send-invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
      }),
    })

    if (!res.ok) {
      alert("La invitación se guardó, pero el correo no pudo enviarse")
    } else {
      alert("Invitación enviada. Cuando la otra persona entre con ese correo podrá aceptarla.")
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

    const alreadyFriend = friendships.some((f) => f.friend_id === senderAppUser.id)

    if (!alreadyFriend) {
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
        console.log(friendshipError)
        return
      }
    }

    await supabase
      .from("friend_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id)

    alert("Amigo añadido correctamente")
    await getReceivedInvitations()
    await getFriendships()
  }

  const addGroup = async () => {
    if (!groupName.trim() || !user || !currentAppUser) return

    const { data: createdGroup, error } = await supabase
      .from("groups")
      .insert({
        name: groupName.trim(),
        owner_id: user.id,
      })
      .select()
      .single()

    if (error || !createdGroup) {
      alert("Error creando grupo")
      return
    }

    await supabase.from("group_members").insert({
      user_id: currentAppUser.id,
      group_id: createdGroup.id,
      owner_id: user.id,
    })

    setGroupName("")
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
    await getGroupMembers()
    await buildGroupsWithMembers()
  }

  const membersOfSelectedExpenseGroup = useMemo(() => {
    return groupMembers
      .filter((item) => item.group_id === expenseGroupId)
      .map((item) => users.find((userItem) => userItem.id === item.user_id))
      .filter(Boolean) as User[]
  }, [expenseGroupId, groupMembers, users])

  const friendList = useMemo(() => {
    const friendIds = new Set(friendships.map((f) => f.friend_id))
    return users.filter((u) => friendIds.has(u.id))
  }, [users, friendships])

  const friendParticipants = useMemo(() => {
    if (!currentAppUser || !selectedFriendId) return []
    const friend = users.find((u) => u.id === selectedFriendId)
    return friend ? [currentAppUser, friend] : []
  }, [currentAppUser, selectedFriendId, users])

  const expenseParticipants =
    expenseMode === "group" ? membersOfSelectedExpenseGroup : friendParticipants

  const getUserName = (userId: string) => {
    const userItem = users.find((u) => u.id === userId)
    return userItem?.name || "Usuario"
  }

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return "Gasto individual"
    const group = groups.find((g) => g.id === groupId)
    return group?.name || "Grupo"
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
    const splits = expenseSplits.filter((split) => split.expense_id === expenseId)

    if (splits.length === 0) return "Sin reparto guardado"

    return splits
      .map(
        (split) =>
          `${getUserName(split.user_id)}: ${Number(split.amount).toFixed(2)}€`
      )
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
    setPaidBy("")
    setSplitMode("equal")
    setCustomSplits({})
  }

  const startMorosoGame = () => {
    setGameRunning(true)
    setGameTimeLeft(12)
    setGamePressure(0)
    setGameCash(0)
    setGameMessage("")
    setCoinBursts([])
    setGameRound((r) => r + 1)

    moveMoroso()
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

  useEffect(() => {
    if (!gameRunning) return

    if (gameTimeLeft <= 0) {
      setGameRunning(false)

      if (gameCash > 40) {
        setGameMessage("💸 Le has sacado todo. Hoy paga sí o sí.")
      } else if (gameCash > 20) {
        setGameMessage("😤 Algo has rascado... pero sigue debiendo.")
      } else {
        setGameMessage("😂 Se te ha escapado. Te debe hasta el aire.")
      }

      return
    }

    const timer = setTimeout(() => {
      setGameTimeLeft((t) => t - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [gameRunning, gameTimeLeft, gameCash])

  useEffect(() => {
    if (!gameRunning) return

    const speed = Math.max(300, 1200 - gamePressure * 5)
    const interval = setInterval(() => {
      moveMoroso()
    }, speed)

    return () => clearInterval(interval)
  }, [gameRunning, gamePressure, gameRound])

  const addExpense = async () => {
    if (!expenseTitle || !amount || !paidBy || !user || !currentAppUser) return
    if (expenseMode === "group" && !expenseGroupId) return
    if (expenseMode === "friend" && !selectedFriendId) return

    const amountNumber = parseFloat(amount)
    if (Number.isNaN(amountNumber) || amountNumber <= 0) return

    const participants = expenseParticipants

    if (participants.length === 0) {
      alert(
        expenseMode === "group"
          ? "Ese grupo no tiene personas"
          : "Elige un amigo para el gasto individual"
      )
      return
    }

    const payerIsInParticipants = participants.some((member) => member.id === paidBy)

    if (!payerIsInParticipants) {
      alert("Quien paga debe estar dentro del gasto")
      return
    }

    const { data: expenseData, error: expenseError } = await supabase
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

    if (expenseError || !expenseData || expenseData.length === 0) {
      console.log("ERROR GASTO:", expenseError)
      return
    }

    const expenseId = expenseData[0].id
    let splitsToInsert: {
      expense_id: string
      user_id: string
      amount: number
      owner_id: string
    }[] = []

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

      const totalCustom = Number(
        customAmounts.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
      )

      if (totalCustom !== Number(amountNumber.toFixed(2))) {
        alert("La suma personalizada no coincide con el total del gasto")
        return
      }

      splitsToInsert = customAmounts.map((item) => ({
        expense_id: expenseId,
        user_id: item.user_id,
        amount: item.amount,
        owner_id: user.id,
      }))
    }

    const { error: splitsError } = await supabase
      .from("expense_splits")
      .insert(splitsToInsert)

    if (splitsError) {
      console.log("ERROR SPLITS:", splitsError)
      return
    }

    resetExpenseForm()
    await getExpenses()
    await getExpenseSplits()
  }

  const deleteExpense = async (expenseId: string) => {
    if (!isAdmin) {
      alert("Solo Girma puede borrar gastos por ahora")
      return
    }

    const { error: splitsDeleteError } = await supabase
      .from("expense_splits")
      .delete()
      .eq("expense_id", expenseId)

    if (splitsDeleteError) {
      console.log("ERROR BORRANDO SPLITS:", splitsDeleteError)
      return
    }

    const { error: expenseDeleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)

    if (expenseDeleteError) {
      console.log("ERROR BORRANDO GASTO:", expenseDeleteError)
      return
    }

    await getExpenses()
    await getExpenseSplits()
  }

  const settleBalance = async (item: BalanceItem) => {
    if (!user) return

    const { data: expenseData, error: expenseError } = await supabase
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

    if (expenseError || !expenseData || expenseData.length === 0) {
      console.log("ERROR SALDAR GASTO:", expenseError)
      return
    }

    const expenseId = expenseData[0].id

    const splitsToInsert = [
      {
        expense_id: expenseId,
        user_id: item.debtorId,
        amount: 0,
        owner_id: user.id,
      },
      {
        expense_id: expenseId,
        user_id: item.creditorId,
        amount: item.amount,
        owner_id: user.id,
      },
    ]

    const { error: splitsError } = await supabase
      .from("expense_splits")
      .insert(splitsToInsert)

    if (splitsError) {
      console.log("ERROR SALDAR SPLITS:", splitsError)
      return
    }

    await getExpenses()
    await getExpenseSplits()
  }

  const buildGroupsWithMembers = async () => {
    if (!user) return

    const { data: groupsData } = await supabase
      .from("groups")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)
      .order("created_at", { ascending: false })

    const { data: usersData } = await supabase.from("users").select("*")

    const { data: membersData } = await supabase
      .from("group_members")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)

    if (!groupsData || !usersData || !membersData) return

    const result: GroupWithMembers[] = (groupsData as Group[]).map((group) => {
      const membersOfGroup = (membersData as GroupMember[])
        .filter((item) => item.group_id === group.id)
        .map((item) => (usersData as User[]).find((userItem) => userItem.id === item.user_id))
        .filter(Boolean) as User[]

      return {
        ...group,
        members: membersOfGroup,
      }
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
      const groupExpenses = expenses.filter((expense) => expense.group_id === group.id)
      const map = new Map<string, number>()

      for (const expense of groupExpenses) {
        const splitsOfExpense = expenseSplits.filter(
          (split) => split.expense_id === expense.id
        )

        for (const split of splitsOfExpense) {
          if (split.user_id === expense.paid_by) continue

          const key = `${split.user_id}|${expense.paid_by}`
          const reverseKey = `${expense.paid_by}|${split.user_id}`

          if (map.has(reverseKey)) {
            const current = map.get(reverseKey)!
            const newValue = current - split.amount

            if (newValue > 0) {
              map.set(reverseKey, newValue)
            } else {
              map.delete(reverseKey)
              if (newValue < 0) {
                map.set(key, Math.abs(newValue))
              }
            }
          } else {
            map.set(key, (map.get(key) || 0) + split.amount)
          }
        }
      }

      const balances: BalanceItem[] = []

      map.forEach((amountValue, key) => {
        const [debtorId, creditorId] = key.split("|")
        balances.push({
          debtorId,
          creditorId,
          amount: amountValue,
          groupId: group.id,
        })
      })

      resultByGroup[group.id] = balances
    }

    return resultByGroup
  }, [groups, expenses, expenseSplits])

  const morosoPorGrupo = useMemo(() => {
    const result: Record<string, { userId: string; amount: number } | null> = {}

    for (const group of groups) {
      const balances = balancesByGroup[group.id] || []
      const debtMap = new Map<string, number>()

      for (const item of balances) {
        debtMap.set(
          item.debtorId,
          (debtMap.get(item.debtorId) || 0) + item.amount
        )
      }

      let maxUserId: string | null = null
      let maxDebt = 0

      debtMap.forEach((amountValue, userId) => {
        if (amountValue > maxDebt) {
          maxDebt = amountValue
          maxUserId = userId
        }
      })

      result[group.id] =
        maxUserId && maxDebt > 0
          ? { userId: maxUserId, amount: maxDebt }
          : null
    }

    return result
  }, [groups, balancesByGroup])

  const friendBalances = useMemo(() => {
    if (!currentAppUser) return []

    const map = new Map<string, number>()

    for (const expense of expenses) {
      const splitsOfExpense = expenseSplits.filter(
        (split) => split.expense_id === expense.id
      )

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
      groupMembers
        .filter((item) => item.user_id === currentAppUser.id)
        .map((item) => item.group_id)
    )

    groupMembers
      .filter(
        (item) =>
          currentUserGroupIds.has(item.group_id) && item.user_id !== currentAppUser.id
      )
      .forEach((item) => {
        if (!map.has(item.user_id)) map.set(item.user_id, 0)
      })

    return Array.from(map.entries())
      .map(([friendId, amountValue]) => ({
        friendId,
        amount: Number(amountValue.toFixed(2)),
      }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  }, [currentAppUser, expenses, expenseSplits, groupMembers])

  const normalExpenses = useMemo(() => {
    return expenses.filter((expense) => expense.title !== "Saldar deuda")
  }, [expenses])

  const settledExpenses = useMemo(() => {
    return expenses.filter((expense) => expense.title === "Saldar deuda")
  }, [expenses])

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

    if (!maxFriendId || maxDebt === 0) return null

    return {
      friendId: maxFriendId,
      amount: maxDebt,
    }
  }, [friendBalances, currentAppUser])

  const getTrustInfo = (amount: number, userId: string): TagInfo => {
    let level: TrustLevel = "top"

    if (amount > 150) level = "chaos"
    else if (amount > 80) level = "dodgy"
    else if (amount > 30) level = "meh"
    else if (amount > 10) level = "good"
    else level = "top"

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

  const openGroupFromHome = (groupId: string) => {
    setExpenseMode("group")
    setExpenseGroupId(groupId)
    setSelectedFriendId("")
    setPaidBy(currentAppUser?.id || "")
    setScreen("gastos")
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
      <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617)] px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute left-[-80px] top-[-40px] h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />
          <div className="absolute right-[-60px] bottom-[-30px] h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-2xl text-white shadow-lg">
              💸
            </div>
            <div>
              <h1 className="text-3xl font-black text-black">TeDebo</h1>
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500">cuentas entre colegas</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2 text-center text-black">
            {authMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>

          <p className="text-sm text-gray-500 text-center mb-6">
            {authMode === "login"
              ? "Entra para gestionar tus grupos, gastos y balances"
              : "Crea tu cuenta para empezar a compartir gastos"}
          </p>

          <button
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            className="text-sm text-gray-500 hover:text-black mb-4 w-full text-center transition"
          >
            {authMode === "login"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>

          <input
            className="border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none p-3 mb-3 w-full rounded-lg transition"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {authMode === "register" && (
            <div className="animate-[fadeIn_.3s_ease] flex flex-col">
              <input
                className="border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none p-3 mb-3 w-full rounded-lg transition"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />

              <input
                className="border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none p-3 mb-3 w-full rounded-lg transition"
                placeholder="Apellidos"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
              />
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

              if (
                !email ||
                !password ||
                (authMode === "register" && (!nombre || !apellidos))
              ) {
                alert("Faltan datos")
                setLoading(false)
                return
              }

              let error: any

              if (authMode === "login") {
                const res = await supabase.auth.signInWithPassword({
                  email,
                  password,
                })
                error = res.error
              } else {
                const res = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                    data: {
                      nombre,
                      apellidos,
                    },
                  },
                })
                error = res.error
              }

              if (error) {
                alert(error.message)
                setLoading(false)
                return
              }

              alert(
                authMode === "login"
                  ? "Login correcto"
                  : "Registro enviado correctamente"
              )
              setLoading(false)
            }}
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:scale-105 active:scale-95 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {loading
              ? "Cargando..."
              : authMode === "login"
              ? "Iniciar sesión"
              : "Crear cuenta"}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_35%,_#ffffff_70%)] p-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-60px] top-24 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl animate-pulse" />
        <div className="absolute right-[-30px] top-12 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-80px] left-1/3 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl animate-pulse" />
      </div>

      <div className="mx-auto max-w-6xl relative">
        <div className="mb-5 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-2xl text-white shadow-lg">
              💸
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500">TeDebo</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
          <div className="flex gap-2 items-center">
            <div className="flex gap-2 items-center flex-wrap">

</div>

  {/* Botón Inicio */}
  <button
    onClick={() => setScreen("home")}
    className={`px-4 py-2 rounded-xl ${
      screen === "home"
        ? "bg-black text-white"
        : "bg-white border border-gray-200"
    }`}
  >
    Inicio
  </button>

  {/* Botón menú */}
  <div className="relative">
    <button
      onClick={() => setMenuOpen(!menuOpen)}
      className="px-4 py-2 rounded-xl bg-white border border-gray-200"
    >
      ☰
    </button>

    {menuOpen && (
      <div className="absolute right-0 mt-2 w-40 bg-white border rounded-xl shadow-lg z-50">
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

</div>


            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setUser(null)
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {screen === "home" && (
          <div className="mx-auto flex max-w-6xl animate-[fadeIn_.35s_ease] flex-col gap-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-slate-800 to-black p-8 text-white shadow-2xl">
              <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute top-10 right-6 h-20 w-20 rounded-full bg-green-400/20 blur-2xl" />
              <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-red-400/20 blur-2xl" />

              <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl flex-1 flex flex-col gap-4">
                <div className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm backdrop-blur">
                  Bienvenido al rincón de las cuentas pendientes
                </div>

                <div className="flex flex-1 items-center justify-center">
  <div className="relative h-[280px] w-full max-w-[320px]">
    <div className="absolute inset-0 rounded-[32px] bg-white/10 blur-2xl" />

    <div className="absolute left-1/2 top-1/2 grid h-56 w-56 -translate-x-1/2 -translate-y-1/2 grid-cols-3 gap-2 rounded-[28px] border border-white/15 bg-black/20 p-4 shadow-2xl backdrop-blur-md animate-[floatCube_6s_ease-in-out_infinite]">
      {[
        "😏", "💸", "🕶️",
        "🪙", "🤑", "💰",
        "😈", "🏦", "🫰",
      ].map((icon, index) => (
        <div
          key={index}
          className="flex items-center justify-center rounded-xl border border-white/10 bg-white/10 text-2xl shadow-inner backdrop-blur-sm"
        >
          {icon}
        </div>
      ))}
    </div>

                <h2 className="relative z-10 text-4xl font-black leading-tight sm:text-5xl">
                  Si estás aquí,
                  <br />
                  <span className="text-green-300">alguien te debe pasta.</span>
                </h2>

                <p className="max-w-2xl text-sm text-gray-200 sm:text-base">
  Grupos, amigos, gastos directos, balances globales y la lista negra del mes.
</p>

<div className="flex flex-wrap gap-3 pt-2">
  <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">
    Grupos reales
  </div>
  <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">
    Amigos y balances
  </div>
  <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">
    Historial y morosos
  </div>
</div>
</div>


</div>
</div>


            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-black">A por el moroso</h3>
                  <p className="text-sm text-gray-500">
                    Dale toques antes de que se vuelva a hacer el loco con tu pasta.
                  </p>
                </div>

                {!gameRunning && (
                  <button
                    onClick={startMorosoGame}
                    className="rounded-xl bg-black px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                  >
                    Empezar
                  </button>
                )}
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
                  <p className="text-xs uppercase tracking-wide text-gray-500">Barra de presión</p>
                  <p className="text-xl font-bold text-black">{gamePressure}%</p>
                </div>
              </div>

              <div className="mb-4 h-4 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 transition-all duration-200"
                  style={{ width: `${Math.min(gamePressure, 100)}%` }}
                />
              </div>
              

    <div className="absolute -left-2 top-6 h-16 w-16 rounded-full bg-emerald-300/20 blur-2xl animate-pulse" />
    <div className="absolute -right-2 bottom-6 h-20 w-20 rounded-full bg-fuchsia-300/20 blur-2xl animate-pulse" />
  </div>
</div>


              <div className="relative h-72 overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-yellow-50 to-red-50">
                <div className="absolute inset-0 opacity-60">
                  <div className="absolute left-10 top-6 h-24 w-24 rounded-full bg-green-300/30 blur-2xl animate-pulse" />
                  <div className="absolute right-10 bottom-6 h-24 w-24 rounded-full bg-red-300/30 blur-2xl animate-pulse" />
                </div>

                {!gameRunning && !gameMessage && (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center">
                    <div>
                      <p className="text-5xl">😈</p>
                      <p className="mt-3 text-lg font-bold text-black">Pulsa empezar y mete presión</p>
                      <p className="mt-2 text-sm text-gray-600">
                        Cuanto más le toques, más pasta rascas y más nervioso se pone.
                      </p>
                    </div>
                  </div>
                )}

                {gameRunning && (
                  <>
                    <button
                      onClick={hitMoroso}
                      className="absolute z-20 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black text-3xl text-white shadow-xl transition-transform active:scale-90"
                      style={{
                        left: `${morosoPosition.x}%`,
                        top: `${morosoPosition.y}%`,
                      }}
                    >
                      💸
                    </button>

                    {coinBursts.map((coin) => (
                      <div
                        key={coin.id}
                        className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 text-lg font-black text-emerald-600"
                        style={{
                          left: `${coin.x}%`,
                          top: `${coin.y - 8}%`,
                        }}
                      >
                        +{coin.value}€
                      </div>
                    ))}

                    <div className="absolute bottom-4 left-4 rounded-xl bg-white/80 px-3 py-2 text-sm text-black shadow">
                      Se está haciendo el loco... tú sigue apretando.
                    </div>

                    <div className="absolute right-4 top-4 rounded-xl bg-white/80 px-3 py-2 text-sm text-black shadow">
                      Tócalo antes de que se escape
                    </div>
                  </>
                )}

                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white shadow-2xl">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div className="max-w-2xl">
      <div className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
        📩 Trae a tu gente
      </div>

      <h3 className="mt-3 text-2xl font-black sm:text-3xl">
        Invita a tus colegas y empieza a repartir clavadas como dios manda
      </h3>

      <p className="mt-2 text-sm text-white/90 sm:text-base">
        Mándales la invitación y que entren con el mismo correo al que les llegó. Si no, luego vienen los lloros.
      </p>
    </div>

    <div className="w-full max-w-xl rounded-2xl bg-white/10 p-4 backdrop-blur-md">
      <label className="mb-2 block text-sm font-semibold text-white">
        Correo de tu colega
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          placeholder="colega@correo.com"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-white/20 bg-white/90 p-3 text-black outline-none"
        />

        <button
          onClick={addUser}
          className="rounded-xl bg-black px-5 py-3 font-semibold text-white transition-all hover:scale-105 active:scale-95"
        >
          Enviar invitación
        </button>
      </div>

      <p className="mt-3 text-xs text-white/80">
        Importante: tu colega debe registrarse o iniciar sesión con ese mismo correo.
      </p>
    </div>
  </div>
</div>


                {!gameRunning && gameMessage && (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center">
                    <div className="max-w-md rounded-3xl bg-white/90 p-6 shadow-xl">
                      <p className="text-5xl">{gameCash > 40 ? "🔥" : gameCash > 20 ? "😤" : "😂"}</p>
                      <p className="mt-4 text-xl font-black text-black">{gameMessage}</p>
                      <p className="mt-3 text-sm text-gray-600">
                        Dinero recuperado en el juego: {gameCash}€
                      </p>

                      {moroso && (
                        <p className="mt-2 text-sm font-semibold text-black">
                          Pero recuerda: {getUserName(moroso.friendId)} aún te debe {moroso.amount.toFixed(2)}€
                        </p>
                      )}

                      <button
                        onClick={startMorosoGame}
                        className="mt-5 rounded-xl bg-black px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                      >
                        Volver a meter presión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {screen === "amigos" && (
          <div className="mx-auto flex max-w-3xl animate-[fadeIn_.35s_ease] flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <h2 className="text-2xl font-semibold text-black">Colegas</h2>
              <p className="mt-1 text-sm text-gray-500">
                Aquí ves el balance global contigo y cada colega, con su nivel de confianza incluido.
              </p>

              <div className="mt-4 space-y-3">
                {friendList.length === 0 ? (
                  <p className="text-gray-500">
                    Todavía no tienes balances con colegas.
                  </p>
                ) : (
                  friendList.map((friend) => {
                    const balance =
                      friendBalances.find((item) => item.friendId === friend.id)?.amount || 0

                    const trustInfo = getTrustInfo(balance > 0 ? balance : 0, friend.id)

                    return (
                      <div
                        key={friend.id}
                        className={`rounded-xl border p-4 ${trustInfo.borderClass}`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-lg font-semibold text-black">{friend.name}</p>
                            <p className="text-sm text-gray-600">
                              {getFriendBalanceText(friend.id)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => setTagModal(trustInfo)}
                              className={`rounded-full px-3 py-2 text-sm font-semibold ${trustInfo.colorClass}`}
                            >
                              {trustInfo.label}
                            </button>

                            <button
                              onClick={() => openFriendExpense(friend.id)}
                              className="rounded-xl bg-black px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                            >
                              Añadir gasto directo
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {screen === "gastos" && (
          <div className="mx-auto flex max-w-3xl animate-[fadeIn_.35s_ease] flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <h2 className="mb-2 text-xl font-semibold text-black">Añadir gasto</h2>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setExpenseMode("group")
                    setSelectedFriendId("")
                  }}
                  className={`rounded-xl px-4 py-2 text-white transition-all ${
                    expenseMode === "group" ? "bg-black" : "bg-gray-500"
                  }`}
                >
                  Gasto de grupo
                </button>

                <button
                  onClick={() => {
                    setExpenseMode("friend")
                    setExpenseGroupId("")
                  }}
                  className={`rounded-xl px-4 py-2 text-white transition-all ${
                    expenseMode === "friend" ? "bg-black" : "bg-gray-500"
                  }`}
                >
                  Gasto con amigo
                </button>
              </div>

              <input
                placeholder="Concepto (ej: cena)"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black"
              />

              <input
                type="number"
                placeholder="Cantidad total"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black"
              />

              {expenseMode === "group" ? (
                <select
                  value={expenseGroupId}
                  onChange={(e) => {
                    setExpenseGroupId(e.target.value)
                    setPaidBy("")
                    setCustomSplits({})
                  }}
                  className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="">Grupo</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedFriendId}
                  onChange={(e) => {
                    setSelectedFriendId(e.target.value)
                    setPaidBy(currentAppUser?.id || "")
                    setCustomSplits({})
                  }}
                  className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="">Amigo</option>
                  {friendList.map((friend) => (
                    <option key={friend.id} value={friend.id}>
                      {friend.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                disabled={expenseParticipants.length === 0}
                className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">
                  {expenseParticipants.length === 0
                    ? expenseMode === "group"
                      ? "Ese grupo no tiene personas"
                      : "Primero elige amigo"
                    : "Quién paga"}
                </option>

                {expenseParticipants.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setSplitMode("equal")}
                  className={`rounded-xl px-3 py-2 text-white ${
                    splitMode === "equal" ? "bg-black" : "bg-gray-500"
                  }`}
                >
                  Equitativa
                </button>

                <button
                  onClick={() => setSplitMode("custom")}
                  className={`rounded-xl px-3 py-2 text-white ${
                    splitMode === "custom" ? "bg-black" : "bg-gray-500"
                  }`}
                >
                  Personalizada
                </button>
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
                          onChange={(e) =>
                            handleCustomSplitChange(member.id, e.target.value)
                          }
                          className="rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={addExpense}
                className="mt-4 w-full rounded-xl bg-red-600 p-3 text-white transition-all hover:scale-105 active:scale-95"
              >
                Añadir gasto
              </button>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <h2 className="text-xl font-semibold text-black">Miembros por grupo</h2>

              <div className="mt-3 flex flex-col gap-4">
                {groupsWithMembers.length === 0 ? (
                  <p className="text-gray-500">No hay grupos todavía</p>
                ) : (
                  groupsWithMembers.map((group) => (
                    <div key={group.id} className="rounded border p-3">
                      <button
                        onClick={() => toggleMemberGroup(group.id)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <h3 className="font-bold text-black">{group.name}</h3>
                        <span className="text-black">
                          {openMemberGroups[group.id] ? "▲" : "▼"}
                        </span>
                      </button>

                      {openMemberGroups[group.id] && (
                        <div className="mt-2">
                          {group.members.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              Todavía no hay personas en este grupo
                            </p>
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {group.members.map((member) => (
                                <li key={member.id} className="text-black">
                                  - {member.name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {screen === "balances" && (
          <div className="mx-auto flex max-w-3xl animate-[fadeIn_.35s_ease] flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <h2 className="text-xl font-semibold text-black">Balances por grupo</h2>
              <p className="mt-1 text-sm text-gray-500">
                Aquí solo cuentan los gastos de ese grupo, no el balance total global con esa persona.
              </p>

              <div className="mt-3 flex flex-col gap-4">
                {groups.length === 0 ? (
                  <p className="text-gray-500">No hay grupos todavía</p>
                ) : (
                  groups.map((group) => {
                    const balances = balancesByGroup[group.id] || []
                    const morosoGrupo = morosoPorGrupo[group.id]

                    return (
                      <div key={group.id} className="rounded border p-3">
                        <button
                          onClick={() => toggleBalanceGroup(group.id)}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <div>
                            <h3 className="font-bold text-black">{group.name}</h3>
                            {morosoGrupo && (
                              <p className="mt-1 text-sm text-red-600">
                                Moroso del grupo: {getUserName(morosoGrupo.userId)} · {morosoGrupo.amount.toFixed(2)}€
                              </p>
                            )}
                          </div>
                          <span className="text-black">
                            {openBalanceGroups[group.id] ? "▲" : "▼"}
                          </span>
                        </button>

                        {openBalanceGroups[group.id] && (
                          <div className="mt-2">
                            {balances.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                No hay deudas en este grupo
                              </p>
                            ) : (
                              <ul className="flex flex-col gap-3">
                                {balances.map((item, index) => (
                                  <li
                                    key={index}
                                    className="flex flex-col gap-2 rounded border p-2 text-black"
                                  >
                                    <span>
                                      {getUserName(item.debtorId)} debe {item.amount.toFixed(2)}€ a{" "}
                                      {getUserName(item.creditorId)}
                                    </span>

                                    <button
                                      onClick={() => settleBalance(item)}
                                      className="rounded bg-black px-3 py-2 text-white transition-all hover:scale-105 active:scale-95"
                                    >
                                      Saldar deuda
                                    </button>
                                  </li>
                                ))}
                              </ul>
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
          <div className="mx-auto flex max-w-3xl animate-[fadeIn_.35s_ease] flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <button
                onClick={() => setShowExpenseHistory((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <h2 className="text-xl font-semibold text-black">Historial de gastos</h2>
                <span className="text-black">{showExpenseHistory ? "▲" : "▼"}</span>
              </button>

              {showExpenseHistory && (
                <div className="mt-3">
                  {normalExpenses.length === 0 ? (
                    <p className="text-gray-500">Todavía no hay gastos normales</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {normalExpenses.map((e) => (
                        <li key={e.id} className="rounded-xl border bg-gray-50 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-black">{e.title}</p>
                              <p className="mt-1 text-sm text-gray-700">
                                {e.amount}€ · {getGroupName(e.group_id)}
                              </p>
                              <p className="text-sm text-gray-700">
                                Pagó: {getUserName(e.paid_by)}
                              </p>
                              <p className="mt-2 text-xs text-gray-500">
                                {formatDate(e.created_at)}
                              </p>
                            </div>

                            <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-black shadow-sm">
                              {e.group_id ? "Grupo" : "Individual"}
                            </div>
                          </div>

                          <div className="mt-3 rounded-lg bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Reparto
                            </p>
                            <p className="mt-1 text-sm text-black">
                              {getExpensePeopleSummary(e.id)}
                            </p>
                          </div>

                          {isAdmin && (
                            <button
                              onClick={() => deleteExpense(e.id)}
                              className="mt-3 rounded bg-black px-3 py-2 text-white transition-all hover:scale-105 active:scale-95"
                            >
                              Borrar gasto
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <button
                onClick={() => setShowSettledHistory((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <h2 className="text-xl font-semibold text-black">
                  Historial de deudas saldadas
                </h2>
                <span className="text-black">{showSettledHistory ? "▲" : "▼"}</span>
              </button>

              {showSettledHistory && (
                <div className="mt-3">
                  {settledExpenses.length === 0 ? (
                    <p className="text-gray-500">Todavía no hay deudas saldadas</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {settledExpenses.map((e) => (
                        <li key={e.id} className="rounded-xl border bg-green-50 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-black">Saldar deuda</p>
                              <p className="mt-1 text-sm text-gray-700">
                                {e.amount}€ · {getGroupName(e.group_id)}
                              </p>
                              <p className="text-sm text-gray-700">
                                Pagó: {getUserName(e.paid_by)}
                              </p>
                              <p className="mt-2 text-xs text-gray-500">
                                {formatDate(e.created_at)}
                              </p>
                            </div>

                            <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-green-700 shadow-sm">
                              Saldado
                            </div>
                          </div>

                          <div className="mt-3 rounded-lg bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Movimiento
                            </p>
                            <p className="mt-1 text-sm text-black">
                              {getExpensePeopleSummary(e.id)}
                            </p>
                          </div>

                          {isAdmin && (
                            <button
                              onClick={() => deleteExpense(e.id)}
                              className="mt-3 rounded bg-black px-3 py-2 text-white transition-all hover:scale-105 active:scale-95"
                            >
                              Borrar registro
                            </button>
                          )}
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
          <div className="mx-auto flex max-w-3xl animate-[fadeIn_.35s_ease] flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <h2 className="mb-3 text-xl font-semibold text-black">Moroso del mes</h2>

              {!moroso ? (
                <p className="text-green-600">No hay morosos. Hoy la peña se ha portado.</p>
              ) : (
                <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-br from-red-500 to-black p-6 text-white shadow-xl animate-pulse">
                  <div className="text-5xl">💀</div>

                  <p className="text-2xl font-bold">
                    {getUserName(moroso.friendId)}
                  </p>

                  <p className="text-lg">
                    te debe {moroso.amount.toFixed(2)}€
                  </p>

                  <p className="text-sm opacity-80">
                    Nivel de morosidad: extremo
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {tagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`inline-flex rounded-full px-3 py-2 text-sm font-semibold ${tagModal.colorClass}`}>
                  {tagModal.label}
                </p>
                <h3 className="mt-4 text-2xl font-black text-black">{tagModal.title}</h3>
              </div>

              <button
                onClick={() => setTagModal(null)}
                className="rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-black"
              >
                ✕
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-600">{tagModal.description}</p>

            <button
              onClick={() => setTagModal(null)}
              className="mt-6 w-full rounded-xl bg-black px-4 py-3 text-white"
            >
              Vale, ya sé de qué pie cojea
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
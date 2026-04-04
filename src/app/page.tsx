
"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type User = {
  id: string
  name: string | null
  is_admin?: boolean
  auth_user_id?: string | null
  owner_id?: string | null
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
  const [money, setMoney] = useState(0)
  const [coins, setCoins] = useState([
    { id: 1, x: "left-6 top-5", icon: "💶", value: 2, anim: "animate-bounce" },
    { id: 2, x: "right-10 top-10", icon: "🪙", value: 1, anim: "animate-pulse" },
    { id: 3, x: "left-1/3 bottom-6", icon: "💸", value: 5, anim: "animate-bounce" },
    { id: 4, x: "right-1/4 bottom-10", icon: "💰", value: 10, anim: "animate-pulse" },
  ])
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState("")
  const [apellidos, setApellidos] = useState("")
  const [authMode, setAuthMode] = useState<"login" | "register">("login")

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

  const ensureCurrentAppUserProfile = async () => {
    if (!user) return

    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle()

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

  const getMembersOfSelectedExpenseGroup = () => {
    return groupMembers.filter((item) => item.group_id === expenseGroupId)
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
    const debtMap = new Map<string, number>()

    for (const groupId in balancesByGroup) {
      const balances = balancesByGroup[groupId]

      for (const item of balances) {
        debtMap.set(
          item.debtorId,
          (debtMap.get(item.debtorId) || 0) + item.amount
        )
      }
    }

    let maxUserId: string | null = null
    let maxDebt = 0

    debtMap.forEach((amountValue, userId) => {
      if (amountValue > maxDebt) {
        maxDebt = amountValue
        maxUserId = userId
      }
    })

    if (!maxUserId || maxDebt === 0) return null

    return {
      userId: maxUserId,
      amount: maxDebt,
    }
  }, [balancesByGroup])

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
              <h1 className="text-lg font-black text-black">La app para las cuentas con amigos</h1>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(["home", "amigos", "gastos", "balances", "historial", "moroso"] as Screen[]).map((item) => (
              <button
                key={item}
                onClick={() => setScreen(item)}
                className={`px-4 py-2 rounded-xl transition-all capitalize ${
                  screen === item ? "bg-black text-white shadow-lg" : "bg-white border border-gray-200 hover:-translate-y-0.5"
                }`}
              >
                {item === "home" ? "Inicio" : item}
              </button>
            ))}

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

              <div className="relative z-10 flex flex-col gap-4">
                <div className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm backdrop-blur">
                  Bienvenido al rincón de las cuentas pendientes
                </div>

                <h2 className="text-4xl font-black leading-tight sm:text-5xl">
                  Si estás aquí,
                  <br />
                  <span className="text-green-300">alguien te debe pasta.</span>
                </h2>

                <p className="max-w-2xl text-sm text-gray-200 sm:text-base">
                  Grupos, amigos, gastos directos, balances globales y la lista negra del mes.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">Grupos reales</div>
                  <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">Amigos y balances</div>
                  <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">Historial y morosos</div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <h2 className="text-xl font-semibold text-black">Crear grupo</h2>
                <input
                  placeholder="Nombre del grupo"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                />
                <button
                  onClick={addGroup}
                  className="mt-3 rounded-xl bg-black px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                >
                  + Crear grupo
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <h2 className="text-xl font-semibold text-black">Invitar a un amigo</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Escribe su correo y podrá aceptar la invitación cuando entre con esa cuenta.
                </p>
                <input
                  placeholder="Correo de tu amigo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                />
                <button
                  onClick={addUser}
                  className="mt-3 rounded-xl bg-gray-900 px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                >
                  + Enviar invitación
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <h2 className="text-xl font-semibold text-black">Añadir amigo a grupo</h2>

                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="">Amigo</option>
                  {friendList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="">Grupo</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={addPersonToGroup}
                  className="mt-3 rounded-xl bg-black px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                >
                  Añadir al grupo
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <h2 className="text-xl font-semibold text-black">Invitaciones</h2>

                <div className="mt-4">
                  <h3 className="font-semibold text-black mb-2">Recibidas</h3>
                  {receivedInvitations.length === 0 ? (
                    <p className="text-sm text-gray-500">No tienes invitaciones recibidas</p>
                  ) : (
                    <div className="space-y-2">
                      {receivedInvitations.map((inv) => (
                        <div key={inv.id} className="rounded-lg bg-gray-100 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-black">
                              {inv.email} ({inv.status})
                            </span>

                            {inv.status === "pending" && (
                              <button
                                onClick={() => acceptInvitation(inv)}
                                className="rounded-lg bg-black px-3 py-2 text-white"
                              >
                                Aceptar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <h3 className="font-semibold text-black mb-2">Enviadas</h3>
                  {sentInvitations.length === 0 ? (
                    <p className="text-sm text-gray-500">No has enviado invitaciones todavía</p>
                  ) : (
                    <div className="space-y-2">
                      {sentInvitations.map((inv) => (
                        <div key={inv.id} className="rounded-lg bg-gray-100 p-3 text-black">
                          {inv.email} ({inv.status})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <h2 className="text-xl font-semibold text-black">Tus grupos</h2>
                <div className="mt-4 space-y-2">
                  {groups.length === 0 ? (
                    <p className="text-gray-500">Todavía no hay grupos</p>
                  ) : (
                    groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => openGroupFromHome(g.id)}
                        className="w-full rounded-lg bg-gray-100 p-4 text-left transition hover:bg-gray-200"
                      >
                        {g.name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <h2 className="text-xl font-semibold text-black">Tus amigos</h2>
                <div className="mt-4 space-y-2">
                  {friendList.length === 0 ? (
                    <p className="text-gray-500">
                      Aquí aparecerán tus amigos cuando acepten invitaciones o compartáis gastos.
                    </p>
                  ) : (
                    friendList.map((friend) => (
                      <div
                        key={friend.id}
                        className="rounded-lg border border-gray-200 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-black">{friend.name}</p>
                            <p className="text-sm text-gray-500">
                              {getFriendBalanceText(friend.id)}
                            </p>
                          </div>

                          <button
                            onClick={() => openFriendExpense(friend.id)}
                            className="rounded-lg bg-black px-3 py-2 text-white transition-all hover:scale-105 active:scale-95"
                          >
                            Gasto directo
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-black">Caza al moroso</h3>
                  <p className="text-sm text-gray-500">
                    Dale al botón antes de que escape con tu dinero.
                  </p>
                </div>
              </div>

              <div className="relative h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-yellow-50 to-red-50">
                <div className="absolute inset-0 opacity-60">
                  <div className="absolute left-10 top-6 h-24 w-24 rounded-full bg-green-300/30 blur-2xl animate-pulse" />
                  <div className="absolute right-10 bottom-6 h-24 w-24 rounded-full bg-red-300/30 blur-2xl animate-pulse" />
                </div>

                <button
                  onMouseEnter={(e) => {
                    const parent = e.currentTarget.parentElement
                    if (!parent) return

                    const maxX = parent.clientWidth - e.currentTarget.clientWidth
                    const maxY = parent.clientHeight - e.currentTarget.clientHeight

                    const randomX = Math.floor(Math.random() * maxX)
                    const randomY = Math.floor(Math.random() * maxY)

                    e.currentTarget.style.left = `${randomX}px`
                    e.currentTarget.style.top = `${randomY}px`
                  }}
                  onClick={() => alert("Lo pillaste. Hoy sí te pagan.")}
                  className="absolute left-6 top-6 rounded-full bg-black px-4 py-2 text-white transition-all duration-300 animate-bounce hover:scale-110"
                >
                  💸 Moroso
                </button>

                {coins.map((coin) => (
                  <div
                    key={coin.id}
                    onClick={() => {
                      setMoney((m) => m + coin.value)

                      setCoins((prev) => prev.filter((c) => c.id !== coin.id))

                      setTimeout(() => {
                        const positions = [
                          "left-6 top-5",
                          "right-10 top-10",
                          "left-1/3 bottom-6",
                          "right-1/4 bottom-10",
                          "left-1/2 top-8",
                          "right-6 bottom-6",
                          "left-10 bottom-10",
                        ]

                        const anims = ["animate-bounce", "animate-pulse"]

                        const randomPos =
                          positions[Math.floor(Math.random() * positions.length)]
                        const randomAnim =
                          anims[Math.floor(Math.random() * anims.length)]

                        setCoins((prev) => [
                          ...prev,
                          {
                            ...coin,
                            x: randomPos,
                            anim: randomAnim,
                          },
                        ])
                      }, 1200)
                    }}
                    className={`absolute ${coin.x} cursor-pointer text-2xl ${coin.anim} hover:scale-125`}
                  >
                    {coin.icon}
                  </div>
                ))}

                <div className="absolute bottom-4 left-4 rounded-xl bg-white/80 px-3 py-2 text-sm text-black shadow">
                  <div className="mb-2 text-sm font-semibold text-black">
                    💰 Dinero recuperado: {money}€
                  </div>
                  Excusa típica: “te lo paso luego”
                </div>

                <div className="absolute right-4 top-4 rounded-xl bg-white/80 px-3 py-2 text-sm text-black shadow">
                  Deuda detectada
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === "amigos" && (
          <div className="mx-auto flex max-w-3xl animate-[fadeIn_.35s_ease] flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <h2 className="text-2xl font-semibold text-black">Amigos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Aquí ves el balance global contigo y cada amigo, sumando gastos de grupos y gastos directos.
              </p>

              <div className="mt-4 space-y-3">
                {friendList.length === 0 ? (
                  <p className="text-gray-500">
                    Todavía no tienes balances con amigos.
                  </p>
                ) : (
                  friendList.map((friend) => (
                    <div
                      key={friend.id}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-black">{friend.name}</p>
                          <p className="text-sm text-gray-600">
                            {getFriendBalanceText(friend.id)}
                          </p>
                        </div>

                        <button
                          onClick={() => openFriendExpense(friend.id)}
                          className="rounded-xl bg-black px-4 py-3 text-white transition-all hover:scale-105 active:scale-95"
                        >
                          Añadir gasto directo
                        </button>
                      </div>
                    </div>
                  ))
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

                    return (
                      <div key={group.id} className="rounded border p-3">
                        <button
                          onClick={() => toggleBalanceGroup(group.id)}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <h3 className="font-bold text-black">{group.name}</h3>
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
                <p className="text-green-600">No hay deudas</p>
              ) : (
                <p className="text-black">
                  {getUserName(moroso.userId)} debe {moroso.amount.toFixed(2)}€
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type User = {
  id: string
  name: string | null
  is_admin?: boolean
  auth_user_id?: string | null
}

type Group = {
  id: string
  name: string | null
}

type GroupMember = {
  id: string
  user_id: string
  group_id: string
}

type Expense = {
  id: string
  title: string
  amount: number
  group_id: string
  paid_by: string
  created_at?: string
}

type ExpenseSplit = {
  id: string
  expense_id: string
  user_id: string
  amount: number
  owner_id?: string
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

type SplitMode = "equal" | "custom"

const ADMIN_NAME = "Girma"

export default function Home() {
  const [name, setName] = useState("")
  const [users, setUsers] = useState<User[]>([])

  const [groupName, setGroupName] = useState("")
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsWithMembers, setGroupsWithMembers] = useState<GroupWithMembers[]>([])

  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])

  const [expenseTitle, setExpenseTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [expenseGroupId, setExpenseGroupId] = useState("")
  const [paidBy, setPaidBy] = useState("")
  const [splitMode, setSplitMode] = useState<SplitMode>("equal")
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseSplits, setExpenseSplits] = useState<ExpenseSplit[]>([])

  const [showUsersSection, setShowUsersSection] = useState(false)
  const [showGroupsSection, setShowGroupsSection] = useState(false)
  const [showExpenseHistory, setShowExpenseHistory] = useState(false)
  const [showSettledHistory, setShowSettledHistory] = useState(false)
  const [showMembersSection, setShowMembersSection] = useState(false)
  const [showBalancesSection, setShowBalancesSection] = useState(false)
  const [openMemberGroups, setOpenMemberGroups] = useState<Record<string, boolean>>({})
  const [openBalanceGroups, setOpenBalanceGroups] = useState<Record<string, boolean>>({})
  const [user, setUser] = useState<any>(null)
  useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user)
  })
}, [])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  type Screen = "home" | "gastos" | "balances" | "historial" | "moroso"
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

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user])

  const loadAll = async () => {
    await Promise.all([
      getUsers(),
      getGroups(),
      getGroupMembers(),
      getExpenses(),
      getExpenseSplits(),
    ])
  }

  const isAdmin = useMemo(() => {
  const currentUser = users.find((u) => u.auth_user_id === user?.id)
  return currentUser?.is_admin || false
}, [users, user])

  const normalExpenses = useMemo(() => {
    return expenses.filter((expense) => expense.title !== "Saldar deuda")
  }, [expenses])

  const settledExpenses = useMemo(() => {
    return expenses.filter((expense) => expense.title === "Saldar deuda")
  }, [expenses])

  const getUsers = async () => {
    if (!user) return

    const { data } = await supabase
      .from("users")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)
      .order("created_at", { ascending: false })

    if (data) setUsers(data)
  }

  const addUser = async () => {
    if (!name.trim() || !user) return

    await supabase.from("users").insert({
      name,
      owner_id: user.id,
    })

    setName("")
    await getUsers()
    await buildGroupsWithMembers()
  }

  const getGroups = async () => {
    if (!user) return

    const { data } = await supabase
      .from("groups")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)
      .order("created_at", { ascending: false })

    if (data) setGroups(data)
  }

  const addGroup = async () => {
    if (!groupName.trim() || !user) return

    await supabase.from("groups").insert({
      name: groupName,
      owner_id: user.id,
    })

    setGroupName("")
    await getGroups()
    await buildGroupsWithMembers()
  }

  const getGroupMembers = async () => {
    if (!user) return

    const { data } = await supabase
      .from("group_members")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)
      .order("created_at", { ascending: false })

    if (data) setGroupMembers(data)
  }

  const addPersonToGroup = async () => {
    if (!selectedUserId || !selectedGroupId || !user) return

    const alreadyExists = groupMembers.some(
      (item) =>
        item.user_id === selectedUserId && item.group_id === selectedGroupId
    )

    if (alreadyExists) {
      alert("Esa persona ya está en el grupo")
      return
    }

    await supabase.from("group_members").insert([
      {
        user_id: selectedUserId,
        group_id: selectedGroupId,
        owner_id: user.id,
      },
    ])

    setSelectedUserId("")
    setSelectedGroupId("")
    await getGroupMembers()
    await buildGroupsWithMembers()
  }

  const getExpenses = async () => {
    if (!user) return

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)
      .order("created_at", { ascending: false })

    if (data) setExpenses(data)
  }

  const getExpenseSplits = async () => {
    if (!user) return

    const { data } = await supabase
      .from("expense_splits")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)

    if (data) setExpenseSplits(data)
  }

  const getMembersOfSelectedExpenseGroup = () => {
    return groupMembers.filter((item) => item.group_id === expenseGroupId)
  }

  const membersOfSelectedExpenseGroup = useMemo(() => {
    return groupMembers
      .filter((item) => item.group_id === expenseGroupId)
      .map((item) => users.find((user) => user.id === item.user_id))
      .filter(Boolean) as User[]
  }, [expenseGroupId, groupMembers, users])

  const getUserName = (userId: string) => {
    const userItem = users.find((u) => u.id === userId)
    return userItem?.name || "Usuario"
  }

  const getGroupName = (groupId: string) => {
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
    setPaidBy("")
    setSplitMode("equal")
    setCustomSplits({})
  }

  const addExpense = async () => {
    if (!expenseTitle || !amount || !expenseGroupId || !paidBy || !user) return

    const amountNumber = parseFloat(amount)
    if (Number.isNaN(amountNumber) || amountNumber <= 0) return

    const membersOfGroup = getMembersOfSelectedExpenseGroup()

    if (membersOfGroup.length === 0) {
      alert("Ese grupo no tiene personas")
      return
    }

    const payerIsInGroup = membersOfGroup.some((member) => member.user_id === paidBy)

    if (!payerIsInGroup) {
      alert("Quien paga debe pertenecer al grupo")
      return
    }

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert([
        {
          title: expenseTitle,
          amount: amountNumber,
          group_id: expenseGroupId,
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
    let splitsToInsert: { expense_id: string; user_id: string; amount: number; owner_id: string }[] = []

    if (splitMode === "equal") {
      const splitAmount = Number((amountNumber / membersOfGroup.length).toFixed(2))

      splitsToInsert = membersOfGroup.map((member) => ({
        expense_id: expenseId,
        user_id: member.user_id,
        amount: splitAmount,
        owner_id: user.id,
      }))
    } else {
      const customAmounts = membersOfGroup.map((member) => ({
        user_id: member.user_id,
        amount: Number(parseFloat(customSplits[member.user_id] || "0").toFixed(2)),
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

    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)

    const { data: membersData } = await supabase
      .from("group_members")
      .select("*")
      .or(`owner_id.eq.${user.id},owner_id.is.null`)

    if (!groupsData || !usersData || !membersData) return

    const result: GroupWithMembers[] = groupsData.map((group) => {
      const membersOfGroup = membersData
        .filter((item) => item.group_id === group.id)
        .map((item) => usersData.find((userItem) => userItem.id === item.user_id))
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

  if (!user) {
    return (
      <main className="p-4">
        <h1 className="text-xl mb-4">Login</h1>
        <button
        onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
        className="text-blue-500 mb-4">
          {authMode === "login"
          ? "¿No tienes cuenta? Regístrate"
          : "¿Ya tienes cuenta? Inicia sesión"}
          </button>


        <input
          className="border p-2 mb-2 w-full"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {authMode === "register" && (
  <input
    className="border p-2 mb-2 w-full"
    placeholder="Nombre"
    value={nombre}
    onChange={(e) => setNombre(e.target.value)}
  />
)}
         
{authMode === "register" && (
  <input
    className="border p-2 mb-2 w-full"
    placeholder="Apellidos"
    value={apellidos}
    onChange={(e) => setApellidos(e.target.value)}
  />
)}

        <input
          className="border p-2 mb-2 w-full"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            className="bg-black text-white px-3 py-2 rounded transition-all hover:scale-105 active:scale-95"
            onClick={async () => {
              if (loading) return
              setLoading(true)

              if (!email || !password) {
                alert("Faltan datos")
                return
              }

              const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
              })

              if (error) alert(error.message)
            }}
          >
            Login
          </button>

          <button
  className="bg-black text-white px-3 py-2 rounded transition-all hover:scale-105 active:scale-95"
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

    let data, error

    if (authMode === "login") {
      const res = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      data = res.data
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
      data = res.data
      error = res.error
    }

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    alert(authMode === "login" ? "Login correcto" : "Registro enviado correctamente")
    setLoading(false)
  }}
>
  {authMode === "login" ? "Iniciar sesión" : "Registrarse"}
</button>

        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white p-6">
      <button
  onClick={async () => {
    await supabase.auth.signOut()
    setUser(null)
  }}
  className="bg-red-500 text-white px-3 py-2 rounded mb-2"
>
  Cerrar sesión
</button>

      <div className="flex gap-2 mb-4">
  <button onClick={() => setScreen("home")} className="bg-black text-white px-3 py-2 rounded">
    Inicio
  </button>
  <button onClick={() => setScreen("gastos")} className="bg-gray-600 text-white px-3 py-2 rounded">
    Gastos
  </button>
  <button onClick={() => setScreen("balances")} className="bg-gray-600 text-white px-3 py-2 rounded">
    Balances
  </button>
  <button onClick={() => setScreen("historial")} className="bg-gray-600 text-white px-3 py-2 rounded">
    Historial
    </button>
    <button onClick={() => setScreen("moroso")} className="bg-gray-600 text-white px-3 py-2 rounded">
  Moroso
</button>
</div>
{screen === "home" && (
      <>
      <div className="relative animate-[fadeIn_.5s_ease] overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-gray-800 to-black p-8 text-white shadow-2xl">
  <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
  <div className="absolute top-10 right-6 h-20 w-20 rounded-full bg-green-400/20 blur-2xl" />
  <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-red-400/20 blur-2xl" />

  <div className="relative z-10 flex flex-col gap-4">
    <div className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm backdrop-blur">
      Bienvenido al rincón de las cuentas pendientes
    </div>

    <h1 className="text-4xl font-black leading-tight sm:text-5xl">
      Si estás aquí,
      <br />
      <span className="text-green-300">alguien te debe pasta.</span>
    </h1>

    <p className="max-w-xl text-sm text-gray-200 sm:text-base">
      O peor: tú debes dinero y te estás haciendo el loco. Se acabó lo de
      “luego te hago Bizum”, “págalo tú y después vemos” y las cuentas con
      los cabrones de tus amigos.
    </p>

    <div className="flex flex-wrap gap-3 pt-2">
      <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">
        Cena del viernes · 18€
      </div>
      <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">
        Bizum pendiente
      </div>
      <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">
        “Luego te pago”
      </div>
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

  <div className="relative h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-red-50">
    <div className="absolute left-6 top-5 text-2xl animate-bounce">💶</div>
<div className="absolute right-10 top-10 text-xl animate-pulse">🪙</div>
<div className="absolute left-1/3 bottom-6 text-2xl animate-bounce">💸</div>
<div className="absolute right-1/4 bottom-10 text-xl animate-pulse">💰</div>
<div className="absolute left-1/2 top-1/3 text-lg animate-ping">·</div>

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

        const randomPos = positions[Math.floor(Math.random() * positions.length)]
        const randomAnim = anims[Math.floor(Math.random() * anims.length)]

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

</>
)}
      {screen === "gastos" && (
  <div className="mx-auto flex max-w-md animate-[fadeIn_.35s_ease] flex-col gap-6">
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <h2 className="mb-2 text-xl font-semibold text-black">Añadir gasto</h2>

      <input
        placeholder="Concepto (ej: cena)"
        value={expenseTitle}
        onChange={(e) => setExpenseTitle(e.target.value)}
        className="mt-2 w-full rounded border p-2 text-black"
      />

      <input
        type="number"
        placeholder="Cantidad total"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-2 w-full rounded border p-2 text-black"
      />

      <select
        value={expenseGroupId}
        onChange={(e) => {
          setExpenseGroupId(e.target.value)
          setPaidBy("")
          setCustomSplits({})
        }}
        className="mt-2 w-full rounded border p-2 text-black"
      >
        <option value="">Grupo</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <select
        value={paidBy}
        onChange={(e) => setPaidBy(e.target.value)}
        disabled={!expenseGroupId || membersOfSelectedExpenseGroup.length === 0}
        className="mt-2 w-full rounded border p-2 text-black disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value="">
          {!expenseGroupId
            ? "Primero elige grupo"
            : membersOfSelectedExpenseGroup.length === 0
            ? "Ese grupo no tiene personas"
            : "Quién paga"}
        </option>
        {membersOfSelectedExpenseGroup.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setSplitMode("equal")}
          className={`rounded px-3 py-2 text-white ${splitMode === "equal" ? "bg-black" : "bg-gray-500"}`}
        >
          Equitativa
        </button>
        <button
          onClick={() => setSplitMode("custom")}
          className={`rounded px-3 py-2 text-white ${splitMode === "custom" ? "bg-black" : "bg-gray-500"}`}
        >
          Personalizada
        </button>
      </div>

      {splitMode === "custom" && expenseGroupId && (
        <div className="mt-3 rounded border p-3">
          <h3 className="font-semibold text-black">Importe por persona</h3>

          {membersOfSelectedExpenseGroup.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              Elige un grupo con personas
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {membersOfSelectedExpenseGroup.map((member) => (
                <div key={member.id} className="flex flex-col gap-1">
                  <label className="text-sm text-black">
                    {member.name}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={customSplits[member.id] || ""}
                    onChange={(e) =>
                      handleCustomSplitChange(member.id, e.target.value)
                    }
                    className="rounded border p-2 text-black"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={addExpense}
        className="mt-3 w-full rounded bg-red-600 p-2 text-white"
      >
        Añadir gasto
      </button>
    </div>
  </div>
)}
{screen === "balances" && (
  <div className="mx-auto flex max-w-md animate-[fadeIn_.35s_ease] flex-col gap-6">
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <h2 className="text-xl font-semibold text-black">Balances por grupo</h2>

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
                              {getUserName(item.debtorId)} debe {item.amount.toFixed(2)}€ a {getUserName(item.creditorId)}
                            </span>

                            <button
                              onClick={() => settleBalance(item)}
                              className="rounded bg-black px-3 py-2 text-white"
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
  <div className="mx-auto flex max-w-md animate-[fadeIn_.35s_ease] flex-col gap-6">
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
                      Gasto
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
                      className="mt-3 rounded bg-black px-3 py-2 text-white"
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

    <div className="rounded border border-gray-300 p-4">
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
                      className="mt-3 rounded bg-black px-3 py-2 text-white"
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
  <div className="mx-auto flex max-w-md animate-[fadeIn_.35s_ease] flex-col gap-6">
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <h2 className="mb-3 text-xl font-semibold text-black">
        Moroso del mes
      </h2>

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

    </main>
  )
}